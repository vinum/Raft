/**
 *
 * RAFT
 *
 * By: Timothy Dickinson
 *
 */
var events = require('events');
var fs = require('fs')
var os = require('os')

var tmpDir = os.tmpDir()

exports = module.exports = new events.EventEmitter;
/**
 * tmp dir
 */
exports.tmpDir = tmpDir;

/**
 * raft utils
 */
exports.utils = require('./lib/utils');
/**
 *raft logger
 */
var Logger = exports.Logger = require('./lib/logger');
/**
 * pipes
 */
var pipes = exports.pipes = {};

pipes.crypto = require('./lib/pipes/crypto');
pipes.json = require('./lib/pipes/json');
pipes.event = require('./lib/pipes/event');
pipes.split = require('./lib/pipes/split');

/**
 * pipes
 */
var rpc = exports.rpc = {};

rpc.module = require('./lib/rpc/module');
/**
 * Froker
 */
var rpc = exports.fork = {};

rpc.Forker = require('./lib/fork/forker');
/**
 * log
 */
exports.log = new Logger()
console.log('link')
/**
 *
 *raft config
 */
exports.configPath = process.env.HOME + "/.raft/.config"

try {
	exports.config = JSON.parse(fs.readFileSync(exports.configPath, 'utf-8'));
} catch(e) {
	fs.writeFileSync(exports.configPath, JSON.stringify(exports.config = {
		"mongodb" : {
			"host" : "localhost",
			"port" : "27017",
			"path" : "/data/db"
		},
		"workerKey" : exports.utils.uuid(true),
		"masterHost" : "mangoraft.com",
		"paths" : {
			"tmp" : tmpDir,
			"logs" : process.env.HOME + "/.raft/logs",
			"node" : process.env.HOME + "/.raft/node",
			"worker" : process.env.HOME + "/.raft/worker",
		}
	}));
}
console.log(exports.config)
/**
 * globale ip
 */

exports.ip = exports.utils.getIp().address;

/**
 * raft store
 */
exports.mongo = new ( require('./lib/mongo/mongo'))(exports.config.mongodb).once('open', function() {
	if (Number(exports.ip.split('.').shift()) === 10) {
		exports.utils.getExternalIp(function(err, ip) {
			exports.ip = ip
			exports.emit('ready')
		});
	} else {
		exports.emit('ready')
	}
}).start();

