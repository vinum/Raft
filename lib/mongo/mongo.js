/***
 * Node modules
 */

var events = require('events');
var util = require('util');
var path = require('path');
var fs = require('fs');
var raft = require('../../');

//
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
/**
 *
 */
var Mongo = module.exports = function(config) {
	events.EventEmitter.call(this);
	this.config = config
}
/***
 * Make it an event
 */
util.inherits(Mongo, events.EventEmitter);

Mongo.prototype.start = function(config) {
	var self = this;
	if (config) {
		mongoose.connect('mongodb://' + (config.host || this.config.host) + ':' + (config.port || this.config.port) + (config.path || this.config.path));
	} else {
		mongoose.connect('mongodb://' + this.config.host + ':' + this.config.port + this.config.path);
	}

	mongoose.connection.on('close', function() {
		mongoose.connect('mongodb://' + self.config.host + ':' + self.config.port + self.config.path);
	})
	mongoose.connection.once('open', function() {
		self.emit('open')
	})
	var files = fs.readdirSync(__dirname + '/schema')

	for (var i = 0; i < files.length; i++) {
		var filePath = __dirname + '/schema/' + files[i];
		self[files[i].split('.')[0]] = require(filePath)
	};
	return this;
}
