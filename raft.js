/*****
 *
 *
 *
 */
var EventEmitter2 = require('eventemitter2').EventEmitter2;
var winston = require('winston');
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
//debugger
//setup logger
//
raft.debug = console.log.bind(console.log)
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
	bucket : path.join(__dirname, 'bucket')

})
//
//config
//
raft.config = nconf.file({
	file : path.join(raft.directories.config, 'config.json')
});
raft.bucket = require('./raft/common/bucket-server');
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

var drone = raft.drone = new raft.Drone({
	packageDir : raft.directories.package,
	logsDir : raft.directories.logs
});
raft.common.onSIGINT(function(next) {
	drone.cleanAll(next)
})
//
//transports
//
raft.transports = require('./raft/common/transports');
//
//transports
//
raft.balancer = require('./raft/common/balancer');
//
//transports
//
raft.Balancer = raft.balancer.Balancer;
raft.on('*', function(data) {
	console.log(data)
})
//
//raft services
//
raft.service = new raft.common.Services();
//
//raft services
//


if (raft.balancer.cluster) {
	raft.debug('boot', 'Raft about to boot.')
	raft.service.start(function() {
console.log(raft.service)
		raft.debug('boot', 'Raft service has boot.')
		raft.mongoose.start(function() {
			raft.debug('boot', 'Raft mongoose has boot.')
			raft.balancer.start(function() {
				raft.debug('boot', 'Raft balancer has boot.')
				raft.bucket.start(function() {
					raft.debug('boot', 'Raft bucket has boot.')
				})
			})
		})
	})
} else {

	raft.debug('boot', 'Process is part of a cluster.')
}
