/*
 *
 * (C) 2013, MangoRaft.
 *
 */
var mkdirp = require('mkdirp');
var crypto = require('crypto')
var fs = require('fs')
var http = require('http')
var os = require('os')
var path = require('path')
var exec = require('child_process').exec
var spawn = require('child_process').spawn
var flatiron = require('flatiron');
var async = flatiron.common.async;
var rimraf = flatiron.common.rimraf;
var raft = require('../../raft');

var common = module.exports = flatiron.common;
//
common.Services = require('./services')
//
common.Module = require('./rpc-module')
//
// **REALLY DONT DO THIS HERE! But where?**
//
if (!Error.prototype.toJSON) {
	Object.defineProperty(Error.prototype, "toJSON", {
		enumerable : false,
		value : function() {
			return flatiron.common.mixin({
				message : this.message,
				stack : this.stack,
				arguments : this.arguments
			}, flatiron.common.clone(this));
		}
	});
}

//
// ### function getEndKey (startKey)
// #### @startKey {string} Startkey paramater for querying CouchDB.
// Returns the 'endkey' associated with the `startKey`, that is,
// the same string except with the last character alphabetically incremented.
//
// e.g. `char ==> chas`
//
common.getEndKey = function(startKey) {
	var length = startKey.length;
	return startKey.slice(0, length - 1) + String.fromCharCode(startKey.charCodeAt(length - 1) + 1);
};

//
// ### function rmApp (appsDir, app, callback)
// #### @appsDir {string} Root for all application source files.
// #### @app {App} Application to remove directories for.
// #### @callback {function} Continuation passed to respond to.
// Removes all source code associated with the specified `app`.
//
common.rmApp = function(appsDir, app, callback) {
	return rimraf(path.join(appsDir, app.user, app.name), callback);
};

//
// ### function rmApps (appsDir, callback)
// #### @appsDir {string} Root for all application source files.
// #### @callback {function} Continuation passed to respond to.
// Removes all source code associated with all users and all applications
// from this raft process.
//
common.rmApps = function(appsDir, callback) {
	if (!callback && typeof appsDir === 'function') {
		callback = appsDir;
		appsDir = null;
	}
	appsDir = appsDir || raft.config.get('directories:apps');
	fs.readdir(appsDir, function(err, users) {
		if (err) {
			return callback(err);
		}
		async.forEach(users, function rmUser(user, next) {
			rimraf(path.join(appsDir, user), next);
		}, callback);
	});
};

//
// ### sanitizeAppname (name)
// Returns sanitized appname (with removed characters) concatenated with
// original name's hash
//
common.sanitizeAppname = function(name) {
	var sha1 = crypto.createHash('sha1');
	sha1.update(name);
	return name.replace(/[^a-z0-9\-\_]+/g, '-') + '-' + sha1.digest('hex');
};

//
// ### function ipAddress (name)
// #### @name {string} **Optional** Name of the network interface
// Returns the address for the network interface on the current
// system with the specified `name`. If no interface or `IPv4`
// family is found return the loopback addres `127.0.0.1`.
//
common.ipAddress = function(name) {
	var interfaces = os.networkInterfaces();

	var addresses = Object.keys(interfaces).map(function(nic) {
		var addrs = interfaces[nic].filter(function(details) {
			return details.address !== '127.0.0.1' && details.family === 'IPv4'
		});
		return addrs.length ? addrs[0].address : undefined;
	}).filter(Boolean);
	return addresses.length ? addresses[0] : '127.0.0.1';
};
//

common.mkdir = function(directories) {
	var keys = Object.keys(directories)

	for (var i = 0, j = keys.length; i < j; i++) {

		mkdirp(directories[keys[i]], function(err) {
			if (err)
				console.error(err)
		});
	};
	return directories
}
/**
 *
 */
var S4 = function() {
	return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}
common.uuid = function uuid(a) {
	if (a) {
		return (S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4());
	}
	return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}
//
//
//
var SIGINTFn = []

//
//
//
common.onSIGINT = function(fn) {
	SIGINTFn.push(fn)
}
//
//
//
var loop = function() {
	var fn = SIGINTFn.shift()
	if (!fn) {
		return process.exit(1);
	}
	process.nextTick(function() {
		fn(loop)
	});
};
//
//
//
process.on('SIGINT', loop);
