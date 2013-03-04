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
var clc = require('cli-color');
var raft = require('../raft');
var MessageBus = require('./message-bus').MessageBus;

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(n) {
	return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

function timestamp(t) {
	var d = new Date(t);
	return [d.getDate(), months[d.getMonth()], [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds()), (d.getTime() + "").substr(-4, 4)].join(':')].join(' ');
};
var colors = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan']
var fromColors = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan']

var Logger = exports.Logger = function(uid, from, user, name) {
	MessageBus.call(this);
	this.uid = uid
	this.from = from
	this.user = user
	this.name = name
	this.buffer = []
	this.push.connect(4000)

};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(Logger, MessageBus);
Logger.prototype.onData = function onData(data, from) {
	data = data.toString();
	if (data.indexOf('\n') > -1) {
		var line = this.buffer.join('');
		data = data.split('\n');
		line += data.shift();
		this.buffer = [];
		if (line.length > 0) {
			this.push.send({
				line : line,
				uid : this.uid,
				time : new Date(),
				from : from || this.from,
				user : this.user,
				name : this.name
			})
		}
		data = data.join('\n');
		if (data.length) {
			this.onData(data, from);
		}
	} else {
		this.buffer.push(data);
	}
}
Logger.prototype.log = function(from, uid, message) {
	this.push.send({
		line : message,
		uid : uid,
		time : new Date(),
		from : from,
		user : 'system',
		name : 'system'
	})
}
Logger.prototype.write = function(data, from) {
	this.onData(data, from)
}
var LogServer = exports.LogServer = function(logPath) {
	MessageBus.call(this);
	this.logPath = raft.directories.logs
	this.streams = {}
};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(LogServer, MessageBus);
var cache = {}
LogServer.prototype.onMessage = function(msg) {
	var user = msg.user
	var uid = msg.uid
	var name = msg.name
	var from = msg.from
	var time = msg.time
	var line = msg.line
	var self = this
	if (!this.streams[uid]) {
		var color = colors.shift()
		colors.push(color)
		var stream = this.streams[uid] = {
			file : fs.createWriteStream(this.logPath + '/' + user + '.' + name + '.log', {
				flags : 'a'
			}),
			color : color,
			colors : {},
			timmer : 0
		}

	} else {
		var stream = this.streams[uid]
	}
	clearTimeout(stream.timmer)
	if (!cache[from]) {
		var c = fromColors.shift()
		fromColors.push(c)
		cache[from] = c
	}

	stream.file.write(' * ' + (timestamp(time)) + ' ' + (from) + '	[' + (uid) + ']: ' + line + '\n')
	console.log(' * ' + clc.cyan(timestamp(time)) + ' ' + clc[cache[from]](from) + '	[' + clc[stream.color](uid) + ']: ' + line)
	stream.timmer = setTimeout(function() {
		stream.file.destroy()
		delete self.streams[uid]
	}, 5 * 60 * 1000)
}