var cluster = require('cluster')
var Router = require('../').Router
var http = require('http')

http.createServer(function(req, res) {
	res.writeHead(200, {
		'connection' : 'closed'
	});
	res.write(JSON.stringify(req.headers, null, 4))
	res.end('beep boop\n');
}).listen(8001);
var r = new Router()
r.start()
r.fork(function() {
	r.addSpawn({
		uid : 'dsfdsf',
		host : '127.0.0.1',
		port : 8001
	}, {
		domain : 'localhost'
	})
})
