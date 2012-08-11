var raft = require('../')
var log = raft.log

var rimraf = require('rimraf')
var os = require('os')
var fs = require('fs')
var Spawner = require('../lib/fork/forker')

var api = require('./server');

var rootRoute = '/worker/app'

/**
 *
 */

var spawner = new Spawner();

spawner.spawns = {}

/*
 *
 */
function testName(name, res, next) {
	if (!spawner.spawns[name]) {
		next(restify.InvalidArgumentError('no app with name "' + name + '"'))
		return false
	} else {
		return spawner.spawns[name]
	}
}

var App = function() {
	events.EventEmitter.call(this);
	this.running = false;
	this.spawn = null;

	this.tar = null;
	this.userid = null;
	this.name = null;

}
/***
 * Make it an event
 */
util.inherits(App, events.EventEmitter);

App.prototype.load = function(config, cb) {
	this.tar = config.tar
	this.userid = config.userid
	this.name = config.name

	cb();

}
App.prototype.start = function(config, cb) {

	if (this.spawn && this.running) {
		return cb(new Error('app is running please stop it first'))
	}
	var self = this;
	spawner.spawn(['worker', __dirname + '/worker-module.js'], function(err, spawn) {
		if (err) {
			return next(err);
		}

		self.spawn = spawn;
		self.running = true;
		spawn.rpc.once('exit', function() {
			self.emit('death')
			self.spawn = null;
			self.running = false;
		})
		spawn.rpc.invoke('worker.load', [self.tar, self.name, self.userid, 'bob', raft.workerKey], function(err, data) {

			if (err) {
				return spawn.kill(function() {

					self.emit('killed')
					self.spawn = null;
					self.running = false;
					cb(err)
				})
			}
			cb()
		});
	});
}
App.prototype.stop = function() {
	if (!this.spawn && !this.running) {
		return cb(new Error('App is not running please start it before stoping it.'))
	}

	var self = this;
	var spawn = this.spawn;

	spawn.rpc.invoke('worker.kill', [], function() {
		spawn.kill(function() {

			self.emit('killed')
			self.spawn = null;
			self.running = false;
			cb(err)
		})
	})
}
App.prototype.restart = function(cb) {
	if (this.running) {

		var self = this;

		this.stop(function() {
			self.start(cb)
		})
	} else {
		this.start(cb)
	}
}
var Apps = function() {
	this.apps = [];

}

Apps.prototype.add = function(app) {
	this.apps.push(app)
}
Apps.prototype.get = function(name) {
	var apps = this.apps;

	for (var i = 0, j = apps.length; i < j; i++) {
		var app = apps[i]
		if (app.name === name) {
			return app
		}
	};
	return false;
}
Apps.prototype.list = function() {
	var apps = this.apps;
	var _apps = []
	for (var i = 0, j = apps.length; i < j; i++) {
		var app = apps[i]
		_apps.push({
			name : app.name,
			running : app.running
		})
	};
	return _apps;

}
Apps.prototype.killAll = function(cb) {
	var apps = this.apps;

	apps.forLoops(function(app, done) {
		app.stop(done)
	}, function() {
		cb()
	})
}
/**
 *
 *
 */
var apps = new Apps()
/**
 *
 */
log.info('Raft-Worker-App', 'Route: ' + rootRoute + '/list');
api.get(rootRoute + '/list', function(req, res, next) {

	log.info('Raft-Worker-App', 'Route: ' + req.url);
	res.json({
		pass : true,
		apps : apps.list()
	})
})
/**
 *
 */
var actions = ['start', 'stop', 'restart']
log.info('Raft-Worker-App', 'Route: ' + rootRoute + '/kill/:name');
api.get(rootRoute + '/:action/:name', function(req, res, next) {

	log.info('Raft-Worker-App', 'Route: ' + req.url);
	var appName = req.params.name;
	var action = req.params.action;

	if (actions.indexOf(action) === -1) {
		res.json(500, {
			pass : false,
			err : {
				message : 'Bad action. Only takes: ' + actions.join(', '),
				code : 'BAD_ACTION',
				stack : ''
			}
		})
	}

	var app = apps.get(appName)

	if (app === false) {
		res.json(500, {
			pass : false,
			err : {
				message : 'No such app',
				code : 'NOT_FOUND',
				stack : ''
			}
		})
	} else {
		app[action](function(err) {
			if (err) {
				res.json(500, {
					pass : false,
					err : {
						message : err.message,
						code : err.code || 'NO_CODE',
						stack : err.stack
					}
				})
			} else {
				res.json(200, {
					pass : true
				})
			}
		})
	}

})
/**
 *
 */
log.info('Raft-Worker-App', 'Route: ' + rootRoute + '/info/:name');
api.get(rootRoute + '/info/:name', function(req, res, next) {
	log.info('Raft-Worker-App', 'Route: ' + req.url);
	var appName = req.params.name;

	log.info('Raft-Worker-App', 'INFO request for app: ' + appName);
	var spawn
	if ( spawn = testName(appName, res, next)) {
		spawn.rpc.invoke('worker.info', [], function(err, data) {
			if (err) {
				next(err)
			} else {
				res.send(data)
			}
		})
	}
})
/**
 *
 */

log.info('Raft-Worker-App', 'Route: ' + rootRoute + '/loadPackage/:name/:tar/:userid');
api.post(rootRoute + '/load/:name/:tar/:userid', function(req, res, next) {
	log.info('Raft-Worker-App', 'Route: ' + req.url);
	var appName = req.params.name;
	var tarName = req.params.tar;
	var userid = req.params.userid;
	var localTarPath = raft.config.paths.tmp + '/' + tarName + '.tar';
	var out = fs.createWriteStream(localTarPath)

	req.pipe(out)
	var app = apps.get(appName)

	if (app === false) {
		app = new App()
	}

	req.once('end', function() {
		log.info('Raft-Worker-App', appName + ' instilizing spawn');
		app.load({
			name : appName,
			tar : localTarPath,
			userid : userid
		}, function(err) {
			if (err) {
				res.json(500, {
					pass : false,
					err : {
						message : err.message,
						code : err.code || 'NO_CODE',
						stack : err.stack
					}
				})
			} else {
				res.json(200, {
					pass : true
				})
			}
		})
	})
})
module.exports = spawner;
