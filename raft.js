/*
 *
 * (C) 2013, MangoRaft.
 *
 */
var EventEmitter2 = require('eventemitter2').EventEmitter2;
var nconf = require('nconf');
var path = require('path');
/**
 * RAFT
 */
var raft = module.exports = new EventEmitter2({
	wildcard : true, // should the event emitter use wildcards.
	delimiter : '::', // the delimiter used to segment namespaces, defaults to `.`.
	newListener : false, // if you want to emit the newListener event set to true.
	maxListeners : 200, // the max number of listeners that can be assigned to an event, defaults to 10.
});
//
//setup logger/debug
//
raft.debug = console.info.bind(console)
var hook;
this.__defineSetter__("hook", function(h) {
	hook = h;
});
this.__defineGetter__("hook", function(h) {
	return hook
});

//
//setup logger/debug
//
var logger

raft.log = function(from, uid, message) {
	if (!logger) {
		logger = new raft.Logger(null, null, 'raft', 'raft')
	}
	logger.log(from, uid, message)
}
//
//
//
raft.distribute = function(event, data, cb) {
	console.log(event)
	if (raft.hook) {
		raft.hook.emit(event, data, cb)
	}
	raft.emit(event, data, cb)

}
//
// Expose version through `pkginfo`.
//
raft.files = {
	fork : __dirname + '/scripts/fork.js'
};
//
// Expose version through `pkginfo`.
//
raft.package = require('./package');
//
//version
//
raft.version = raft.package.version;
//
//common
//
raft.common = require('./raft/index');
//
//Stats
//
raft.Stats = require('./raft/stats').Stats;
//
//Spawner
//
raft.Spawner = require('./raft/spawner').Spawner;
//
//Spawner
//
raft.Spawn = require('./raft/spawn').Spawn;
//
//Spawner
//
raft.Router = require('./raft/router').Router;
//
//Drone
//
raft.SnapShot = require('./raft/snapshot').SnapShot;
//
//Nodev
//
raft.Nodev = require('./raft/nodev').Nodev;
//
//MessageBus
//
raft.MessageBus = require('./raft/message-bus').MessageBus;
//
//Logger
//
raft.Logger = require('./raft/logger').Logger;
//
//LogServer
//
raft.LogServer = require('./raft/logger').LogServer;

//
//Balancer
//
raft.boot = function(root, cb) {

	if ( typeof root == 'function') {
		cb = root
		root = path.join(process.env.HOME, 'raft')
	}

	function start(err) {
		if (err) {
			throw err
		}

		raft.nodev = new raft.Nodev({
			install_dir : raft.directories.node,
			tmp_dir : raft.directories.tmp
		});

		raft.spawner = new raft.Spawner({});

		raft.common.onSIGINT(function(next) {
			raft.spawner.stopAll(next);
		});
		cb()
	}


	raft.common.mkdir({
		root : root
	}, function(err) {
		if (err) {
			throw err
		}
		raft.directories = raft.common.mkdir({
			config : path.join(root, 'config'),
			tmp : path.join(root, 'tmp'),
			snapshot : path.join(root, 'snapshot'),
			tar : path.join(root, 'tar'),
			package : path.join(root, 'package'),
			logs : path.join(root, 'logs'),
			node : path.join(root, 'node')
		}, start);
	});
};
