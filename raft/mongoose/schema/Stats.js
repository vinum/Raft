var mongoose = require('mongoose')
var Schema = mongoose.Schema
var raft = require('../../../raft')

var Stats = new Schema({
	time : {
		type : Date,
		required : true,
		'default' : Date.now()
	},
	pcpu : String,
	rssize : Number,
	name : String,
	user : String,
	vsz : Number,
	uid : String,
	disk : String
});

module.exports = mongoose.model('Stats', Stats);
