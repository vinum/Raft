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

	rpc.expose('scale', {
		proxy : {
			up : function() {
				var exposed = this;
				var before = Object.keys(raft.balancer.cluster.workers).length
				raft.balancer.fork(function() {
					var count = Object.keys(raft.balancer.cluster.workers).length
					exposed.send({
						scale : before !== count,
						before : before,
						count : count
					})
				})
			},
			down : function() {
				var exposed = this;
				var before = Object.keys(raft.balancer.cluster.workers).length
				raft.balancer.killOne(function() {
					var count = Object.keys(raft.balancer.cluster.workers).length
					exposed.send({
						scale : before !== count,
						before : before,
						count : count
					})
				})
			},
			count : function() {
				this.send({
					count : Object.keys(raft.balancer.cluster.workers).length
				}, 200);

			}
		}
	})
};
