/*
 *
 * (C) 2013, MangoRaft.
 *
 */

var fs = require('fs')
var path = require('path')
var events = require('events')
var util = require('util')
var async = require('flatiron').common.async
var rimraf = require('flatiron').common.rimraf
var raft = require('../../raft')
var Spawn = require('./spawn')

var Spawner = exports.Spawner = function(options) {
	events.EventEmitter.call(this);
	this.options = options

	this.records = {};
	this.count = 0;

};
//
// Inherit from `events.EventEmitter`.
//
util.inherits(Spawner, events.EventEmitter);
/**
 *
 */
Spawner.prototype.start = function(meta, cb) {

	var self = this

	var spawn = this.spawn(meta)

	function onError(err) {
		spawn.removeListener('start', onStart)
		spawn.removeListener('error', onError)
		self.emit('error', err, meta)
		if (cb) {
			cb()
		}
	}

	function onStart() {
		spawn.removeListener('error', onError)
		self._add(meta, spawn, function(err, result) {
			if (err) {
				self.emit('error', err, meta)
			} else {
				self.count++
				self.emit('start', result, meta)
			}
			if (cb) {
				cb()
			}
		})
	}


	spawn.once('error', onError)
	spawn.once('start', onStart)

	spawn.init(meta, onError)

	spawn.trySpawn(onError)

};
/**
 *
 */
Spawner.prototype.stop = function(meta, cb) {
	var username = meta.user.username;
	var name = meta.package.name;
	var self = this

	if (!this.records[username] || typeof this.records[username][name] === 'undefined') {
		return this.emit(new Error('Cannot stop application that is not running.'), meta);
	} else if (!Object.keys(this.records[username][name].spawns).length) {
		return this.emit(new Error('Cannot stop spawn that is not running.'), meta);
	}

	var record = this.records[username][name]

	async.forEach(Object.keys(record.spawns), function(uid, next) {
		self.stopOne(meta, uid, next)
	}, cb ? cb : function() {

	});
};
/**
 *
 */
Spawner.prototype.stopOne = function(meta, uid, cb) {

	var username = meta.user.username;
	var name = meta.package.name;

	if (!this.records[username] || typeof this.records[username][name] === 'undefined') {
		return this.emit('error', new Error('Cannot stop application that is not running.'), meta);
	} else if (!this.records[username][name].spawns[uid]) {
		return this.emit('error', new Error('Cannot stop spawn that is not running.'), meta);
	}

	var self = this
	var record = this.records[username][name]
	var spawn = this.records[username][name].spawns[uid]
	var results = [];

	function onStop() {
		spawn.monitor.removeListener('error', onErr);
		self._remove(record, username, uid, function(err, result) {
			if (err) {
				return self.emit('error', err, meta)
			}
			self.count--
			self.emit('stop', result, meta)
		});
		if (cb) {
			cb()
		}
	}

	function onErr(err) {
		spawn.monitor.removeListener('stop', onStop);
		self.emit('error', err, meta)

		if (cb) {
			cb()
		}
	}


	spawn.once('stop', onStop);
	spawn.once('error', onErr);

	try {
		spawn.stop();
	} catch (err) {
		onErr(err);
	}
};
/**
 *
 */
Spawner.prototype.stopAll = function(cb) {
	var self = this
	async.forEach(Object.keys(this.records), function(username, next) {
		async.forEach(Object.keys(self.records[username]), function(name, next2) {
			self.stop({
				package : {
					name : name
				},
				user : {
					username : username
				}
			}, next2)
		}, next);
	}, cb);
};
/**
 *
 */
Spawner.prototype.deploy = function(meta, cb) {
	var username = meta.user.username;
	var name = meta.package.name;
	var self = this

	console.log(this.records)
	if (!this.records[username] || typeof this.records[username][name] === 'undefined') {
		this.start(meta, cb)
	} else if (!Object.keys(this.records[username][name].spawns).length) {
		this.start(meta, cb)
	} else {
		var keys = Object.keys(this.records[username][name].spawns)
		this.start(meta, function() {
			async.forEach(keys, function(uid, next) {
				self.stopOne(meta, uid, next)
			}, cb ? cb : function() {

			});
		})
	}

};
/**
 *
 */
Spawner.prototype.restart = function() {
	//
};
/**
 *
 */
Spawner.prototype.error = function() {
	//
};
/**
 *
 */
Spawner.prototype.spawn = function() {
	//
};
/**
 *
 */
Spawner.prototype.spawn = function() {
	//
};
/**
 *
 */
Spawner.prototype.spawn = function() {
	//
};
/**
 *
 */
Spawner.prototype.spawn = function() {
	//
};

/**
 *
 */
Spawner.prototype.spawn = function() {
	//
};

/**
 *
 */
Spawner.prototype.spawn = function() {
	//
};

/**
 *
 */
Spawner.prototype.spawn = function() {
	//
};

/**
 *
 */
Spawner.prototype.spawn = function() {
	//
};

/**
 *
 */
Spawner.prototype.spawn = function() {
	//
};

/**
 *
 */
Spawner.prototype.spawn = function() {
	//
};

Spawner.prototype._add = function(meta, spawn, callback) {

	var username = meta.user.username;
	var package = meta.package;
	var name = package.name;
	var self = this

	this.records[username] = this.records[username] || {};

	this.records[username][name] = this.records[username][name] || {};

	var record = this.records[username][name];

	if (!record.package) {
		//
		// If we have not yet created a record for this app
		// then sanitize the data in the app and update the record.
		//
		['domain', 'domains', 'subdomain', 'subdomains'].forEach(function(prop) {
			if (!package[prop]) {
				return;
			}

			if (Array.isArray(package[prop])) {
				package[prop] = package[prop].map(function(value) {
					return value.toLowerCase();
				});
			} else if ( typeof package[prop] === 'string') {
				package[prop].toLowerCase();
			}
		});

		record.package = package;
		record.spawns = {};
	}

	var uid = spawn.uid;
	record.spawns[uid] = spawn;
	spawn.stats.on('update', function(stats) {
		self.emit('stats', spawn.stats.data, meta)
	})
	callback(null, self._formatRecord(spawn, package))
};
/**
 *
 */
Spawner.prototype._remove = function(record, username, uid, callback) {
	var self = this;
	delete record.spawns[uid];

	if (Object.keys(record.spawns).length === 0) {
		delete this.records[username][record.package.name];
	}

	callback();
};
/**
 *
 */
Spawner.prototype._formatRecord = function(spawn, package) {
	var response = {};

	if (spawn.socket && spawn.socket.port) {
		response.port = spawn.socket.port;
		response.host = spawn.socket.host;
	}

	response.stats = spawn.stats.data;
	response.stdout = spawn.stdout;
	response.stderr = spawn.stderr;
	response.npmlog = spawn.snapshot.npmlog;

	response.uid = spawn.uid;
	response.ctime = spawn.data.ctime;
	response.uptime = Date.now() - spawn.data.ctime;
	response.status = spawn._stage

	response.name = package.name;

	return response;
};
/**
 *
 */
Spawner.prototype.spawn = function(meta) {
	return new Spawn(meta)
};

