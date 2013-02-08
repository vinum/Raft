/*
 *
 * (C) 2013, MangoRaft.
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
	rpc.expose('stats.uid.load', function listHosts(uid, limit) {
		var user = this.user
		var exposed = this;
		var by = {
			user : user.username
		}
		if (uid) {
			by.uid = uid
		}

		var query = raft.mongoose.Stats.find(by)
		query.sort('-time').limit(limit || 10)
		query.exec(function(err, data) {
			if (err) {
				return exposed.error(err);
			}
			exposed.send({
				load : data
			});
		});

	})
	rpc.expose('stats.package.load', function listHosts(name, limit) {
		var user = this.user
		var exposed = this;
		var by = {
			user : user.username,
			name : name
		}
		var query = raft.mongoose.Stats.find(by)
		query.sort('-time').limit(limit || 10)
		query.exec(function(err, data) {
			if (err) {
				return exposed.error(err);
			}
			exposed.send({
				load : data
			});
		});

	})
	rpc.expose('stats.user.load', function listHosts(limit) {
		var user = this.user
		var exposed = this;
		var by = {
			user : user.username
		}

		var query = raft.mongoose.Stats.find(by)
		query.sort('-time').limit(limit || 10)

		query.exec(function(err, data) {
			if (err) {
				return exposed.error(err);
			}

			exposed.send({
				load : data
			});
		});

	})
	rpc.expose('stats.proxy.host', function listHosts(host) {
		var user = this.user
		var exposed = this;

		exposed.send({
			stats : raft.balancer.balancer.domains[host] ? raft.balancer.balancer.domains[host] : null
		})
	})
	rpc.expose('stats.proxy', function listHosts() {
		var user = this.user
		var exposed = this;
		exposed.send({
			stats : raft.balancer.balancer.stats
		})
	})
};
