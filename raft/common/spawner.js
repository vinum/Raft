/*
 *
 * (C) 2013, MangoRaft.
 *
 */

var fs = require('fs')
var path = require('path')
var forever = require('forever-monitor')
var semver = require('semver')
var events = require('events')
var mixin = require('flatiron').common.mixin
var async = require('flatiron').common.async
var rimraf = require('flatiron').common.rimraf
var repositories = require('haibu-repo')
var Repository = repositories.Repository
var getPid = require('ps-pid');
var tar = require('tar')
var Packer = require("fstream-npm")
var fs = require('fs')
var zlib = require('zlib')
var exec = require('child_process').exec;
var crypto = require('crypto');
var fstream = require("fstream")
var raft = require('../../raft')
var Spawn = require('./spawn')
var Spawner = exports.Spawner = function Spawner(options) {

	this.options = options

};
//
// ### function rmApp (appsDir, app, callback)
// #### @appsDir {string} Root for all application source files.
// #### @app {App} Application to remove directories for.
// #### @callback {function} Continuation passed to respond to.
// Removes all source code associated with the specified `app`.
//
Spawner.prototype.rmApp = function(packagesDir, app, callback) {
	console.log(path.join(packagesDir, app.user, raft.common.sanitizeAppname(app.name)))
	return rimraf(path.join(packagesDir, app.user, raft.common.sanitizeAppname(app.name)), callback);
};

//
// ### function rmApps (appsDir, callback)
// #### @appsDir {string} Root for all application source files.
// #### @callback {function} Continuation passed to respond to.
// Removes all source code associated with all users and all applications
// from this Haibu process.
//
Spawner.prototype.rmApps = function(appsDir, callback) {
	if (!callback && typeof appsDir === 'function') {
		callback = appsDir;
		appsDir = null;
	}
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
// ### function spawn (app, callback)
// #### @repo {Repository} App code repository to spawn from on this server.
// #### @callback {function} Continuation passed to respond to.
// spawns the appropriate carapace for an Application repository and bootstraps with the events listed
//
Spawner.prototype.spawn = function spawn() {
	return new Spawn(this.options)
};

