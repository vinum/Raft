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
var raft = require('../raft');

var MessageBus = exports.MessageBus = function() {
	events.EventEmitter.call(this);

	this.pull = axon.socket('pull');
	this.pull.format('json');
	this.pull.on('message', this.onMessage.bind(this));

	this.push = axon.socket('push');
	this.push.format('json');

	this.send = this.push.send.bind(this.push);
};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(MessageBus, events.EventEmitter);

MessageBus.prototype.onMessage = function(message) {

}
MessageBus.prototype.bind = function(port) {
	this.pull.bind(port)
}
MessageBus.prototype.connect = function(port, host) {
	this.push.connect(port, host);
}
