var util = require('util');
var crypto = require('crypto');
var http = require('http');
var fs = require('fs');
var path = require('path');
var events = require('events');
var restify = require('restify');

var raft = require('../../raft')
var MESSAGE_BACKLOG = 200
var SESSION_TIMEOUT = 60 * 1000;
var sessions = {};

var starttime = (new Date()).getTime();

var mem = process.memoryUsage();
// every 10 seconds poll for the memory.
setInterval(function() {
	mem = process.memoryUsage();
}, 10 * 1000);
// interval to kill off old sessions
setInterval(function() {
	var now = new Date();
	for (var id in sessions) {
		if (!sessions.hasOwnProperty(id))
			continue;
		var session = sessions[id];

		if (now - session.timestamp > SESSION_TIMEOUT) {
			session.destroy();
		}
	}
}, 1000);
function Channel() {
	var messages = [], callbacks = [];
	var self = this
	this.rpc = new raft.common.Module(function(data) {
		self.appendMessage('msg', data)
	})
	this.appendMessage = function(type, data) {
		var m = {
			type : type,
			data : data,
			timestamp : (new Date()).getTime()
		};

		messages.push(m);

		while (callbacks.length > 0) {
			callbacks.shift().callback([m]);
		}

		while (messages.length > MESSAGE_BACKLOG)
		messages.shift();
	};

	this.query = function(since, callback) {
		var matching = [];
		for (var i = 0; i < messages.length; i++) {
			var message = messages[i];
			if (message.timestamp > since)
				matching.push(message)
		}

		if (matching.length != 0) {
			callback(matching);
		} else {
			callbacks.push({
				timestamp : new Date(),
				callback : callback
			});
		}
	};

	// clear old callbacks
	// they can hang around for at most 30 seconds.
	setInterval(function() {
		var now = new Date();
		while (callbacks.length > 0 && now - callbacks[0].timestamp > 30 * 1000) {
			callbacks.shift().callback([]);
		}
	}, 25000);
};

function createSession(username, password, service, callback) {

	raft.user.auth(username, password, function(err, user) {
		if (err) {
			return callback(err)
		}

		for (var i in sessions) {
			var session = sessions[i];
			if (session && session.username === username)
				return null;
		}
		var session = {
			username : username,
			user : user,
			channel : new Channel,
			id : Math.floor(Math.random() * 99999999999).toString(),
			timestamp : new Date(),

			poke : function() {
				session.timestamp = new Date();
			},

			destroy : function() {
				delete sessions[session.id];
			}
		};
		session.channel.rpc.functions = service.rpc[user.privilege].functions;
		sessions[session.id] = session;
		callback(null, session)
	})
}

module.exports = function(service) {

	service.server.post('/stream/join', function(req, res, next) {
		if ( typeof req.body === 'string') {
			var data = JSON.parse(req.body)
		} else {
			return res.send(500, new Error('Body must be json'));
		}

		createSession(data.username, data.password, service, function(err, session) {
			if (err) {
				return next(err)
			}
			if (session == null) {
				res.send(400, {
					error : "Nick in use"
				});
				return;
			}

			res.send(200, {
				id : session.id,
				username : session.username,
				rss : mem.rss,
				starttime : starttime
			});
		});

	});
	service.server.get('/stream/part', function(req, res, next) {
		var id = req.query.id;
		var session;
		if (id && sessions[id]) {
			session = sessions[id];
			session.destroy();
		}
		res.send(200, {
			rss : mem.rss
		});
	});
	service.server.get('/stream/recv', function(req, res, next) {
		if (!req.query.since) {
			res.send(400, {
				error : "Must supply since parameter"
			});
			return;
		}
		var id = req.query.id;
		var session;
		if (id && sessions[id]) {
			session = sessions[id];
			session.poke();
		} else {
			res.send(400, {
				error : "No such session id"
			});
			return;
		}
		var since = parseInt(req.query.since, 10);

		session.channel.query(since, function(messages) {
			if (session)
				session.poke();
			res.send(200, {
				messages : messages,
				rss : mem.rss
			});
		});
	});
	service.server.post('/stream/send', function(req, res, next) {
		if ( typeof req.body === 'string') {
			var data = JSON.parse(req.body)
		} else {
			return res.send(500, new Error('Body must be json'));
		}
		var id = req.query.id;

		var session = sessions[id];
		if (!session || !data) {
			res.send(400, {
				error : "No such session id"
			});
			return;
		}

		session.poke();

		session.channel.rpc.requestEvent(data);
		res.send(200, {
			rss : mem.rss
		});
	});
}
