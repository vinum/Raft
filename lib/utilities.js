/*!
* Raft - utils
* Copyright(c) 2010 ShareFarm.
* MIT Licensed
*/

/**
 * Module dependencies.
 */
var util = require('util')

/**
 * Generate a uuid.
 *
 */
var S4 = function() {
	return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
};

exports.uuid = function uuid() {
	return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}