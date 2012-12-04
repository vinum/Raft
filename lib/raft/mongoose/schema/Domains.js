/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var raft = require('../../../raft')

/**
 * Schema definition
 */
var Domains = new Schema({
	"domain" : String,
	"name" : String,
	"host" : String,
	"port" : Number
});
/**
 * Define model.
 */

module.exports = mongoose.model('Domains', Domains);
