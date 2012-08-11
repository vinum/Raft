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
	this.buffer = []

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
	if (str.indexOf('\n') > -1) {

		var message = this.buffer.join('');
		var data = str.split('\n');
		message += data.shift();

		this.buffer = [];

		this.emit('data', message);

		data = data.join('\n');

		if (data.length) {
			this.write(data);
		}
	} else {
		this.buffer.push(str);
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
	this.buffer = []

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
	this.emit('data', str + '\n')
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
