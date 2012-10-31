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
var raft = require('../../raft');
var cache404 = ''
//
//
//

fs.readFile(__dirname + '/static/404.html', function(err, data) {
	if (err)
		throw err;
	cache404 = data.toString();
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

	//
	// Setup shared state for the `raft.ProcessStore`.
	//
	//app : {name:...,user:...,drones:...[],domains:...[],proxies:{desiredport:[{droneid:,port:}]}}
	this.users = {
		//user : apps{ name: app}
	};
	this.domains = {
		//Domain : app
	};
	this.drones = {
		//id : {id: ..., user : ..., app:  ..., proxies: ...}
	};
	this.proxies = {};
	this.active = {};

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
	var domain = req.headers.host.split(':')[0];
	var app = this.domains[domain]

	var drone;

	if (!app) {
		return this.serveText(req, bounce, {
			code : 400,
			message : 'App not found for domain: ' + domain
		});
	}
	if (!app.drones.length) {
		return this.serveText(req, bounce, {
			code : 400,
			message : 'Drone not found for : ' + domain
		});
	}
	var drone = app.drones.shift()

	app.drones.push(drone)

	app.requests = app.requests + 1;

	req.ptime = Date.now();
	//raft.emit('balancer:incoming', 'info', req.headers);

	var bytesWritten = 0
	var bytesRead = 0

	var socket = net.connect({
		port : drone.port,
		host : drone.host
	}).on('error', function(err) {
		return self.serveText(req, bounce, {
			code : 400,
			message : err.message
		});
	}).on('data', function(c) {
		app.bytesRead += c.length
	})
	socket.__write = socket.write
	socket.__end = socket.end
	socket.write = function(c) {
		app.bytesWritten += c.length
		socket.__write.call(this, c)
	}
	socket.end = function(c) {
		if (c)
			app.bytesWritten += c.length
		socket.__end.call(this, c)
	}
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
	text = cache404.replace('{TEXT}', text)

	res.statusCode = data.code;
	res.setHeader('content-type', 'text/html');
	res.setHeader('x-powered-by', 'raft');

	if (req.method !== 'HEAD') {
		res.write(text);
	}

	raft.emit('balancer:serve', 'info', {
		text : text,
		code : data.code,
		time : diff + 'ms'
	});

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

Balancer.prototype.addApp = function(app) {
	var name = app.name;
	var domain = app.domain;

	if (!this.domains[domain]) {
		this.domains[domain] = {
			drones : [],
			requests : 0,
			bytesRead : 0,
			bytesWritten : 0,
			app : app
		}
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

Balancer.prototype.destroyDrone = function(droneHash, app, callback) {
	//console.log(app, droneHash, this.domains[app.domain])
	if (!this.domains[app.domain]) {
		return false
	}
	var domains = this.domains[app.domain]

	for (var i = 0, j = domains.drones.length; i < j; i++) {
		if (domains.drones[i].hash === droneHash) {
			domains.drones.splice(i, 1)
			break
		}
	};

};

Balancer.prototype.syncRequests = function() {

};

Balancer.prototype.syncRequestsUpdate = function(domains) {

	var requests = 0
	for (var domain in domains) {
		var app = domains[domain]
		if (this.domains[domain]) {
			requests += domains[domain].requests
			this.domains[domain].bytesWritten += domains[domain].bytesWritten;
			this.domains[domain].bytesRead += domains[domain].bytesRead;
			this.domains[domain].requests += domains[domain].requests;
		}
	}
};
