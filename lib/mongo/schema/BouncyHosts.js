/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
/**
 * Schema definition
 */

var BouncyHosts = new Schema({
	port : Number,
	host : String,
	domain : String,
	appid : String,
	workerKey : String
});

/**
 * Define model.
 */

module.exports = mongoose.model('BouncyHosts', BouncyHosts);
