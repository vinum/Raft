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

/**
 *
 */
exports.utils = require('./lib/utils');

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
	exports.config = JSON.parse(fs.readFileSync(tmpDir + '/__config.json', 'utf-8'))
} catch(e) {

	fs.writeFileSync(tmpDir + '/__config.json', JSON.stringify(exports.config = {
		"mongodb" : {
			"host" : "localhost",
			"port" : "27017",
			"path" : "/data/db"
		},
		"workerKey" : exports.utils.uuid(true),
		"paths" : {
			"tmp" : tmpDir
		}
	}))
}
/**
 * Logger
 */

exports.log = npmlog;

exports.log.heading = 'RAFT'

console.log = function(a) {
	exports.log.info('log', 'data: ', a);
}
console.error = function(a) {
	exports.log.error('error', 'data: ', a);
}
console.warn = function(a) {
	exports.log.warn('warn', 'data: ', a);
}

npmlog.warn('RAFT BOOT', new Date)

/**
 * data store
 */
exports.mongo = new ( require('./lib/mongo/mongo'))(exports.config.mongodb).start()
/**
 * raft init
 */

exports.init = function(type) {
	return;
	npmlog.stream = fs.createWriteStream('./logs/' + type + '.log', {
		flags : 'a',
		encoding : null,
		mode : 0666
	})
};

