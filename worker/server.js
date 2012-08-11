var restify = require('restify');

var raft = require('../')

var server = restify.createServer({
	name : 'raft-node'//,
	//version : '1.0.0'
});

//server.server.removeAllListeners('error')
//server.server.removeAllListeners('clientError')

server.use(restify.acceptParser(server.acceptable));
server.use(restify.authorizationParser());
server.use(restify.dateParser());
server.use(restify.queryParser());
server.use(restify.urlEncodedBodyParser());

server.listen(9081, function() {
	raft.log.info('Worker-API', 'listening: %s', server.url);
});

exports = module.exports = server;
