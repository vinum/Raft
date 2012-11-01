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
exports.createRouter = function(drone) {

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
		this.get('/list', raft.notAvailable);
		//
		// ### Proxy Resource
		// list proxy hosts
		//
		this.get('/list/:host', raft.notAvailable);
		//
		// ### Proxy Resource
		// list proxy hosts
		//
		this.get('/status', raft.notAvailable);
		//
		// ### Proxy Resource
		// list proxy hosts
		//
		this.get('/totext', raft.notAvailable);

		//
		// ### Proxy Resource
		// add host to proxy list
		//
		this.post('/add-app', raft.notAvailable);
		//
		// ### Proxy Resource
		// add host to proxy list
		//
		this.post('/destroy-app', raft.notAvailable);
		//
		// ### Proxy Resource
		// Remove host from proxy list
		//
		this.post('/add-drone', raft.notAvailable);
		//
		// ### Proxy Resource
		// Remove host from proxy list
		//
		this.post('/destroy-drone', raft.notAvailable);
	});

};
