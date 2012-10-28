/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
/**
 * Schema definition
 */

var App = new Schema({
	username : String,
	appname : String,
	online : String,
	dronehash : String,
	hivehash : String,
	drones : Number
});

/**
 * Define model.
 */

module.exports = mongoose.model('App', App);

module.exports.remove({},function(){})