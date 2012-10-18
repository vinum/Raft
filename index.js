/**
 *
 * RAFT
 *
 * By: Timothy Dickinson
 *
 */
var events = require('events');
var fs = require('fs');
var os = require('os');

/**
 * tmp dir
 */
var tmpDir = exports.tmpDir = os.tmpDir();

exports = module.exports = new events.EventEmitter;
/**
 * raft package
 */
exports.package = require('./package.json');
/**
 *raft version
 */
exports.version = exports.package.version;

/**
 * raft utils
 */
exports.utils = require('./lib/utils');
/**
 * raft container
 */
exports.Container = require('./lib/container/app');
/**
 * raft commander
 */
exports.Commander = require('./lib/commander');
/**
 *raft logger
 */
var Logger = exports.Logger = require('./lib/logger');
/**
 *raft Api
 */
var Api = exports.Api = require('./lib/api');
/**
 * pipes
 */
var pipes = exports.pipes = {};

pipes.crypto = require('./lib/pipes/crypto');
pipes.json = require('./lib/pipes/json');
pipes.event = require('./lib/pipes/event');
pipes.split = require('./lib/pipes/split');
pipes.stream = require('./lib/pipes/stream');

/**
 * pipes
 */
var rpc = exports.rpc = {};

rpc.module = require('./lib/rpc/module');
/**
 * Froker
 */
var jobTracker = require('./lib/job-tracker');

if (jobTracker.isMaster) {
	exports.Master = jobTracker
} else {
	exports.Worker = jobTracker
}

/**
 * Froker
 */
var fork = exports.fork = {};

fork.Forker = require('./lib/fork/forker');
/**
 * log
 */
exports.log = new Logger();
/**
 *
 *raft config
 */
exports.configPath = process.env.HOME + "/.raft/.config";

try {
	exports.config = JSON.parse(fs.readFileSync(exports.configPath, 'utf-8'));
} catch(e) {
	fs.writeFileSync(exports.configPath, JSON.stringify(exports.config = {
		"mongodb" : {
			"host" : "localhost",
			"port" : "27017",
			"path" : "/data/db"
		},
		"keys" : {
			"master" : exports.utils.uuid(true),
			"worker" : exports.utils.uuid(true)
		},
		"masterHost" : "mangoraft.com",
		"paths" : {
			"tmp" : tmpDir,
			"logs" : process.env.HOME + "/.raft/logs",
			"node" : process.env.HOME + "/.raft/node",
			"worker" : process.env.HOME + "/.raft/worker",
		}
	}));
}
/**
 *
 */

exports.defults = {
	host : 'api.mangoraft.com',
	port : 80
}
/**
 * globale ip
 */

exports.ip = exports.utils.getIp().address;

if (Number(exports.ip.split('.').shift()) === 10) {

	exports.hasIp = false
	exports.utils.getExternalIp(function(err, ip) {
		exports.ip = ip
		exports.hasIp = true
		exports.emit('ip')
	});
} else {
	exports.hasIp = true
	exports.emit('ip')
}
/**
 * raft store
 */
exports.mongo = new ( require('./lib/mongo/mongo'))(exports.config.mongodb)