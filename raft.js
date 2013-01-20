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
raft.debug = raft.log = winston.log.bind(winston.log)
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
raft.common = raft.utils = require('./raft/common');
//
//directories
//
raft.directories = raft.common.mkdir({
	config : path.join(__dirname, 'config'),
	tmp : path.join(__dirname, 'tmp'),
	snapshot : path.join(__dirname, 'snapshot'),
	tar : path.join(__dirname, 'tar')
})
//
//config
//
raft.config = nconf.file({
	file : path.join(raft.directories.config, 'config.json')
});
//
//common
//
raft.user = require('./raft/common/user');
raft.mongoose = require('./raft/mongoose');
//
//raft api cleints
//
raft.clients = {
	User : require('raft-api').User,
	Drone : require('raft-api').Drone,
	Proxy : require('raft-api').Proxy,
	Haibu : require('raft-api').Haibu
}
//
//raft services
//
raft.service = new raft.common.Services();

console.log(raft)
