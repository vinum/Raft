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
	email : {
		type : String,
		required : true,
		index : {
			unique : true,
			sparse : true
		}
	}
});

/**
 * Define model.
 */

module.exports = mongoose.model('User', User);
