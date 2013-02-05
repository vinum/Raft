/*
 * service.js: RESTful JSON-based web service for the drone module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var path = require('path');
var util = require('util');
var raft = require('../../../../raft');

//
// ### function createRouter (dron, logger)
// #### @drone {Drone} Instance of the Drone resource to use in this router.
//
// Creates the Journey router which represents the `raft` Drone webservice.
//
exports.run = function(rpc) {
	rpc.expose('user', function listHosts(host) {
		var user = this.user
		this.send({
			username : user.username,
			role : user.zone,
			bucketKey : user.bucketKe,
			email : user.email,
			privileges : user.privileges
		}, 200);
	})
};
