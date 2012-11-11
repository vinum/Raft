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

SnapShot.methods.pack_id = function(id, cb) {
	this.package_id = id
	this.save(cb)

};
/**
 * Define model.
 */

module.exports = mongoose.model('SnapShot', SnapShot);
module.exports.find(function(err, result) {
	console.log(err, result)
})