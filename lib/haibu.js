/*
 * haibu.js: Top level include for the haibu module
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs')
var path = require('path')
var flatiron = require('flatiron')
var semver = require('semver');

var haibu = module.exports = new flatiron.App({
	delimiter : ':',
	root : path.join(__dirname, '..'),
	directories : {
		apps : '#ROOT/local',
		autostart : '#ROOT/autostart',
		config : '#ROOT/config',
		packages : '#ROOT/packages',
		snapshots : '#ROOT/snapshots',
		tar : '#ROOT/tar',
		tmp : '#ROOT/tmp'
	}
});

//haibu.use(flatiron.plugins.exceptions);

haibu.onAny(function(data) {

});

//
// Expose version through `pkginfo`.
//
require('pkginfo')(module, 'version');

haibu.config.file({
	file : path.join(__dirname, '..', 'config', 'config.json')
});
//
// Set the allowed executables
//
haibu.config.set('allowedExecutables', ['node', 'coffee']);

haibu.common = haibu.utils = require('./haibu/common');
haibu.Spawner = require('./haibu/core/spawner').Spawner;
haibu.repository = require('./haibu/repositories');
haibu.drone = require('./haibu/drone');
haibu.mongoose = require('./haibu/mongoose');
haibu.balancer = require('./haibu/proxy/balancer');
haibu.proxy = require('./haibu/proxy');
haibu.clients = require('./haibu/clients');
haibu.api = require('./haibu/api');
haibu.running = {};

haibu.sendResponse = function sendResponse(res, status, body) {
	return res.json(status, body);
};

//
// Expose the relevant plugins as lazy-loaded getters
//
['coffee', 'advanced-replies', 'useraccounts'].forEach(function(plugin) {
	haibu.__defineGetter__(plugin, function() {
		return require('./haibu/plugins/' + plugin);
	});
})