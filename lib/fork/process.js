var events = require('events');
var util = require('util');
var net = require('net');
var Stream = require('stream')
var cp = require('child_process')
var raft = require('../../')

var Module = require('../rpc/module');

var rpc = new Module(process.send.bind(process));

process.on('message', function(data) {
	rpc.requestEvent(data, function(err, data) {
		if (err)
			process.send(err);
		else
			process.send(data);
	});
});

rpc.expose('process', {
	load : function(path) {
		try {
			require(path)(rpc)
		} catch(e) {
			//throw e
		}
		this.send('ok', true)

	}
});

var isReady = false

raft.mongo.once('open', function() {
	if (isReady)
		rpc.ready()
	isReady = true
});
raft.once('ip', function() {
	if (isReady)
		rpc.ready()
	isReady = true
});
raft.mongo.start()
