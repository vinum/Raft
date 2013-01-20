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
var httpStreamHelper = require('./http-stream');

var raft = require('../../raft')
function Services(id) {
	events.EventEmitter.call(this);
	this.rpc = {}
	this.keys = ['keys']

};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(Services, events.EventEmitter);

module.exports = Services

Services.prototype.boot = function(callback) {
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
						return callback()
					}
					require(path.join(dir, privilege, service)).start(rpc, loop)
				}

				load()
			})
		}

		loop()
	})
}

Services.prototype.expose = function(a, b) {
	return this.rpc.expose(a, b)
}

Services.prototype.socket = function(port) {
	//coming soon
}
/**
 *
 *
 */

Services.prototype.http = function(port) {
	var rpc = this.rpc
	var server = this.server = restify.createServer({
		name : raft.config.get('domain'),
		version : raft.version
	});
	server.server.removeAllListeners('error')
	server.server.removeAllListeners('clientError')

	server.use(restify.authorizationParser());
	server.use(restify.dateParser());
	server.use(restify.queryParser());
	server.use(restify.bodyParser());
	server.use(restify.urlEncodedBodyParser());

	httpStreamHelper(this)

	server.listen(port);
	return server
}

Services.prototype.services = function(options) {
	if (options.services) {
		var services = options.services
		if (Array.isArray(services)) {
			for (var i = 0; i < services.length; i++) {
				require(services[i]).run(this)
			};
		} else {
			require(services).run(this)
		}
	}

}