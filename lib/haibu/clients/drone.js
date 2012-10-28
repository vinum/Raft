var Client = require('./client')
var util = require('util');
var http = require('http');

var zlib = require('zlib')
var fstream = require("fstream")
var tar = require('tar')
var Packer = require("fstream-npm")
var exec = require('child_process').exec
//
// ### function Drone (options)
// #### @options {Object} Options to use for this instance.
// Constructor function for the Client to the Haibu server.
//
var Drone = module.exports = function(options) {
	Client.call(this, options);
};
util.inherits(Drone, Client);

//
// ### function get (name, callback)
// #### @name {string} name of the application to get from the Haibu server.
// #### @callback {function} Continuation to pass control back to when complete.
// Gets the data about all the drones for the app with the specified `name`
// on the remote Haibu server.
//
Drone.prototype.get = function(app, callback) {
	this._request('/drones/' + app.name, callback, function(err, result) {
		if (err) {
			return callback(err)
		}
		callback(null, result);
	});
};
//
// ### function get (name, callback)
// #### @name {string} name of the application to get from the Haibu server.
// #### @callback {function} Continuation to pass control back to when complete.
// Gets the data about all the drones for the app with the specified `name`
// on the remote Haibu server.
//
Drone.prototype.stats = function(appname, callback) {
	this._request('/drones/' + appname + '/stats', callback, callback);
};
//
// ### function get (name, callback)
// #### @name {string} name of the application to get from the Haibu server.
// #### @callback {function} Continuation to pass control back to when complete.
// Gets the data about all the drones for the app with the specified `name`
// on the remote Haibu server.
//
Drone.prototype.status = function(appname, callback) {
	this._request('/drones/' + appname + '/status', callback, function(err, result) {
		if (err) {
			return callback(err)
		}
		callback(null, result);
	});
};

//
// ### function start (app, callback)
// #### @app {Object} Application to start on the Haibu server.
// #### @callback {function} Continuation to pass control back to when complete.
// Starts the the app with the specified `app.name` on the remote Haibu server.
//
Drone.prototype.start = function(app, callback) {
	this._request({
		method : 'POST',
		path : '/drones/' + app.name + '/start',
		body : {
			start : app
		}
	}, callback, function(err, result) {
		if (err) {
			return callback(err)
		}
		callback(null, result);

	});
};

//
// ### function stop (name, callback)
// #### @name {string} Name of the application to stop on the Haibu server.
// #### @callback {function} Continuation to pass control back to when complete.
// Stops the application with the specified `name` on the remote Haibu server.
//
Drone.prototype.stop = function(app, callback) {
	this._request({
		method : 'POST',
		path : '/drones/' + app.name + '/stop',
		body : {
			stop : {
				name : app.name
			}
		}
	}, callback, function(err, result) {
		if (err) {
			return callback(err)
		}
		callback(null, null);

	});
};

//
// ### function stop (name, callback)
// #### @name {string} Name of the application to stop on the Haibu server.
// #### @callback {function} Continuation to pass control back to when complete.
// Stops the application with the specified `name` on the remote Haibu server.
//
Drone.prototype.stopOne = function(hash, callback) {
	this._request({
		method : 'POST',
		path : '/drones/' + hash + '/stop/hash',
		body : {

		}
	}, callback, function(err, result) {
		if (err) {
			return callback(err)
		}
		callback(null, null);

	});
};
//
// ### function stop (name, callback)
// #### @name {string} Name of the application to stop on the Haibu server.
// #### @callback {function} Continuation to pass control back to when complete.
// Stops the application with the specified `name` on the remote Haibu server.
//
Drone.prototype.stopHash = function(hash, callback) {
	this._request({
		method : 'POST',
		path : '/drones/' + hash + '/stop/hash',
		body : {

		}
	}, callback, function(err, result) {
		if (err) {
			return callback(err)
		}
		callback(null, null);

	});
};

//
// ### function restart (name, callback)
// #### @name {string} Name of the application to restart on the Haibu server.
// #### @callback {function} Continuation to pass control back to when complete.
// Restarts the application with the specified :id on the remote Haibu server.
//
Drone.prototype.restart = function(name, callback) {
	this._request({
		method : 'POST',
		path : '/drones/' + name + '/restart',
		body : {
			restart : {
				name : name
			}
		}
	}, callback, function(err, result) {
		if (err) {
			return callback(err)
		}
		callback(null, result.drones);

	});
};

//
// ### function clean (app, callback)
// #### @app {Object} Application to clean on the Haibu server.
// #### @callback {function} Continuation to pass control back to when complete.
// Attempts to clean the specified `app` from the Haibu server targeted by this instance.
//
Drone.prototype.clean = function(app, callback) {
	this._request({
		method : 'POST',
		path : '/drones/' + app.name + '/clean',
		body : app
	}, callback, function(err, result) {
		callback(null, result);
	});
};

//
// ### function cleanAll (app, callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Attempts to clean the all applications from the Haibu server targeted by this instance.
//
Drone.prototype.cleanAll = function(callback) {
	this._request({
		method : 'POST',
		path : '/drones/cleanall'
	}, callback, function(err) {
		callback();
	});
};
Drone.prototype.destroy = function(app, callback) {
	var self = this
	self.get(app.name, function(err, data) {
		if (err) {
			return callback(err)
		}
		if (!err && data.app) {
			return cli.stop(app.name, function(err, data) {
				if (err) {
					return callback(err)
				}
				self.clean(app, callback)
			})
		}
		callback()

	});
}
Drone.prototype.showHash = function(app, hash, callback) {
	this._request({
		method : 'GET',
		path : '/drones/' + app.name + '/hash/' + hash
	}, callback, callback);
}

Drone.prototype.deploy = function(app, appPath, callback) {
	var self = this
	self.get(app, function(err, data) {
		if (err) {
			return callback(err)
		}
		if (!err && data.app) {
			return self.stop(app, function(err, data) {
				if (err) {
					return callback(err)
				}
				self.clean(app, function(err, data) {
					if (err) {
						return callback(err)
					}
					self.package(app, appPath, callback)
				})
			})
		}
		self.package(app, appPath, callback)

	});
};

Drone.prototype.drone = function(app, appPath, callback) {

	this.package(app, appPath, callback)
};

Drone.prototype.stream = function(app, appPath, callback) {

	this.package(app, appPath, callback)
};

Drone.prototype.package = function(app, appPath, callback) {
	var self = this
	var options = {
		host : this.config.host,
		port : this.config.port,
		path : '/package/' + app.user + '/' + app.name,
		method : 'POST',
		headers : {}
	};
	options.headers['Authorization'] = this.config.Authorization;
	var req = http.request(options, function(res) {
		res.setEncoding('utf8');
		var body = ''
		res.on('data', function(chunk) {
			body += chunk
		});
		res.on('end', function() {
			callback(null, JSON.parse(body))
		});
	});

	req.on('error', callback);

	if ( typeof appPath !== 'string') {
		appPath.pipe(req)
	} else {
		var a = new Packer({
			path : appPath,
			type : "Directory",
			isDirectory : true
		}).pipe(tar.Pack({
			noProprietary : true
		})).on("error", callback).pipe(zlib.Gzip()).on("error", callback).pipe(req)
	}
}
Drone.prototype.running = function(callback) {
	this._request({
		method : 'GET',
		path : '/drones/running'
	}, callback, function(res, result) {
		callback(null, result);
	});
};
Drone.prototype.scaleUp = function(app, by, callback) {
	this._request({
		method : 'POST',
		body : {
			user : app.user,
			name : app.name,
			by : app.by
		},
		path : '/scale/up'
	}, callback, function(res, result) {
		if (err) {
			return callback(err)
		}
		callback(null, result);
	});
};
Drone.prototype.scaleDown = function(app, by, callback) {
	this._request({
		method : 'POST',
		body : {
			user : app.user,
			name : app.name,
			by : app.by
		},
		path : '/scale/down'
	}, callback, function(res, result) {
		if (err) {
			return callback(err)
		}
		callback(null, result);
	});
};
