/***
 * Node modules
 */

var events = require('events');
var util = require('util');
var path = require('path');
var fs = require('fs');

//
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
/**
 *
 */
var Mongoose = module.exports = {}

Mongoose.start = function(config, cb) {
	var self = this;

	mongoose.connect('mongodb://' + config.host + ':' + config.port + config.path);

	mongoose.connection.once('open', function() {
		console.log('mongoose open')
		cb()
	})
	mongoose.connection.on('close', function() {
		console.log('colsed0')
		mongoose.connect('mongodb://' + config.host + ':' + config.port + config.path);
	})
	var files = fs.readdirSync(__dirname + '/schema')

	for (var i = 0; i < files.length; i++) {
		var filePath = __dirname + '/schema/' + files[i];
		Mongoose[files[i].split('.')[0]] = require(filePath)
	};
	return this;
}