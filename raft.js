/*
 *
 * (C) 2013, MangoRaft.
 *
 */
var EventEmitter2 = require('eventemitter2').EventEmitter2;
var log = require('npmlog');
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
raft.debug = log.info.bind(log)
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
raft.common = require('./raft/common');
//
//Stats
//
raft.Stats = require('./raft/common/stats');
//
//Module
//
raft.Module = require('./raft/common/rpc-module');
//
//mongoose
//
raft.mongoose = require('./raft/mongoose');
//
//Spawner
//
raft.Spawner = require('./raft/common/spawner').Spawner;
//
//Drone
//
raft.Drone = require('./raft/common/drone').Drone;
//
//transports
//
raft.transports = require('./raft/common/transports');
//
//Nodev
//
raft.Nodev = require('./raft/common/nodev').Nodev;
//
//balancer
//
raft.balancer = require('./raft/common/balancer');
//
//Balancer
//
raft.Balancer = raft.balancer.Balancer;
//
//Balancer
//
raft.boot = function(config, cb) {
	raft.directories = config.get('directories')
	raft.config = config
	raft.mongoose.start(cb)
};

