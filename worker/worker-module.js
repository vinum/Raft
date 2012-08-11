var http = require('http')
var URL = require('url')
var raft = require('../')

var Container = require('./container/container');

var app = new Container();

function getInfo(exposed) {
	exposed.send({
		domains : app.env.domains,
		paths : app.env.paths,
		config : app.env.config,
		memoryUsage : process.memoryUsage(),
		uptime : process.uptime(),
		package : app.env.package
	})
}

console.log(app)
var sent = false
module.exports = {
	kill : function() {
		var exposed = this

		app.kill(function() {

			exposed.send('ok', true)

		})
	},
	info : function() {
		var exposed = this
		getInfo(this)
	},
	load : function(tarPath, name, userid, user, workerKey) {
		var exposed = this
		function error(err) {
			exposed.error(err)
		}

		function loadApp(err) {
			if (err) {
				error(err)
			} else {
				exposed.send({
					pass : true
				})
			}
		}

		function loadNpm(err) {
			if (err) {
				error(err)
			} else {
				app.loadApp(loadApp);
			}
		}

		function loadPackage(err) {
			if (err) {
				error(err)
			} else {
				app.loadNpm(loadNpm);
			}
		}

		function loadTar(err) {
			if (err) {
				error(err)
			} else {
				app.loadPackage(loadPackage);
			}
		}

		function loadConfig(err) {
			if (err) {
				error(err)
			} else {
				app.loadTar(loadTar);
			}
		}


		app.loadConfig({
			tarPath : tarPath,
			name : name,
			userid : userid,
			user : user,
			workerKey : workerKey
		}, loadConfig);
	}
}
