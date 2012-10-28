/*
 * service.js: RESTful JSON-based web service for the drone module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var haibu = require('../../haibu');
var util = require('util');

//
// ### function createRouter (dron, logger)
// #### @drone {Drone} Instance of the Drone resource to use in this router.
//
// Creates the Journey router which represents the `haibu` Drone webservice.
//
exports.createRouter = function(drone) {
	//
	// TODO (indexzero): Setup token-based auth for Drone API servers
	//
	haibu.router.strict = false;
	if (false)
		haibu.router.every.before = function(val) {

			var next = arguments[arguments.length - 1]

			var authorization = this.req.headers['authorization'];
			if (!authorization) {
				haibu.sendResponse(this.res, 403, {
					message : 'No auth header'
				});
				return false;
			}

			var token = authorization.split(/\s+/).pop() || '';
			var auth = new Buffer(token, 'base64').toString();
			var parts = auth.split(/:/);
			var username = parts[0];
			var password = parts[1];

			if (username === 'bob' && password === 'pass') {

				this.req.username = username;

				next()
				return true;
			}

			haibu.sendResponse(this.res, 403, {
				message : 'Wrong user auth'
			});
			return false;
		};

	function preventTimeout(next) {
		next = arguments[arguments.length - 1];
		this.req.connection.setTimeout(haibu.config.get('service:timeout') || 60 * 1000 * 15);
		next();
	}


	haibu.router.every.before = haibu.router.every.before ? [haibu.router.every.before] : [];
	haibu.router.every.before.push(preventTimeout);

	//
	// ### Default Root
	// `GET /` responds with default JSON message
	//
	haibu.router.get('/', function() {
		haibu.sendResponse(this.res, 400, {
			message : 'No drones specified'
		});
	});

	//
	// ### Version Binding
	// `GET /version` returns the version string for this webservice
	//
	haibu.router.get('/version', function() {
		haibu.sendResponse(this.res, 200, {
			version : 'haibu ' + haibu.version
		});
	});

	//
	// ### Deploys App
	// 'POST /deploy/:userid/:appid'
	//
	haibu.router.post('/deploy/:userid/:appid', {
		stream : true
	}, function(userId, appId) {
		var res = this.res;
		drone.deploy(userId, appId, this.req, function(err, result) {
			if (err) {
				haibu.emit(['error', 'service'], 'error', err);
				return haibu.sendResponse(res, 500, {
					error : err
				});
			}
			haibu.sendResponse(res, 200, {
				drone : result
			});
		})
	});

	//
	// ### Deploys App
	// 'POST /deploy/:userid/:appid'
	//
	haibu.router.post('/package/:userid/:appid', {
		stream : true
	}, function(userId, appId) {
		var res = this.res;
		drone.package(userId, appId, this.req, function(err, result) {
			if (err) {
				haibu.emit(['error', 'service'], 'error', err);
				return haibu.sendResponse(res, 500, {
					error : err
				});
			}
			haibu.sendResponse(res, 200, {
				drone : result
			});
		})
	});

	//
	// ### Drones Resource
	// Routes for RESTful access to the Drone resource.
	//
	haibu.router.path('/drones', function() {
		//
		// ### List Apps
		// `GET /drones` returns list of all drones managed by the
		// Drone associated with this router.
		//
		this.get(function() {
			var res = this.res, data = {
				drones : drone.list()
			};

			haibu.sendResponse(res, 200, data);
		});

		//
		// ### List Drone Processes
		// `GET /drones/running` returns with a list of formatted
		// drone processes.
		//
		this.get('/running', function() {
			haibu.sendResponse(this.res, 200, drone.running());
		});
		//
		// ### List Drone Processes
		// `GET /drones/running` returns with a list of formatted
		// drone processes.
		//
		this.get('/totext', function() {
			this.res.end(util.inspect(drone, false, 50))
		});
		//
		// ### List Drone Processes
		// `GET /drones/running` returns with a list of formatted
		// drone processes.
		//
		this.get('/:id/hash/:hash', function(id, hash) {
			var data = drone.show(id);
			if ( typeof data === 'undefined') {
				haibu.sendResponse(this.res, 404, {
					message : 'No drone(s) found for application ' + id
				});
			} else {
				for (var i = 0; i < data.drones.length; i++) {
					if (data.drones[i].hash = hash) {

						return haibu.sendResponse(this.res, 200, data.drones[i]);
					}
				};
			}
			haibu.sendResponse(this.res, 404, {
				message : 'No drone(s) found for application ' + id
			});
		});

		//
		// ### Show App
		// `GET /drones/:id` shows details of a drone managed by the
		// Drone associated with this router.
		//
		this.get('/:id', function(id) {
			var data = drone.show(id);
			if ( typeof data === 'undefined') {
				haibu.sendResponse(this.res, 404, {
					message : 'No drone(s) found for application ' + id
				});
				
			} else {
				haibu.sendResponse(this.res, 200, data);
			}
		});

		//
		// ### Start Drone for App
		// `POST /drone/:id/start` starts a new drone for app with :id on this server.
		//
		this.post('/:id/start', function(id) {
			var res = this.res;

			drone.start(this.req.body.start, function(err, result) {
				if (err) {
					haibu.emit(['error', 'service'], 'error', err);
					return haibu.sendResponse(res, 500, {
						error : err
					});
				}

				haibu.sendResponse(res, 200, {
					drone : result
				});
			});
		});

		//
		// ### Stop Drone for App
		// `POST /drone/:id/stop` stops all drones for app with :id on this server.
		//
		this.post('/:id/stop', function(id) {
			var res = this.res;

			drone.stop(this.req.body.stop.name, function(err, result) {
				if (err || !result) {
					err = err || new Error('Unknown error from drone.');
					haibu.emit('error:service', 'error', err);
					return haibu.sendResponse(res, 500, {
						error : err
					});
				}

				haibu.sendResponse(res, 200, {});
			});
		});

		//
		// ### Stop Drone for App
		// `POST /drone/:id/stop` stops all drones for app with :id on this server.
		//
		this.post('/:hash/stop/hash', function(hash) {
			var res = this.res;

			drone.stopHash(hash, function(err, result) {
				if (err || !result) {
					err = err || new Error('Unknown error from drone.');
					haibu.emit('error:service', 'error', err);
					return haibu.sendResponse(res, 500, {
						error : err
					});
				}

				haibu.sendResponse(res, 200, {});
			});
		});

		//
		// ### Restart Drone for App
		// `POST /drone/:id/restart` restarts all drones for app with :id on this server.
		//
		this.post('/:id/restart', function(id) {
			var res = this.res;

			drone.restart(this.req.body.restart.name, function(err, drones) {
				if (err) {
					haibu.emit(['error', 'service'], 'error', err);
					return haibu.sendResponse(res, 500, {
						error : err
					});
				}

				haibu.sendResponse(res, 200, {
					drones : drones
				});
			});
		});

		//
		// ### Clean Drone for App
		// `POST /drones/:id/clean` removes all of the dependencies and source files for
		// the app with :id on this server.
		//
		this.post('/:id/clean', function(id) {
			var res = this.res;

			drone.clean(this.req.body, function(err, drones) {
				if (err) {
					haibu.emit('error:service', 'error', err);
					return haibu.sendResponse(res, 500, {
						error : err
					});
				}

				haibu.sendResponse(res, 200, {
					clean : true
				});
			});
		});

		//
		// ### Update Drone for App
		// `POST /drones/:id/update` cleans and starts
		// the app with :id on this server.
		//
		this.post('/:id/update', function(id) {
			var res = this.res;

			drone.update(this.req.body, function(err, drones) {
				if (err) {
					haibu.emit('error:service', 'error', err);
					return haibu.sendResponse(res, 500, {
						error : err
					});
				}

				haibu.sendResponse(res, 200, {
					update : true
				});
			});
		});

		//
		// ### Clean All Drones
		// `POST /drones/cleanall` removes all of the dependencies and source files for
		// all apps on this server.
		//
		this.post('/cleanall', function(response) {
			var res = this.res;

			drone.cleanAll(function(err, drones) {
				if (err) {
					haibu.emit('error:service', 'error', err);
					return haibu.sendResponse(res, 500, {
						error : err
					});
				}

				haibu.sendResponse(res, 200, {
					clean : true
				});
			});
		});

		//
		// ### Clean All Drones
		// `POST /drones/cleanall` removes all of the dependencies and source files for
		// all apps on this server.
		//
		this.get('/:id/status', function(id) {
			var res = this.res;

			haibu.sendResponse(res, 200, {
				status : drone.show(id)
			});

		});
		//
		// ### Clean All Drones
		// `POST /drones/cleanall` removes all of the dependencies and source files for
		// all apps on this server.
		//
		this.get('/:id/stats', function(id) {
			var res = this.res;

			haibu.sendResponse(res, 200, {
				stats : drone.stats(id)
			});

		});

		//
		// ### Clean All Drones
		// `POST /drones/cleanall` removes all of the dependencies and source files for
		// all apps on this server.
		//
		this.get('/:id/:hash/status', function(id, hash) {
			var res = this.res;

			haibu.sendResponse(res, 200, {
				status : drone.showHash(hash)
			});

		});
		//
		// ### Clean All Drones
		// `POST /drones/cleanall` removes all of the dependencies and source files for
		// all apps on this server.
		//
		this.get('/:id/:hash/stats', function(id, hash) {
			var res = this.res;

			haibu.sendResponse(res, 200, {
				stats : drone.stats(id)
			});

		});

	});
	//
	// ### Drones Resource
	// Routes for RESTful access to the Drone resource.
	//
	haibu.router.path('/scale', function() {
		//
		// ### List Apps
		// `GET /drones` returns list of all drones managed by the
		// Drone associated with this router.
		//
		this.get(function() {
			var res = this.res, data = {
				drones : drone.list()
			};

			haibu.sendResponse(res, 200, data);
		});

		this.get('/up/:appname', function(appname) {
			var res = this.res;
			var req = this.req;
			var app = drone.list()[appname]
			if (!app) {
				var err = new Error('No such app found')
				haibu.emit('error:service', 'error', err);
				return haibu.sendResponse(res, 500, {
					error : err
				});
			}

			if (!app.drones.length) {
				var err = new Error('No drones found for app')
				haibu.emit('error:service', 'error', err);
				return haibu.sendResponse(res, 500, {
					error : err
				});
			}

			var pid = app.drones[0].pid

			haibu.drone.scaler.up(pid, function() {
				haibu.sendResponse(res, 200, {
					scaled : true,
					drones : drone.running()
				});
			})

			haibu.sendResponse(res, 200, {
				scaled : false,
				drones : drone.running()
			});
		});

		this.get('/down/:appname', function(appname) {
			var res = this.res;
			var req = this.req;
			var app = drone.list()[appname]
			if (!app) {
				var err = new Error('No such app found')
				haibu.emit('error:service', 'error', err);
				return haibu.sendResponse(res, 500, {
					error : err
				});
			}

			if (!app.drones.length) {
				var err = new Error('No drones found for app')
				haibu.emit('error:service', 'error', err);
				return haibu.sendResponse(res, 500, {
					error : err
				});
			}

			var pid = app.drones[0].pid

			return haibu.drone.scaler.down(pid, function() {
				haibu.sendResponse(res, 200, {
					scaled : true,
					drones : drone.running()
				});
			})
		});
	});
};
