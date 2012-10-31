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
	raft.router.path('/application', function() {

		this.get('/:appname', raft.request(function(appname) {
			var request = this;
			var user = this.user;
			var req = this.req;
			var res = this.res;

			

		}));
	});
};
