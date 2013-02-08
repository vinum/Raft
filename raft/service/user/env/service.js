/*
 *
 * (C) 2013, MangoRaft.
 *
 */

var path = require('path');
var util = require('util');
var raft = require('../../../../raft');


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
					drones : result
				})
			}
		})
	})
};
