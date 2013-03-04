/*
 *
 * (C) 2013, MangoRaft.
 *
 */

var fs = require('fs');
var path = require('path');
var util = require('util');
var fs = require('fs');
var EventEmitter2 = require('eventemitter2').EventEmitter2;

var forever = require('forever-monitor');
var semver = require('semver');
var getPid = require('ps-pid');

var raft = require('../raft')

var mixin = raft.common.mixin
var async = raft.common.async
var rimraf = raft.common.rimraf

var SnapShot = raft.SnapShot
var Stats = require('./stats').Stats
var Logger = require('./logger').Logger

var Spawn = module.exports.Spawn = function(meta, uid) {
	EventEmitter2.call(this, {
		wildcard : true, // should the event emitter use wildcards.
		delimiter : '::', // the delimiter used to segment namespaces, defaults to `.`.
		newListener : false, // if you want to emit the newListener event set to true.
		maxListeners : 200, // the max number of listeners that can be assigned to an event, defaults to 10.
	});
	var self = this
	this.maxRestart = 2;
	this.silent = true;
	this.minUptime = 2000;

	this.options = {}
	this.meta = meta
	this.instance = meta.instance

	this.env = {}
	this._event = 'nostart'

	this.uid = uid || (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1) + (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)

	this.responded = false
	this.errState = false;
	this.stdout = []
	this.stderr = []
	this.loggers = {
		stdout : new Logger(this.uid, 'stdout', meta.user.username, meta.package.name),
		stderr : new Logger(this.uid, 'stderr', meta.user.username, meta.package.name)
	}

	this.on('build::*', function(data) {
		self.loggers.stdout.write('Build at stage:' + this.event + '\n', 'build')
	})
	this.on('snapshot::*', function(data) {
		self.loggers.stdout.write('Snapshot at stage:' + this.event + '\n', 'snapshot')
	})
	this.init()
};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(Spawn, EventEmitter2);
var meta = {
	"droplet" : 148,
	"name" : "helloworld",
	"uris" : ["helloworld.cloudfoundry.com"],
	"runtime" : "ruby19",
	"framework" : "sinatra",
	"sha1" : "72d650c62c017fd00622c2ac5d816e8fe111c20d",
	"executableFile" : "/var/vcap/shared/droplets/72d650c62c017fd00622c2ac5d816e8fe111c20d",
	"executableUri" : "/staged_droplets/148/72d650c62c017fd00622c2ac5d816e8fe111c20d",
	"version" : "72d650c62c017fd00622c2ac5d816e8fe111c20d-1",
	"services" : [{
		"name" : "mysql-b68e4",
		"type" : "database",
		"label" : "mysql-5.5",
		"vendor" : "mysql",
		"version" : "5.5",
		"tags" : ["mysql", "mysql-5.5", "relational"],
		"plan" : "free",
		"plan_option" : null,
		"credentials" : {
			"name" : "databasename",
			"hostname" : "192.168.1.2",
			"host" : "192.168.1.2",
			"port" : 3306,
			"user" : "user",
			"username" : "pass",
			"password" : "pass"
		}
	}],
	"limits" : {
		"mem" : 256,
		"disk" : 2048,
		"fds" : 256
	},
	"env" : {
		"" : ""
	},
	"users" : ["user@example.com"]
}
var meta = {
	instance : {

	}
}

function noop() {

}

Spawn.prototype.sendEvent = function(event, data) {
	var meta = {
		//
	}

	meta.data = data
	meta.time = Date.now()
	meta.uid = this.uid
	meta.event = event

	this._event = event

	this.emit(event, meta)

	raft.distribute(event, meta)
}

Spawn.prototype.init = function() {

	var self = this
	var snapshot;
	var meta = this.meta;

	this.sendEvent('build::init', meta)

	try {
		snapshot = this.snapshot = new raft.SnapShot(this.meta, {
			uid : this.uid,
			spawn : this
		})
	} catch (error) {
		this.emit('error', err)
		return this.emit('build::init::error', {
			error : error
		})
	}

	if ( snapshot instanceof Error) {
		this.emit('error', snapshot)
		return this.emit('build::init::error', {
			error : snapshot
		});
	}

	snapshot.onAny(function(data) {

		self.emit('snapshot::' + this.event, data || {})

	})
};

Spawn.prototype.build = function(callback) {
	var self = this

	this.sendEvent('build::start', {})

	self.installEngine(function(err) {
		if (err) {
			return callback(err);
		}

		self.snapshot.bootstrap(function(err, existed) {
			if (err) {
				return callback(err);
			}
			self.snapshot.init(function(err, inited) {
				if (err) {
					return callback(err);
				}

				self.setEnv()

				callback()
			})
		});

	})
};

Spawn.prototype.installEngine = function(callback) {
	var engine = this.instance.engines.node;
	var self = this
	var engineDir = raft.directories.node

	raft.nodev.checkInstall(engine, function(err, version) {

		if (err) {
			return callback(err)
		}

		self.engine = {
			version : version,
			dir : path.join(engineDir, version),
			node : 'node',
			npm : 'npm'
		}

		raft.common.version(self.engine.node, function(err, nodeVersion) {
			raft.common.version(self.engine.npm, function(err, npmVersion) {
				self.sendEvent('engine::node', {
					version : nodeVersion,
					path : self.engine.node
				})
				self.sendEvent('engine::npm', {
					version : npmVersion,
					path : self.engine.npm
				})
				callback()
			})
		})
	})
}

Spawn.prototype.setEnv = function() {

	var self = this

	self.options.cwd = self.engine.dir;
	self.options.command = self.engine.node;
	self.options.carapaceBin = path.join(__dirname, '..', 'scripts', 'haibu-carapace', 'bin', 'carapace');

	var args = [self.options.carapaceBin, '--plugin', 'net']
	if (self.instance.chroot) {
		args = args.concat('--plugin', 'chroot', '--plugin', 'chdir', '--chroot', self.snapshot.directories.home)
	}
	self.options.args = args.concat([self.snapshot.scripts.start]);

	if (self.meta.env)
		mixin(self.env, self.meta.env);
	if (self.instance.env)
		mixin(self.env, self.instance.env);
	self.options.env = self.env;
	self.sendEvent('env::set', self.env)
};

Spawn.prototype.spawn = function(callback) {
	var snapshot = this.snapshot
	var options = this.options
	var self = this
	var meta = this.meta
	var foreverOptions = {
		fork : true,
		silent : this.silent,
		stdio : ['ipc', 'pipe', 'pipe'],
		cwd : snapshot.directories.home,
		hideEnv : [],
		env : this.env,
		killTree : true,
		uid : this.uid,
		killTTL : 0,
		minUptime : this.minUptime,
		command : this.options.command,
		options : self.options.args
	};
	foreverOptions.forever = typeof this.maxRestart === 'undefined';

	if ( typeof this.maxRestart !== 'undefined') {
		foreverOptions.max = this.maxRestart;
	}

	this.sendEvent('build::spawn', foreverOptions)
	fs.stat(path.join(snapshot.directories.home, snapshot.scripts.start), function(err, stats) {
		if (err) {
			var err = new Error('package.json error: Package.json start script declared but not found ' + 'can\'t find starting script: ' + snapshot.scripts.start);
			err.blame = {
				type : 'user',
				message : 'Package.json start script declared but not found'
			}
			return callback(err);
		}

		var carapaceBin = foreverOptions.options.shift();

		self.spawn = new forever.Monitor(carapaceBin, foreverOptions);
		self.spawn.on('error', function() {

		});

		self.spawn.on('stdout', self.loggers.stdout.write.bind(self.loggers.stdout));
		self.spawn.on('stderr', self.loggers.stderr.write.bind(self.loggers.stderr));
		self.spawn.once('exit', self.onExit.bind(self));
		self.spawn.once('error', self.onError.bind(self));
		self.spawn.once('start', self.onChildStart.bind(self));
		self.spawn.on('restart', self.onChildRestart.bind(self));

		self.spawn.on('message', self.onMessage.bind(self));

		if (self.instance.http) {
			self.timeout = setTimeout(self.onTimeout.bind(self), 20000);
		} else {
			self.timeout = 0
		}
		self.spawn.start();
	})
};
//
// If the `forever.Monitor` instance emits an error then
// pass this error back up to the callback.
//
// (remark) this may not work if haibu starts two apps at the same time
//
Spawn.prototype.onError = function onError(err) {

	if (!this.responded) {

		this.sendEvent('build::error', {
			error : err
		})
		this.errState = true;
		this.responded = true;
		this.emit('error', err)
		//
		// Remove listeners to related events.
		//
		this.spawn.removeListener('exit', this.onExit.bind(this));
		this.spawn.removeListener('message', this.onMessage.bind(this));

		this.spawn.removeListener('stdout', this.onStdout.bind(this));
		this.spawn.removeListener('stderr', this.onStderr.bind(this));

		clearTimeout(this.timeout);
	}
}

Spawn.prototype.onNewPort = function(data) {
	this.socket = {
		host : data.host || raft.common.ipAddress(),
		port : data.port
	};
	this.sendEvent('build::port', {
		uid : this.uid,
		port : this.socket.port,
		host : this.socket.host,
		domains : this.meta.domains
	})
}
//
// When the carapace provides the port that the spawn
// has bound to then respond to the callback
//
Spawn.prototype.onMessage = function onMessage(info) {

	if (info && info.event) {
		this.sendEvent('package::' + info.event, info.data)
	}

	if (!this.responded && info && info.event === 'port') {

		var self = this;
		this.responded = true;

		this.spawn.minUptime = 0;
		this.onNewPort(info.data)
		//
		// Remove listeners to related events
		//
		this.spawn.removeListener('exit', this.onExit.bind(this));
		this.spawn.removeListener('error', this.onError.bind(this));

		clearTimeout(this.timeout);
		this.sendEvent('build::finish', this.format())
	}
}
//
// When the spawn starts, update the result for monitoring software
//
Spawn.prototype.onChildStart = function onChildStart(monitor, data) {
	var self = this
	this.sendEvent('build::childstart', data)
	this.process = monitor.child

	this.monitor = monitor
	this.data = data
	this.pid = monitor.childData.pid
	this.stats = new Stats({
		name : this.meta.package.name,
		user : this.meta.user.username,
		pid : this.pid,
		uid : this.uid,
		dir : this.snapshot.directories.home
	})
	this.stats.on('update', function(stats) {

		if (stats.memory > self.instance.max.memory) {
			self.sendEvent('build::max::memory', {
				used : stats.memory,
				max : self.instance.max.memory
			})
		}
		if (stats.disk > self.instance.max.disk) {
			self.sendEvent('build::max::disk', {
				used : stats.disk,
				max : self.instance.max.disk
			})
		}

		self.sendEvent('stats', stats)
	})
	if (this.instance.http) {

		this.spawn.minUptime = 0;
		this.spawn.removeListener('exit', this.onExit.bind(this));
		this.spawn.removeListener('error', this.onError.bind(this));

		clearTimeout(this.timeout);
	}
}
//
// When the spawn stops, update the result for monitoring software
//
Spawn.prototype.onChildRestart = function onChildRestart(monitor, data) {

}
//
// If the spawn exits prematurely then respond with an error
// containing the data we receieved from `stderr`
//
Spawn.prototype.onExit = function onExit(data) {
	this.sendEvent('build::exit')
	var self = this
	if (!this.responded) {
		this.errState = true;
		this.responded = true;
		var error = new Error('Error spawning spawn Script prematurely exited');
		error.stdout = this.stdout.join('\n');
		error.stderr = this.stderr.join('\n');

		this.emit('error', error)
		this.sendEvent('build::error', {
			error : error
		})
		//
		// Remove listeners to related events.
		//
		this.spawn.removeListener('error', this.onError.bind(this));
		this.spawn.removeListener('message', this.onMessage.bind(this));
		clearTimeout(this.timeout);
	}
	this.snapshot.once('clean', function() {
		this.sendEvent('build::stop', {})
	})
	this.snapshot.clean()
	this.stats ? this.stats.kill() : null
}

Spawn.prototype.onTimeout = function onTimeout() {

	this.spawn.removeListener('exit', this.onExit.bind(this));
	this.spawn.stop();
	var error = new Error('Error spawning spawn Script took too long to listen on a socket');
	error.stdout = this.stdout.join('\n');
	error.stderr = this.stderr.join('\n');
	this.emit('error', error)
	this.sendEvent('build::error', {
		error : error
	})
}
//
// When the spawn starts, update the result for monitoring software
//
Spawn.prototype.stop = function() {
	this.kill = true
	this.monitor.stop(true)

	this.sendEvent('build::kill', {

	})
}
//
// When the spawn starts, update the result for monitoring software
//
Spawn.prototype.format = function() {
	var response = {};

	if (this.socket && this.socket.port) {
		response.port = this.socket.port;
		response.host = this.socket.host;
	}

	response.stats = this.stats ? this.stats.data : {};

	response.uid = this.uid;
	response.ctime = this.data ? this.data.ctime : 0;
	response.uptime = response.ctime == 0 ? 0 : Date.now() - this.data.ctime;
	response.status = this._stage

	response.package = this.snapshot ? this.snapshot.package : {};
	response.name = this.meta.package.name;
	response.user = this.meta.user.username;
	response.metaid = this.meta.id;
	response.domains = this.meta.domains;
	response.instance = this.instance;

	return response;
}