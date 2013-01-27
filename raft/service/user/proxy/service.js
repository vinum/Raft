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
	console.log(rpc.functions)
	rpc.expose('proxy.list.host', function listHosts(host) {
		this.send({
			domains : host ? raft.balancer.balancer.domains[host] : raft.balancer.balancer.domains
		}, 200);
	})
	//
	// ### Proxy Resource
	// add host to proxy list
	//
	rpc.expose('user.drone.destroy', function(app) {
		var user = this.user;
		this.send({
			message : 'App removed'
		}, 200);
	});
	//
	// ### Proxy Resource
	// add host to proxy list
	//
	rpc.expose('proxy.drone.destroy', function(app) {
		var user = this.user;
		this.send({
			message : 'App removed'
		}, 200);
	});
	//
	// ### Proxy Resource
	// Remove host from proxy list
	//
	rpc.expose('proxy.drone.add', function(app) {
		var user = this.user;
		this.send({
			message : 'App removed'
		}, 200);
	});
};
