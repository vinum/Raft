/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
/**
 * Schema definition
 */

var Nodes = new Schema({
	port : Number,
	host : String,
	name : String,
	key : String,
	master : Boolean
});

/**
 * Define model.
 */

module.exports = mongoose.model('Nodes', Nodes);
