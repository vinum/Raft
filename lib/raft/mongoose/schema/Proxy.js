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

var Proxy = new Schema({
	port : {
		type : Number,
		required : true
	},
	host : {
		type : String,
		required : true
	},
	hash : {
		type : String,
		required : true
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

Proxy.statics.cli = function(method, params, callback) {
	this.find({
		online : true
	}, function(err, servers) {
		var args = params.concat([
		function(err, result) {
			if (err) {
				return callback(err)
			}
			loop()
		}])

		function loop() {
			var info = servers.shift()

			if (!info) {
				return callback()
			}

			if (clis[info.hash]) {
				var cli = clis[info.hash]
			} else {
				var cli = clis[info.hash] = new raft.clients.Proxy({
					port : info.port,
					host : info.host,
					username : raft.config.get('system:username'),
					password : raft.config.get('system:password')
				})
			}
			cli[method].apply(cli, args)
		}

		loop()
	})
}
/**
 * Define model.
 */

module.exports = mongoose.model('Proxy', Proxy);
