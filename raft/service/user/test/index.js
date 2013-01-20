//
// ### Include Exports
// Export other components in the module
//
exports.started = false;
//

exports.services = __dirname + '/service'
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
exports.start = function(server, callback) {
	if (exports.started) {

		return callback(null);
	}

	require(__dirname + '/service').run(server)
	//
	// Indicate that `raft.drone` has started
	//
	exports.started = true;

	return callback(null)

}
//
// ### function stop (callback)
// #### @cleanup {bool} (optional) Remove all autostart files (default=true).
// #### @callback {function} Continuation to respond to when complete.
// Gracefully stops `drone` instance
//
exports.stop = function(callback) {

	if (!exports.started) {
		return callback ? callback(null) : null;
	}

	exports.started = false;

	callback(null)

}