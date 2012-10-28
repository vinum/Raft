/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * Schema definition
 */

var Package = new Schema({
	"name" : String,
	"description" : {
		type : String,
		"default" : 'No description'
	},
	"version" : String,
	"author" : String,
	"keywords" : [String],
	"scripts" : {
		"start" : String
	},
	"user" : String,
	"domain" : String,
	"main" : {
		type : String,
		"default" : ''
	},
	"status" : {
		type : Boolean,
		"default" : true
	},
	"hash" : String,
	"dependencies" : {}
});

/**
 * Define model.
 */

module.exports = mongoose.model('Package', Package);

module.exports.remove({}, function() {
})