/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
/**
 * Schema definition
 */

var Domain = new Schema({
	domain : String,
	host : String,
	port : Number
});

var WorkerStore = new Schema({

	name : String,
	domain : String,
	userid : String,
	user : String,
	domain : String,
	running : Boolean,
	version : Number,
	deployed : Date,
	created : Date,
	worker : {
		key : String
	},
	paths : {
		tar : String,
		tmp : String,
		views : String,
		stores : String,
		app : String,
		main : String,
		public : String
	}
});

/**
 * Define model.
 */

module.exports = mongoose.model('WorkerStore', WorkerStore);
