var raft = require('../')
var log = raft.log

var rimraf = require('rimraf')
var os = require('os')
var fs = require('fs')
var Spawner = require('../lib/fork/forker')

var api = require('./server');

var rootRoute = '/worker/app'

/**
 *
 */

var spawner = new Spawner();

spawner.spawns = {}

/*
 *
 */
function testName(name, res, next) {
	if (!spawner.spawns[name]) {
		next(restify.InvalidArgumentError('no app with name "' + name + '"'))
		return false
	} else {
		return spawner.spawns[name]
	}
}

/**
 *
 */
log.info('Raft-Worker-App', 'Route: ' + rootRoute + '/list');
api.get(rootRoute + '/list', function(req, res, next) {

	log.info('Raft-Worker-App', 'Route: ' + req.url);
	var names = Object.keys(spawner.spawns)
	var info = []
	names.forLoop(function(name, done) {
		spawner.spawns[name].rpc.invoke('worker.info', [], function(err, data) {
			data.name = name
			info.push(data);
			done()
		})
	}, function() {
		res.send({
			pass : true,
			info : info
		})
	})
})
/**
 *
 */
log.info('Raft-Worker-App', 'Route: ' + rootRoute + '/kill/:name');
api.get(rootRoute + '/kill/:name', function(req, res, next) {
	log.info('Raft-Worker-App', 'Route: ' + req.url);
	var appName = req.params.name;
	var spawn
	if ( spawn = testName(appName, res, next)) {
		spawn.rpc.invoke('worker.kill', [], function() {

			log.info('Raft-Worker-App', 'App invoke kill');
			spawn.kill(function() {
				delete spawner.spawns[appName];
				res.send({
					pass : true
				})
			})
		})
	}
})
/**
 *
 */
log.info('Raft-Worker-App', 'Route: ' + rootRoute + '/info/:name');
api.get(rootRoute + '/info/:name', function(req, res, next) {
	log.info('Raft-Worker-App', 'Route: ' + req.url);
	var appName = req.params.name;

	log.info('Raft-Worker-App', 'INFO request for app: ' + appName);
	var spawn
	if ( spawn = testName(appName, res, next)) {
		spawn.rpc.invoke('worker.info', [], function(err, data) {
			if (err) {
				next(err)
			} else {
				res.send(data)
			}
		})
	}
})
/**
 *
 */

log.info('Raft-Worker-App', 'Route: ' + rootRoute + '/loadPackage/:name/:tar/:userid');
api.post(rootRoute + '/loadPackage/:name/:tar/:userid', function(req, res, next) {
	log.info('Raft-Worker-App', 'Route: ' + req.url);

	req.on('data', function() {
		console.log('data')
	})
	var appName = req.params.name;
	var tarName = req.params.tar;
	var userid = req.params.userid;
	var localTarPath = raft.config.paths.tmp + '/' + tarName + '.tar';

	if (!spawner.spawns[appName]) {
		var out = fs.createWriteStream(localTarPath)

		req.pipe(out)
		req.once('end', function() {
			log.info('Raft-Worker-App', appName + ' instilizing spawn');

			spawner.spawn(['worker', __dirname + '/worker-module.js'], function(err, spawn) {
				if (err) {
					return next(err);
				}
				spawn.config = {
					appName : appName,
					tarName : tarName,
					userid : userid,
					localTarPath : localTarPath
				};

				spawner.spawns[appName] = spawn;
				spawn.rpc.once('exit', function() {
					delete spawner.spawns[appName]
				})
				spawn.rpc.invoke('worker.load', [localTarPath, appName, userid, 'bob', raft.workerKey], function(err, data) {
					//console.log(err)
					if (err) {
						return spawn.kill(function() {
							delete spawner.spawns[appName]
							next(new Error(err))
						})
					}
					res.json(201, data);
				});
			});

		})
	} else {
		log.error('Raft-Worker-App', 'Running app with name "' + appName + '"');
		return next(new Error('Running app with name "' + appName + '"'))
	}
})
module.exports = spawner;
