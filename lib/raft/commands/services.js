var raft = require('../../raft')

var commands = module.exports = {

}
/**
 *
 * @param {Object} options
 */
commands.services = function(options) {

	raft.start({
		port : 9000
	}, function() {

	})
}
commands.services.description = 'Start services.'
commands.services.options = []
