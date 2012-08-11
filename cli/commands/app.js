var restify = require('restify');
var raft = require('../../');
var fs = require('fs');

var http = require("http");

function buildClient(worker) {
	var client = restify.createJsonClient({
		url : 'http://' + worker.host + ':' + worker.port
	});
	//client.basicAuth(raft.config.user.username, raft.config.user.password);

	return client
}

function postTar(worker, file, tarName, name, userid, cb) {
	var req = http.request({
		host : worker.host,
		port : worker.port,
		path : '/worker/app/loadPackage/' + name + '/' + tarName + '/' + userid,
		method : "POST",
		headers : {
			//authorization : 'Basic ' + new Buffer(raft.config.user.username + ':' + raft.config.user.password).toString('base64')
		}

	}, function(res) {
		res.setEncoding('utf8');
		fs.unlink(file, function(err) {
			
		});
		var body = '';
		res.on('data', function(chunk) {
			body += chunk;
		});
		res.once('end', function() {
			if (res.statusCode === 500) {

				cb(new Error(JSON.parse(body).message))
			} else {

				cb(null, JSON.parse(body))
			}

		})
	});
	fs.createReadStream(file).pipe(req);
}

function killApp(worker, app, cb) {
	var client = restify.createJsonClient({
		url : 'http://' + worker.host + ':' + worker.port
	});
	client.get('/worker/app/kill/' + app.name, cb)
}

function initTar(appPath, cb) {
	var id = raft.utils.uuid()
	var info = {
		path : raft.config.paths.tmp + '/' + id + '.tar',
		fileName : id
	}
	raft.utils.createTar(appPath, info.path, function(err) {
		if (err)
			cb(err)
		else
			cb(null, info)
	})
}

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
		query = raft.mongo.WorkerNodes.find({
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
	distroy : function(options) {

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
						console.log(err, info)
						if (err) {
							raft.log.error('Raft-Cli', err)
						} else {
							raft.log.info('Raft-Cli', info)

						}
						process.exit(1)
					})
				})
			})
		}


		raft.utils.readPackage(appPath, function(err, package) {

			raft.mongo.WorkerStore.findOne({
				name : package.name
			}).run(function(err, app) {

				if (!app) {
					return newWorker(workerName, package)
				}

				if (app.running) {
					return raft.mongo.WorkerNodes.findOne({
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