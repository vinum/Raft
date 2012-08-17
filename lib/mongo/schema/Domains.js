/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
/**
 * Schema definition
 */

var Domains = new Schema({
	domain : String,
	master : Boolean
});

/**
 * Define model.
 */

module.exports = mongoose.model('Domains', Domains);
