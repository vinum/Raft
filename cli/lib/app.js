/***
 * Node modules
 */

var events = require('events');
var util = require('util');
var path = require('path');
var fs = require('fs');

var http = require("http");

//
var rimraf = require('rimraf')

var utils = require('../../lib/utils');
var raft = require('../../');
var uuid = utils.uuid
var log = raft.log

/**
 *
 */
var app = module.exports = {}

app.postTar = function postTar(worker, file, tarName, name, userid, cb) {
	var req = http.request({
		host : worker.host,
		port : worker.port,
		path : '/worker/app/load/' + name + '/' + userid,
		method : "POST",
		headers : {
			//authorization : 'Basic ' + new Buffer(raft.config.user.username + ':' + raft.config.user.password).toString('base64')
		}

	}, function(res) {
		res.setEncoding('utf8');

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
/**
 *
 * @param {Object} appPath
 * @param {Object} cb
 */
app.initTar = function initTar(appPath, cb) {
	var id = raft.utils.uuid()
	var info = {
		path : raft.config.paths.tmp + '/' + id + '.tar',
		fileName : id
	}
	raft.utils.createTar(appPath, info.path, function(err) {
		if (err) {
			cb(err)
		} else {
			cb(null, info)
		}
	})
}
/*
 *
 */
app.buildClient = function buildClient(worker) {
	var client = restify.createJsonClient({
		url : 'http://' + worker.host + ':' + worker.port
	});
	//client.basicAuth(raft.config.user.username, raft.config.user.password);

	return client
}
app.start = function start(worker, name, cb) {
	var client = buildClient(worker)

	client.get('/worker/app/start/' + name, cb)

}
app.stop = function stop(worker, name, cb) {
	var client = buildClient(worker)

	client.get('/worker/app/stop/' + name, cb)
}
app.restart = function restart(worker, name, cb) {
	var client = buildClient(worker)

	client.get('/worker/app/restart/' + name, cb)
}
