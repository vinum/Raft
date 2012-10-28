/*
 * index.js: Top-level include for the drone module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs');
var path = require('path');
var cluster = require('cluster');
var http = require('http');
var os = require('os')
var flatiron = require('flatiron');
var haibu = require('../../haibu');

var async = haibu.common.async;
var server = haibu.common.server;

//
// ### Include Exports
// Export other components in the module
//
exports.started = false;
exports.balancer = new haibu.balancer();
exports.scaler = new haibu.common.Scaler();
//
// ### Include Exports
// Export other components in the module
//
exports.hosts = {};
/**
 *
 *
 * @param {Object} options
 * @param {Object} callback
 */

exports.addApp = function(app) {
	exports.balancer.addApp(app)
	Object.keys(cluster.workers).forEach(function(id) {
		cluster.workers[id].send({
			cmd : 'addApp',
			app : app
		});
	});
}
exports.destroyApp = function(app) {
	exports.balancer.destroyApp(app)

	Object.keys(cluster.workers).forEach(function(id) {
		cluster.workers[id].send({
			cmd : 'destroyApp',
			app : app
		});
	});
}
exports.addDrone = function(drone, app) {
	exports.balancer.addDrone(drone, app)

	Object.keys(cluster.workers).forEach(function(id) {
		cluster.workers[id].send({
			cmd : 'addDrone',
			app : app,
			drone : drone
		});
	});
}
exports.destroyDrone = function(hash, app) {
	exports.balancer.destroyDrone(hash, app)

	Object.keys(cluster.workers).forEach(function(id) {
		cluster.workers[id].send({
			cmd : 'destroyDrone',
			hash : hash,
			app : app
		});
	});
}
exports.syncRequests = function() {

	Object.keys(cluster.workers).forEach(function(id) {
		cluster.workers[id].send({
			cmd : 'syncRequests'
		});
	});
}
//
// ### function start (options, callback)
// #### @options {Object} Options to use when starting this module.
// #### @callback {function} Continuation to respond to when complete.
// Starts the haibu `drone` webservice with the specified options.
//
exports.start = function(options, callback) {
	if (exports.started) {
		return callback(null, haibu.running.server);
	}
	function startCluster() {
		cluster.setupMaster({
			exec : path.join(__dirname, 'fork.js'),
			args : haibu.config.get('proxy:port') ? [haibu.config.get('proxy:port')] : ['8000'],
			silent : false
		})
function fork(callback) {
			var worker = cluster.fork();
			worker.on('message', exports.balancer.syncRequestsUpdate.bind(exports.balancer))
			callback(worker, worker.process.pid, function(cb) {
				worker.destroy();
				cb()
			});
		}
		exports.scaler.fork(fork)
		exports.scaler.fork(fork)
		exports.scaler.fork(fork)
		exports.scaler.fork(fork)
		exports.scaler.fork(fork)
		exports.scaler.fork(fork)
		exports.scaler.fork(fork)
		exports.scaler.fork(fork)
		var timmer = setInterval(function() {
			exports.syncRequests()
		}, 1000)
		startServer()
	}

	function startServer(err) {
		if (err) {
			return callback(err);
		}

		options.services = __dirname + '/service'

		if (server.started) {
			server.services(options.services)
		} else {
			server.start(options, function(err, _server) {
				if (err) {
					return callback(err);
				}

				haibu.common.onSIGINT(exports.stop)

				callback(null, haibu.server);
			})
		}

	}

	//
	// Indicate that `haibu.drone` has started
	//
	exports.started = true;

	return haibu.initialized ? startCluster() : haibu.init(options, startCluster);

}
//
// ### function stop (callback)
// #### @cleanup {bool} (optional) Remove all autostart files (default=true).
// #### @callback {function} Continuation to respond to when complete.
// Gracefully stops `drone` instance
//
exports.stop = function(cleanup, callback) {
	if (!callback && typeof cleanup === 'function') {
		callback = cleanup;
		cleanup = true;
	}

	if (!exports.started) {
		return callback ? callback() : null;
	}

	//kill the cluster
	cluster.disconnect()

	exports.started = false;

	if (server.started) {
		server.stop(cleanup, callback)
	} else {
		callback()
	}

}
