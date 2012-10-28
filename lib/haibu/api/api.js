/*
 * proxy.js: Responsible for proxying across all applications available to haibu.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var util = require('util')
var path = require('path')
var fs = require('fs')
var net = require('net')
var events = require('events')
var crypto = require('crypto')
var zlib = require('zlib')
var fstream = require("fstream")
var tar = require('tar')
var Packer = require("fstream-npm")
var qs = require('querystring')
var haibu = require('../../haibu');
var App = haibu.common.App;

var mongoose = haibu.mongoose;
var clients = haibu.clients;

//
// ### function Balancer (options)
// #### @options {Object} Options for this instance.

//
var Api = module.exports = function(options) {
	events.EventEmitter.call(this);
	this.clis = {};
	this.packages = {}
	this.drones = {}
	this.apps = {}
	this.hives = {}
	var self = this
	this.proxy = new haibu.clients.Proxy({
		host : '192.168.1.25',
		port : 9001
	});
	this.__defineGetter__("snapshotDir", function() {
		return path.join(__dirname, '..', '..', '..', 'snapshots');
	});
	this.__defineGetter__("tarDir", function() {
		return path.join(__dirname, '..', '..', '..', 'tar');
	});
};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(Api, events.EventEmitter);

Api.prototype.auth = function(request, callback) {

	var authorization = request.req.headers['authorization'];
	if (!authorization) {
		callback(new Error('No auth header'))
		return false;
	}

	var token = authorization.split(/\s+/).pop() || '';
	var auth = new Buffer(token, 'base64').toString();
	var parts = auth.split(/:/);
	var username = parts[0];
	var password = parts[1];

	haibu.mongoose.User.findOne({
		username : username
	}).run(function(err, user) {
		if (err) {
			return callback(err)
		} else if (!user) {
			callback(new Error('Wrong username'))

		} else {
			user.comparePassword(password, function(err, isMatch) {
				if (err) {
					return callback(err)
				} else if (!isMatch) {
					return callback(new Error('Wrong password'));
				}
				callback(null, user)
			})
		}
	})
}

Api.prototype.startApp = function(username, appname, snapshot, callback) {
	var hash = snapshot.hash
	var app = this.apps[hash]

	if (!app) {
		app = this.apps[hash] = new App(username, appname)
	}

	app.init(snapshot.package, callback)

}

Api.prototype.startDrone = function(username, appname, callback) {
	var app = this._getApp(username, appname)

	if (!app) {
		return callback(new Error('No app found'))
	}

	app.start(callback)

}

Api.prototype.stopApp = function(username, appname, snapshot, callback) {
	var hash = snapshot.hash
	var self = this
	if (!this.apps[hash]) {
		return callback(new Error('No app running please start it first'))

	}
	var app = this.apps[hash]

	app.stop(function(err) {
		delete self.apps[hash]
		callback()
	})
}

Api.prototype.status = function(username, appname, callback) {
	var app = this._getApp(username, appname)

	if (!app) {
		return callback(new Error('No app running please start it first'))
	}
	app.status(callback)
}

Api.prototype.stats = function(username, appname, callback) {
	var app = this._getApp(username, appname)

	if (!app) {
		return callback(new Error('No app running please start it first'))
	}

	app.stats(callback)
}

Api.prototype.running = function(callback) {
	var running = {}
	var keys = Object.keys(haibu.api.hives)
	function loop(key, err, data) {
		if (data) {
			running[key] = data
		}

		var key = keys.shift()

		if (!key) {
			return callback(null, running)
		}

		var hive = haibu.api.hives[key]

		hive.running(loop.bind(null, key))
	}

	loop()
}

Api.prototype._getApp = function(username, appname) {
	var apps = this.apps

	var hashs = Object.keys(apps)
	for (var i = 0, j = hashs.length; i < j; i++) {
		var app = apps[hashs[i]]

		if (app.username == username && app.appname == appname) {

			return app
		}
	};
	return
}
/*******
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */

Api.prototype.mongooseError = function(err, res) {
	err.blame = {
		type : 'system',
		message : 'MongoDB Error: ' + err.message
	}
	haibu.emit('error:service', 'error', err);
	haibu.sendResponse(res, 500, {
		error : err
	});
}
Api.prototype.error = function(err, res) {
	err.blame = {
		type : 'system',
		message : 'Error.'
	}
	haibu.emit('error:service', 'error', err);
	haibu.sendResponse(res, 500, {
		error : err
	});
}

Api.prototype.notAvailable = function() {
	haibu.sendResponse(this.res, 404, {
		message : "Method not available."
	});
}

Api.prototype.availableName = function(username, appname, callback) {
	mongoose.Package.findOne({
		name : appname,
		user : username
	}).run(function(err, package) {
		if (err) {
			return callback(err)
		}
		if (package) {
			callback(null, {
				available : false
			})
		} else {
			callback(null, {
				available : true
			})
		}
	})
}

Api.prototype.getPackage = function(options, callback) {
	var self = this
	mongoose.Package.findOne(options).run(callback)
}

Api.prototype.getPackages = function(options, callback) {
	var self = this
	mongoose.Package.find(options).run(callback)
}

Api.prototype.setPackage = function(snapshot, callback) {

	new mongoose.Package(snapshot.package).save(callback)
}

Api.prototype.killDrones = function killDrones(drones, cb) {

	var self = this
	this.connectDrone(drones, function(cli, drone, next) {

		cli.stopHash(drone.hash, function(err) {
			if (err) {
				//return cb(err)
			}
			console.log('cli.stopHash')
			self.removeDrone(drone.hash, function(err) {
				if (err) {
					//return cb(err)
				}
				next()

			})
		})
	}, function() {
		cb()
	})
}

Api.prototype.request = function(fn) {
	var self = this
	return function(appname) {
		if (!appname) {
			appname = 'false'
		}
		var request = this;
		var args = arguments;
		self.auth(request, function(err, user) {
			if (err) {
				self.error(err, request.res)
			} else {
				self.getPackage({
					user : user.username,
					name : appname
				}, function(err, package) {
					if (err) {
						self.error(err, request.res)
					} else {

						request.user = user
						request.package = package
						fn.apply(request, args)

					}
				})
			}
		})
	}
}

Api.prototype.getSnapshots = function(username, appname, callback) {
	mongoose.SnapShot.find({
		username : username,
		appname : appname
	}).run(callback)

}

Api.prototype.setSnapshot = function(userId, appId, stream, callback) {
	var time = Date.now()
	var dir = [userId, appId, time].join('-')
	var untarDir = path.join(this.snapshotDir, dir)
	var tarFile = path.join(this.tarDir, dir + '.tar')

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

			mongoose.SnapShot.count({
				username : userId,
				appname : appId
			}, function(err, count) {

				pkg.user = userId;
				pkg.name = appId;
				var snapshot = {
					package : pkg,
					tar : tarFile,
					dir : untarDir,
					ctime : time,
					hash : sha.digest('hex')

				}
				snapshot.package.version = snapshot.package.version + '-' + count
				var save = new mongoose.SnapShot({
					username : userId,
					appname : appId,
					ctime : time,
					tar : tarFile,
					dir : untarDir,
					version : snapshot.package.version,
					hash : snapshot.hash
				});

				save.save(function(err) {
					if (err) {
						callback(err)
					} else {
						callback(null, snapshot)
					}
				})
			})
		});
	}

	//
	// Create a temporary directory to untar the streamed data
	// into and pipe the stream data to a child `tar` process.
	//
	fs.mkdir(untarDir, '0755', function(err) {
		stream.pipe(fs.createWriteStream(tarFile, {
			flags : 'w',
			encoding : null,
			mode : 0666
		}))

		stream.pipe(zlib.Unzip()).on("error", callback).pipe(tar.Extract({
			type : "Directory",
			path : untarDir,
			strip : 1
		})).on("error", onError).on("end", onEnd)
	});

}