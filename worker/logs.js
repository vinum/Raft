var raft = require('../')
var log = raft.log

var fs = require('fs')
var api = require('./server');

/**
 *
 */

var rootRoute = '/worker/logs'

var LOG_LINEBREAK = "\n";
var HISTORY_LENGTH = 100000;
var logPaths = __dirname + '../logs'

/**
 *
 */
function error(req, res, next, err) {
	res.json(500, {
		pass : false,
		err : {
			message : err.message,
			code : err.code || 'NO_CODE',
			stack : err.stack
		}
	})
}

log.info('Raft-Worker-App', 'Route: ' + rootRoute + '/get/:name');
api.get(rootRoute + '/get/:name', function(req, res, next) {
	var logName = req.param.name
	var logFile = logPaths + '/' + logName;
	var length = HISTORY_LENGTH;
	var lines = [];
	try {
		var stat = fs.stats(logFile);
		var fd = fs.openSync(logFile, 'r');
		var text = fs.readSync(fd, length, Math.max(0, stat.size - length));
		lines = text[0].split(LOG_LINEBREAK).reverse();
		res.json(200, {
			pass : true,
			lines : lines
		})
	} catch(err) {
		res.json(500, {
			pass : false,
			err : {
				message : err.message,
				code : err.code || 'NO_CODE',
				stack : err.stack
			}
		})
	}

})
/**
 *
 */
log.info('Raft-Worker-App', 'Route: ' + rootRoute + '/stream/:name');
api.get(rootRoute + '/stream/:name', function(req, res, next) {

})