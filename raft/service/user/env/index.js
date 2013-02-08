/*
 *
 * (C) 2013, MangoRaft.
 *
 */

//
// ### Include Exports
// Export other components in the module
//
exports.started = false;
//
//
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
//
//
exports.stop = function(callback) {
	if (!exports.started) {
		return callback ? callback(null) : null;
	}
	exports.started = false;
	callback(null)
}