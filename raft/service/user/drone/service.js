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

	rpc.expose('drone.running', function() {
		var user = this.user
		var exposed = this;
		this.send({
			running : raft.drone.running(user.username)
		})
	})

	rpc.expose('drone.get', function(id) {
		var user = this.user
		var exposed = this;

		var data = raft.drone.show(id, user.username);
		if ( typeof data === 'undefined') {
			exposed.error('No drone(s) found for application ' + id);
		} else {
			exposed.send(data);
		}
	})

	rpc.expose('drone.start', function(package) {
		var user = this.user
		var exposed = this;
		raft.drone.start(package, user.username, function(err, result) {
			if (err) {
				return exposed.error(err);
			}
			exposed.send({
				drone : result
			});
		});
	})

	rpc.expose('drone.stop', function(name) {
		var user = this.user
		var exposed = this;
		raft.drone.stop(name, user.username, function(err, result) {
			if (err || !result) {
				err = err || new Error('Unknown error from drone.');
				return exposed.error(err);
			}
			exposed.send({

			});
		});
	})

	rpc.expose('drone.restart', function(name) {
		var user = this.user
		var exposed = this;
		raft.drone.restart(name, user.username, function(err, drones) {
			if (err) {
				return exposed.error(err);
			}
			exposed.send({
				drones : drones
			});
		});
	})

	rpc.expose('drone.clean', function(app) {
		var user = this.user
		var exposed = this;
		raft.drone.clean(app, user.username, function(err, drones) {
			if (err) {
				return exposed.error(err);
			}
			exposed.send({
				clean : true
			});
		});
	})

	rpc.expose('drone.update', function(app) {
		var user = this.user
		var exposed = this;
		raft.drone.update(app, user.username, function(err, drones) {
			if (err) {
				return exposed.error(err);
			}
			exposed.send({
				update : true,
				drone : drones
			});
		});
	})

	rpc.expose('drone.load', function(app, uid) {
		var user = this.user
		var exposed = this;
		var by = {
			user : user.username,
			name : app.name
		}
		if (uid) {
			by.uid = uid
		}
		var query = raft.mongoose.Load.find(by)

		query.exec(function(err, data) {
			if (err) {
				return exposed.error(err);
			}

			exposed.send({
				load : data
			});
		});

	})
};
