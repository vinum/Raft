/*
 *
 * (C) 2013, MangoRaft.
 *
 */
var nconf = require('nconf');
var Nats = require('raft-nats');
var raft = require('../../');

var hasStarted = false;

module.exports = function() {
	if (hasStarted)
		return;
	nconf.file({
		file : '~/.raft.json'
	});
	hasStarted = true;
	raft.config = nconf;
	raft.nats = new Nats(raft.config.nats);
};
