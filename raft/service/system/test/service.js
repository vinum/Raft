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
exports.run = function(server) {
	var lib = require('./lib')
	server.expose('proxy.list.host', function listHosts(host) {
		this.send({
			domains : []
		}, 200);
	})
	//
	// ### Proxy Resource
	// add host to proxy list
	//
	server.expose('proxy.drone.destroy', function(app) {
		var user = this.user;
		this.send({
			message : 'App removed'
		}, 200);
	});
	//
	// ### Proxy Resource
	// add host to proxy list
	//
	server.expose('system.drone.destroy', function(app) {
		var user = this.user;
		this.send({
			message : 'App removed'
		}, 200);
	});
	//
	// ### Proxy Resource
	// Remove host from proxy list
	//
	server.expose('proxy.drone.add', function(app) {
		var user = this.user;
		this.send({
			message : 'App removed'
		}, 200);
	});
};
