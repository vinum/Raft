/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var raft = require('../../../raft')

/**
 * Schema definition
 */
var Node = new Schema({
	"online" : {
		type : Boolean
	},
	"nodeType" : {
		type : String
	},
	"port" : {
		type : Number
	},
	"host" : {
		type : String
	}
});
/**
 * Define model.
 */

module.exports = mongoose.model('Node', Node);
