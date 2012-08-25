/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
/**
 * Schema definition
 */

var User = new Schema({
	username : String,
	password : String,
	userid : String,
	activated : Boolean,
	email : {
		type : String,
		required : true
	}
});

/**
 * Define model.
 */

module.exports = mongoose.model('User', User);
