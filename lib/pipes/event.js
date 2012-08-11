/***
 * Node modules
 */

var events = require('events');
var Stream = require('stream');
var util = require('util');
//
module.exports = {}

var regexp = /([\S]*):([0-9]+):?([\s\S]*)?/;
/**
 *
 */
var Read = module.exports.Read = function() {
	Stream.call(this);

	this.readable = this.writable = true;

}
/***
 * Make it an event
 */
util.inherits(Read, Stream);

/**
 *
 */
Read.prototype.write = function(str) {
	if (regexp.test(str)) {
		var keys = regexp.exec(str)

		var name = keys[1]
		var id = keys[1]
		var data = new Buffer(keys[1])

		this.emit(name, id, data)
	}
}
/**
 *
 */
Read.prototype.end = function(str) {
	if (str) {
		this.write(str)
	}
	this.emit('end')
};
/**
 *
 */
var Write = module.exports.Write = function() {
	Stream.call(this);

	this.readable = true;
	this.writable = false;

}
/***
 * Make it an event
 */
util.inherits(Write, Stream);

/**
 *
 */
Write.prototype.write = function(str) {
	this.emit('data', str)
}
/**
 *
 */
Write.prototype.emit = function(event, id, data) {
	this.write(event + ':' + id + ':' + data)
}
/**
 *
 */
Write.prototype.end = function(str) {
	if (str) {
		this.write(str)
	}
	this.emit('end')
};
