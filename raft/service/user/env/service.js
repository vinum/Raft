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
	rpc.expose('env.set', function(key, val, name) {
		var user = this.user.username
		var exposed = this

		raft.drone.setEnv(key, val, name, user, function(err, result) {
			if (err) {
				exposed.error(err)
			} else {
				exposed.send({
					set : true
				})
			}
		})
	})
	rpc.expose('env.get', function(key, name) {
		var user = this.user.username
		var exposed = this
		raft.drone.getEnv(key, name, user, function(err, result) {
			if (err) {
				exposed.error(err)
			} else {
				exposed.send({
					set : true,
					drones : result
				})
			}
		})
	})
};
