var bolt = require('bolt');
var util = require('util');
var events = require('events');
var raft = require('../../../raft')

function Bolt(id) {
	events.EventEmitter.call(this);
	this.nodes = {}
	var mesh = this.mesh = new bolt.Node();
	mesh.on('register', function(id) {
		var rpc = new raft.common.Module(function(data) {
			mesh.emit('rpc-to-' + id, data);
		})
		mesh.on('rpc-from-' + id, function(data) {
			rpc.requestEvent(data);
		});
	});
	mesh.start();
};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(Bolt, events.EventEmitter);

module.exports = Bolt

Bolt.prototype.addNode = function(id) {

}
Bolt.prototype.removeNode = function() {

}
