var cluster = require('cluster')
var Router = require('../raft/common/router').Router
var http = require('http')

http.createServer(function(req, res) {
	res.write(JSON.stringify(req.headers, null, 4))
	res.end('beep boop\n');
}).listen(8001);
var r = new Router()
r.start()
r.fork(function() {
	r.addSpawn({
		uid : 'dsfdsf',
		host : '192.168.1.101',
		port : 8001
	}, {
		domain : '192.168.1.101'
	})
})
