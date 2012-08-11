/***
 * Node modules
 */

var events = require('events');
var util = require('util');
var path = require('path');
var crypto = require('crypto');
var fs = require('fs');
//
module.exports = {}

/**
 *
 */
var Stream = module.exports.Stream = function(stream) {
	events.EventEmitter.call(this);
	this.streams = {};
	this.readable = this.writable = true;
}
/***
 * Make it an event
 */
util.inherits(Stream, events.EventEmitter);

/**
 *
 */
Stream.prototype.createWriteStream = function(stream) {
	var id = process.utils.uuid()

	this.stream[id] = stream
	
	
	
	
}
/**
 *
 */
Stream.prototype.createReadStream = function(stream) {

}
