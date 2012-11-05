var bouncy = require('bouncy');
var events = require('events');
var fs = require('fs');
var util = require('util');
var net = require('net');
var Balancer = require('./balancer');

var balancer = new Balancer()

process.on('message', function(msg) {
	console.log(msg)
	var cmd;
	if ( cmd = msg.cmd) {
		if (cmd === 'addApp') {
			balancer.addApp(msg.app)
		} else if (cmd === 'destroyApp') {
			balancer.destroyApp(msg.app)
		} else if (cmd === 'addDrone') {
			balancer.addDrone(msg.drone, msg.app)
		} else if (cmd === 'destroyDrone') {
			balancer.destroyDrone(msg.drone, msg.app)
		} else if (cmd === 'sync') {
			balancer.domains = msg.domains
		} else if (cmd === 'syncRequests') {
			process.send(balancer.domains)
			for (var domain in balancer.domains) {
				balancer.domains[domain].requests = 0
				balancer.domains[domain].bytesRead = 0
				balancer.domains[domain].bytesWritten = 0
			}
		}
	}
});

var server = bouncy(balancer.handle.bind(balancer))

server.on('listen', function() {
	//console.log('Bouncy listen')
})
server.listen(Number(process.argv[2] || 3000))