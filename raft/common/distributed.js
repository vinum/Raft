/*
 *
 * (C) 2013, MangoRaft.
 *
 */

var util = require('util')
var fs = require('fs')
var net = require('net')
var path = require('path');
var http = require('http');
var os = require('os')
var events = require('events')
var qs = require('querystring')
var bolt = require('bolt')
var raft = require('../../raft');

var Distributed = exports.Distributed = function(options) {
	events.EventEmitter.call(this);
	var self = this
	this.uid = raft.common.uuid()
	this.callbacks = {}
	this.limits = {
		memory : 2 * 1024 * 1024
	}
	this.mesh = new bolt.Node({
		host : options.host || '127.0.0.1',
		port : options.port || 6357,
		debug : false,
		silent : true
	});
	this.mesh.on(this.uid, function(result) {
		console.log(result)
		if (self.callbacks[result.queryId]) {
			self.callbacks[result.queryId](result)
			delete self.callbacks[result.queryId];
		}
	})
	this.mesh.on('app', function(meta) {
		if (self.uid !== meta.uid && meta.memory < self.limits.memory && meta.runtime === process.version) {

			var transports = raft.config.get('transports')
			var avalibleTransports = []
			var keys = Object.keys(transports)
			keys.forEach(function(transport) {
				if (transports[key].load) {
					avalibleTransports.push(transports[key])
				}
			})
			if (avalibleTransports.length) {
				self.mesh.emit(meta.uid, {
					uid : self.uid,
					queryId : meta.queryId,
					host : raft.common.ipAddress(),
					transports : raft.config.get('transports')
				})
			}
		}
	})
	this.mesh.start()
};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(Distributed, events.EventEmitter);

//
//
//
Distributed.prototype.enqueue = function(meta, callback) {
	var self = this
	var queryId = raft.common.uuid()
	var sent = false
	var timmer = setTimeout(function() {
		sent = true
		delete self.callbacks[queryId]
		callback(new Error('No avalible slots'))
	}, 30 * 1000)

	this.callbacks[queryId] = function(result) {
		if (!sent) {
			clearTimeout(timmer)
			callback(null, result)
		}
	}

	this.mesh.emit('app', {
		memory : meta.memory || 120 * 1024,
		runtime : meta.runtime || process.version,
		uid : this.uid,
		queryId : queryId
	});
}
