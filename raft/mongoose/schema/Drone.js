/*
 *
 * (C) 2013, MangoRaft.
 *
 */

var mongoose = require('mongoose')
var Schema = mongoose.Schema
var raft = require('../../../raft')

var Drone = new Schema({
	command : String,
	ctime : Number,
	cwd : String,
	env : String,
	file : String,
	foreverPid : Number,
	host : String,
	pid : Number,
	port : Number,
	repository : {},
	silent : Boolean,
	uid : String,
});

module.exports = mongoose.model('Drone', Drone);
