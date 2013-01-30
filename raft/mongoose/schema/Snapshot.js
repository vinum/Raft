var mongoose = require('mongoose')
var Schema = mongoose.Schema
var raft = require('../../../raft')

var Snapshot = new Schema({
	time : {
		type : Date,
		required : true,
		'default' : Date.now()
	},
	name : String,
	hash : String,
	tar : String,
	user : String
});

module.exports = mongoose.model('Snapshot', Snapshot);
