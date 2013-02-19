var raft = require('../')

//
//start
//NOTE: need to remove
//
if (raft.balancer.cluster) {
	if (raft.config.get('distributed')) {
		raft.distributed = new raft.Distributed(raft.config.get('distributed'))
	}

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
} else {
	raft.debug('boot', 'Process is part of a cluster.')
}