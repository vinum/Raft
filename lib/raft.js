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
		tar : '#ROOT/tar',
		config : '#ROOT/config'
	}
});

raft.running = {}

raft.debug = console.log.bind(console.log)

raft.debug('info', 'Debugger started.')

//
// Expose version through `pkginfo`.
//
require('pkginfo')(module, 'version');

raft.config.file({
	file : path.join(__dirname, '..', 'config', 'config.json')
});

raft.debug('info', 'config file: ' + path.join(__dirname, '..', 'config', 'config.json'))

raft.common = raft.utils = require('./raft/common');
raft.mail = new (require('./raft/common/mailer'));
raft.mongoose = require('./raft/mongoose');
raft.service = require('./raft/service');

//
//raft api cleints
//
raft.clients = {
	User : require('raft-api').User,
	Drone : require('raft-api').Drone,
	Proxy : require('raft-api').Proxy,
	Haibu : require('raft-api').Haibu
}
raft.debug('info', 'Raft API clients: ' + Object.keys(raft.clients).join(', '))

raft.sendResponse = function sendResponse(res, status, body) {
	res.setHeader("X-Runtime", Date.now() - res.time)
	res.setHeader("X-run", Date.now() - res.time)
	if ( typeof res.origin === 'string') {
		res.setHeader("access-control-allow-origin", res.origin);
		res.setHeader('Access-Control-Allow-Credentials', 'true');
		res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
		res.setHeader('Access-Control-Max-Age', '1000');
		res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	}
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
			if (!user.confirmed) {
				return callback(new Error('Account not confirmed'))
			}
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

				raft.mongoose.UserProfile.findOne({
					userid : user._id
				}, function(err, profile) {
					if (err) {
						raft.error(err, request.res)
					} else {
						request.profile = profile
						fn.apply(request, args)
					}
				})
			}
		})
	}
}
raft.system = function(fn) {
	return raft.request(function() {
		var request = this;
		var args = arguments;
		if (request.user.zone === 'admin' || request.user.zone === 'system') {
			fn.apply(request, args)
		} else {
			raft.error(new Error('Bad request'), request.res)
		}
	})
}

raft.error = function(error, res, code) {
	var err = {
		blame : {
			type : 'system',
			message : error.name
		},
		message : error.message,
		code : code || 500,
		stack : error.stack,
		stderr : error.stderr || ''
	}
	raft.emit('error:service', 'error', error);

	raft.sendResponse(res, code || 500, {
		err : err,
		error : error
	});
}

raft.kill = function(type, port, callback) {

}

raft.kill = function(type, port, callback) {
	raft.mongoose.Node.findOne({
		port : port,
		ip : ip,
		type : type
	}, function(err, node) {
		if (!node) {
			callback()
		} else {
			node.online = false
			node.save(callback)
		}
	})
}

raft.boot = function(type, port, callback) {
	var ip = raft.common.ipAddress()

	raft.mongoose.Node.findOne({
		port : port,
		ip : ip,
		type : type
	}, function(err, node) {
		if (!node) {
			new raft.mongoose.Node({
				port : port,
				ip : ip,
				online : true,
				type : type
			}).save(callback)
		} else {
			node.online = true
			node.save(callback)
		}
	})
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
					name : 'RAFTAPI',
					domain : 'api.' + (raft.config.get('domain') || 'localhost')
				}
				var drone = {
					port : 9000,
					host : '127.0.0.1'
				}
				raft.service.proxy.addApp(app)
				raft.service.proxy.addDrone(drone, app)
				var app = {
					name : 'RAFTBLOG',
					domain : 'blog.' + (raft.config.get('domain') || 'localhost')
				}
				var drone = {
					port : 8080,
					host : '127.0.0.1'
				}
				raft.service.proxy.addApp(app)
				raft.service.proxy.addDrone(drone, app)
				return callback()
			}
			raft.debug('info', 'Loading services [' + service + ']')

			raft.service[service].start(options, loop)
		}


		raft.mongoose.User.count(function(err, count) {
			if (count === 0) {
				var systemUser = new raft.mongoose.User({
					username : raft.config.get('system:username'),
					password : raft.config.get('system:password'),
					confirmed : true,
					zone : 'system'
				});
				var systemUserProfile = new raft.mongoose.UserProfile({
					userid : systemUser._id,
					email : raft.config.get('system:email')
				});
				systemUser.save(function() {
					systemUserProfile.save(function() {
						loop()
					})
				})
			} else {

				loop()
			}
		})
	})
}

