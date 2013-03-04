var raft = require('raft')

raft.network(['localhost', '192.168.1.9'])

//
//
//
raft.expose('test', function() {
	this.send({
		ok : true
	})
})
//
//
//
raft.on('test', function(data) {
	network.invoke('test', [], function(err, result) {

	})
})
//
//
//
raft.on('promote', function() {

})
raft.on('demote', function() {

})
//
//
//
raft.on('promoted', function(info) {
	var uid = data.uid
	var port = data.port
	var host = data.host
})
raft.on('demoted', function(info) {
	var uid = data.uid
	var port = data.port
	var host = data.host
})
//
//
//
raft.on('*::logger', function(data) {

})
raft.on('*::logger', function(data) {

})
raft.emit('logger', {
	log : 'data'
})
