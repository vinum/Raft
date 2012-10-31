/*
 * proxy.js: Responsible for proxying across all applications available to raft.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var util = require('util')
var path = require('path')
var fs = require('fs')
var net = require('net')
var events = require('events')
var qs = require('querystring')
var cluster = require('cluster')
var os = require('os')
var numCPUs = os.cpus().length;
var raft = require('../../raft');

//
// ### function Balancer (options)
// #### @options {Object} Options for this instance.
// Constructor function for the `raft` Balancer responsible
// for load balancing across all applications know to raft on
// this machine.
//
var Scaler = module.exports = function(options) {
	events.EventEmitter.call(this);
	this.workers = {}
	this.timmers = {}
	this.workerCount = 0
	this.nextFork = true
	this.heartbeat = 1000
	this.scaleUpLimit = 70
	this.scaleDownLimit = 1
	this.minWorkers = 1
	this.maxWorkers = 10
	this.forkTimeout = 240 * 1000
};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(Scaler, events.EventEmitter);

Scaler.prototype.onExit = function(worker) {
	this.workerCount--;
	clearInterval(this.timmers[worker.pid])
	delete this.workers[worker.pid]
	delete this.timmers[worker.pid]
}

Scaler.prototype.up = function(pid, callback) {
	console.log(this.workers)
	var worker = this.workers[pid]
	this.fork(worker.fork, callback)
}

Scaler.prototype.down = function(pid, callback) {
	var worker = this.workers[pid]
	worker.kill(callback)
}

Scaler.prototype.status = function(_pid) {
	var result = []
	var workers = this.workers;
	var worker;

	if (_pid) {
		worker = workers[pid]
		console.log(worker, pid, workers)
		var stats = {}

		for (var key in worker.stats) {
			stats[key] = worker.stats[key]
		}
		stats.pid = pid
		return stats
	}

	var pids = Object.keys(workers)
	for (var i = 0; i < pids.length; i++) {
		var pid = pids[i]
		worker = workers[pid]
		var stats = {}

		for (var key in worker.stats) {
			stats[key] = worker.stats[key]
		}
		stats.pid = pid
		result.push(stats)
	};
	return result
}

Scaler.prototype.autoScale = function autoScale(worker) {
	var self = this
	if (self.nextFork) {
		if (worker.pcpu > self.scaleUpLimit && self.workerCount < self.maxWorkers) {
			self.nextFork = false
			setTimeout(function() {
				self.nextFork = true
			}, self.forkTimeout)
			self.fork(wokrer.fork)
		}
	}
}

Scaler.prototype.fork = function(fork, cb) {

	var self = this
	fork(function(worker, pid, kill) {
		function monitor(err, stats) {
			worker.pcpu = Number(stats.pcpu)
			worker.stats = stats
			//self.autoScale(worker)
		}


		worker.pid = pid
		worker.fork = fork
		worker.kill = kill
		worker.pcpu = 0
		self.workerCount++
		worker.ctime = Date.now()
		worker.on('exit', self.onExit.bind(self, worker))
		self.workers[pid] = worker
		self.timmers[pid] = setInterval(function() {
			raft.common.monitor(pid, monitor)
		}, self.heartbeat)

		raft.common.monitor(pid, monitor)
		cb && cb()
	})
}