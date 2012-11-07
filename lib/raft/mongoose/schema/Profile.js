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
	zone : {
		type : String,
		required : true,
		'default' : 'free'
	},
	maxDrones : {
		type : Number,
		required : true,
		'default' : 1
	}
});

/**
 * Define model.
 */

module.exports = mongoose.model('Profile', Profile);
