/*
 *
 * (C) 2013, MangoRaft.
 *
 */
var nconf = require('nconf');
var raft = require('../../');

module.exports.load = function() {
	nconf.use('memory');
	var replyEvent = raft.common.uuid(true);
	var sidreply = raft.nats.subscribe(replyEvent, function(config) {
		var keys = Object.keys(config);
		keys.forEach(function(key) {
			nconf.set(key, config[key]);
		});
		raft.emit('config');
	});
	raft.nats.publish('config.load', {}, replyEvent);
	raft.config = nconf;
};
