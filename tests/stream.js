var raft = require('./')
var net = require('net')

var Stream = raft.pipes.stream

console.log(Stream)

var event = 'rpc';
var key = 'somegreatkey';
var stream = new Stream(key)
var port = 8124;

function connect() {
	var socket = net.connect(port, function() {//'connect' listener

		rpc.once('stream', function() {
			console.log('stream ready')
			rpc.invoke('list', [], function(a, s) {
				console.log(a, s)
			})
		})
	});

	var rpc = stream.createRpcStream(socket)
	
}

var server = net.createServer(function(socket) {
	stream.request(socket, function(err, _stream) {

	})
});
server.listen(port, function() {//'listening' listener
	connect()
});
