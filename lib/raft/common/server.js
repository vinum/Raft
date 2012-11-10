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
var raft = require('../../raft');
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
// Starts the raft `drone` webservice with the specified options.
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

		//
		// Setup the `union` server through `flatiron.plugins.http`
		// and then add routes.
		//

		function before(req, res) {

			res.time = Date.now();
			var origin = (req.headers["origin"] || req.headers["x-forwarded-for"] || req.headers['host'] || "*");
			
			
			if (req.method.toUpperCase() === "OPTIONS") {

				// Echo back the Origin (calling domain) so that the
				// client is granted access to make subsequent requests
				// to the API.
				res.writeHead("204", {
					"access-control-allow-origin" : origin,
					"access-control-allow-methods" : "GET, POST, PUT, DELETE, OPTIONS",
					"access-control-allow-headers" : "content-type, accept",
					"access-control-max-age" : 10, // Seconds.
					"content-length" : 0
				});

				// End the response - we're not sending back any content.
				return ( res.end() );

			}
			res.origin = origin
			res.emit('next');
		}


		raft.use(flatiron.plugins.http, {
			before : [before],
			headers : {
				'x-powered-by' : raft.config.get("site-name") + ' v' + require('../../../package.json').version
			}

		});
		raft.listen(options.port, options.host, function() {

			raft.running.server = raft.server;
			raft.server.hash = raft.common.hash(options.port, options.host)
			raft.server.port = options.port
			raft.server.host = options.host || 'localhost'

			raft.running.ports = {};

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
			if (false)
				raft.plugins.exceptions.logger.exitOnError = function(err) {
					if (err.code === 'EPIPE') {
						console.log('expected error:');
						console.log('EPIPE -- probabaly caused by someone pushing a non gzip file.');
						console.log('"net" throws on a broken pipe, current node bug, not raft.');
						return false;
					}

					return true;
				};

			//
			// Attempt to autostart any applications and respond.
			//
			//
			// Ignore errors from autostart and continue
			// bringing up the raft `drone` server.
			//
			// Remark: We should report the `err` somewhere
			//
			raft.emit(['server', 'start'], 'info', raft.server);

			callback(null, raft.server);
		});

	}

	//
	// Indicate that `raft.drone` has started
	//
	exports.started = true;

	return raft.initialized ? startServer() : raft.init(options, startServer);
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

	raft.running = {};

	raft.running.server ? (function() {
		raft.running.server.once('close', function() {
			callback(null, raft.server)
		})
		raft.running.server.close()
	})() : callback(null, raft.server);

};
