var raft = require('../raft')

raft.boot(function() {
	var server = new raft.LogServer()
	var logger = new raft.Logger('asd', 'stdout', 'bob', 'demo')

	server.pull.bind(4000)
	logger.push.connect(4000)

	setInterval(function() {
		logger.write('sadasdasdasd\n');
	}, 1000)
})
