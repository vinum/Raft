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
	rpc.expose('stats', function listHosts(host) {
		this.send({
			test : 'some great data'
		}, 200);
	})
	rpc.expose('stats.uid.load', function listHosts(uid) {
		var user = this.user
		var exposed = this;
		var by = {
			user : user.username
		}
		if (uid) {
			by.uid = uid
		}

		var query = raft.mongoose.Stats.find(by)
		query.where('time').limit(5)
		query.exec(function(err, data) {
			if (err) {
				return exposed.error(err);
			}
			console.log(data)
			exposed.send({
				load : data
			});
		});

	})
	rpc.expose('stats.package.load', function listHosts(name) {
		var user = this.user
		var exposed = this;
		var by = {
			user : user.username,
			name : name
		}
		var query = raft.mongoose.Stats.find(by)

		query.exec(function(err, data) {
			if (err) {
				return exposed.error(err);
			}
			console.log(data)

			exposed.send({
				load : data
			});
		});

	})
	rpc.expose('stats.user.load', function listHosts() {
		var user = this.user
		var exposed = this;
		var by = {
			user : user.username
		}

		var query = raft.mongoose.Stats.find(by)

		query.exec(function(err, data) {
			if (err) {
				return exposed.error(err);
			}
			console.log(data)

			exposed.send({
				load : data
			});
		});

	})
};
