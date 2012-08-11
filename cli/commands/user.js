var raft = require('../../')
var fs = require('fs')
var ini = require('ini')

module.exports = {
	'userid' : function() {
		raft.config.userid = raft.utils.uuid(true)

		fs.writeFile('/tmp/__config.json', JSON.stringify(raft.config), 'utf-8', function(err) {
			if (err)
				throw err;
			process.exit(1)
		});
	},
	'login' : function(options) {

		raft.config.user = {
			username : options[0],
			password : options[1]
		}

		fs.writeFile('/tmp/__config.json', JSON.stringify(raft.config), 'utf-8', function(err) {
			if (err)
				throw err;
			process.exit(1)
		});
	},
	'create' : function(options) {

		var username = options[0]
		var password = options[1]

	}
}