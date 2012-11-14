/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * Schema definition
 */
var DroneStats = new Schema({
	"package_id" : String,
	"drone_id" : String,
	"comm" : String,
	"etime" : String,
	"pcpu" : String,
	"rssize" : Number,
	"time" : String,
	"user" : String,
	"vsz" : Number,
});
/**
 * Define model.
 */

module.exports = mongoose.model('DroneStats', DroneStats);
