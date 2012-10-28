/*
 * index.js: Top-level include for the drone module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs');
var path = require('path');
var http = require('http');
var os = require('os')
var flatiron = require('flatiron');
var haibu = require('../../haibu');
var Api = require('./api');

var async = haibu.common.async;
var server = haibu.common.server;

//
// ### Include Exports
// Export other components in the module
//
exports.started = false;
//
// ### Include Exports
// Export other components in the module
//
exports.hosts = {};
exports.hives = {};

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

	exports.api = new Api;
	function startServer(err) {
		if (err) {
			return callback(err);
		}

		options.services = [__dirname + '/users', __dirname + '/apps', __dirname + '/snapshots']
		
		options.include = exports.api
		
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

	return haibu.initialized ? startServer() : haibu.init(options, startServer);

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
