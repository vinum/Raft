/*
 * index.js: Top-level include for the drone module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var util = require('util')
var fs = require('fs')
var net = require('net')
var path = require('path');
var cluster = require('cluster');
var http = require('http');
var os = require('os')
var events = require('events')
var qs = require('querystring')
var ejs = require('ejs');
var raft = require('../../raft');
var Stats = require('./stats')

var async = raft.common.async;
var server = raft.common.server;

ejs.open = '{{';
ejs.close = '}}';
var compiled = function() {

}
//
//
//

fs.readFile(__dirname + '/static/404.html', function(err, data) {
	if (err)
		throw err;
	compiled = ejs.compile(data.toString(), {});
});

//
// ### @matchers
// Regular expression parsers for handling different
// persistent storage files used by `raft`.
//
var matchers = {
	app : /^([\w|\-]+)\.package\.json/,
	pid : /^([\w|\-]+)\.(\d+)\.json/
};
exports.__defineGetter__("cluster", function() {
	return cluster
});
//
// ### function Balancer (options)
// #### @options {Object} Options for this instance.
// Constructor function for the `raft` Balancer responsible
// for load balancing across all applications know to raft on
// this machine.
//
var Balancer = exports.Balancer = function(options) {
	events.EventEmitter.call(this);

	var self = this;

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
};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(Balancer, events.EventEmitter);

//
// ### function handle (req, res)
// #### @req {ServerRequest} Incoming server request to balancer
// #### @res {ServerResponse} Outoing server request to write to.
// Attempts to proxy the incoming request to the specified application
// by using the `req.headers.host` property.
//
Balancer.prototype.handle = function(req, bounce) {
	var self = this

	if (!req.headers.host) {
		return this.serveText(req, bounce, {
			code : 400,
			message : 'No HOST header included'
		});
	}

	var domain = req.headers.host.split(':')[0];
	var app = this.domains[domain]

	var drone;

	if (!app)
		return this.serveText(req, bounce, {
			code : 404,
			message : 'App not found for domain: ' + domain
		});
	if (!app.drones.length)
		return this.serveText(req, bounce, {
			code : 404,
			message : 'Drone not found for : ' + domain
		});

	drone = app.drones.shift()
	app.drones.push(drone)

	var socket = net.connect({
		port : drone.port,
		host : drone.host
	}).on('error', function(err) {
		return self.serveText(req, bounce, {
			code : 502,
			message : err.message
		});
	})

	socket.on('end', function() {
		app.update(socket.bytesRead || 0, socket.bytesWritten || 0)
	});

	bounce(socket);
};

//
// ### function serveText (req, res, data)
// #### @req {ServerRequest} Incoming server request
// #### @res {ServerResponse} Outoing server request to write to.
// Writes `data.message` to the outgoing `res` along with any
// metadata passed as `data.meta`.
//
Balancer.prototype.serveText = function(req, bounce, data) {
	var text = data.message, diff = Date.now() - req.ptime;
	var res = bounce.respond();
	if (data.meta) {
		text = [message, qs.unescape(qs.stringify(data.meta, ', '))].join(' | ');
	}

	text = compiled({
		TEXT : text
	}, {})

	res.statusCode = data.code;

	res.setHeader('content-type', 'text/html');
	res.setHeader('x-powered-by', 'raft');

	if (req.method !== 'HEAD') {
		res.write(text);
	}

	res.end();
};

//
// ### function close ()
// Closes this balancer by shutting down the child
// `HttpProxy` instance.
//
Balancer.prototype.close = function() {
	this.httpProxy.close();
};
function App(app) {
	this.drones = []
	this.stats = {
		requests : 0,
		bytesRead : 0,
		bytesWritten : 0
	}
	this.app = app;
	this.domain = app.domain;
}

App.prototype.update = function(r, w) {
	var stats = this.stats;
	stats.requests = stats.requests + 1;
	stats.bytesRead = stats.bytesRead + r;
	stats.bytesWritten = stats.bytesWritten + w;
}

Balancer.prototype.addApp = function(app) {
	var name = app.name;
	var domain = app.domain;
	if (domain == undefined || domain === 'undefined') {
		return false
	}
	if (!this.domains[domain]) {
		this.domains[domain] = new App(app)
	}
	return true
};

Balancer.prototype.destroyApp = function(app, callback) {
	var user = app.user, userApps = this.users[user], name = app.name, empty = true;

	if (!userApps) {
		return callback('User "' + user + '" does not exists.');
	}

	app = userApps[name];
	if (!app) {
		return callback('User "' + user + '" has no app "' + name + '"');
	}
	delete userApps[name];
	for (var k in userApps) {
		empty = false;
		break;
	}

	if (empty) {
		delete this.users[user];
	}

	return callback();
};
Balancer.prototype.addDrone = function(drone, app) {
	var domain = app.domain
	var domains;
	if (!this.domains[domain]) {
		this.addApp(app)
	}

	domains = this.domains[domain]
	domains.drones.push(drone)

	return true
};

Balancer.prototype.destroyDrone = function(drone, app, callback) {
	if (!this.domains[app.domain]) {
		return false
	}
	var domains = this.domains[app.domain]

	for (var i = 0, j = domains.drones.length; i < j; i++) {
		if (domains.drones[i].port === drone.port && domains.drones[i].host === drone.host) {
			domains.drones.splice(i, 1)
			break
		}
	};

};

Balancer.prototype.syncRequestsUpdate = function(msg) {
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
//
// ### Include Exports
// Export other components in the module
//
exports.started = false;
exports.balancer = new Balancer();
//
// ### Include Exports
// Export other components in the module
//
exports.hosts = {};
/**
 *
 *
 * @param {Object} options
 * @param {Object} callback
 */

exports.addApp = function(app) {
	exports.balancer.addApp(app)
	Object.keys(cluster.workers).forEach(function(id) {
		cluster.workers[id].send({
			cmd : 'addApp',
			app : {
				domain : app.domain
			}
		});
	});
}
exports.destroyApp = function(app) {
	exports.balancer.destroyApp(app)

	Object.keys(cluster.workers).forEach(function(id) {
		cluster.workers[id].send({
			cmd : 'destroyApp',
			app : {
				domain : app.domain
			}
		});
	});
}
exports.addDrone = function(drone, app) {
	exports.balancer.addDrone({
		host : drone.host,
		port : drone.port
	}, {
		domain : app.domain
	})
	Object.keys(cluster.workers).forEach(function(id) {
		cluster.workers[id].send({
			cmd : 'addDrone',
			app : {
				domain : app.domain
			},
			drone : {
				host : drone.host,
				port : drone.port
			}
		});
	});
}
exports.destroyDrone = function(drone, app) {
	exports.balancer.destroyDrone({
		host : drone.host,
		port : drone.port
	}, {
		domain : app.domain
	})
	Object.keys(cluster.workers).forEach(function(id) {
		cluster.workers[id].send({
			cmd : 'destroyDrone',
			drone : {
				host : drone.host,
				port : drone.port
			},
			app : {
				domain : app.domain
			}
		});
	});
}
exports.syncRequests = function() {

	Object.keys(cluster.workers).forEach(function(id) {
		cluster.workers[id].send({
			cmd : 'syncRequests'
		});
	});
}
exports.sync = function() {
	Object.keys(cluster.workers).forEach(function(id) {
		cluster.workers[id].send({
			cmd : 'sync',
			domains : exports.balancer.domains
		});
	});
}
exports.fork = function(callback) {
	var worker = cluster.fork().on('message', exports.balancer.syncRequestsUpdate.bind(exports.balancer));

	worker.once('listening', callback)
	worker.once('listening', function() {
		worker.stats = new Stats({
			name : 'process-load-proxy',
			user : raft.config.get('system:username'),
			pid : worker.process.pid,
			uid : worker.id,
			dir : worker.id
		})
		worker.once('exit', function(code, signal) {
			worker.stats.kill()
		})
		exports.sync()
	});
}
exports.killOne = function(callback) {
	var id = Object.keys(cluster.workers)[0]

	if (!id) {
		return callback()
	}

	cluster.workers[id].disconnect()
	cluster.workers[id].once('disconnect', callback);
}
//
// ### function start (options, callback)
// #### @options {Object} Options to use when starting this module.
// #### @callback {function} Continuation to respond to when complete.
// Starts the raft `drone` webservice with the specified options.
//
exports.start = function(callback) {
	if (exports.started) {
		return callback();
	}
	cluster.setupMaster({
		exec : __dirname + '/fork.js',
		args : raft.config.get('proxy:port') ? [raft.config.get('proxy:port')] : ['8000'],
		silent : raft.config.get('proxy:silent') || false
	})

	exports.fork(callback)
	exports.sync()
	setInterval(exports.syncRequests, raft.config.get('timmer:proxy') || 1000)

}
//
// ### function stop (callback)
// #### @cleanup {bool} (optional) Remove all autostart files (default=true).
// #### @callback {function} Continuation to respond to when complete.
// Gracefully stops `drone` instance
//
exports.stop = function(cleanup, callback) {

	if (!exports.started) {
		return callback ? callback() : null;
	}

	//kill the cluster
	cluster.disconnect()

	exports.started = false;
	callback ? callback() : null;
}
