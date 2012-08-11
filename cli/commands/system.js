var raft = require('../../')
var fs = require('fs')
var ini = require('ini')

module.exports = {
	'mongo-host' : function(options) {
		raft.config.mongodb.host = options[0]
		fs.writeFile('/tmp/__config.json', JSON.stringify(raft.config), 'utf-8', function(err) {
			if (err)
				throw err;
			process.exit(1)
		});
	},
	'mongo-port' : function(options) {
		raft.config.mongodb.port = options[0]

		fs.writeFile('/tmp/__config.json', JSON.stringify(raft.config), 'utf-8', function(err) {
			if (err)
				throw err;
			process.exit(1)
		});
	},
	'list-nodes' : function(options) {
		raft.mongo.WorkerNodes.find({

		}).run(function(err, node) {
			console.log(node)
			process.exit(1);
		})
	},
	'list-apps' : function(options) {
		raft.mongo.WorkerStore.find({

		}).run(function(err, node) {
			console.log(node)
			process.exit(1);
		})
	},
	'list-domains' : function(options) {
		raft.mongo.BouncyHosts.find({

		}).run(function(err, node) {
			console.log(node)
			process.exit(1);
		})
	},
	'drop' : function(options) {
		raft.mongo.WorkerNodes.remove({

		}, function(err, data) {

			raft.mongo.WorkerStore.remove({

			}, function(err, data) {

				raft.mongo.BouncyHosts.remove({

				}, function(err, data) {

					process.exit(1);
				})
			})
		})
	}
}