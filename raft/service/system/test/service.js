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
		scale : {
			up : function(host) {
				var exposed = this
				var before = Object.keys(cluster.workers).length
				raft.balancer.fork(function() {
					exposed.send({
						scale : true,
						count : Object.keys(cluster.workers).length,
						before : before
					})
				})
			}
		},
		down : function(host) {
			var before = Object.keys(cluster.workers).length
			raft.balancer.killOne(function() {
				exposed.send({
					scale : true,
					count : Object.keys(cluster.workers).length,
					before : before
				})
			})
		}
	})
};
