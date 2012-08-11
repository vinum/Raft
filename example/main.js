var test = require('./test')
var lib = require('./lib/test')
var url = require('url')

console.log(test)
console.log('lib', lib)
console.log('paths', raft.paths)
console.log('__dirname', __dirname)
console.log('__filename', __filename)

raft.servers.httpServer(function(req, res) {
	res.end('dsfdsfdsf\n' + test + '\n' + lib + '\n')
}).listen('localhost')

