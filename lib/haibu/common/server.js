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
var flatiron = require('flatiron');
var haibu = require('../../haibu');
var async = require('./index').async;

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
//
// ### function start (options, callback)
// #### @options {Object} Options to use when starting this module.
// #### @callback {function} Continuation to respond to when complete.
// Starts the haibu `drone` webservice with the specified options.
//
exports.services = function(options) {
	if (options.services) {
		var services = options.services
		if (Array.isArray(services)) {
			for (var i = 0; i < services.length; i++) {
				require(services[i]).createRouter(options.include)
			};
		} else {
			require(services).createRouter(options.include)
		}
	}
};
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

	function startServer(err) {
		if (err) {
			return callback(err);
		}

		//
		// Setup the `union` server through `flatiron.plugins.http`
		// and then add routes.
		//
		haibu.use(flatiron.plugins.http, options.http || {});

		haibu.listen(options.port, options.host, function() {
			console.log('haibu.listen')
			exports.services(options)

			haibu.running.server = haibu.server;

			haibu.running.ports = {};

			//
			// There is a current bug in node that throws here:
			//
			// https://github.com/joyent/node/blob/v0.4.12/lib/net.js#L159
			//
			// It will throw a broken pipe error (EPIPE) when a child process that you
			// are piping to unexpectedly exits. The write function on line 159 is
			// defined here:
			//
			// https://github.com/joyent/node/blob/v0.4.12/lib/net.js#L62
			//
			// This uncaughtExceptionHandler will catch that error,
			// and since it originated with in another sync context,
			// this section will still respond to the request.
			//
			if(false)
			haibu.plugins.exceptions.logger.exitOnError = function(err) {
				if (err.code === 'EPIPE') {
					console.log('expected error:');
					console.log('EPIPE -- probabaly caused by someone pushing a non gzip file.');
					console.log('"net" throws on a broken pipe, current node bug, not haibu.');
					return false;
				}

				return true;
			};

			//
			// Attempt to autostart any applications and respond.
			//
			//
			// Ignore errors from autostart and continue
			// bringing up the haibu `drone` server.
			//
			// Remark: We should report the `err` somewhere
			//
			haibu.emit(['server', 'start'], 'info', haibu.server);

			callback(null, haibu.server);
		});

	}

	//
	// Indicate that `haibu.drone` has started
	//
	exports.started = true;

	return haibu.initialized ? startServer() : haibu.init(options, startServer);
};

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

	haibu.running = {};

	haibu.running.server ? (function() {
		haibu.running.server.once('close', function() {
			callback(null, haibu.server)
		})
		haibu.running.server.close()
	})() : callback(null, haibu.server);

};
