/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var raft = require('../../../raft')
/**
 * Schema definition
 */

var ProxyStats = new Schema({
	domain : {
		type : String,
		required : true
	},
	time : {
		type : Date,
		required : true,
		'default' : Date.now
	},
	requests : {
		type : Number,
		required : true
	},
	bytesRead : {
		type : Number,
		required : true
	},
	bytesWritten : {
		type : Number,
		required : true
	}
});

/**
 * Define model.
 */

module.exports = mongoose.model('ProxyStats', ProxyStats);
