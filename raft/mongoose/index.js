/*
 *
 * (C) 2013, MangoRaft.
 *
 */

var events = require('events');
var util = require('util');
var path = require('path');
var fs = require('fs');
var raft = require('../../raft');

//
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
/**
 *
 */
var Mongoose = module.exports = {}

Mongoose.start = function(cb) {
	var uri = 'mongodb://' + (raft.config.get('db:mongodb:host') || 'localhost' ) + ':' + (raft.config.get('db:mongodb:port') || '27017') + (raft.config.get('db:mongodb:path') || '/data/db')

	raft.debug('Mongodb', ' connecting [' + uri + ']')
	mongoose.connect(uri);

	mongoose.connection.once('open', function() {
		raft.debug('Mongodb', ' open [' + uri + ']')
		cb()
	})
	mongoose.connection.on('close', function() {
		raft.debug('Mongodb', ' close [' + uri + ']')
		mongoose.connect(uri);
	})
	var files = fs.readdirSync(__dirname + '/schema')
	raft.debug('Mongodb', ' loading schemas [' + files.join(', ') + ']')

	for (var i = 0; i < files.length; i++) {
		var filePath = __dirname + '/schema/' + files[i];
		var fileName = files[i].split('.')[0]
		raft.debug('Mongodb', ' laoding schema (' + fileName + ') - [' + filePath + ']')
		Mongoose[fileName] = require(filePath)
	};
}