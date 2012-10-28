/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
/**
 * Schema definition
 */
var Drone = new Schema({
	"ctime" : Number,
	"command" : String,
	"file" : String,
	"foreverPid" : Number,
	//"options" : [String],
	"pid" : Number,
	"silent" : Boolean,
	"uid" : String,
	//"spawnWith" : {
	"cwd" : String,
	"env" : {

	},
	//"stdio" : [String]
	//},
	"env" : String,
	"cwd" : String,
	"repository" : {
		"type" : String,
		"url" : String,
		"directory" : String
	},
	"online" : {
		type : Boolean,
		"default" : true
	},
	"port" : Number,
	"host" : String,
	"hash" : String,
	"hivehash" : String,
	"packagehash" : String
});
/**
 * Define model.
 */

module.exports = mongoose.model('Drone', Drone);
module.exports.remove({}, function() {
})
