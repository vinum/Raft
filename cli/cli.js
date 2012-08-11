/***
 * Node modules
 */

var events = require('events');
var util = require('util');
var path = require('path');
var fs = require('fs');
var raft = require('../');

/**
 *
 */
var Cli = module.exports = function() {
	events.EventEmitter.call(this);
}
/***
 * Make it an event
 */
util.inherits(Cli, events.EventEmitter);

Cli.prototype.run = function(cmd, action, options) {

	if (!raft.config.userid && cmd !== 'user') {
		throw new Error('no userid please set using "raft-cli user userid"')
	}
	if (raft.config.user) {
		//throw new Error('no userid please set using "raft-cli system login <username> <password>"')
	}

	require('./commands/' + cmd)[action](options)

}
