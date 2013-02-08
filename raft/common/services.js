/*
 *
 * (C) 2013, MangoRaft.
 *
 */

var util = require('util');
var crypto = require('crypto');
var http = require('http');
var fs = require('fs');
var path = require('path');
var events = require('events');
var restify = require('restify');

var raft = require('../../raft')

function Services() {
	events.EventEmitter.call(this);
	this.rpc = {}
	this.users = {}
};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(Services, events.EventEmitter);

module.exports = Services

Services.prototype._start = function(callback) {
	var self = this
	var dir = path.join(__dirname, '..', 'service')
	fs.readdir(dir, function(err, privileges) {
		if (err)
			throw err
		raft.debug('Services', 'found privileges [' + privileges.join(', ') + ']')
		function loop() {
			var privilege = privileges.shift()
			if (!privilege) {
				return callback()
			}

			var rpc = self.rpc[privilege] = new raft.common.Module()

			fs.readdir(path.join(dir, privilege), function(err, services) {
				if (err)
					throw err
				raft.debug('Services', 'Found services [' + services.join(', ') + '] for privilege [' + privilege + ']')
				function load() {
					var service = services.shift();
					if (!service) {
						return loop()
					}
					require(path.join(dir, privilege, service)).start(rpc, load)
				}

				load()
			})
		}

		loop()
	})
}

Services.prototype.start = function(callback) {
	var self = this
	var transports = raft.config.get('transports')

	this._start(function() {
		Object.keys(transports).forEach(function(type) {
			var config = transports[type]
			if (config.load) {

				raft.debug('boot', 'Raft transports ' + type + ' will boot.')
				raft.transports[type](self)
			}
		})
		callback()
	})
}

Services.prototype.getPrivilege = function(privilege) {
	return this.rpc[privilege]
}