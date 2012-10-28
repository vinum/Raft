/*
 * index.js: Top-level include for the drone module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'), path = require('path'), os = require('os'), http = require('http'), flatiron = require('flatiron'), haibu = require('../../haibu'), async = haibu.common.async;

var server = haibu.common.server;
//
// ### Include Exports
// Export other components in the module
//
exports.Drone = require('./drone').Drone;
exports.started = false;
exports.scaler = new haibu.common.Scaler();

//
// ### function autostart (server, callback)
// #### @server {http.Server} Haibu drone server to autostart drones with.
// #### @callback {function} Continuation to respond to when complete
// Autostarts drones for all applications persisted to
// `haibu.config.get('directories:autostart')`.
//
exports.autostart = function(server, callback) {
	var autostartDir = haibu.config.get('directories:autostart');

	//
	// Helper function which starts multiple drones
	// a given application.
	//
	function startDrones(pkg, done) {
		if (pkg.drones == 0) {
			return done();
		}

		var started = 0;

		async.whilst(function() {
			return started < pkg.drones;
		}, function(next) {
			started++;
			server.drone.start(pkg, next);
		}, done);
	}

	//
	// Find all drones in directory:
	//   %dir/%sanitized_name.json
	//
	fs.readdir(autostartDir, function(err, files) {
		if (err) {
			return callback(err);
		}

		async.map(files, function(file, next) {
			//
			// Read each `package.json` manifest file and start
			// the appropriate drones in this `haibu` instance.
			//
			fs.readFile(path.join(autostartDir, file), function(err, pkg) {
				if (err) {
					return callback(err);
				}

				//
				// Read the contents of the package.json manifest,
				// which should be JSON
				//
				try {
					pkg = JSON.parse(pkg.toString());
				} catch (ex) {
					return callback(ex);
				}

				startDrones(pkg, next);
			});
		}, callback);
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

	function tryAutostart(server) {
		exports.autostart(server, function(err) {
			//
			// Ignore errors from autostart and continue
			// bringing up the haibu `drone` server.
			//
			// Remark: We should report the `err` somewhere
			//

		});
	}

	function findProxy(cb) {
		cb(null, {})
	}

	function startServer(err, proxyOptions) {
		if (err) {
			return callback(err);
		}
		options.proxy = proxyOptions || {
			host : '127.0.0.1'
		}
		//
		// Create the server and add the new `http.Server`
		// and `haibu.drone.Drone` instance into the `haibu.running`
		// namespace.
		//
		drone = new haibu.drone.Drone(options);

		options.services = __dirname + '/service';

		options.include = drone;

		function ready(err, _server) {
			if (err) {
				return callback(err);
			}

			haibu.running.drone = haibu.server.drone = drone;
			haibu.common.onSIGINT(exports.stop)

			//haibu.server.domain = os.hostname() + '.hive.' + (haibu.config.get('proxy:domain') || 'localhost')
			haibu.common.registerHive(function() {

				haibu.emit('start');

				callback(null, haibu.server);
			})
		}

		if (server.started) {
			server.services(options.services)
			ready()
		} else {
			server.start(options, ready)
		}

	}

	//
	// Indicate that `haibu.drone` has started
	//
	exports.started = true;

	return haibu.initialized ? findProxy(startServer) : haibu.init(options, findProxy(startServer));
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

	// Terminate drones
	haibu.running.drone.destroy(cleanup, function() {
		haibu.common.unregisterHive(function() {
			if (server.started) {
				server.stop(cleanup, callback)
			} else {
				callback()
			}
		})
	});
	haibu.running = {};
};
