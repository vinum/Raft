/*
 *
 * (C) 2013, MangoRaft.
 *
 */

var path = require('path');
var util = require('util');
var raft = require('../../../../raft');

exports.run = function(rpc) {

	rpc.expose('scale.package.down', function(app) {
		var user = this.user
		var exposed = this;

		if (!raft.drone.show(app.name, user.username)) {
			return exposed.send({
				scale : false,
				before : 0,
				count : 0
			});
		}
		var app = raft.drone.show(app.name, user.username).app
		var before = raft.drone.running(user.username).length

		raft.drone.stopOne(app.name, user.username, function(err, result) {
			if (err || !result) {
				err = err || new Error('Unknown error from drone.');
				return exposed.error(err);
			}

			var spawn = raft.drone.show(app.name, user.username)
			if (!spawn) {
				return exposed.send({
					scale : before != 0,
					before : before,
					count : 0
				});
			}
			var count = spawn.drones.length
			exposed.send({
				scale : before != count,
				before : before,
				count : count
			});
		});
	})

	rpc.expose('scale.package.up', function(app) {
		var user = this.user
		var exposed = this;
		var before = raft.drone.show(app.name, user.username)
		if (!before) {
			before = 0
		} else {
			before = before.length
		}
		raft.drone.start(app, user.username, function(err, result) {
			if (err || !result) {
				err = err || new Error('Unknown error from drone.');
				return exposed.error(err);
			}
			var count = raft.drone.show(app.name, user.username).length
			exposed.send({
				scale : before != count,
				before : before,
				count : count
			});
		});
	})

	rpc.expose('scale.package.count', function(app) {
		var user = this.user
		var exposed = this;
		exposed.send({
			count : raft.drone.show(app.name, user.username).drones.length
		});
	})
};
