/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
/**
 * Schema definition
 */

var Person = new Schema({
	name : {
		first : String,
		last : String
	},
	email : {
		type : String,
		required : true,
		index : {
			unique : true,
			sparse : true
		}
	},
	alive : Boolean
});

/**
 * Define model.
 */

module.exports = mongoose.model('Person', Person);
