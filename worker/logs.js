var raft = require('../')
var log = raft.log

var fs = require('fs')
var api = require('./server');

/**
 *
 */

var rootRoute = '/worker/logs'

var logPaths = __dirname + '../logs'

/**
 *
 */
log.info('Raft-Worker-App', 'Route: ' + rootRoute + '/get/:name');
api.get(rootRoute + '/get/:name', function(req, res, next) {
	
})
/**
 *
 */
log.info('Raft-Worker-App', 'Route: ' + rootRoute + '/stream/:name');
api.get(rootRoute + '/stream/:name', function(req, res, next) {

})