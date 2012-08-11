/***
 * Node modules
 */

var events = require('events');
var Stream = require('stream');
var util = require('util');
var path = require('path');
var crypto = require('crypto');
var fs = require('fs');
//
module.exports = {}

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
	this.emit('data', JSON.parse(str))
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
	this.readable = this.writable = true;

}
/***
 * Make it an event
 */
util.inherits(Write, Stream);

/**
 *
 */
Write.prototype.write = function(str) {
	this.emit('data', JSON.stringify(str))
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
