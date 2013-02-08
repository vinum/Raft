/*
 *
 * (C) 2013, MangoRaft.
 *
 */

var mongoose = require('mongoose')
var Schema = mongoose.Schema
var raft = require('../../../raft')

var Load = new Schema({
	time : [{
		type : Date,
		required : true,
		'default' : Date.now()
	}],
	pcpu : [String],
	rssize : [Number],
	name : String,
	user : String,
	vsz : [Number],
	uid : String,
	pid : Number
});

module.exports = mongoose.model('Load', Load);
