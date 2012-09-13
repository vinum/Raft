/***
 * Node modules
 */

var events = require('events');
var util = require('util');
var path = require('path');
var fs = require('fs');
var domain = require('domain');
//
var _npm = require('npm');
var rimraf = require('rimraf')
//
var raft = require('../../');
//
var utils = raft.utils;
var uuid = utils.uuid;
var log = raft.log;

/**
 *
 */
var Setup = module.exports = function(Module, runType) {
	events.EventEmitter.call(this);
	this.Module = Module
	this.runType = runType
};
/***
 * Make it an event
 */
util.inherits(Setup, events.EventEmitter);
var debugPorts = 2999
Setup.prototype.debugEnv = function() {
	var _self = this
	var net = this.Module._load('net');
	var listen = net.Server.prototype.listen;
	var close = net.Server.prototype.close;

	net.Server.prototype.listen = function(domain, cb) {
		var self = this
		this._domain = domain
		var port = debugPorts = debugPorts + 1
		listen.call(this, port, function() {
			_self.Module.console._log.raft('domain: ' + domain + ' port: ' + port + ' http://localhost:' + port)
			cb && cb()
		});
	}
}
Setup.prototype.setup = function(options) {
	if (this.runType === 'debug') {
		this.debugEnv()
	}
}
