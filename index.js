/**
 *
 * RAFT
 *
 * By: Timothy Dickinson
 *
 */
var npmlog = require('npmlog')
var events = require('events');
var ini = require('ini')
var fs = require('fs')
var os = require('os')

var tmpDir = os.tmpDir()

exports = module.exports = new events.EventEmitter;

exports.tmpDir = tmpDir;

/**
 *
 */
exports.utils = require('./lib/utils');

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
 *
 *
 */
try {
	exports.config = JSON.parse(fs.readFileSync(tmpDir + '/.raft', 'utf-8'));
} catch(e) {

	fs.writeFileSync(tmpDir + '/.raft', JSON.stringify(exports.config = {
		"mongodb" : {
			"host" : "localhost",
			"port" : "27017",
			"path" : "/data/db"
		},
		"workerKey" : exports.utils.uuid(true),
		"paths" : {
			"tmp" : tmpDir
		}
	}));
}
/**
 * data store
 */
exports.mongo = new ( require('./lib/mongo/mongo'))(exports.config.mongodb).start();

