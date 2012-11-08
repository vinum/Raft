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

var Coupon = new Schema({
	userid : {
		type : String,
		required : true
	},
	confirmed : {
		type : Boolean,
		required : true,
		'default' : false
	},
	code : {
		type : String,
		required : true
	}
});

/**
 * Define model.
 */

module.exports = mongoose.model('Coupon', Coupon);
