/***
 * Node modules
 */

var events = require('events');
var util = require('util');
var url = require("url");
var path = require('path');
var qs = require("querystring");
var http = require("http");
var https = require("https");
var net = require("net");
var express = require('express');
var fs = require('fs');

//

var raft = require('raft');
var utils = raft.utils;
var Module = raft.rpc.Module;

/**
 *
 */
var Parts = module.exports = function(env) {
	events.EventEmitter.call(this);
	this.env = env;
	env.set('servers', this);
}
/***
 * Make it an event
 */
util.inherits(Parts, events.EventEmitter);

/**
 * createHttpServer
 */
Parts.prototype.httpServer = Parts.prototype.createServer = function(cb) {
	var env = this.env
	var listen = http.Server.prototype.listen;
	var close = http.Server.prototype.close;

	function Server() {
		http.Server.apply(this, arguments);

	}


	util.inherits(Server, http.Server);

	Server.prototype.listen = function(domain, cb) {
		var self = this
		this._domain = domain
		listen.call(this, function() {
			new raft.mongo.BouncyHosts({
				host : raft.ip,
				port : self.address().port,
				domain : domain,
				appid : env.config.appid,
				workerKey : raft.config.workerKey
			}).save(function() {
				if (cb) {
					cb()
				}
			})
		});
	}
	Server.prototype.close = function(cb) {
		var self = this
		raft.mongo.BouncyHosts.remove({
			host : raft.ip,
			port : self.address().port,
			domain : self._domain,
			appid : env.config.appid
		}, function() {
			close.call(self, cb);
		})
	}

	return new Server(cb);
}
/**
 * createHttpServer
 */
Parts.prototype.tcpServer = function(cb) {
	var listen = net.Server.prototype.listen;
	var close = net.Server.prototype.close;

	function Server() {
		net.Server.apply(this, arguments);
	}


	util.inherits(Server, net.Server);

	Server.prototype.listen = function(domain, cb) {
		var self = this
		this._domain = domain;
		listen.call(this, function() {
			new raft.mongo.BouncyHosts({
				host : ip,
				port : self.address().port,
				domain : domain,
				appid : env.config.appid,
				workerKey : raft.config.workerKey
			}).save(function() {
				if (cb) {
					cb()
				}
			})
		});
	}
	Server.prototype.close = function(cb) {
		var self = this
		raft.mongo.BouncyHosts.remove({
			host : raft.ip,
			port : self.address().port,
			domain : self._domain,
			appid : env.config.appid
		}, function() {
			close.call(this, cb);
		})
	}
	return new Server(cb);
}
/**
 * createHttpServer
 */
Parts.prototype.addDomain = function() {

	if (arguments.length === 4) {
		var ip = arguments[0]
		var domain = arguments[1]
		var port = arguments[2]
		var cb = arguments[3]
	} else {
		var ip = raft.ip
		var domain = arguments[0]
		var port = arguments[1]
		var cb = arguments[2]

	}

	var env = this.env
	
	new raft.mongo.BouncyHosts({
		host : ip,
		port : port,
		domain : domain,
		appid : env.config.appid,
		workerKey : raft.config.workerKey
	}).save(function(err) {
		cb()
	})
}
/**
 * createHttpServer
 */
Parts.prototype.removeDomain = function(domain, cb) {

	var env = this.env
	raft.mongo.BouncyHosts.remove({
		domain : domain,
		appid : env.config.appid
	}, function() {
		cb()
	})
}
/**
 * createHttpServer
 */
Parts.prototype.express = express
/**
 * createHttpServer
 */
Parts.prototype.expressServer = function() {
	var env = this.env

	var server = express.createServer()
	var listen = server.listen;
	var close = server.close;

	server.listen = function(domain, cb) {
		var self = this
		this._domain = domain
		listen.call(this, function() {
			new raft.mongo.BouncyHosts({
				host : raft.ip,
				port : self.address().port,
				domain : domain,
				appid : env.config.appid,
				workerKey : raft.config.workerKey
			}).save(function(err) {
				if (cb) {
					cb()
				}
			})
		});
	}
	server.close = function(cb) {
		var self = this
		raft.mongo.BouncyHosts.remove({
			host : raft.ip,
			port : self.address().port,
			domain : self._domain,
			appid : env.config.appid
		}, function() {
			close.call(this, cb);
		})
	}
	return server

}