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
	rpc.expose('proxy', {
		stats : function() {
			var stats = []
			Object.keys(raft.balancer.cluster.workers).forEach(function(id) {
				raft.balancer.cluster.workers[id].stats ? stats.push(raft.balancer.cluster.workers[id].stats.get()) : null
			})
			this.send({
				stats : stats
			}, 200);

		},
		list : {
			host : function(host) {
				this.send({
					host : raft.balancer.balancer.domains[host]
				}, 200);
			}
		}
	})
};
