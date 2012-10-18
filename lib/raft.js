/***
 * Node modules
 */
var events = require('events');
var util = require('util');
var events = require('events');
var fs = require('fs');
var os = require('os');
var cp = require('child_process');
var net = require('net');
var crypto = require('crypto');

/**
 * RPC-JSON style calls for partition.io
 * Originally taken from rpc-socket
 *
 * @param {Object} initialized peer
 *
 * @return {Object}
 */
var Raft = module.exports = function() {
	events.EventEmitter.call(this);
	this._modules()
}
/***
 * Make it an event
 */
util.inherits(Raft, events.EventEmitter);
Raft.tmpDir = os.tmpDir();

Raft.package = require('../package.json');
/**
 *raft version
 */
Raft.version = Raft.package.version;

/**
 * raft utils
 */
Raft.utils = require('./utils');
/**
 * raft container
 */
Raft.Container = require('./container/app');
/**
 * raft commander
 */
Raft.Commander = require('./commander');
/**
 *raft logger
 */
Raft.Logger = require('./logger');
/**
 *raft Api
 */
Raft.Api = require('./api');
/**
 * pipes
 */
var pipes = Raft.pipes = {};

pipes.crypto = require('./pipes/crypto');
pipes.json = require('./pipes/json');
pipes.event = require('./pipes/event');
pipes.split = require('./pipes/split');
pipes.stream = require('./pipes/stream');

/**
 * pipes
 */
var rpc = Raft.rpc = {};

rpc.module = require('./rpc/module');
/**
 * Froker
 */
var rpc = Raft.prototype.fork = {};

rpc.Forker = require('./fork/forker');
/**
 * log
 */
Raft.log = new Raft.Logger();
/**
 *
 *raft config
 */
Raft.configPath = process.env.HOME + "/.raft/.config";
Raft.defults = {
	host : 'api.mangoraft.com',
	port : 80
}
/**
 * globale ip
 */

Raft.prototype._modules = function() {

	this._makeConfig()
	this.ip = Raft.utils.getIp().address;
	if (Number(this.ip.split('.').shift()) === 10) {

		this.hasIp = false
		this.utils.getExternalIp(function(err, ip) {
			exports.ip = ip
			exports.hasIp = true
			exports.emit('ip')
		});
	} else {
		this.hasIp = true
		this.emit('ip')
	}
	/**
	 * raft store
	 */
	this.mongo = new ( require('./mongo/mongo'))(Raft.config.mongodb)

}

Raft.prototype.setup = function(options, cb) {
	var isReady = false
	var self = this
	self.mongo.once('open', function() {
		if (isReady) {
			cb(options);
		}
		isReady = true;
	});
	if (!self.hasIp) {
		self.once('ip', function() {
			if (isReady) {
				cb(options);
			}
			isReady = true;
		});
	} else {
		isReady = true;
	}

	self.mongo.start({
		host : options.mongo_host || null,
		port : options.mongo_port || null,
		path : options.mongo_path || null
	});
}

Raft.prototype.createTypeKey = function(type) {

	if (!this.config.keys[type]) {
		this.config.keys[type] = this.utils.uuid(true)
		fs.writeFileSync(exports.configPath, JSON.stringify(this.config));
	}
	return this.config.keys[type]
}

Raft.prototype._makeConfig = function() {
	if (!fs.existsSync(Raft.configPath)) {
		fs.mkdirSync(process.env.HOME + "/.raft", 0777)
		fs.mkdirSync(process.env.HOME + "/.raft/logs", 0777)
		fs.mkdirSync(process.env.HOME + "/.raft/worker", 0777)
		fs.mkdirSync(process.env.HOME + "/.raft/node", 0777)
		fs.writeFileSync(exports.configPath, JSON.stringify(Raft.config = {
			"mongodb" : {
				"host" : "localhost",
				"port" : "27017",
				"path" : "/data/db"
			},
			"keys" : {

			}
		}));
	}
}