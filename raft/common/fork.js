var bouncy = require('bouncy');
var events = require('events');
var fs = require('fs');
var util = require('util');
var path = require('path');
var net = require('net');

var balancer = require('./balancer').balancer
process.on('uncaughtException', function(err) {
	//console.log('Caught exception: ' + err);
	//console.log('Caught exception: ' + err.stack);
});
process.on('message', function(msg) {
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
			process.send({
				domains : balancer.domains
			})
			//console.log(balancer.domains)
			for (var domain in balancer.domains) {
				balancer.domains[domain].stats.requests = 0
				balancer.domains[domain].stats.bytesRead = 0
				balancer.domains[domain].stats.bytesWritten = 0
			}
		}
	}
});

var server = bouncy(balancer.handle.bind(balancer))
server.on('listen', function() {

})
server.listen(Number(process.argv[2] || 3000))
function ssl() {
	try {

		var privateKey = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'config', 'privatekey.pem')).toString();
		var certificate = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'config', 'certificate.csr')).toString();
		return {
			key : privateKey,
			cert : certificate
		}
	} catch(err) {
		return
	}
}

var options = ssl()
if (options) {

	var sslServer = bouncy(options, balancer.handle.bind(balancer))
	sslServer.on('listen', function() {

	})
	sslServer.listen(Number(process.argv[2] || 3000) + 363)
}
