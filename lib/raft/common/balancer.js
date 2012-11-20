/*
 * proxy.js: Responsible for proxying across all applications available to raft.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var util = require('util')
var path = require('path')
var fs = require('fs')
var net = require('net')
var events = require('events')
var qs = require('querystring')
var ejs = require('ejs');
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

//
// ### function Balancer (options)
// #### @options {Object} Options for this instance.
// Constructor function for the `raft` Balancer responsible
// for load balancing across all applications know to raft on
// this machine.
//
var Balancer = module.exports = function(options) {
	events.EventEmitter.call(this);

	var self = this;

	this.domains = {
		//Domain : app
	};
	this.domainsTmp = {
		//Domain : app
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
	var domainKeys = Object.keys(domains)
	domainKeys.forEach(function(domain) {
		var sentDomain = domains[domain]
		var selfDomain = selfDomains[domain]
		for (var key in sentDomain.stats) {
			selfDomain.stats[key] = selfDomain.stats[key] + sentDomain.stats[key]
		}
	})
}
