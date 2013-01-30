var raft = require('../../../raft')
function authSocket(data, socket, callback) {
	raft.mongoose.User.getAuthenticated(data.username, data.password, function(err, user, reason) {
		if (err) {

		}
		if (user) {
			var rpc = new raft.common.Module(function(data) {
				socket.emit('rpc', data);
			})
			socket.on('rpc', function(data) {
				rpc.requestEvent(data);
			});

			socket.on('error', function(err) {
				console.log('error', err)
			})
			rpc.user = user
			rpc.functions = raft.service.rpc[user.zone].functions;
			callback(null, rpc)
			return;
		}
		// otherwise we can determine why we failed
		var reasons = raft.mongoose.User.failedLogin;
		switch (reason) {
			case reasons.NOT_FOUND:
				callback(new Error('reasons.NOT_FOUND'));
				break;
			case reasons.PASSWORD_INCORRECT:
				callback(new Error('reasons.PASSWORD_INCORRECT'));
				break;
			case reasons.MAX_ATTEMPTS:
				callback(new Error('reasons.MAX_ATTEMPTS'));
				break;
		}

	})
}

module.exports = function(service) {
	//
	// Create an `nssocket` TCP server
	//
	var io = require('socket.io').listen(raft.config.get('transports:socket.io:port'))
	io.set("origins", "*");
	io.set('transports', ['websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']);
	io.sockets.on('connection', function(socket) {
		socket.on('login', function() {
			authSocket(data, socket, function() {
				if (err) {
					socket.emit('error', err)
				} else {
					socket.emit('auth')
				}
			})
		})
	});

	raft.balancer.addApp({
		domain : 'ws.api.' + raft.config.get('domain')
	})
	raft.balancer.addDrone({
		host : raft.common.ipAddress(),
		port : raft.config.get('transports:socket.io:port')
	}, {
		domain : 'ws.api.' + raft.config.get('domain')
	})
}