/*
 *
 * (C) 2013, MangoRaft.
 *
 */

var nssocket = require('nssocket');
var raft = require('../../../raft')

function authSocket(data, socket, callback) {
	raft.mongoose.User.getAuthenticated(data.username, data.password, function(err, user, reason) {
		if (err) {

		}
		if (user) {
			var rpc = new raft.common.Module(function(data) {
				socket.send('rpc', data);
			})
			socket.data('rpc', function(data) {
				rpc.requestEvent(data);
			});

			socket.on('error', function(err) {
				console.log('error', err)
			})
			rpc.user = user
			for (var i = 0; i < user.privileges.length; i++) {
				rpc.expose(user.privileges[i], raft.service.rpc[user.privileges[i]].functions);
			};
			user.setRpc(rpc)
			socket.on('close', function() {
				user.removeRpc(rpc)
			})
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
	var server = nssocket.createServer(function(socket) {

		socket.data('login', function(data) {
			authSocket(data, socket, function(err) {
				if (err) {
					socket.send('error', err)
				} else {
					socket.send('auth')
				}
			})
		})
	});
	server.listen(raft.config.get('transports:nssocket:port'));
	raft.balancer.addApp({
		domain : 'nssocket.api.' + raft.config.get('domain')
	})
	raft.balancer.addDrone({
		host : raft.common.ipAddress(),
		port : raft.config.get('transports:nssocket:port')
	}, {
		domain : 'nssocket.api.' + raft.config.get('domain')
	})
}