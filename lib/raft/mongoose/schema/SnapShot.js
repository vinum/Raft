/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');
/**
 * Schema definition
 */

var SnapShot = new Schema({
	username : String,
	appname : String,
	ctime : Date,
	tar : String,
	dir : String,
	version : String,
	package_id : String
});

/**
 * Define model.
 */

module.exports = mongoose.model('SnapShot', SnapShot);
