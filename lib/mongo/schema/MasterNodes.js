/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
/**
 * Schema definition
 */

var MasterNodes = new Schema({
	port : Number,
	host : String,
	key : String,
	name : String,
	zone : String,
	online : Boolean,
	master : Boolean,
	paths : {
		tmp : String
	},
	servent : {
		port : Number,
		host : String,
		id : String
	},
	mongo : {
		port : Number,
		host : String,
		path : String
	},
	choked : Boolean
});

/**
 * Define model.
 */

module.exports = mongoose.model('MasterNodes', MasterNodes);
