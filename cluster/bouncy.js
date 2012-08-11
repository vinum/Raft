var bouncy = require('bouncy');
var events = require('events');
var fs = require('fs');
var util = require('util');
var net = require('net');
var raft = require('../');

var hosts = {}
var cache404 = ''
function send404(bounce) {
	var res = bounce.respond();
	res.statusCode = 404;
	res.end(cache404)
};

fs.readFile(__dirname + '/404.html', function(err, data) {
	if (err)
		throw err;
	cache404 = data.toString();
});

var server = bouncy(function(req, bounce) {
	if (!req.headers.host) {
		send404(bounce)
	} else {
		var host = req.headers.host.split(':')[0];
		raft.mongo.BouncyHosts.findOne({
			domain : host
		}).run(function(err, hostInfo) {
			if (hostInfo) {
				bounce(net.connect({
					port : hostInfo.port,
					host : hostInfo.host
				}).on('error', function(err) {
					send404(bounce)
				}));
			} else {
				send404(bounce);
			}
		})
	}
})
server.on('listen', function() {
	console.log('Bouncy listen')
})
server.listen(Number(process.argv[2]))