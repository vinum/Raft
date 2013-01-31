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

	rpc.expose('logs.get', function listHosts(uid, name) {
		var user = this.user.username
		var exposed = this

		raft.drone.getlogs(uid, name, user, 10000, function(err, data) {
			if (err) {
				exposed.error(err)
			} else {
				exposed.send(data)
			}
		})
	})
	rpc.expose('logs.tail', function listHosts(uid, name) {
		var user = this.user.username
		var exposed = this

		raft.drone.getlogs(uid, name, user, 50, function(err, data) {
			if (err) {
				exposed.error(err)
			} else {
				exposed.send(data)
			}
		})
	})
};
