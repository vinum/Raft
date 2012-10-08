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

//
var Module = require('./module');
var Console = require('./console');

/**
 *
 */
var App = module.exports = function(config) {
	events.EventEmitter.call(this);

	this.package = require(config.mainPath + '/package.json')

	this.config = {
		appName : config.appName,
		userid : config.userid,
		userName : config.userName,
		workerKey : raft.config.workerKey,
		appid : raft.utils.uuid(true),
		mainPath : config.mainPath,
		runType : config.runType,
		mainScript : config.mainPath + '/' + this.package.main
	}

	this.log = new raft.Logger();

	this.log.addLevel('raft', 3000, {
		fg : 'green',
		bg : 'black'
	})

};
/***
 * Make it an event
 */
util.inherits(App, events.EventEmitter);

function loadNpm(self, cb) {
	_npm.on("log", function(message) {
		self.log.info('Raft-NPM', message)
	})
	_npm.load({
		name : 'Raft-App-Server-' + self.config.name,
		dependencies : Object.create(self.package.dependencies)
	}, function(err) {
		if (err) {
			self.emit('error', err)
		} else {
			var keys = Object.keys(self.package.dependencies)
			if (keys.length > 0)
				_npm.commands.install(self.config.paths.main, keys, function(err) {
					if (err) {
						self.emit('error', err)
					} else {
						self.emit('npm')
						cb()
					}
				});
			else {
				self.emit('npm')
				cb()
			}
		}
	})
}

App.prototype.logStream = function(stream) {
	this.log.stream = stream
}

App.prototype.setup = function(setup) {
	this._setup = setup
}

App.prototype.init = function(cb) {
	var self = this;

	loadNpm(self, function(err) {
		if (err) {
			self.emit('error', err)
		} else {
			domain.create().on('error', function(err) {
				self.emit('module error', err)
			}).run(function() {
				Module._loadRaft(self.config.mainScript, self._setup)
				self.emit('loaded')
				self.emit('setup', setup)
				cb && cb()
			});
		}
	})
}

