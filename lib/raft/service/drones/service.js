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
	//
	// ### Proxy Resource
	// Routes for RESTful access to the Drone resource.
	//
	raft.router.path('/drones', function() {

		this.get('/register/:host/:port/:zone', function(host, port, zone) {
			var res = this.res;
			raft.mongoose.Hive.remove({
				host : host,
				port : port
			}, function(err) {
				if (err) {
					return raft.error(err, res)
				}
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
			}, function(err) {
				if (err) {
					return raft.error(err, res)
				}
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
				if (err) {
					return raft.error(err, res)
				}
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

			var limit = req.query && req.query.limit ? req.query.limit : 35
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
					package._status(limit, function(err, status) {
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
			var limit = req.query && req.query.limit ? req.query.limit : 35
			user.getApp(id, false, function(err, package) {
				if (err) {
					return raft.error(err, res)
				}

				if (package === null) {
					return raft.error(new Error('No package found. Please start the app first'), res)
				}
				package._status(limit, function(err, status) {
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
			function cb(err, package) {
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
			}

			if (!req.body.start) {
				user.getApp(id, false, cb)
			} else {
				user.getApp(id, req.body.start, cb)
			}
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
		//
		// ### Show App
		// `GET /drones/:id` shows details of a drone managed by the
		// Drone associated with this router.
		//
		this.post('/:id/clean', raft.request(function(id) {
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
				package.cleanApp(function(err) {
					if (err) {
						return raft.error(err, res)
					}

					raft.sendResponse(res, 200, {
						clean : true
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
		//
		//
		this.get('/:id/log', raft.request(function(id) {
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

				package._logs(function(err, result) {
					if (err) {
						return raft.error(err, res)
					}

					raft.sendResponse(res, 200, result);
				})
			})
		}));

	});

};
