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
var Write = module.exports.Write = function() {
	Stream.call(this);
	this.key = ''
	this.on('data', function(data) {
		console.log(data)
	})
	this.readable = this.writable = true;
}
/***
 * Make it an event
 */
util.inherits(Write, Stream);

/**
 *
 */
Write.prototype.setKey = function(key) {
	this.key = key;
	return this
}
/**
 *
 */
Write.prototype.write = function(str) {
	var cipher = crypto.createCipher('aes-256-cbc', this.key)
	this.emit('data', cipher.update(str, 'utf8', 'hex') + cipher['final']('hex'))
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
/***
 *
 *
 *
 */
var Read = module.exports.Read = function() {
	Stream.call(this);
	this.readable = this.writable = true;
	this.key = ''
	this.on('data', function(data) {
		console.log(data)
	})
};
/***
 * Make it an event
 */
util.inherits(Read, Stream);

/**
 *
 */
Read.prototype.setKey = function(key) {
	this.key = key;
	return this
}
/**
 *
 */
Read.prototype.write = function(str) {
	var decipher = crypto.createDecipher('aes-256-cbc', this.key);
	this.emit('data', decipher.update(str, 'hex', 'utf8') + decipher['final']('utf8'));
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
