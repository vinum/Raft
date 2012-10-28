/*
 * drone.js: Controls the application lifetime for nodejs applications on a single server.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var crypto = require('crypto'), fs = require('fs'), path = require('path'), zlib = require('zlib'), tar = require('tar'), haibu = require('../../haibu'), async = haibu.common.async;

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
	this.spawner = new haibu.Spawner(options);
	this.proxy = new haibu.clients.Proxy({
		host : '192.168.1.25',
		port : 9001
	});

	this.__defineGetter__("packagesDir", function() {
		return path.join(__dirname, '..', '..', '..', 'packages');
	});
};

//
// ### function start (app, callback)
// #### @app {App} Application to start in this instance.
// #### @callback {function} Continuation passed to respond to.
// Attempts to spawn the @app by passing it to the spawner.
//
Drone.prototype.start = function(app, callback) {
	var self = this;
	var first = true
	haibu.drone.scaler.fork(function(cb) {
		self.fork(app, function(err, result) {
			if (err)
				throw err
			cb(result.process, result.pid, function(cb) {
				self.stopOne(app.name, result.monitor.uid, false, cb)
			})
			if (first) {
				first = false
				callback(null, self._formatRecord(result));
			}

		})
	})
};

Drone.prototype.fork = function(app, callback) {
	var self = this;

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

		self._add(app, result, function(err) {
			//
			// If there is an error persisting the drone
			// to disk then just respond anyway since the
			// drone process started correctly.
			//
			self._updateAddProxy(result, app, function() {
				callback(null, result);
			})
		});
	});
};

Drone.prototype.getPid = function(pid) {
	for (var key in this.drones) {

	}
};

Drone.prototype.stream = function(userId, appId, stream, output, callback) {
	var untarDir = path.join(this.packagesDir, [userId, appId, Date.now()].join('-'))
	var sha = crypto.createHash('sha1')
	var self = this;
	function updateSha(chunk) {
		sha.update(chunk);
	}

	//
	// Update the shasum for the package being streamed
	// as it comes in and prehash any buffered chunks.
	//
	stream.on('data', updateSha);
	if (stream.chunks) {
		stream.chunks.forEach(updateSha);
	}

	//
	// Handle error caused by `zlib.Gunzip` or `tar.Extract` failure
	//
	function onError(err) {
		err.usage = 'tar -cvz . | curl -sSNT- HOST/deploy/USER/APP';
		err.blame = {
			type : 'system',
			message : 'Unable to unpack tarball'
		};
		return callback(err);
	}

	function onEnd() {

		//
		// Stop updating the sha since the stream is now closed.
		//
		stream.removeListener('data', updateSha);
		//
		// When decompression is done, then read the `package.json`
		// file and attempt to start the drone via `this.start()`.
		//
		haibu.common.file.readJson(path.join(untarDir, 'package.json'), function(err, pkg) {
			if (err) {
				err.usage = 'Submit a tar with a package.json containing a start script'
				return callback(err);
			}

			pkg.user = userId;
			pkg.name = appId;
			pkg.hash = sha.digest('hex');
			pkg.repository = {
				type : 'local',
				directory : untarDir
			};

			self.start(pkg, function(err, result) {
				if (err) {
					haibu.emit([pkg.user, pkg.name, 'error', 'service'], 'error', err);
					return callback(err);
				}

				var record = self.apps[appId];
				result.hash = pkg.hash;

				return callback(null, self._formatRecord(record.drones[result.uid], record.app, pkg));
			});
		});
	}

	//
	// Create a temporary directory to untar the streamed data
	// into and pipe the stream data to a child `tar` process.
	//
	fs.mkdir(untarDir, '0755', function(err) {
		output(untarDir, stream.pipe(zlib.Unzip()).on("error", callback).on("error", onError).on("end", onEnd))
	});

};

Drone.prototype.package = function(userId, appId, stream, callback) {
	this.stream(userId, appId, stream, function(untarDir, zipStream) {
		zipStream.pipe(tar.Extract({
			type : "Directory",
			path : untarDir,
			strip : 1
		}))
	}, callback)

};

Drone.prototype.deploy = function(userId, appId, stream, callback) {
	var untarDir = path.join(this.packagesDir, [userId, appId, Date.now()].join('-')), sha = crypto.createHash('sha1'), self = this;

	function updateSha(chunk) {
		sha.update(chunk);
	}

	//
	// Update the shasum for the package being streamed
	// as it comes in and prehash any buffered chunks.
	//
	stream.on('data', updateSha);
	if (stream.chunks) {
		stream.chunks.forEach(updateSha);
	}

	//
	// Handle error caused by `zlib.Gunzip` or `tar.Extract` failure
	//
	function onError(err) {
		err.usage = 'tar -cvz . | curl -sSNT- HOST/deploy/USER/APP';
		err.blame = {
			type : 'system',
			message : 'Unable to unpack tarball'
		};
		return callback(err);
	}

	function onEnd() {
		//
		// Stop updating the sha since the stream is now closed.
		//
		stream.removeListener('data', updateSha);

		//
		// When decompression is done, then read the `package.json`
		// file and attempt to start the drone via `this.start()`.
		//
		haibu.common.file.readJson(path.join(untarDir, 'package.json'), function(err, pkg) {
			if (err) {
				err.usage = 'Submit a tar with a package.json containing a start script'
				return callback(err);
			}

			pkg.user = userId;
			pkg.name = appId;
			pkg.hash = sha.digest('hex');
			pkg.repository = {
				type : 'local',
				directory : untarDir
			};

			self.start(pkg, function(err, result) {
				if (err) {
					haibu.emit([pkg.user, pkg.name, 'error', 'service'], 'error', err);
					return callback(err);
				}

				var record = self.apps[appId];
				result.hash = pkg.hash;
				return callback(null, self._formatRecord(record.drones[result.uid], record.app, pkg));
			});
		});
	}

	//
	// Create a temporary directory to untar the streamed data
	// into and pipe the stream data to a child `tar` process.
	//
	fs.mkdir(untarDir, '0755', function(err) {
		//
		// Create a tar extractor and pipe incoming stream to it.
		//
		stream.pipe(zlib.Gunzip()).on('error', onError).pipe(new tar.Extract({
			path : untarDir
		})).on('error', onError).on('end', onEnd);
	});
};

//
// ### function stop (name, callback)
// #### @name {string} Name of the application to stop (i.e. app.name).
// #### @cleanup {bool} (optional) Remove all autostart files (default=true).
// #### @callback {function} Continuation passed to respond to.
// Stops all drones with app.name === name managed by this instance
//
Drone.prototype.stop = function(name, cleanup, callback) {
	if ( typeof cleanup !== 'boolean') {
		callback = cleanup;
		cleanup = true;
	}

	if ( typeof this.apps[name] === 'undefined') {
		return callback(new Error('Cannot stop application that is not running.'));
	}

	var self = this, app = this.apps[name], keys = Object.keys(app.drones), results = [];

	function removeAndSave(key, next) {
		function onStop() {
			app.drones[key].monitor.removeListener('error', onErr);
			results.push(app.drones[key].process);
			self._updateRemoveProxy(app.drones[key], app.app, function() {
				self._remove(app, app.drones[key], cleanup, function() {
					next()
				});
			})
		}

		function onErr(err) {
			//
			// Remark should we handle errors here
			//
			haibu.emit(['drone', 'stop', 'error'], {
				key : key,
				message : err.message
			});
			app.drones[key].monitor.removeListener('stop', onStop);
			self._updateRemoveProxy(app.drones[key], app.app, function() {
				next()
			});
		}


		app.drones[key].monitor.once('stop', onStop);
		app.drones[key].monitor.once('error', onErr);
		try {
			app.drones[key].monitor.stop(true);
		} catch (err) {
			onErr(err);
		}
		haibu.emit(['drone', 'stop', 'success'], {
			key : key
		});
	}


	async.forEach(keys, removeAndSave, function() {
		callback(null, results);

	});
};
//
// ### function stop (name, callback)
// #### @name {string} Name of the application to stop (i.e. app.name).
// #### @cleanup {bool} (optional) Remove all autostart files (default=true).
// #### @callback {function} Continuation passed to respond to.
// Stops all drones with app.name === name managed by this instance
//
Drone.prototype.stopHash = function(hash, cleanup, callback) {
	if ( typeof cleanup !== 'boolean') {
		callback = cleanup;
		cleanup = true;
	}

	var self = this, results = [];

	var apps = this.apps;

	var appData;

	for (var name in apps) {
		var app = apps[name];
		var drones = app.drones;

		for (var uid in drones) {

			var drone = drones[uid]

			//console.log(drone.droneHash, hash)
			if (drone.droneHash === hash) {

				return (function(app, drone) {

					function onStop() {
						//console.log('onStop')
						drone.monitor.removeListener('error', onErr);
						results.push(drone.process);
						self._updateRemoveProxy(drone, app.app, function() {
							self._remove(app, drone, cleanup, function() {
								callback()
							});
						})
					}

					function onErr(err) {
						//
						// Remark should we handle errors here
						//
						//console.log('Remark should we handle errors here')
						haibu.emit(['drone', 'stop', 'error'], {
							key : drone.droneHash,
							message : err.message
						});
						drone.monitor.removeListener('stop', onStop);
						self._updateRemoveProxy(drone, app.app, function() {
							callback()
						});
					}


					drone.monitor.once('stop', onStop);
					drone.monitor.once('error', onErr);
					try {
						drone.monitor.stop(true);
					} catch (e) {
						onErr(err);
					}
					haibu.emit(['drone', 'stop', 'success'], {
						key : drone.droneHash
					});

				})(app, drone)
			}
		};
	}
	return callback(new Error('cant find that drone'));

};

//
// ### function stop (name, callback)
// #### @name {string} Name of the application to stop (i.e. app.name).
// #### @cleanup {bool} (optional) Remove all autostart files (default=true).
// #### @callback {function} Continuation passed to respond to.
// Stops all drones with app.name === name managed by this instance
//
Drone.prototype.stopOne = function(name, uid, cleanup, callback) {
	if ( typeof cleanup !== 'boolean') {
		callback = cleanup;
		cleanup = true;
	}

	if ( typeof this.apps[name] === 'undefined') {
		return callback(new Error('Cannot stop application that is not running.'));
	}

	var self = this, app = this.apps[name], keys = Object.keys(app.drones), results = [];

	function removeAndSave(key, next) {
		function onStop() {
			app.drones[key].monitor.removeListener('error', onErr);
			results.push(app.drones[key].process);
			self._updateRemoveProxy(app.drones[key], app.app, function() {
				self._remove(app, app.drones[key], cleanup, function() {
					next()
				});
			})
		}

		function onErr(err) {
			//
			// Remark should we handle errors here
			//
			haibu.emit(['drone', 'stop', 'error'], {
				key : key,
				message : err.message
			});
			app.drones[key].monitor.removeListener('stop', onStop);
			self._updateRemoveProxy(app.drones[key], app.app, function() {
				next()
			});
		}


		app.drones[key].monitor.once('stop', onStop);
		app.drones[key].monitor.once('error', onErr);
		try {
			app.drones[key].monitor.stop(true);
		} catch (e) {
			onErr(err);
		}
		haibu.emit(['drone', 'stop', 'success'], {
			key : key
		});
	}

	removeAndSave(uid, function() {
		callback(null, results);

	})
};

//
// ### function destroy (cleanup, callback)
// #### @cleanup {bool} Remove all autostart files.
// #### @callback {function} Continuation pased to respond to.
// Stops all drones managed by this instance
//
Drone.prototype.destroy = function(cleanup, callback) {
	var self = this;
	async.forEach(Object.keys(this.apps), function(name, callback) {
		self.stop(name, cleanup, callback);
	}, callback);
};

//
// ### function restart (name, callback)
// #### @name {string} Name of the application to restart (i.e. app.name).
// Restarts all drones with app = name managed by this instance and
// responds with the list of processes of new processes.
//
Drone.prototype.restart = function(name, callback) {
	if (!this.apps || !this.apps[name]) {
		return callback(new Error('Cannot restart application that is not running.'));
	}

	var self = this, record = this.apps[name], keys = Object.keys(record.drones), processes = [];

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
Drone.prototype.clean = function(app, callback) {
	if (!app || !app.user || !app.name) {
		return callback(new Error('Both `user` and `name` are required.'));
	}

	var self = this, appsDir = haibu.config.get('directories:apps');

	this.stop(app.name, function(err, result) {
		//
		// Ignore errors and continue cleaning
		//
		if (err) {
			haibu.emit('drone:clean:warning', err);
		}
		haibu.common.rmApp(appsDir, app, callback);
	});
};

//
// ### function cleanAll ()
// #### @callback {function} Continuation passed to respond to.
// Stops all potentially running applications and removes all source code
// and/or dependencies associated with them from this instance.
//
Drone.prototype.cleanAll = function(callback) {
	var self = this, appsDir = haibu.config.get('directories:apps'), autostartDir = haibu.config.get('directories:autostart');

	function forceStop(name, next) {
		self.stop(name, function(err) {
			//
			// Ignore errors here.
			//
			if (err) {
				haibu.emit('drone:cleanAll:warning', err);
			} else {
				haibu.emit('drone:cleanAll:success', name);
			}
			next();
		});
	}


	async.forEach(Object.keys(this.apps), forceStop, function cleanFiles() {
		//
		// Reset `this.apps`, then remove all files in the `apps` and
		// `autostart` dir(s).
		//
		self.apps = {};
		haibu.emit('drone:cleanAll:end');
		async.forEach([appsDir, autostartDir], haibu.common.rmApps, callback);
	});
};

//
// ### function update (name, callback)
// #### @name {string} Name of the application to update (i.e. app.name).
// Stops an application, Cleans all source and deps, Starts the pplication
//
Drone.prototype.update = function(app, callback) {
	if (!app || !this.apps || !this.apps[app.name]) {
		return callback(new Error('Cannot update application that is not running.'));
	}

	var self = this;
	this.clean(app, function(err) {
		self.start(app, function(err, result) {
			callback(err, result);
		});
	});
};

//
// ### function show (name)
// #### @name {string} Name of the application to show (i.e. app.name)
// Shows details for drone with `name` managed by this instance
//
Drone.prototype.showHash = function(hash) {
	var apps = this.apps;
	var app;
	var drones;
	var drone;
	var appData;
	for (var name in apps) {
		app = apps[name];
		drones = app.drones;
		for (var i = 0; i < drones.length; i++) {
			drone = drones[i]
			//console.log(drone)
			if (drone.hash === hash) {
				appData = {
					app : haibu.common.clone(app.app),
					drones : []
				};
				appData.app.repository = undefined;

				if (app.drones) {
					Object.keys(drones).forEach(function(uid) {
						appData.drones.push(self._formatRecord(app.drones[uid]));
					});
				}
				return appData
			}
		};
	}
	return undefined;
};

//
// ### function show (name)
// #### @name {string} Name of the application to show (i.e. app.name)
// Shows details for drone with `name` managed by this instance
//
Drone.prototype.show = function(name) {
	var self = this, app = this.apps[name], appData;

	if (!app) {
		return undefined;
	}

	appData = {
		app : haibu.common.clone(this.apps[name].app),
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
// ### function show (name)
// #### @name {string} Name of the application to show (i.e. app.name)
// Shows details for drone with `name` managed by this instance
//
Drone.prototype.stats = function(name) {
	var self = this, app = this.apps[name], appData;

	if (!app) {
		return undefined;
	}

	appData = []

	if (app.drones) {
		Object.keys(app.drones).forEach(function(uid) {
			var stats = {};
			//console.log(app.drones[uid])
			for (var key in app.drones[uid].process.stats) {
				stats[key] = app.drones[uid].process.stats[key]
			}
			stats.port = app.drones[uid].socket.port
			stats.name = name
			stats.hash = app.drones[uid].droneHash
			appData.push(stats);
		});
	}

	return appData;
}
//
// ### function list ()
// Lists details about all drones managed by this instance
//
Drone.prototype.list = function() {
	var self = this, allApps = {};

	Object.keys(this.apps).forEach(function(name) {
		allApps[name] = self.show(name);
	});

	return allApps;
};

Drone.prototype.running = function(appName) {
	var self = this, all = [];
	function cb(record) {

		if (!record)
			return;
		var app = record.app;

		for (var i = 0; i < record.drones.length; i++) {

			all.push(self.format(app, record.drones[i]));
		};

	}

	if (appName) {
		cb(self.show(appName))
	} else {
		haibu.common.each(this.list(), cb);
	}

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
		stats : drone.stats,
		hash : drone.hash,
		port : drone.port,
		haibuPort : drone.port
	};
};
Drone.prototype.scaleUp = function(appName, by, callback) {
	var record = this.apps[appName]
	var app = record.app
	var self = this
	function cb() {
		by--;
		if (by >= 1) {

			self.start(app, cb)
		} else {
			callback()
		}
	}


	this.start(app, cb)
};
Drone.prototype.scaleDown = function(appName, by, callback) {
	var record = this.apps[appName]
	var app = record.app
	var self = this

	function cb() {
		by--;
		if (by >= 1) {

			var uid = Object.keys(record.drones)[0]
			if (uid) {
				self.stopOne(appName, uid, cb)
			} else {
				cb()
			}
		} else {
			callback()
		}
	}

	var uid = Object.keys(record.drones)[0]
	if (uid) {
		this.stopOne(appName, uid, cb)
	} else {
		callback()
	}
};

//
// ### function _autostartFile (app)
// #### @app {Object} App to create the autostart file for.
// Returns filename for haibu's persistance (autostart) feature
//
Drone.prototype._autostartFile = function(app) {
	var appname = haibu.common.sanitizeAppname(app.name);
	return path.join(haibu.config.get('directories:autostart'), appname + '.json');
};

//
// ### function _autostartUpdate (action, app, drones, callback)
// #### @action {'start'|'stop'} Action to perform on the autostart file
// #### @app {Object} Application to update for autostart
// #### @drones {Object} Existing drones for the specified `app`.
// #### @callback {function} Continuation to respond to when complete.
// Performs the `action` for the autostart file on the specified `app`
// with the current `drones`.
//
Drone.prototype._autostartUpdate = function(action, app, drones, callback) {
	var _drones = app.drones, autostartFile = this._autostartFile(app), dronesCount = Object.keys(drones).length, appJson;

	app.drones = dronesCount;
	appJson = JSON.stringify(app);
	app.drones = _drones;

	// If app has no drones - remove autostart file
	if (action === 'remove' && dronesCount == 0) {
		return fs.unlink(autostartFile, callback);
	}

	function writeFile() {
		fs.writeFile(autostartFile, appJson, callback);
	}

	//
	// Attempt to read any  old `autostartFile`; if it
	// doesn't exist, overwrite it. Otherwise, update it
	// based on the `action` supplied.
	//
	fs.readFile(autostartFile, function(err, contents) {
		if (err) {
			return writeFile();
		}

		try {
			contents = JSON.parse(contents.toString());
		} catch (ex) {
			return writeFile();
		}

		//
		// Update file only if:
		// action == 'add': drones count less than in new app
		// action == 'remove': drones count greater than in new app
		//
		if (action === 'add' && contents.drones < app.drones || action === 'remove' && contents.drones > app.drones) {
			return writeFile();
		}

		callback();
	});
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
	this.apps[app.name] = this.apps[app.name] || {};

	var self = this, record = this.apps[app.name];

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

		app.domain = app.domain// + '.' + (haibu.config.get('user:domain') || 'free') + '.' + (haibu.config.get('proxy:domain') || 'localhost')

		record.app = app;
		record.drones = {};
	}

	var uid = drone.monitor.uid;
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

	this._autostartUpdate('add', app, record.drones, callback);
};

//
// ### function _remove (a, drone)
// #### @record {Object} Wrapped {app, drone} tuple set in _add
// #### @drone {Object} Drone metadata to remove from the specified application
// #### @cleanup {bool} (optional) Remove all autostart files (default = true).
// Removes the specified drone object from the bookkeeping of this instance.
//
Drone.prototype._remove = function(record, drone, cleanup, callback) {
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
		delete self.apps[record.app.name];
	}

	if (cleanup) {
		this._autostartUpdate('remove', record.app, record.drones, callback);
	} else {
		callback();
	}
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
Drone.prototype._formatRecord = function(record, app, package) {

	var response = haibu.common.clone(record.data);

	if (record.socket && record.socket.port) {
		response.port = record.socket.port;
		response.host = record.socket.host;
		response.hash = record.droneHash;
	}
	response.stats = record.process.stats;

	response.droneHash = record.droneHash;
	response.hiveHash = haibu.server.hash;
	if (package)
		response.package = package;

	response.host = response.host || this.host || 'localhost';

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
Drone.prototype._updateAddProxy = function(record, app, callback) {
	//console.log('_updateAddProxy')
	var proxy = this.proxy;
	var drone = {
		port : record.socket.port,
		host : record.socket.host,
		hash : record.hash
	}

	var _app = {
		domain : app.domain,
		user : app.user,
		name : app.name
	}

	proxy.addDrone(drone, _app, callback)
};
//
// ### function _formatRecord (record)
// #### @record {Object} Record to format.
// Formats the specified `record` based on the `record.socket`.
//
Drone.prototype._updateRemoveProxy = function(record, app, callback) {
	var proxy = this.proxy;
	var drone = {
		port : record.socket.port,
		host : record.socket.host,
		hash : record.hash
	}

	var _app = {
		domain : app.domain,
		user : app.user,
		name : app.name
	}
	proxy.destroyDrone(drone.hash, _app, callback)
};
