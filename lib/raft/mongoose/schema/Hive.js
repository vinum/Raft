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

var Hive = new Schema({
	port : Number,
	host : String,
	maxDrones : {
		type : Number,
		required : true,
		'default' : 100
	},
	choked : {
		type : Boolean,
		required : true,
		'default' : false
	},
	zone : {
		type : String,
		required : true,
		'default' : 'free'
	},
	online : Boolean
});

Hive.methods.cli = function(cb, deap) {
	var self = this
	var name = this.port + ':' + this.host + ':' + this.zone
	function giveCli() {
		if (!clis[name]) {
			clis[name] = new raft.api.Drone({
				port : this.port,
				host : this.host
			})
			clis[name].hive = self
		}
		
		cb(null, clis[name])
	}


	raft.mongoose.Drone.count({
		hive_id : this._id
	}, function(err, count) {
		if (!self.choked && count > +self.maxDrones) {
			self.choked = true
			self.save(giveCli)
		} else if (self.choked && count < +self.maxDrones) {
			self.choked = false
			self.save(giveCli)
		} else {
			giveCli()
		}

	})
};

Hive.statics.cli = function(_id, cb) {
	var self = this;
	if ( typeof _id === 'string') {
		this.findOne({
			_id : _id
		}, function(err, hive) {

			hive.cli(cb)
		})
	} else {
		this.findOne({
			zone : _id.zone,
			choked : false,
			online : true
		}, function(err, hive) {
			if (!hive) {
				self.findOne({
					zone : _id.zone,
					online : true
				}, function(err, hive) {
					if (!hive) {
						cb(new Error('No hives found please spawn one'))
					} else {
						hive.cli(cb)
					}
				})
			} else {
				hive.cli(cb)
			}
		})
	}

}
/**
 * Define model.
 */

module.exports = mongoose.model('Hive', Hive);
