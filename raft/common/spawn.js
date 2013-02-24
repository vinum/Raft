/*
 *
 * (C) 2013, MangoRaft.
 *
 */

var fs = require('fs');
var path = require('path');
var util = require('util');
var fs = require('fs');
var events = require('events');

var forever = require('forever-monitor');
var semver = require('semver');
var getPid = require('ps-pid');

var raft = require('../../raft')

var mixin = raft.common.mixin
var async = raft.common.async
var rimraf = raft.common.rimraf

var SnapShot = raft.SnapShot
var Stats = require('./stats').Stats

var Spawn = module.exports = function(meta) {
	events.EventEmitter.call(this);

	this.maxRestart = 2;
	this.silent = true;
	this.minUptime = 2000;

	this.options = {}
	this.meta = meta

	this.env = {}
	this._stage = 'START'

	this.uid = (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1) + (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)

	this.responded = false
	this.errState = false;
	this.stdout = []
	this.stderr = []
};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(Spawn, events.EventEmitter);

function noop() {

}

Spawn.prototype.stage = function(stage, meta) {

	stage = stage.toLocaleLowerCase()
	this._stage = stage
	this.emit(stage, meta)
}

Spawn.prototype.init = function(meta, callback) {
	var self = this
	var snapshot;

	this.stage('INIT')
	try {
		snapshot = this.snapshot = new raft.SnapShot(meta)
	} catch (ex) {
		return callback(ex)
	}

	if ( snapshot instanceof Error) {
		return callback(repo);
	}

};

Spawn.prototype.reset = function() {

	this.responded = false
	this.errState = false;
	this.stdout = []
	this.stderr = []
};

Spawn.prototype.setLogs = function() {

	var file = this.snapshot.directories.logs + '/';
	this.logs = {
		err : file + this.uid + '.err.log',
		out : file + this.uid + '.out.log',
		npm : file + this.uid + '.npm.log'
	}

};

Spawn.prototype.bootstrap = function(callback) {

};

Spawn.prototype.trySpawn = function(callback) {
	var self = this

	this.stage('TRYSPAWN')
	this.reset()

	self.installEngine(function(err) {
		if (err) {
			return callback(err);
		}

		self.stage('REPOBOOTSTRAP')

		self.snapshot.bootstrap(function(err, existed) {
			if (err) {
				return callback(err);
			}

			self.setLogs()

			self.stage('REPOINIT')

			self.snapshot.init(function(err, inited) {
				if (err) {
					return callback(err);
				}

				self.setEnv()

				self.spawn(function(err) {
					if (err) {
						return callback(err)
					}
					self.stage('TRYSPAWNFINISH')
				});
			})
		});

	})
};

Spawn.prototype.installEngine = function(callback) {
	this.stage('ENGINEINSTALL')
	var engine = this.meta.instance.engines.node;
	var self = this
	var engineDir = raft.directories.node

	raft.nodev.checkInstall(process.version, function(err, version) {

		if (err) {
			return callback(err)
		}

		self.engine = {
			version : version,
			dir : path.join(engineDir, version),
			node : path.join(engineDir, version, 'bin', 'node')
		}

		self.options.cwd = self.engine.dir;
		self.options.command = 'node'// self.engine.node;

		self.options.carapaceBin = path.join(__dirname, 'haibu-carapace', 'bin', 'carapace');

		callback()
	})
}

Spawn.prototype.setEnv = function() {

	this.stage('SETENV')
	var self = this

	if (this.meta.env)
		mixin(this.env, this.meta.env);
	this.options.env = this.env;
};

Spawn.prototype.spawn = function(callback) {
	this.stage('SPAWN')
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
		options : [this.options.carapaceBin].concat(['--plugin', 'net', this.snapshot.scripts.start]),
		'outFile' : this.logs.out,
		'errFile' : this.logs.err
	};

	foreverOptions.forever = typeof this.maxRestart === 'undefined';

	if ( typeof this.maxRestart !== 'undefined') {
		foreverOptions.max = this.maxRestart;
	}

	fs.stat(path.join(snapshot.directories.home, snapshot.scripts.start), function(err, stats) {
		if (err) {
			var err = new Error('package.json error: Package.json start script declared but not found ' + 'can\'t find starting script: ' + snapshot.scripts.start);
			err.blame = {
				type : 'user',
				message : 'Package.json start script declared but not found'
			}
			return callback(err);
		}

		foreverOptions.options.push(snapshot.scripts.start);
		var carapaceBin = foreverOptions.options.shift();
		self.spawn = new forever.Monitor(carapaceBin, foreverOptions);
		self.spawn.on('error', function() {

		});

		self.spawn.on('stdout', self.onStdout.bind(self));
		self.spawn.on('stderr', self.onStderr.bind(self));
		self.spawn.once('exit', self.onExit.bind(self));
		self.spawn.once('error', self.onError.bind(self));
		self.spawn.once('start', self.onChildStart.bind(self));
		self.spawn.on('restart', self.onChildRestart.bind(self));

		self.spawn.on('message', self.onMessage.bind(self));

		if (self.meta.instance.worker) {
			self.timeout = setTimeout(self.onTimeout.bind(self), 20000);
		} else {
			self.timeout = 0
		}

		self.spawn.start();

		self.stage('SPAWNSTART')

	})
};

Spawn.prototype.restart = function() {

};

Spawn.prototype.restart = function(callback) {
	var self = this

	this.spawn.removeListener('exit', self.onExit.bind(self));
	self.spawn.removeListener('stdout', self.onStdout.bind(self));
	self.spawn.removeListener('stderr', self.onStderr.bind(self));
	self.spawn.removeListener('restart', self.onChildRestart.bind(self));
	self.spawn.removeListener('message', self.onMessage.bind(self));

	this.spawn.once('exit', function() {
		self.trySpawn(callback)
	})
	this.spawn.stop();
};

Spawn.prototype.onStdout = function onStdout(data) {
	data = data.toString();
	if (!this.responded) {
		this.stdout = this.stdout.concat(data.split('\n').filter(function(line) {
			return line.length > 0
		}));
	}
	this.emit('stdout', data)
}
//
// Log data from `spawn.stderr` to haibu
//
Spawn.prototype.onStderr = function onStderr(data) {
	data = data.toString();
	if (!this.responded) {
		this.stderr = this.stderr.concat(data.split('\n').filter(function(line) {
			return line.length > 0
		}));
	}
	this.emit('stderr', data)
}
//
// If the `forever.Monitor` instance emits an error then
// pass this error back up to the callback.
//
// (remark) this may not work if haibu starts two apps at the same time
//
Spawn.prototype.onError = function onError(err) {

	if (!this.responded) {

		this.stage('SPAWNERROR')
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
//
// When the carapace provides the port that the spawn
// has bound to then respond to the callback
//
Spawn.prototype.onMessage = function onMessage(info) {
	if (!this.responded && info && info.event === 'port') {

		this.stage('SPAWNPORT')
		var self = this;
		this.responded = true;
		this.socket = {
			host : info.data.host || raft.common.ipAddress(),
			port : info.data.port
		};

		this.spawn.minUptime = 0;

		//
		// Remove listeners to related events
		//
		this.spawn.removeListener('exit', this.onExit.bind(this));
		this.spawn.removeListener('error', this.onError.bind(this));

		clearTimeout(this.timeout);
		this.stage('START')
	}
}
//
// When the spawn starts, update the result for monitoring software
//
Spawn.prototype.onChildStart = function onChildStart(monitor, data) {

	this.stage('SPAWNCHILDSTART')
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
	if (this.meta.instance.worker) {

		this.spawn.minUptime = 0;

		//
		// Remove listeners to related events
		//
		this.spawn.removeListener('exit', this.onExit.bind(this));
		this.spawn.removeListener('error', this.onError.bind(this));

		clearTimeout(this.timeout);
		this.stage('START')
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
	if (!this.responded) {
		this.stage('SPAWNEXIT')
		this.errState = true;
		this.responded = true;
		var error = new Error('Error spawning spawn Script prematurely exited');
		error.blame = {
			type : 'user',
			message : 'Script prematurely exited'
		}
		error.stdout = this.stdout.join('\n');
		error.stderr = this.stderr.join('\n');

		this.emit('error', error)
		//
		// Remove listeners to related events.
		//
		this.spawn.removeListener('error', this.onError.bind(this));
		this.spawn.removeListener('message', this.onMessage.bind(this));
		clearTimeout(this.timeout);
	} else {
		if (this.kill) {
			this.emit('stop')
			this.snapshot.clean()
		}
	}
	this.stats ? this.stats.kill() : null
}

Spawn.prototype.onTimeout = function onTimeout() {

	this.spawn.removeListener('exit', this.onExit.bind(this));
	this.spawn.stop();
	var error = new Error('Error spawning spawn Script took too long to listen on a socket');
	error.blame = {
		type : 'user',
		message : 'Script took too long to listen on a socket'
	};
	error.stdout = this.stdout.join('\n');
	error.stderr = this.stderr.join('\n');
	this.emit('error', error)
}
//
// When the spawn starts, update the result for monitoring software
//
Spawn.prototype.stop = function() {
	this.kill = true
	this.monitor.stop(true)
}
//
// When the spawn starts, update the result for monitoring software
//
Spawn.prototype.result = function() {
	return {
		socket : this.socket,
		uid : this.uid
	}

}