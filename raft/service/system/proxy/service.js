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
	rpc.expose('proxy.add.app', function(app) {
		raft.balancer.addApp(app)
		this.send({
			added : true
		}, 200);
	})
	rpc.expose('proxy.add.drone', function(drone, app) {
		raft.balancer.addDrone(drone, app)
		this.send({
			added : true
		}, 200);
	})
	rpc.expose('proxy.destroy.app', function(app) {
		raft.balancer.destroyApp(drone, app)
		this.send({
			destroyed : true
		}, 200);
	})
	rpc.expose('proxy.destroy.drone', function(drone, app) {
		raft.balancer.destroyDrone(drone, app)
		this.send({
			destroyed : true
		}, 200);
	})
	rpc.expose('proxy.list', function listHosts() {
		this.send({
			domains : raft.balancer.balancer.domains
		}, 200);
	})
	
};
