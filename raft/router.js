/*
 *
 * (C) 2013, MangoRaft.
 *
 */
var util = require('util')
var fs = require('fs')
var net = require('net')
var path = require('path');
var cluster = require('cluster');
var bouncy = require('bouncy');
var http = require('http');
var os = require('os')
var events = require('events')
var qs = require('querystring')
var ejs = require('ejs');
var raft = require('../raft');
var Stats = require('./stats').Stats

var async = raft.common.async;
var server = raft.common.server;

ejs.open = '{{';
ejs.close = '}}';
var compiled = function() {

}
//
//
//
fs.readFile(__dirname + '/../public/code.html', function(err, data) {
	if (err)
		throw err;
	compiled = ejs.compile(data.toString(), {});
});

exports.__defineGetter__("cluster", function() {
	return cluster
});

var Router = exports.Router = function(options) {
	events.EventEmitter.call(this);

	var self = this;
	this.count = 0
	this.domains = {
		//Domain : app
	};
	this.domainsTmp = {
		//Domain : app
	};
	this.stats = {
		requests : 0,
		bytesRead : 0,
		bytesWritten : 0
	};
	process.on('message', function(msg) {
		var cmd;
		if ( cmd = msg.cmd) {
			if (cmd === 'add.package') {
				self.addPackage(msg.package)
			} else if (cmd === 'add.spawn') {
				self.addSpawn(msg.spawn, msg.package)
			} else if (cmd === 'destroy.spawn') {
				self.destroySpawn(msg.spawn, msg.package)
			} else if (cmd === 'sync') {
				self.syncSpawns(msg)
			}

		}
	});
};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(Router, events.EventEmitter);

Router.prototype.handle = function(req, res, bounce) {
	var self = this

	if (!req.headers.host) {
		raft.log('info', 'router', 'No HOST header included')
		return this.serveText(req, res, bounce, {
			code : 400,
			message : 'No HOST header included'
		});
	}

	var domain = req.headers.host.split(':')[0];
	var package = this.domains[domain]

	var spawn;

	if (!package) {
		raft.log('info', 'router', 'Package not found => ' + domain)
		return this.serveText(req, res, bounce, {
			code : 404,
			message : 'Package not found'
		});
	}
	if (!package.spawns.length) {

		raft.log('info', 'router', 'Package offline => ' + domain)
		return this.serveText(req, res, bounce, {
			code : 503,
			message : 'Package offline'
		});
	}

	spawn = package.spawns.shift()

	package.spawns.push(spawn)

	var socket = net.connect({
		port : spawn.port,
		host : spawn.host
	})
	
	bounce({
		stream : socket,
		headers : {
			portsss : spawn.port,
			hostsss : spawn.host
		}
	});
};

Router.prototype.serveText = function(req, res, bounce, data) {
	var text = data.message
	var diff = Date.now() - req.ptime;
	if (data.meta) {
		text = [message, qs.unescape(qs.stringify(data.meta, ', '))].join(' | ');
	}

	text = compiled({
		text : text,
		code : data.code
	}, {})

	res.statusCode = data.code;

	res.setHeader('content-type', 'text/html');
	res.setHeader('x-powered-by', 'raft');

	if (req.method !== 'HEAD') {
		res.write(text);
	}

	res.end();
};

Router.prototype.close = function() {
	this.httpProxy.close();
};
Router.prototype.addPackage = function(package) {
	var name = package.name;
	var domain = package.domain;
	if (domain == undefined || domain === 'undefined') {
		return false
	}
	if (!this.domains[domain]) {
		this.domains[domain] = new Package(package)
	}
	if (cluster.isMaster) {
		Object.keys(cluster.workers).forEach(function(id) {
			cluster.workers[id].send({
				cmd : 'add.package',
				package : {
					domain : package.domain
				}
			});
		});
	}

	return true
};

Router.prototype.removeUid = function(uid) {
	var self = this
	Object.keys(this.domains).forEach(function(domain) {
		var spawns = self.domains[domain].spawns
		var s = []
		for (var i = 0; i < spawns.length; i++) {
			var spawn = spawns[i]
			if (spawn.uid == uid) {
				s.push(spawn)
			}
		};
		s.forEach(function(spawn) {
			self.destroySpawn(spawn, {
				domain : domain
			})
		})
	})
};

Router.prototype.addSpawn = function(spawn, package) {
	var domain = package.domain
	var domains;
	if (!this.domains[domain]) {
		this.addPackage(package)
	}

	domains = this.domains[domain]
	domains.spawns.push(spawn)
	if (cluster.isMaster) {
		Object.keys(cluster.workers).forEach(function(id) {
			cluster.workers[id].send({
				cmd : 'add.spawn',
				spawn : spawn,
				package : package
			});
		});
		raft.log('router', spawn.uid, 'Route added ' + package.domain + '=>' + spawn.host + ':' + spawn.port)
	}
	return true
};

Router.prototype.destroySpawn = function(spawn, package) {

	if (!this.domains[package.domain]) {
		return false
	}
	var domains = this.domains[package.domain]

	for (var i = 0, j = domains.spawns.length; i < j; i++) {
		if (domains.spawns[i].port === spawn.port && domains.spawns[i].host === spawn.host) {
			domains.spawns.splice(i, 1)
			break
		}
	};
	if (cluster.isMaster) {
		Object.keys(cluster.workers).forEach(function(id) {
			cluster.workers[id].send({
				cmd : 'destroy.spawn',
				spawn : spawn,
				package : package
			});
		});
		raft.log('router', spawn.uid, 'Route removed ' + package.domain + '=>' + spawn.host + ':' + spawn.port)
	}

};

Router.prototype.syncRequests = function(msg) {
	var domains = msg.domains
	var selfDomains = this.domains
	var self = this;
	var domainKeys = Object.keys(domains)

	domainKeys.forEach(function(domain) {
		var sentDomain = domains[domain]
		var selfDomain = selfDomains[domain]
		for (var key in sentDomain.stats) {
			self.stats[key] = self.stats[key] + sentDomain.stats[key];
			selfDomain.stats[key] = selfDomain.stats[key] + sentDomain.stats[key]
		}
	})
}
Router.prototype.sync = function() {
	var self = this
	if (cluster.isMaster) {
		Object.keys(cluster.workers).forEach(function(id) {
			cluster.workers[id].send({
				cmd : 'sync',
				packages : self.domains
			});
		});
	}
}
Router.prototype.syncSpawns = function(msg) {
	var packages = msg.packages
	var keys = Object.keys(packages)
	var self = this
	keys.forEach(function(key) {
		self.addPackage(packages[key].package)
		packages[key].spawns.forEach(function(spawn) {

		})
	})
}

Router.prototype.fork = function(callback) {
	var self = this
	if (cluster.isMaster) {

		var worker = cluster.fork();
		exports.count++
		worker.once('listening', function() {
			worker.stats = new Stats({
				name : 'process-load-proxy',
				pid : worker.process.pid,
				uid : worker.id,
				dir : worker.id
			})
			worker.once('exit', function(code, signal) {
				worker.stats.kill()
				self.count--
				if (code !== 0) {
					self.fork(function() {

					})
				}
			})
			self.sync()
		});
		worker.once('listening', callback)
		worker.on('message', function(msg) {
			var cmd;
			if ( cmd = msg.cmd) {
				if (cmd === 'add.package') {
					self.addPackage(msg.package)
				} else if (cmd === 'add.spawn') {
					self.addSpawn(msg.spawn, msg.package)
				} else if (cmd === 'destroy.spawn') {
					self.destroySpawn(msg.spawn, msg.package)
				} else if (cmd === 'sync') {
					self.syncSpawns(msg)
				} else if (cmd === 'logger') {
					raft.log(msg.data.from, msg.data.uid, msg.data.message)
				}

			}
		})
	} else {
		this.emit('error', new Error('can not fork from worker'))
	}
}
Router.prototype.killOne = function(callback) {
	var self = this
	var id = Object.keys(cluster.workers)[0]

	if (!id) {
		return callback()
	}
	self.count--;
	cluster.workers[id].disconnect()
	cluster.workers[id].once('disconnect', callback);
}

Router.prototype.start = function(callback) {
	var self = this
	cluster.setupMaster({
		exec : __dirname + '/../scripts/fork.js',
		args : ['8000'],
		silent : false
	})
}

Router.prototype.listen = function(callback) {
	var server = this.server = bouncy(this.handle.bind(this));
	server.listen(Number(process.argv[2] || 8000));
}
function Package(package) {
	this.spawns = []
	this.stats = {
		requests : 0,
		bytesRead : 0,
		bytesWritten : 0
	}
	this.package = package;
	this.domain = package.domain;
}

Package.prototype.update = function(r, w) {
	var stats = this.stats;
	stats.requests = stats.requests + 1;
	stats.bytesRead = stats.bytesRead + r;
	stats.bytesWritten = stats.bytesWritten + w;
}
