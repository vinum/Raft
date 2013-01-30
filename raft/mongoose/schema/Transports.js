var mongoose = require('mongoose')
var Schema = mongoose.Schema
var raft = require('../../../raft')

var Transports = new Schema({
	type : String,
	ip : String,
	port : String,
	domain : Number
});

module.exports = mongoose.model('Transports', Transports);
