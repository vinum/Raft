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

var raft = require('../../');
var utils = raft.utils;
var Module = raft.rpc.Module;
var ip = raft.utils.getIp().address

if (Number(ip.split('.').shift()) === 10) {
	raft.utils.getExternalIp(function(err, pi) {
		ip = pi
	})
}
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
 * build
 */
Parts.prototype.build = function(callBack) {

	var env = this.env;

	env.set('servers', this);
	callBack()
}
/**
 * createHttpServer
 */
Parts.prototype.httpServer = Servers.prototype.createServer = function(cb) {
	var env = this.env
	var listen = http.Server.prototype.listen;
	var close = http.Server.prototype.close;

	function Server() {
		http.Server.apply(this, arguments);

	}


	util.inherits(Server, http.Server);

	Server.prototype.listen = function(domain, cb) {
		console.log(domain)
		var self = this
		this._domain = domain
		listen.call(this, function() {
			new raft.mongo.BouncyHosts({
				host : ip,
				port : self.address().port,
				domain : domain,
				appid : env.config.id,
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
			host : ip,
			port : self.address().port,
			domain : self._domain,
			appid : env.config.id
		}, function() {
			//try {
			close.call(self, cb);
			//} catch(e) {
			//cb && cb()
			//}
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
		this._domain = domain
		listen.call(this, function() {
			new raft.mongo.BouncyHosts({
				host : ip,
				port : self.address().port,
				domain : domain,
				appid : env.config.id,
				workerKey : raft.config.workerKey
			}).save(function() {
				if (cb) {
					cb()
				}
			})
		});
	}
	Server.prototype.close = function(cb) {
		raft.mongo.BouncyHosts.remove({
			host : ip,
			port : self.address().port,
			domain : self._domain,
			appid : env.config.id
		}, function() {
			close.call(this, cb);
		})
	}
	return new Server(cb);
}
/**
 * createHttpServer
 */
Parts.prototype.addDomain = function(domain, port, cb) {
	new raft.mongo.BouncyHosts({
		host : ip,
		port : port,
		domain : domain,
		appid : env.config.id,
		workerKey : raft.config.workerKey
	}).save(function(err) {

		if (cb) {
			cb()
		}
	})
}
/**
 * createHttpServer
 */
Parts.prototype.removeDomain = function(domain, cb) {
	raft.mongo.BouncyHosts.remove({
		host : ip,
		port : self.address().port,
		domain : domain,
		appid : env.config.id
	}, function() {
		cb()
	})
}
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
		console.log(domain)
		listen.call(this, function() {

			console.log('ready', {
				host : ip,
				port : self.address().port,
				domain : domain,
				appid : env.config.id
			})
			new raft.mongo.BouncyHosts({
				host : ip,
				port : self.address().port,
				domain : domain,
				appid : env.config.id,
				workerKey : raft.config.workerKey
			}).save(function(err) {
				console.log('save', err, domain)

				if (cb) {
					cb()
				}
			})
		});
	}
	server.close = function(cb) {
		var self = this
		raft.mongo.BouncyHosts.remove({
			host : ip,
			port : self.address().port,
			domain : self._domain,
			appid : env.config.id
		}, function() {
			close.call(this, cb);
		})
	}
	return server

}