var mongoose = require('mongoose')
var Schema = mongoose.Schema
var raft = require('../../../raft')

var Package = new Schema({
	"user" : String,
	"name" : String,
	"domain" : String,
	"version" : String,
	"repository" : {

	},
	"scripts" : {
		"start" : String
	},
	versionCode : Number
});

module.exports = mongoose.model('Package', Package);
