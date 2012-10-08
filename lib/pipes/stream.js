/***
 * Node modules
 */

var events = require('events');
var util = require('util');
var path = require('path');
var crypto = require('crypto');
var fs = require('fs');
//
var Cyrpt = require('./crypto');
var json = require('./json');
var event = require('./event');
var Split = require('./split');
var Module = require('../rpc/module');

/**
 *
 */
var Stream = module.exports = function(key) {
	events.EventEmitter.call(this);
	this.key = key
}
/***
 * Make it an event
 */
util.inherits(Stream, events.EventEmitter);

/**
 *
 */
Stream.prototype.createRpcStream = function(socket, req) {
	var jStream = new json.Write()

	var self = this
	function onWrite(a, b) {
		if (a) {
			jStream.write(a)
		} else {
			jStream.write(b)
		}
	}

	var module = new Module(onWrite)
	var jsonStream = new json(socket)
	
	
	
}
/**
 *
 */
Stream.prototype.createStream = function(type, data, stream, socket) {
	var self = this;

	socket.once('data', function(data) {
		if (data.toString() === 'OKEY') {

			socket.pipe(new Split.Read())
			//
			.pipe((new Cyrpt.Read()).setKey(self.key))
			//
			.pipe(stream)
			//
			.pipe((new Cyrpt.Write()).setKey(self.key))
			//
			.pipe(new Split.Write()).pipe(socket)
		} else {
			var err = new Error('connection error')
			socket.destroy()
			stream.destroy()
			socket.emit('error', err)
			stream.emit('error', err)
		}
	})

	socket.write(type + 'splitter' + JSON.stringify(data))
	return stream
}
/**
 *
 */
Stream.prototype.createWriteStream = function(path, options, socket, req) {
	var id = process.utils.uuid()

	var self = this
	var stream = fs.createWriteStream(path, options)
	this.createStream('writefile', options, stream, socket)
	return stream
}
/**
 *
 */
Stream.prototype.createReadStream = function(path, options, socket, req) {
	var id = process.utils.uuid()

	var self = this
	var stream = fs.createReadStream(path, options)
	stream.pause()
	socket.once('data', function(data) {
		if (data.toString() !== 'OKEY') {
			socket.destroy()
			stream.destroy()
		} else {

			socket.pipe(new Split.Read()).pipe((new Cyrpt.Read()).setKey(self.key)).pipe(stream)
			stream.pipe((new Cyrpt.Write()).setKey(self.key)).pipe(new Split.Write()).pipe(socket)
			stream.resume()
			stream.emit('stream')
		}
	})
	if (req !== true)
		socket.write('readfilesplitter' + JSON.stringify({
			path : path,
			options : options
		}))
	return stream
}
/**
 *
 */
Stream.prototype.request = function(socket, cb) {
	var self = this
	socket.once('data', function(data) {
		data = data.toString()
		var split = data.split('splitter')
		if (split.length > 1) {
			var type = split[0]
			data = JSON.parse(split[1])
		} else {

			socket.destroy()
			return cb(new Error('socket error'))
		}
		if (type === 'rpc') {
			var stream = self.createRpcStream(socket, true)
		} else if (type === 'readfile') {
			var stream = self.createRpcStream(data.path, data.options, socket, true)
		} else if (type === 'writefile') {
			var stream = self.createRpcStream(data.path, data.options, socket, true)
		} else {
			socket.destroy()
			return cb(new Error('socket error'))
		}
		socket.write('OKEY')
		cb(null, stream)
	})
}
