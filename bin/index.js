var raft = require('../raft')
//
//boot
//
//load the http plugin
raft.service.http(9000);
//boot raft
raft.mongoose.start(function() {

	raft.service.boot(function() {
		//raft is loaded
	})
})
