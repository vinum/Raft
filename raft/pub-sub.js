/*
 *
 * (C) 2013, MangoRaft.
 *
 */
var util = require('util')
var fs = require('fs')
var net = require('net')
var path = require('path');
var events = require('events')
var nssocket = require('nssocket');
var axon = require('axon')
var tinyhook = require('tinyhook')
var raft = require('../raft');

var PubSub = exports.PubSub = function() {
	events.EventEmitter.call(this);
	var self = this
	this.callbacks = {}
	raft.hook.on('*::raft::pub', function(data) {
		console.log(data)
		var result = data.data
		var reply = data.reply
		var event = data.event
		if (this.callbacks[event]) {
			this.callbacks[event].forEah(function(fn) {
				fn(result, reply)
			})
		}
	})
};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(PubSub, events.EventEmitter);

PubSub.prototype.publish = function(event, data, reply) {
	raft.hook.emit('raft::pub', {
		data : data,
		event : event,
		reply : reply
	})
}
PubSub.prototype.subscribe = function(event, fn) {
	if (!this.callbacks[event]) {
		this.callbacks[event] = []
	}
	this.callbacks[event].push(fn)
}
