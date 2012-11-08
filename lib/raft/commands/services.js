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

a = {
	"proxy" : {
		"port" : 80
	},
	"db" : {
		"mongodb" : {
			"host" : "localhost",
			"port" : 27017,
			"path" : "/data/db"
		}
	},
	"mail" : {
		"service" : "Gmail",
		"auth" : {
			"user" : "noreply@mangoraft.com",
			"pass" : "relaod123"
		}

	},
	"domain" : "mangoraft.com"
}