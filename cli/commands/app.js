var restify = require('restify');
var http = require("http");
var raft = require('../../');
var fs = require('fs');

var appLib = require('../lib/app')

//
var postTar = appLib.postTar
var buildClient = appLib.buildClient
var initTar = appLib.initTar
var start = appLib.start
var stop = appLib.stop
var restart = appLib.restart

function listApps(options) {

	var workerName = options[0] || 'ANY'

	function loop(worker, cb) {

		var client = buildClient(worker);

		client.get('/worker/app/list', function(err, req, res, obj) {
			if (err) {
				cb(err)
			} else {
				cb(null, obj.info)
			}
		})
	}

	var query = null;

	if (workerName == 'ANY') {
		query = raft.mongo.WorkerNodes.find({});
	} else {
		query = raft.mongo.WorkerNodes.findOne({
			name : workerName
		});
	}
	query.run(function(err, worker) {

		var workerApps = []

		if (Array.isArray(worker)) {
			worker.forLoop(function(worker, done) {
				loop(worker, function(err, data) {
					if (!err) {
						workerApps = workerApps.concat(data)
					}
					done()
				})
			}, function() {

				raft.log.info('Raft-Cli', workerApps)
				process.exit(1)
			})
		} else {
			loop(worker, function(err, data) {
				if (!err) {
					workerApps = workerApps.concat(data)
				}
				raft.log.info('Raft-Cli', workerApps)
				process.exit(1)
			})
		}

	})
}

module.exports = {
	stop : function(options) {
		var name = options[0]
		raft.mongo.WorkerStore.findOne({
			name : name,
			userid : raft.config.userid
		}).run(function(err, app) {
			raft.mongo.WorkerNodes.findOne({
				key : app.worker.key
			}).run(function(err, worker) {
				stop(worker, name, function(err) {
					if (err) {
						raft.log.error('Raft-Cli', err)
					}
					process.exit(1)
				})
			})
		})
	},
	start : function(options) {
		var name = options[0]
		raft.mongo.WorkerStore.findOne({
			name : name,
			userid : raft.config.userid
		}).run(function(err, app) {
			raft.mongo.WorkerNodes.findOne({
				key : app.worker.key
			}).run(function(err, worker) {
				start(worker, name, function(err) {
					if (err) {
						raft.log.error('Raft-Cli', err)
					}
					process.exit(1)
				})
			})
		})
	},
	restart : function(options) {
		var name = options[0]
		raft.mongo.WorkerStore.findOne({
			name : name,
			userid : raft.config.userid
		}).run(function(err, app) {
			raft.mongo.WorkerNodes.findOne({
				key : app.worker.key
			}).run(function(err, worker) {
				restart(worker, name, function(err) {
					if (err) {
						raft.log.error('Raft-Cli', err)
					}
					process.exit(1)
				})
			})
		})
	},
	list : listApps,
	deploy : function(options) {

		var appPath = process.cwd()

		var workerName = options[0] || 'ANY'
		function newWorker(name, package) {

			var query = null;

			if (!name) {
				query = raft.mongo.WorkerNodes.findOne({
					choked : false,
					online : true
				})
			} else {
				query = raft.mongo.WorkerNodes.findOne({
					choked : false,
					online : true,
					name : name
				})
			}

			query.run(function(err, worker) {
				if (!worker) {
					throw new Error('No worker online please spawn a new one.')
				}
				initTar(appPath, function(err, info) {
					postTar(worker, info.path, info.fileName, package.name, raft.config.userid, function(err, info) {
						if (err) {
							raft.log.error('Raft-Cli', err)
							process.exit(1)
						} else {
							raft.log.info('Raft-Cli', info)
							start(worker, package.name, function(err) {
								if (err) {
									raft.log.error('Raft-Cli', err)
								}
								process.exit(1)
							})
						}

					})
				})
			})
		}


		raft.utils.readPackage(appPath, function(err, package) {

			raft.mongo.WorkerStore.findOne({
				name : package.name
			}).run(function(err, app) {

				if (!app) {
					newWorker(workerName, package)
				} else if (app.running) {
					raft.mongo.WorkerNodes.findOne({
						key : app.worker.key
					}).run(function(err, worker) {
						if (worker.online) {
							killApp(worker, app, function() {
								if (worker.name === workerName) {
									newWorker(workerName, package)
								} else {
									newWorker(false, package)
								}
							})
						} else {
							newWorker(false, package)
						}
					})
				} else {
					newWorker(workerName, package)
				}
			})
		})
	}
}