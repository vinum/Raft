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
var raft = require('../../../raft');

var async = raft.common.async;
var server = raft.common.server;

//
// ### Include Exports
// Export other components in the module
//
exports.started = false;
exports.balancer = new raft.common.Balancer();
exports.scaler = new raft.common.Scaler();
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
exports.destroyDrone = function(drone, app) {
	exports.balancer.destroyDrone(drone, app)

	Object.keys(cluster.workers).forEach(function(id) {
		cluster.workers[id].send({
			cmd : 'destroyDrone',
			drone : drone,
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
exports.sync = function() {
	Object.keys(cluster.workers).forEach(function(id) {
		cluster.workers[id].send({
			cmd : 'sync',
			domains : exports.balancer.domains
		});
	});
}
//
// ### function start (options, callback)
// #### @options {Object} Options to use when starting this module.
// #### @callback {function} Continuation to respond to when complete.
// Starts the raft `drone` webservice with the specified options.
//
exports.start = function(options, callback) {
	if (exports.started) {
		return callback(null, raft.running.server);
	}
	function startCluster() {
		cluster.setupMaster({
			exec : raft.common.fork.file,
			args : raft.config.get('proxy:port') ? [raft.config.get('proxy:port')] : ['8000'],
			silent : raft.config.get('proxy:silent') || false
		})
		cluster.on('exit', function(worker, code, signal) {
			fork(function() {
				exports.sync()
			})
		});
		function fork(callback) {
			var worker = cluster.fork();
			console.log('var worker = cluster.fork()')
			worker.on('message', exports.balancer.syncRequestsUpdate.bind(exports.balancer))
			//exports.sync()
			callback()
		}

		fork(startServer)
		
		setInterval(function() {
			var balancerDomains = exports.balancer.domains
			var domainKeys = Object.keys(balancerDomains)

			domainKeys.forEach(function(domain) {
				var _domain = balancerDomains[domain]

				new raft.mongosse.ProxyStats({
					domain : domain,
					requests : _domain.stats.requests,
					bytesRead : _domain.stats.bytesRead,
					bytesWritten : _domain.stats.bytesWritten,
				}).save(function() {

				})
				_domain.stats.bytesWritten = 0
				_domain.stats.bytesRead = 0
				_domain.stats.requests = 0
			})
		}, 15 * 60 * 60 * 1000)

	}

	function startServer(err) {
		if (err) {
			return callback(err);
		}

		options.services = __dirname + '/service'

		server.start(options, function(err, _server) {
			if (err) {
				return callback(err);
			}
			server.services(options)
			raft.common.onSIGINT(exports.stop)
			callback(null, raft.server);
		})
	}

	//
	// Indicate that `raft.drone` has started
	//
	exports.started = true;

	return raft.initialized ? startCluster() : raft.init(options, startCluster);

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
