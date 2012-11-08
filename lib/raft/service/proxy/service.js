/*
 * service.js: RESTful JSON-based web service for the drone module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var path = require('path');
var util = require('util');
var raft = require('../../../raft');

//
// ### function createRouter (dron, logger)
// #### @drone {Drone} Instance of the Drone resource to use in this router.
//
// Creates the Journey router which represents the `raft` Drone webservice.
//
exports.createRouter = function(proxy) {

	//
	// ### Proxy Resource
	// Routes for RESTful access to the Drone resource.
	//
	raft.router.path('/proxy', function() {
		//
		// ### Proxy Resource
		// landing page
		//
		this.get(function() {
			raft.sendResponse(this.res, 400, {
				message : 'No info specified'
			});
		});
		//
		// ### Proxy Resource
		// list proxy hosts
		//
		this.get('/list', raft.system(function() {
			raft.sendResponse(this.res, 200, {
				domains : raft.service.proxy.balancer.domains
			});
		}));
		//
		// ### Proxy Resource
		// list proxy hosts
		//
		this.get('/list/:host', raft.system(function(host) {
			raft.sendResponse(this.res, 200, {
				domains : raft.service.proxy.balancer.domains[host]
			});
		}));
		//
		// ### Proxy Resource
		// list proxy hosts
		//
		this.get('/status/:domain', raft.request(function(domain) {
			var user = this.user;
			var res = this.res;
			var req = this.req;

			raft.mongoose.Package.count({
				user : user.username,
				domain : domain
			}, function(err, count) {
				if (err) {
					return raft.error(err, res)
				}
				if (count === 0) {
					return raft.error(new Error('Domain is not linked with user'), res)
				}
				raft.mongoose.ProxyStats.find({
					domain : domain
				}).limit(35).sort('-time').exec(function(err, stats) {
					if (err) {
						return raft.error(err, res)
					}
					raft.sendResponse(res, 200, {
						stats : stats
					});
				})
			})
		}));
		//
		// ### Proxy Resource
		// list proxy hosts
		//
		this.get('/totext', raft.notAvailable);

		//
		// ### Proxy Resource
		// add host to proxy list
		//
		this.post('/add-app', raft.system(function() {
			var user = this.user;
			var res = this.res;
			var req = this.req;
			var app = req.body;

			proxy.addApp(app)
			raft.sendResponse(res, 200, {
				message : 'App added'
			});

		}));
		//
		// ### Proxy Resource
		// add host to proxy list
		//
		this.post('/destroy-app', raft.system(function() {
			var user = this.user;
			var res = this.res;
			var req = this.req;
			var app = req.body;
			proxy.destroyApp(app)
			raft.sendResponse(res, 200, {
				message : 'App removed'
			});
		}));
		//
		// ### Proxy Resource
		// Remove host from proxy list
		//
		this.post('/add-drone', raft.system(function() {
			var user = this.user;
			var res = this.res;
			var req = this.req;
			var app = req.body.app;
			var drone = req.body.drone;
			console.log(req.body)
			proxy.addDrone(drone, app)
			raft.sendResponse(res, 200, {
				message : 'App added'
			});
		}));
		//
		// ### Proxy Resource
		// Remove host from proxy list
		//
		this.post('/destroy-drone', raft.system(function() {
			var user = this.user;
			var res = this.res;
			var req = this.req;
			var app = req.body.app;
			var drone = req.body.drone;
			proxy.destroyDrone(drone, app)
			raft.sendResponse(res, 200, {
				message : 'App added'
			});
		}));
	});

};
