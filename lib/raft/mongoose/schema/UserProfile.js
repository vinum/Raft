/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var raft = require('../../../raft')
/**
 * Schema definition
 */

var clis = {}

var Profile = new Schema({
	userid : {
		type : String,
		required : true
	},
	names : {
		first : {
			type : String,
			required : true,
			'default' : ''
		},
		last : {
			type : String,
			required : true,
			'default' : ''
		}
	},
	location : {
		streetname : {
			type : String,
			required : true,
			'default' : ''
		},
		number : {
			type : Number,
			required : true,
			'default' : 0
		},
		state : {
			type : String,
			required : true,
			'default' : ''
		},
		postcode : {
			type : String,
			required : true,
			'default' : ''
		}
	},
	email : {
		type : String,
		required : true,
		index : {
			unique : true
		}
	}
});

/**
 * Define model.
 */

module.exports = mongoose.model('Profile', Profile);

//module.exports.remove({},function(){})