var raft = require('../raft');
var path = require('path');
var repl = require('repl')
var clc = require('cli-color');
var eyes = require('eyes')
var connect = require('connect')
var http = require('http');

var app = connect()
app.use(connect.favicon())
app.use(connect.static(__dirname))
app.use(connect.directory(__dirname))
app.use(connect.cookieParser())
app.use(connect.session({
	secret : 'my secret here'
}))
app.use(function(req, res) {
	res.end('Hello from Connect!\n');
});

http.createServer(app).listen(3000);
var urls = ['http://localhost:3000/demo.tar.gz']
var names = ['demo']
var meta = {
	snapshot : {
		version : 67,
		time : 1362011702277
	},
	instance : {
		instance : 3,
		type : 'web',
		chroot : false,
		http : true,
		env : {
			MYENV : 'somedata'
		},
		engines : {
			node : '>=0.6'
		},
		max : {
			memory : 19000,
			disk : 1900
		},
		script : 'web.js'
	},
	package : {
		name : 'demo'
	},
	domains : ['192.168.1.101', 'localhost'],
	user : {
		username : 'bob'
	}
}
meta.snapshot.__defineGetter__("url", function() {
	var url = urls.shift()
	urls.push(url)
	return url;
});
function trySpawn() {

	var spawn = new raft.Spawn(meta);

	spawn.build(function(err) {
		if (err) {
			throw err;
		}
		spawn.spawn(function(err) {
			if (err) {
				throw err;
			}
		});
	});

	spawn.on('error', function(err) {
		console.log(err)
	});
	spawn.on('log::*', function(lines) {
		console.log(lines)
	});
	raft.on(spawn.uid + '::spawn::build::*', function(data) {
		raft.log('build', spawn.uid, 'Build at event:' + this.event)
	});
	raft.on(spawn.uid + '::spawn::snapshot::*', function(data) {
		raft.log('snapshot', spawn.uid, 'Snapshot event:' + this.event)
	});
	spawn.onAny(function(a) {
		//console.log(a)
	})
	return spawn;
}

raft.boot(function() {

	raft.spawner.cleanAll(trySpawn)
})
