/*
 *
 * (C) 2013, MangoRaft.
 *
 */

var Nats = require('raft-nats')
var raft = require('../../')

module.exports = function() {
	raft.config = require(process.configPath)
	raft.nats = new Nats(raft.config.nats)
}
