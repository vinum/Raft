/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
/**
 * Schema definition
 */

var WorkerNodes = new Schema({
	port : Number,
	host : String,
	key : String,
	name : String,
	online : Boolean,
	paths : {
		tmp : String
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

module.exports = mongoose.model('WorkerNodes', WorkerNodes);
