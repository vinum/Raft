/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
/**
 * Schema definition
 */

var Hive = new Schema({
	hash : String,
	port : Number,
	host : String,
	domain : String,
	online : Boolean
});

/**
 * Define model.
 */

module.exports = mongoose.model('Hive', Hive);
