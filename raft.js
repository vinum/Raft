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
raft.on('*', function(data) {
	console.log(data)
})
//
//setup logger
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
//directories
//
raft.directories = raft.common.mkdir({
	config : path.join(__dirname, 'config'),
	tmp : path.join(__dirname, 'tmp'),
	snapshot : path.join(__dirname, 'snapshot'),
	tar : path.join(__dirname, 'tar'),
	package : path.join(__dirname, 'package'),
	logs : path.join(__dirname, 'logs'),
	node : path.join(__dirname, 'node')

})
//
//config
//
raft.config = nconf.file({
	file : path.join(raft.directories.config, 'config.json')
});
//
//nodetime
//
if (raft.config.get('nodetime')) {
	require('nodetime').profile(raft.config.get('nodetime'));
}
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
raft.drone = new raft.Drone({
	packageDir : raft.directories.package,
	logsDir : raft.directories.logs,
	snapshotDir : raft.directories.snapshot
});
//
raft.common.onSIGINT(function(next) {
	raft.drone.cleanAll(next)
})
//
//transports
//
raft.transports = require('./raft/common/transports');
//
//balancer
//
raft.Nodev = require('./raft/common/nodev').Nodev;
//
raft.nodev = new raft.Nodev({
	install_dir : raft.directories.node,
	tmp_dir : raft.directories.tmp
});
//
//balancer
//
raft.balancer = require('./raft/common/balancer');
//
//transports
//
raft.Balancer = raft.balancer.Balancer;
//
//services
//
raft.service = new raft.common.Services();
//
//services
//
raft.Distributed = require('./raft/common/distributed').Distributed;

