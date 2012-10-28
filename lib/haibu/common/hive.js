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
	// ### Drones Resource
	// Routes for RESTful access to the Drone resource.
	//
	haibu.router.path('/hive', function() {
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

		this.get('/drone/:hash', function(hash) {
			
			haibu.sendResponse(res, 200, data);
		})
	});
};
