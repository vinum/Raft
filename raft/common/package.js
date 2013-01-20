/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var path = require('path');
var util = require('util');
var crypto = require('crypto');
var http = require('http');
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var tar = require('tar');
var events = require('events');
var raft = require('../../raft')


module.exports = {};

module.exports.auth = function(user, pass, cb) {
	if (user !== 'admin') {
		return cb(new Error('bad user name'));
	}
	if (pass !== 'pass') {
		return cb(new Error('bad password'));
	}

	cb(null, {
		username : user,
		privilege : 'system'
	});
};

module.exports.create = function() {

};

module.exports.test = function() {

};
