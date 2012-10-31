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
//
// ### Include Exports
// Export other components in the module
//
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

	function startServer(err) {
		if (err) {
			return callback(err);
		}


		server.start(options, function(err, _server) {
			if (err) {
				return callback(err);
			}

			var io = exports.io = require('socket.io').listen(raft.server);
			io.configure(function() {
			io.set('log level', 1)
				io.set('authorization', function(handshakeData, callback) {
					console.log(handshakeData)
				});
			});
			raft.on('socket:event', function(data) {
				io.sockets.emit('event', data)
			})
			setInterval(function() {
				raft.emit('socket:event', {
					cons : 'great event'
				})
			}, 1000)
			io.sockets.on('connection', exports.onconnection);

			raft.common.onSIGINT(exports.stop)
			callback(null, raft.server);
		})
	}

	//
	// Indicate that `raft.drone` has started
	//
	exports.started = true;

	return raft.initialized ? startServer() : raft.init(options, startServer);

}
//
// ### function stop (callback)
// #### @cleanup {bool} (optional) Remove all autostart files (default=true).
// #### @callback {function} Continuation to respond to when complete.
// Gracefully stops `drone` instance
//
exports.onconnection = function(socket) {

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

	exports.started = false;

	if (server.started) {
		server.stop(cleanup, callback)
	} else {
		callback()
	}

}
