/*
 * service.js: RESTful JSON-based web service for the drone module.
 *
 *
 */

var path = require('path');
var util = require('util');
var fs = require('fs');
var raft = require('../../../raft');

exports.createRouter = function(drone) {

	//
	// ### Proxy Resource
	// Routes for RESTful access to the Drone resource.
	//
	raft.router.path('/events', function() {
		//
		// ### Proxy Resource
		// landing page
		//
		this.get(function() {
			var res = this.res
			fs.readFile(__dirname + '/index.html', function(err, data) {
				if (err) {
					res.writeHead(500);
					return res.end('Error loading index.html');
				}
				res.writeHead(200);
				res.end(data);
			});

		});
	});

};
