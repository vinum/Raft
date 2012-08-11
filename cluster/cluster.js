/***
 * Node modules
 */
var events = require('events');
var util = require('util');
var fs = require('fs');
var cp = require('child_process');
var cluster = require('cluster');
var net = require('net');
var path = require('path');
var crypto = require('crypto');
var numCPUs = require('os').cpus().length;

/**
 *
 */

/**
 * RPC-JSON style calls for partition.io
 * Originally taken from rpc-socket
 *
 * @param {Object} initialized peer
 *
 * @return {Object}
 */
var Cluster = module.exports = function() {

	events.EventEmitter.call(this);

}
/***
 * Make it an event
 */
util.inherits(Cluster, events.EventEmitter);

Cluster.prototype.bouncy = function(args) {

	cluster.setupMaster({
		exec : path.join(__dirname, '/bouncy.js'),
		args : args || ['80'],
		silent : false
	});

	for (var i = 0; i < numCPUs; i++) {
		cluster.fork();
	}

	cluster.on('exit', function(worker, code, signal) {
		var exitCode = worker.process.exitCode;
		console.log('worker ' + worker.pid + ' died (' + exitCode + '). restarting...');
		cluster.fork();
	});
}

