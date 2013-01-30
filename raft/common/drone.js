/*
 * drone.js: Controls the application lifetime for nodejs applications on a single server.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs');
var path = require('path');
var raft = require('../../raft')
var async = raft.common.async;

var LOG_LINEBREAK = "\n";
var HISTORY_LENGTH = 5000;
//
// ### function Drone (options)
// #### @options {Object} Options for this instance.
// Constructor function for the Drone resource.
//
var Drone = exports.Drone = function(options) {
	options = options || {};

	this.apps = {};
	this.drones = {};
	this.host = options.host || 'localhost';
	this.spawner = new raft.Spawner(options);
	this.packagesDir = options.packageDir;
	this.logsDir = options.logsDir
};
//
// ### function start (app, callback)
// #### @app {App} Application to start in this instance.
// #### @callback {function} Continuation passed to respond to.
// Attempts to spawn the @app by passing it to the spawner.
//
Drone.prototype.start = function(oldApp, user, callback) {
	var self = this;
	console.log(oldApp)
	function save(app) {
		self.spawner.trySpawn(app, function(err, result) {
			if (err) {
				return callback(err, false);
			} else if ( typeof result === 'undefined') {
				var err = new Error('Unknown error from Spawner.');
				err.blame = {
					type : 'system',
					message : 'Unknown'
				}
				return callback(err);
			}
			result.hash = app.hash
			self._add(app, result, function(err, data) {
				//
				// If there is an error persisting the drone
				// to disk then just respond anyway since the
				// drone process started correctly.
				//
				callback(null, data);
			});
		});
	}


	this._cleanPackage(oldApp, user, function(err, app) {
		if (err) {
			return callback(err)
		}
		raft.mongoose.Package.findOne({
			name : app.name,
			user : app.user,
			version : app.version
		}, function(err, package) {
			if (!package) {
				app.versionCode = 0
				new raft.mongoose.Package(app).save(function(err) {
					if (err) {
						return callback(err)
					}
					save(app)
				})
			} else {

				app.versionCode = package.versionCode = package.versionCode + 1
				package.save(function(err) {
					if (err) {
						return callback(err)
					}
					save(app)
				})
			}
		})
	})
};

//
// ### function stop (name, callback)
// #### @name {string} Name of the application to stop (i.e. app.name).
// #### @cleanup {bool} (optional) Remove all autostart files (default=true).
// #### @callback {function} Continuation passed to respond to.
// Stops all drones with app.name === name managed by this instance
//
Drone.prototype.stop = function(name, user, cleanup, callback) {
	if ( typeof cleanup !== 'boolean') {
		callback = cleanup;
		cleanup = true;
	}

	if (!this.apps[user] || typeof this.apps[user][name] === 'undefined') {
		return callback(new Error('Cannot stop application that is not running.'));
	}

	var self = this, app = this.apps[user][name], keys = Object.keys(app.drones), results = [];

	function removeAndSave(key, next) {
		function onStop() {
			app.drones[key].monitor.removeListener('error', onErr);
			results.push(app.drones[key].process);
			var pid = app.drones[key].pid
			var uid = app.drones[key].data.uid
			raft.balancer.destroyDrone(self._formatRecord(app.drones[key]), app.app)
			self._remove(app, user, app.drones[key], cleanup, function() {
				raft.mongoose.Drone.remove({
					pid : pid,
					uid : uid
				}, next)
			});
		}

		function onErr(err) {
			//
			// Remark should we handle errors here
			//
			raft.emit(['drone', 'stop', 'error'], {
				key : key,
				message : err.message
			});
			app.drones[key].monitor.removeListener('stop', onStop);
			raft.balancer.destroyDrone(self._formatRecord(app.drones[key]), app.app)
			raft.mongoose.Drone.remove({
				pid : app.drones[key].pid,
				uid : app.drones[key].uid
			}, next)
		}


		app.drones[key].monitor.once('stop', onStop);
		app.drones[key].monitor.once('error', onErr);

		try {
			app.drones[key].monitor.stop(true);
		} catch (err) {
			onErr(err);
		}

		raft.emit(['drone', 'stop', 'success'], {
			key : key
		});
	}


	async.forEach(keys, removeAndSave, function() {
		callback(null, results);
	});
};

//
// ### function destroy (cleanup, callback)
// #### @cleanup {bool} Remove all autostart files.
// #### @callback {function} Continuation pased to respond to.
// Stops all drones managed by this instance
//
Drone.prototype.destroy = function(cleanup, callback) {
	var self = this;
	async.forEach(Object.keys(this.apps), function(user, callback) {
		async.forEach(Object.keys(this.apps[user][name]), function(name, callback) {
			self.stop(name, user, cleanup, callback);
		}, callback);
	}, callback);
};

//
// ### function restart (name, callback)
// #### @name {string} Name of the application to restart (i.e. app.name).
// Restarts all drones with app = name managed by this instance and
// responds with the list of processes of new processes.
//
Drone.prototype.restart = function(name, user, callback) {
	if (!this.apps || !this.apps[user] || !this.apps[user][name]) {
		return callback(new Error('Cannot restart application that is not running.'));
	}

	var self = this, record = this.apps[user][name], keys = Object.keys(record.drones), processes = [];

	function restartAndUpdate(key, next) {
		var existing = record.drones[key].monitor.uid;

		record.drones[key].monitor.once('restart', function(_, data) {
			//
			// When the `restart` event is raised, update the set of processes for this
			// app which this `Drone` instance has restarted
			//
			processes.push(self._formatRecord(record.drones[data.uid]));
			next();
		});

		record.drones[key].monitor.restart();
	}


	async.forEach(keys, restartAndUpdate, function() {
		callback(null, processes);
	});
};

//
// ### function clean (app)
// #### @app {App} Application to clean in this instance.
// #### @callback {function} Continuation passed to respond to.
// Stops the potentially running application then removes all dependencies
// and source files associated with the application.
//
Drone.prototype.clean = function(app, user, callback) {
	app.user = user
	if (!app || !app.user || !app.name) {
		return callback(new Error('Both `user` and `name` are required.'));
	}

	var self = this, appsDir = this.packagesDir;

	this.stop(app.name, user, function(err, result) {
		//
		// Ignore errors and continue cleaning
		//
		if (err) {
			raft.emit('drone:clean:warning', err);
		}
		self.spawner.rmApp(appsDir, app, callback);
	});
};

//
// ### function setEnv (key, val, name, user, callback)
// #### @app {App} Application to clean in this instance.
// #### @callback {function} Continuation passed to respond to.
// Stops the potentially running application then removes all dependencies
// and source files associated with the application.
//
Drone.prototype.setEnv = function(key, val, name, user, callback) {
	if (!this.apps || !this.apps[user] || !this.apps[user][name]) {
		return callback(new Error('Cannot restart application that is not running.'));
	}

	var self = this
	var record = this.apps[user][name]
	var keys = Object.keys(record.drones)
	var processes = [];
	function setEnv(uid, next) {
		record.drones[uid].rpc.invoke('env.set', [key, val], next)
	}


	async.forEach(keys, setEnv, function() {
		callback(null);
	});
};
//
// ### function getEnv (key, name, user, callback)
// #### @app {App} Application to clean in this instance.
// #### @callback {function} Continuation passed to respond to.
// Stops the potentially running application then removes all dependencies
// and source files associated with the application.
//
Drone.prototype.getEnv = function(key, name, user, callback) {
	if (!this.apps || !this.apps[user] || !this.apps[user][name]) {
		return callback(new Error('Cannot restart application that is not running.'));
	}

	var self = this
	var record = this.apps[user][name]
	var keys = Object.keys(record.drones)
	var processes = {};

	function setEnv(uid, next) {
		record.drones[uid].rpc.invoke('env.get', [key], function(err, result) {
			processes[uid] = result.env
			next()
		})
	}


	async.forEach(keys, setEnv, function() {
		callback(null, processes);
	});

};
//
// ### function getEnv (key, name, user, callback)
// #### @app {App} Application to clean in this instance.
// #### @callback {function} Continuation passed to respond to.
// Stops the potentially running application then removes all dependencies
// and source files associated with the application.
//
Drone.prototype.getlogs = function(uid, name, user, callback) {
	var length = HISTORY_LENGTH;
	var outFile = this.logsDir + '/' + user + '.' + name + '.outFile.' + uid + '.log'
	var errFile = this.logsDir + '/' + user + '.' + name + '.errFile.' + uid + '.log'

	function readLog(file, cb) {
		var lines = []
		var data = ''
		fs.stat(file, function(err, stat) {
			if (err) {
				return cb(err)
			}

			if (stat.size == 0) {
				return cb(null, [])
			}
			var options = {
				flags : 'r',
				encoding : 'utf8',
				fd : null,
				mode : 0666,
				end : stat.size,
				start : stat.size - length
			}

			var stream = fs.createReadStream(file, options)

			stream.on('data', function(c) {
				data += c
			})
			stream.on('end', function() {
				var lines = data.split(LOG_LINEBREAK)
				lines.shift()
				lines.shift()
				cb(null, lines)
			})
		})
	}

	readLog(outFile, function(err, stdout) {
		if (err) {
			return callback(err)
		}

		readLog(errFile, function(err, stderr) {
			if (err) {
				return callback(err)
			}

			callback(null, {
				stdout : stdout,
				stderr : stderr
			})
		})
	})
};

//
// ### function cleanAll ()
// #### @callback {function} Continuation passed to respond to.
// Stops all potentially running applications and removes all source code
// and/or dependencies associated with them from this instance.
//
Drone.prototype.cleanAll = function(callback) {
	var self = this, appsDir = this.packagesDir;

	function forceStop(user) {
		return function(name, next) {
			self.stop(name, user, function(err) {
				//
				// Ignore errors here.
				//
				if (err) {
					raft.emit('drone:cleanAll:warning', err);
				} else {
					raft.emit('drone:cleanAll:success', name);
				}
				next();
			});
		}
	}


	async.forEach(Object.keys(this.apps), function(user, next) {

		async.forEach(Object.keys(self.apps[user]), forceStop(user), function cleanFiles() {
			//
			// Reset `this.apps`, then remove all files in the `apps` and
			// `autostart` dir(s).
			//
			self.apps = {};
			raft.emit('drone:cleanAll:end');
			self.spawner.rmApps(self.packagesDir, next)
		});
	}, callback);
};

//
// ### function update (name, callback)
// #### @name {string} Name of the application to update (i.e. app.name).
// Stops an application, Cleans all source and deps, Starts the pplication
//
Drone.prototype.update = function(app, user, callback) {
	app.user = user
	if (!app || !this.apps || !this.apps[user] || !this.apps[user][app.name]) {
		return callback(new Error('Cannot update application that is not running.'));
	}

	var self = this;
	this.clean(app, user, function(err) {
		self.start(app, user, function(err, result) {
			callback(err, result);
		});
	});
};

//
// ### function show (name)
// #### @name {string} Name of the application to show (i.e. app.name)
// Shows details for drone with `name` managed by this instance
//
Drone.prototype.show = function(name, user) {
	var self = this, app = this.apps[user] ? this.apps[user][name] : null, appData;

	if (!app) {
		return undefined;
	}

	appData = {
		app : raft.common.clone(this.apps[user][name].app),
		drones : []
	};
	appData.app.repository = undefined;

	if (app.drones) {
		Object.keys(app.drones).forEach(function(uid) {
			appData.drones.push(self._formatRecord(app.drones[uid]));
		});
	}

	return appData;
}
//
// ### function list ()
// Lists details about all drones managed by this instance
//
Drone.prototype.list = function(user) {
	var self = this, allApps = {};
	Object.keys(this.apps[user] || {}).forEach(function(name) {
		allApps[name] = self.show(name, user);
	});

	return allApps;
};

Drone.prototype.running = function(user) {
	var self = this, all = [];

	raft.common.each(this.list(user), function(record) {
		var app = record.app;
		raft.common.each(record.drones, function(drone) {
			all.push(self.format(app, drone));
		});
	});

	return all;
};

Drone.prototype.format = function(app, drone) {
	var hosts = drone.host.split(' '), host2 = hosts.pop(), host1 = hosts.pop();

	return {
		user : app.user,
		name : app.name,
		version : app.version,
		ctime : drone.ctime,
		host : host1 || host2,
		host2 : host2,
		domain : app.domain,
		uid : drone.uid,
		hash : drone.hash,
		port : drone.port,
		raftPort : drone.port
	};
};

//
// ### function _add (app, drone)
// #### @app {App} Application for which to attach @drone to
// #### @drone {Object} Drone to attach to @app
// Attaches the specified drone to the application in
// this instance.
//
Drone.prototype._add = function(app, drone, callback) {
	//
	// Create a record for this app if it doesn't exist
	//

	this.apps[app.user] = this.apps[app.user] || {};
	this.apps[app.user][app.name] = this.apps[app.user][app.name] || {};

	var self = this, record = this.apps[app.user][app.name];

	if (!record.app) {
		//
		// If we have not yet created a record for this app
		// then sanitize the data in the app and update the record.
		//
		['domain', 'domains', 'subdomain', 'subdomains'].forEach(function(prop) {
			if (!app[prop]) {
				return;
			}

			if (Array.isArray(app[prop])) {
				app[prop] = app[prop].map(function(value) {
					return value.toLowerCase();
				});
			} else if ( typeof app[prop] === 'string') {
				app[prop].toLowerCase();
			}
		});

		record.app = app;
		record.drones = {};
	} else {
		record.app.versionCode = app.versionCode
	}

	var uid = drone.data.uid;
	record.drones[uid] = drone;

	//
	// In the event that the drone unexpectedly restarts,
	// we need to update the record with the new uid so that
	// we can control it later on.
	//
	drone.monitor.on('restart', function(_, data) {
		self._update(record, uid, data);
		uid = data.uid;
	});

	var data = self._formatRecord(drone)

	new raft.mongoose.Drone(data).save(function(err) {
		raft.balancer.addApp(app)
		raft.balancer.addDrone(data, app)
		callback(null, data);
	})
};

//
// ### function _remove (a, drone)
// #### @record {Object} Wrapped {app, drone} tuple set in _add
// #### @drone {Object} Drone metadata to remove from the specified application
// #### @cleanup {bool} (optional) Remove all autostart files (default = true).
// Removes the specified drone object from the bookkeeping of this instance.
//
Drone.prototype._remove = function(record, user, drone, cleanup, callback) {
	var self = this;

	if ( typeof cleanup !== 'boolean') {
		callback = cleanup;
		cleanup = true;
	}
	delete record.drones[drone.monitor.uid];

	//
	// If there are no more drones for this app
	// delete the entire app
	//
	if (Object.keys(record.drones).length === 0) {
		delete self.apps[user][record.app.name];
	}

	callback();

};

//
// ### function _update (record, existing, update, callback)
// #### @record {Object} Wrapped {app, drone} tuple set in _add
// #### @existing {string} Existing uid for the drone to be updated.
// #### @updated {Object} New forever data for the drone
// Updates the process information for the uid of the `existing` drone
// process for the app specified by `records` with the `updated` uid.
//
Drone.prototype._update = function(record, existing, updated, callback) {
	callback = callback ||
	function() {
	};

	var drone = record.drones[existing];
	drone.process = drone.monitor.child;
	drone.data = updated;
	record.drones[updated.uid] = drone;

	callback();
};

//
// ### function _formatRecord (record)
// #### @record {Object} Record to format.
// Formats the specified `record` based on the `record.socket`.
//
Drone.prototype._formatRecord = function(record, app) {

	var response = raft.common.clone(record.data);
	//response.repository = null;
	delete response.spawnWith
	if (record.socket && record.socket.port) {
		response.port = record.socket.port;
		response.host = record.socket.host;
		response.hash = record.hash;
	}

	response.host = response.host || this.host || 'localhost';
	response.load = record.load;

	if (app) {
		response.name = app.name;
		response.user = app.user;
	}

	return response;
};

//
// ### function _formatRecord (record)
// #### @record {Object} Record to format.
// Formats the specified `record` based on the `record.socket`.
//
Drone.prototype._cleanPackage = function(oldApp, user, callback) {
	var app = {}

	var validateError = this._validate([], oldApp)

	if (validateError) {
		return callback(validateError)
	}
	app.user = user
	app.nameClean = raft.common.sanitizeAppname(oldApp.name)
	app.name = oldApp.name
	app.repository = oldApp.repository
	app.scripts = oldApp.scripts
	app.domain = oldApp.domain ? oldApp.domain : app.name + '.' + user + '.' + raft.config.get('domain')
	if (oldApp.subdomain) {
		//app.domain = app.subdomain + '.' + raft.config.get('domain')
	} else {
		//app.domain = oldApp.domain = app.name + '.' + user + '.' + raft.config.get('domain')
	}
	callback(null, app)
};

Drone.prototype._validate = function(keys, app) {
	var i, i2, required, props, check;

	// Check for the basic required properties needed for haibu repositories + requested ones
	keys = keys || [];
	required = ['name', 'version', 'repository.type', 'scripts.start'].concat(keys);

	for ( i = 0; i < required.length; i++) {
		// split property if needed and run over each part
		props = required[i].split('.');
		check = app || this.app;

		for ( i2 = 0; i2 < props.length; i2++) {
			if ( typeof (check[props[i2]]) == 'undefined') {
				var message = ['Property', required[i], 'is required.'].join(' ');
				var err = new Error(message);
				err.blame = {
					type : 'user',
					message : 'Missing properties in repository configuration'
				}
				return err;
			}

			check = check[props[i2]];
		}
	}
	// all ok!
	return;
}