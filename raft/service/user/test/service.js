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
	rpc.expose('test', function listHosts(host) {
		this.send({
			test : 'some great data'
		}, 200);
	})
};
