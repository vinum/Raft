var raft = require('../')

//
//services
//
raft.service = new raft.common.Services();

raft.debug('boot', 'Raft about to boot.')
raft.balancer.start(function() {
	raft.debug('boot', 'Raft balancer has boot.')
	raft.service.start(function() {
		raft.debug('boot', 'Raft service has boot.')
		raft.mongoose.start(function() {
			raft.debug('boot', 'Raft mongoose has boot.')
			return;
			raft.harvester.run()
			process.on('uncaughtException', function(err) {
				console.log('Caught exception: ' + err);
				console.log('Caught exception: ' + err.stack);

			});
		})
	})
})