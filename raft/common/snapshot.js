/**
 * Module dependencies.
 */

var util = require('util');
var crypto = require('crypto');
var http = require('http');
var fs = require('fs');
var path = require('path');
var events = require('events');
var getPid = require('ps-pid');
var restify = require('restify');

var raft = require('../../raft')

function Stats(meta) {
	events.EventEmitter.call(this);
	
};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(Stats, events.EventEmitter);

module.exports = Stats