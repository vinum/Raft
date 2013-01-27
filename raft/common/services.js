/**
 * Module dependencies.
 */

var util = require('util');
var crypto = require('crypto');
var http = require('http');
var fs = require('fs');
var path = require('path');
var events = require('events');
var restify = require('restify');

var raft = require('../../raft')
function Services(id) {
	events.EventEmitter.call(this);
	this.rpc = {}
	this.keys = []
};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(Services, events.EventEmitter);

module.exports = Services

Services.prototype.start = function(callback) {
	var self = this
	var dir = path.join(__dirname, '..', 'service')
	fs.readdir(dir, function(err, privileges) {
		if (err)
			throw err
		function loop() {
			var privilege = privileges.shift()
			if (!privilege) {
				return callback()
			}

			var rpc = self.rpc[privilege] = new raft.common.Module()

			fs.readdir(path.join(dir, privilege), function(err, services) {
				if (err)
					throw err
				function load() {
					var service = services.shift();
					if (!service) {
						return loop()
					}
					console.log('service', service)
					require(path.join(dir, privilege, service)).start(rpc, load)
				}

				load()
			})
		}

		loop()
	})
}

Services.prototype.getPrivilege = function(privilege) {
	return this.rpc[privilege]
}