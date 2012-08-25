/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
/**
 * Schema definition
 */

var SnapShot = new Schema({
	userid : String,
	name : String,
	time : Date,
	version : String,
	tar : String
});

/**
 * Define model.
 */

module.exports = mongoose.model('SnapShot', SnapShot);
