/**
 * Raft Raft
 *
 */

var EventEmitter2 = require('eventemitter2').EventEmitter2;
module.exports = new EventEmitter2()
module.exports.common = require('./lib/raft/common')
module.exports.start = require('./lib/raft/start')

