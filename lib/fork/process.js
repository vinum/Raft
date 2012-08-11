var events = require('events');
var util = require('util');
var net = require('net');
var Stream = require('stream')
var cp = require('child_process')

var raft = require('../../');

var Module = raft.rpc.module;
raft.init('process')
var rpc = new Module(function(data) {

	process.send(data)
});
process.on('message', function(data) {
	rpc.requestEvent(data, function(err, data) {
		if (err)
			process.send(err);
		else
			process.send(data);
	});
});

rpc.expose('process', {
	load : function(a) {
		try {
			rpc.expose(a[0], require(a[1]))
		} catch(e) {
			throw e
		}
		this.send('ok', true)

	}
});
