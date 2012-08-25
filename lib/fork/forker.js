var events = require('events');
var util = require('util');
var net = require('net');
var cp = require('child_process')

var Module = require('../rpc/module');

var Forker = module.exports = function() {
	events.EventEmitter.call(this);
}
/***
 * Make it an event
 */
util.inherits(Forker, events.EventEmitter);

Forker.prototype.spawn = function(mod, cb) {

	var rpc = new Module(function(data) {
		child.send(data)
	});
	var child = cp.fork(__dirname + '/process.js', [], {
		silent : false
	});
	//console.log(child)
	var current = {
		rpc : rpc,
		child : child,
		running : false,
		kill : function(cb) {
			child.once('exit', cb);
			child.kill('SIGHUP');
		}
	};
	child.on('message', function(data) {
		rpc.requestEvent(data, function(err, data) {
			if (err)
				child.send(err);
			else
				child.send(data);
		});
	});

	child.on('exit', function() {
		console.log('exit')
		current.running = false
		rpc.emit('exit')
	});

	function loadRpc(err, data) {
		console.log(err, data)
		current.rpc.invoke('process.load', [mod], function() {
			current.running = true
			cb(null, current)
		})
	}


	rpc.once('ready', loadRpc);

	rpc.ready();
}
