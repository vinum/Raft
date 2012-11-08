/*
 * service.js: RESTful JSON-based web service for the drone module.
 *
 *
 */

var path = require('path');
var util = require('util');
var crypto = require('crypto');
var http = require('http');
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var tar = require('tar');

var raft = require('../../../raft');

exports.createRouter = function(drone) {
	function setSnapshot(userId, appId, stream, callback) {
		var time = Date.now()
		var dir = [userId, appId, time].join('-')
		var untarDir = path.join(path.join(__dirname, '..', '..', '..', '..', 'snapshot'), dir)
		var tarFile = path.join(__dirname, '..', '..', '..', '..', 'tar', dir + '.tar')

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

			raft.mongoose.SnapShot.count({
				username : userId,
				appname : appId
			}, function(err, count) {

				var snapshot = {
					package : require(untarDir + '/package'),
					tar : tarFile,
					dir : untarDir,
					ctime : time,
					hash : sha.digest('hex')

				}
				snapshot.package.version = snapshot.package.version + '-' + count
				var save = new raft.mongoose.SnapShot({
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

	//
	// ### Proxy Resource
	// Routes for RESTful access to the Drone resource.
	//
	raft.router.path('/drones', function() {

		this.get('/register/:host/:port/:zone', function(host, port, zone) {

			var res = this.res

			raft.mongoose.Hive.remove({
				host : host,
				port : port
			}, function() {

				new raft.mongoose.Hive({
					host : host,
					port : port,
					zone : zone,
					online : true
				}).save(function(err) {
					raft.sendResponse(res, 200, {
						message : 'Register new drone'
					});
				})
			})
		});

		this.get('/leave/:host/:port/:zone', function(host, port, zone) {
			var res = this.res
			raft.mongoose.Hive.remove({
				host : host,
				zone : zone,
				port : port
			}, function() {
				raft.sendResponse(res, 200, {
					message : 'Drone removed'
				});

			})
		});
		this.get('/register/list', function() {
			var res = this.res
			raft.mongoose.Hive.find({
				online : true
			}, function(err, result) {
				raft.sendResponse(res, 200, {
					result : result
				});

			})
		});

		//
		// ### List Drone Processes
		// `GET /drones/running` returns with a list of formatted
		// drone processes.
		//
		this.get('/running', raft.request(function(id) {
			var user = this.user;
			var res = this.res;
			var req = this.req;
			user.getApps(function(err, packages) {
				if (err) {
					return raft.error(err, res)
				}
				var apps = []
				if (!packages) {
					return raft.sendResponse(res, 200, {
						apps : apps
					});
				}
				function loop() {
					var package = packages.shift()
					if (!package) {
						return raft.sendResponse(res, 200, {
							apps : apps
						});
					}
					package._status(function(err, status) {
						if (err) {
							return raft.error(err, res)
						}
						apps.push(status)
						loop()
					})
				}

				loop()
			})
		}));
		//
		//
		// ### Show App
		// `GET /drones/:id` shows details of a drone managed by the
		// Drone associated with this router.
		//
		this.get('/:id/get', raft.request(function(id) {
			var user = this.user;
			var res = this.res;
			var req = this.req;
			user.getApp(id, false, function(err, package) {
				if (err) {
					return raft.error(err, res)
				}

				if (package === null) {
					return raft.error(new Error('No package found. Please start the app first'), res)
				}
				package._status(function(err, status) {
					if (err) {
						return raft.error(err, res)
					}

					raft.sendResponse(res, 200, status);
				})
			})
		}));
		//
		this.post('/:name/package', {
			stream : true
		}, raft.request(function(name) {

			var user = this.user;
			var res = this.res;
			var req = this.req;
			user._startPackage(name, req, res, function(err, package) {
				if (err) {
					return raft.error(err, res)
				}
				raft.sendResponse(res, 200, {
					started : true
				});
			})
		}));
		//
		// ### Start Drone for App
		// `POST /drone/:id/start` starts a new drone for app with :id on this server.
		//
		this.post('/:id/start', raft.request(function(id) {
			var user = this.user;
			var res = this.res;
			var req = this.req;
			user.getApp(id, req.body.start, function(err, package) {
				if (err) {
					return raft.error(err, res)
				}
				package._start(user, function(err) {
					if (err) {
						return raft.error(err, res)
					}

					raft.sendResponse(res, 200, {
						started : true
					});
				})
			})
		}));

		//
		// ### Stop Drone for App
		// `POST /drone/:id/stop` stops all drones for app with :id on this server.
		//
		this.post('/:id/stop', raft.request(function(id) {
			var user = this.user;
			var res = this.res;
			var req = this.req;

			user.getApp(id, false, function(err, package) {
				if (err) {
					return raft.error(err, res)
				}
				if (package === null) {
					return raft.error(new Error('No package found. Please start the app first'), res, 404)
				}
				package._stop(function(err) {
					if (err) {
						return raft.error(err, res)
					}

					raft.sendResponse(res, 200, {
						stoped : true
					});
				})
			})
		}));

		//
		// ### Restart Drone for App
		// `POST /drone/:id/restart` restarts all drones for app with :id on this server.
		//
		this.post('/:id/restart', raft.request(function(id) {
			var user = this.user;
			var res = this.res;
			var req = this.req;

			user.getApp(id, false, function(err, package) {
				if (err) {
					return raft.error(err, res)
				}
				if (package === null) {
					return raft.error(new Error('No package found. Please start the app first'), res, 404)
				}
				package._stop(function(err) {
					if (err) {
						return raft.error(err, res)
					}

					package._start(user, function(err) {
						if (err) {
							return raft.error(err, res)
						}

						raft.sendResponse(res, 200, {
							restarted : true
						});
					})
				})
			})
		}));

		//
		// ### Update Drone for App
		// `POST /drones/:id/update` cleans and starts
		// the app with :id on this server.
		//
		this.post('/:id/update', raft.notAvailable);
		//
		// ### Restart Drone for App
		// `POST /drone/:id/restart` restarts all drones for app with :id on this server.
		//
		this.get('/:id/stats', raft.request(function(id) {
			var user = this.user;
			var res = this.res;
			var req = this.req;

			user.getApp(id, false, function(err, package) {
				if (err) {
					return raft.error(err, res)
				}
				if (package === null) {
					return raft.error(new Error('No package found. Please start the app first'), res, 404)
				}
				package._toJsonStats(function(err, drones) {
					if (err) {
						return raft.error(err, res)
					}

					raft.sendResponse(res, 200, {
						drones : drones
					});

				})
			})
		}));

	});

};
