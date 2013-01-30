var mongoose = require('mongoose')
var Schema = mongoose.Schema
var raft = require('../../../raft')

var Env = new Schema({
	key : String,
	value : String,
	name : String,
	user : String
});

module.exports = mongoose.model('Env', Env);
