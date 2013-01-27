var mongoose = require('mongoose')
var Schema = mongoose.Schema
var raft = require('../../../raft')

var Nodes = new Schema({
	username : {
		type : String,
		required : true,
		index : {
			unique : true
		}
	},
	zone : {
		type : String,
		required : true,
		'default' : 'free'
	}
});

module.exports = mongoose.model('Nodes', Nodes);
