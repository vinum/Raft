/*
 * raft.js: Top level include for the raft module
 *
 *
 */

var fs = require('fs')
var path = require('path')
var flatiron = require('flatiron')
var winston = require('winston');
var semver = require('semver');

var raft = module.exports = new flatiron.App({
	delimiter : ':',
	root : path.join(__dirname, '..'),
	directories : {
		tmp : '#ROOT/tmp',
		snapshotDir : '#ROOT/snapshot',
		tar : '#ROOT/tar'
	}
});

raft.debug = winston.log.bind(winston.log)

raft.debug('info', 'Debugger started.')
//raft.use(flatiron.plugins.exceptions);

//
// Expose version through `pkginfo`.
//
require('pkginfo')(module, 'version');

raft.config.file({
	file : path.join(__dirname, '..', 'config', 'config.json')
});

raft.debug('info', 'config file: ' + path.join(__dirname, '..', 'config', 'config.json'))
//
// Set the allowed executables
//
raft.config.set('allowedExecutables', ['node', 'coffee']);

raft.common = raft.utils = require('./raft/common');
raft.mongoose = require('./raft/mongoose');
raft.service = require('./raft/service');
raft.api = {
	Drone : require('haibu-api').Drone
}
raft.clients = {
	User : require('raft-api').User,
	Drone : require('raft-api').Drone
}
raft.running = {}

raft.sendResponse = function sendResponse(res, status, body) {
	res.setHeader("X-Runtime", Date.now() - res.time)
	return res.json(status, body);
}

raft.notAvailable = function() {
	raft.sendResponse(this.res, 404, {
		message : "Method not available."
	});
}

raft.auth = function(request, callback) {

	var authorization = request.req.headers['authorization'];
	if (!authorization) {
		callback(new Error('No auth header'))
		return false;
	}

	var token = authorization.split(/\s+/).pop() || '';
	var auth = new Buffer(token, 'base64').toString();
	var parts = auth.split(/:/);
	var username = parts[0];
	var password = parts[1];

	raft.mongoose.User.getAuthenticated(username, password, function(err, user, reason) {
		if (err) {
			return callback(err)
		}

		// login was successful if we have a user
		if (user) {

			callback(null, user)
			return;
		}

		// otherwise we can determine why we failed
		var reasons = raft.mongoose.User.failedLogin;

		switch (reason) {
			case reasons.NOT_FOUND:
			case reasons.PASSWORD_INCORRECT:
				callback(new Error('Login Failed. Please try again'))
				break;
			case reasons.MAX_ATTEMPTS:
				callback(new Error('Login Failed. Max login attempts'))
				break;
		}
	});
}

raft.request = function(fn) {
	return function() {

		var request = this;
		var args = arguments;
		raft.auth(request, function(err, user) {
			if (err) {
				raft.error(err, request.res)
			} else {
				request.user = user
				fn.apply(request, args)
			}
		})
	}
}

raft.error = function(error, res, code) {
	var err = {
		blame : {
			type : 'system',
			message : error.name
		},
		message : error.message,
		code : code || 500
	}
	raft.emit('error:service', 'error', error);

	raft.sendResponse(res, 500, {
		error : err
	});
}

raft.start = function(options, callback) {

	raft.mongoose.start(options, function() {
		raft.debug('info', 'starting')
		var services = Object.keys(raft.service)

		raft.debug('info', 'Loading these services [' + services.join(', ') + ']')

		function loop() {

			var service = services.shift();

			if (!service) {
				var app = {
					name : 'RAFTMAIN',
					domain : 'api.' + (raft.config.get('domain') || 'localhost')
				}
				var drone = {
					port : 9000,
					host : '127.0.0.1'
				}
				raft.service.proxy.addApp(app)
				raft.service.proxy.addDrone(app, drone)
				return callback()
			}
			raft.debug('info', 'Loading services [' + service + ']')

			raft.service[service].start(options, loop)
		}

		loop()
	})
}

raft.start({
	port : 9000
}, function() {

})
