/*
 * spawner.js: Spawner object responsible for starting carapace processes.
 *
 * (C) 2010, Nodejitsu Inc.
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
var repositories = require('../../../haibu-repo')
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
Spawner.prototype.rmApp = function(appsDir, app, callback) {
	return rimraf(path.join(appsDir, app.user, app.nameClean), callback);
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

