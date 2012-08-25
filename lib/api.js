var events = require('events');
var util = require('util');
var restify = require('restify');

var Api = module.exports = function() {
	events.EventEmitter.call(this);
}
/***
 * Make it an event
 */
util.inherits(Api, events.EventEmitter);

Api.prototype.createServer = function(name) {
	var server = restify.createServer({
		name : 'raft-' + name
	});

	//server.server.removeAllListeners('error')
	//server.server.removeAllListeners('clientError')

	server.use(restify.acceptParser(server.acceptable));
	server.use(restify.authorizationParser());
	server.use(restify.dateParser());
	server.use(restify.queryParser());
	server.use(restify.bodyParser());
	server.use(restify.urlEncodedBodyParser());

	server.get('/versions', function(req, res, next) {
		res.json({
			pass : true,
			versions : {
				http_parser : process.versions.http_parser,
				node : process.versions.node,
				v8 : process.versions.v8,
				ares : process.versions.ares,
				uv : process.versions.uv,
				zlib : process.versions.zlib,
				openssl : process.versions.openssl
			}
		});
	});

	server.error = function(err, res) {
		res.json(500, {
			pass : false,
			err : {
				message : err.message,
				code : err.code || 'NO_CODE',
				stack : err.stack
			}
		});
	};
	return server
}
