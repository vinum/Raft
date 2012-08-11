var restify = require('restify');

var raft = require('../')

var server = restify.createServer({
	name : 'raft-node'
});

server.use(restify.acceptParser(server.acceptable));
server.use(restify.authorizationParser());
server.use(restify.dateParser());
server.use(restify.queryParser());
server.use(restify.urlEncodedBodyParser());

server.on('NotFound', function(req, res) {
	raft.log.warn('Node-API', req.url + ' was not found')
	res.send(404, req.url + ' was not found');
});

server.listen(9080, function() {
	raft.log.info('Node-API', 'listening: %s', server.url);
});
exports = module.exports = server; 