/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
/**
 * Schema definition
 */

var ApiDomains = new Schema({
	domain : String,
	master : Boolean
});

/**
 * Define model.
 */

module.exports = mongoose.model('ApiDomains', ApiDomains);
