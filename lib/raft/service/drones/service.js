/*
 * service.js: RESTful JSON-based web service for the drone module.
 *
 *
 */

var path = require('path');
var util = require('util');
var raft = require('../../../raft');

exports.createRouter = function(drone) {

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
		this.get('/running', raft.notAvailable);

		//
		// ### Show App
		// `GET /drones/:id` shows details of a drone managed by the
		// Drone associated with this router.
		//
		this.get('/:id', raft.request(function(id) {
			var user = this.user;
			var res = this.res;
			var req = this.req;
			console.log(req.body)
			user.getApp(id, false, function(err, package) {
				if (err) {
					return raft.error(err, res)
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
		// ### Start Drone for App
		// `POST /drone/:id/start` starts a new drone for app with :id on this server.
		//
		this.post('/:id/start', raft.request(function(id) {
			var user = this.user;
			var res = this.res;
			var req = this.req;
			console.log(req.body)
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
