/*
 * service.js: RESTful JSON-based web service for the drone module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var path = require('path');
var util = require('util');
var haibu = require('../../haibu');

//
// ### function createRouter (dron, logger)
// #### @drone {Drone} Instance of the Drone resource to use in this router.
//
// Creates the Journey router which represents the `haibu` Drone webservice.
//
exports.createRouter = function(drone) {

	//
	// ### Proxy Resource
	// Routes for RESTful access to the Drone resource.
	//
	haibu.router.path('/proxy', function() {
		//
		// ### Proxy Resource
		// landing page
		//
		this.get('/', function() {
			haibu.sendResponse(this.res, 400, {
				message : 'No info specified'
			});
		});
		//
		// ### Proxy Resource
		// list proxy hosts
		//
		this.get('/list', function() {
			haibu.sendResponse(this.res, 200, {
				hosts : haibu.proxy.balancer.domains
			});
		});
		//
		// ### Proxy Resource
		// list proxy hosts
		//
		this.get('/list/:host', function(host) {
			haibu.sendResponse(this.res, 200, {
				hosts : haibu.proxy.balancer.domains[host] || {}
			});
		});
		//
		// ### Proxy Resource
		// list proxy hosts
		//
		this.get('/status', function() {
			haibu.sendResponse(this.res, 200, {
				stats : haibu.cluster.status()
			});
		});
		//
		// ### Proxy Resource
		// list proxy hosts
		//
		this.get('/totext', function() {
			this.res.end(util.inspect(haibu.proxy, false, 50))
		});

		//
		// ### Proxy Resource
		// add host to proxy list
		//
		this.post('/add-app', function(id) {
			var res = this.res;
			var options = this.req.body
			if (options.domain && options.host && options.port) {
				haibu.proxy.addApp(options)
				haibu.sendResponse(res, 200, {
					added : true
				});
			} else {
				haibu.sendResponse(this.res, 400, {
					message : 'missing options missing',
					added : false
				});
			}
		});
		//
		// ### Proxy Resource
		// add host to proxy list
		//
		this.post('/destroy-app', function(id) {
			var res = this.res;
			var options = this.req.body
			if (options.domain && options.host && options.port) {
				haibu.proxy.destroyApp(options)
				haibu.sendResponse(res, 200, {
					added : true
				});
			} else {
				haibu.sendResponse(this.res, 400, {
					message : 'missing options missing',
					added : false
				});
			}
		});
		//
		// ### Proxy Resource
		// Remove host from proxy list
		//
		this.post('/add-drone', function(id) {
			var res = this.res;
			var options = this.req.body

			if (options.drone && options.app) {
				haibu.proxy.addDrone(options.drone, options.app)
				haibu.sendResponse(res, 200, {
					removed : true
				});
			} else {
				haibu.sendResponse(this.res, 400, {
					message : 'missing options missing',
					removed : false
				});
			}
		});
		//
		// ### Proxy Resource
		// Remove host from proxy list
		//
		this.post('/destroy-drone', function(id) {
			var res = this.res;
			var options = this.req.body
			//console.log(options)
			if (options.hash && options.app) {
				haibu.proxy.destroyDrone(options.hash, options.app)
				haibu.sendResponse(res, 200, {
					removed : true
				});
			} else {
				haibu.sendResponse(this.res, 400, {
					message : 'missing options missing',
					removed : false
				});
			}
		});
	});

};
