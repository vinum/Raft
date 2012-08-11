#!/usr/bin/env node

var name = process.argv[2] || 'ANY'

var raft = require('../');
//raft.init('worker')

process.title = 'RAFT-' + name

var server = require('../worker/server');

var key = raft.utils.uuid(true);

raft.workerKey = key

var spawner = require('../worker/app');

function onRemoveApps(err, apps) {
	apps.forLoop(function(app, done) {
		var spawn = spawner.spawns[app.name]
		if (spawn && spawn.running) {
			spawn.rpc.invoke('worker.kill', [], function() {
				raft.log.info('Raft-Worker', 'App invoke kill ' + app.name);
				spawn.kill(function() {
					delete spawner.spawns[appName];
					done()
				})
			})
		} else {
			done()
		}
	}, function() {

		raft.mongo.BouncyHosts.remove({

			workerKey : raft.config.workerKey
		}, function() {
			process.exit(1)
		})
	})
}

function onExit() {

	raft.mongo.WorkerNodes.findOne({
		key : raft.config.workerKey
	}).run(function(err, worker) {

		worker.online = false;
		worker.save(function() {
			raft.mongo.WorkerStore.find({
				worker : {
					key : raft.config.workerKey
				},
				running : true
			}).run(onRemoveApps)
		})
	})
}

function initConfig() {
	function save() {
		process.once('SIGINT', onExit);
	}

	function cb(ip) {
		raft.mongo.WorkerNodes.findOne({
			key : raft.config.workerKey
		}).run(function(err, worker) {
			if (!worker) {
				new raft.mongo.WorkerNodes({
					port : server.address().port,
					host : ip,
					key : raft.config.workerKey,
					name : name,
					choked : false,
					online : true
				}).save(save)
			} else {
				worker.port = server.address().port;
				worker.host = ip;
				worker.choked = false;
				worker.online = true;
				worker.save(save)
			}
		})
	}

	var ip = raft.utils.getIp().address

	if (Number(ip.split('.').shift()) === 10) {
		raft.utils.getExternalIp(function(err, pi) {
			cb(pi)
		})
	} else {
		cb(ip)
	}

}

server.once('listening', initConfig);

