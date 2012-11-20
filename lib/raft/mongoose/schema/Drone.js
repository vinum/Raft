/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var raft = require('../../../raft')

/**
 * Schema definition
 */
var Drone = new Schema({
	"ctime" : Number,
	"package_id" : String,
	"hive_id" : String,
	"command" : String,
	"file" : String,
	"foreverPid" : Number,
	"pid" : Number,
	"silent" : Boolean,
	"uid" : String,
	"logFile" : String,
	"spawnWith" : {
		"cwd" : String,
		"env" : {

		}
	},
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
	"stats" : {

	},
	"port" : Number,
	"host" : String
});
Drone.methods.stop = function(cb) {
	var user = this;

	raft.mongoose.Drones.find({
		package_id : this._id
	}, function(err, drones) {

	})
};
/**
 * Define model.
 */

module.exports = mongoose.model('Drone', Drone);
