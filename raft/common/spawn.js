/**
 * Module dependencies.
 */

var fs = require('fs')
var path = require('path')
var util = require('util')
var fs = require('fs')
var events = require('events')

var forever = require('forever-monitor')
var semver = require('semver')
var getPid = require('ps-pid');

var flatiron = require('flatiron')
var mixin = flatiron.common.mixin
var async = flatiron.common.async
var rimraf = flatiron.common.rimraf

var repositories = require('haibu-repo')
var Repository = repositories.Repository

var raft = require('../../raft')

var Stats = require('./stats')

var lf = require('log.io-cut').lf

function Spawn(options) {
	events.EventEmitter.call(this);
	options = options || {};

	this.maxRestart = options.maxRestart;
	this.silent = true;
	this.host = options.host || '127.0.0.1';
	this.packageDir = options.packageDir
	this.logsDir = options.logsDir
	this.minUptime = typeof options.minUptime !== 'undefined' ? options.minUptime : 2000;

	this.options = options
	this.app = options.app
	this.env = {}
	this._stage = 'START'

	this.uid = (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1) + (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)

};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(Spawn, events.EventEmitter);

module.exports = Spawn
function noop() {

}

Spawn.prototype.stage = function(stage) {

	this._stage = stage
	this.emit(stage)
	this.rpc ? this.rpc.invoke('spawn.stage', [this.app.name, this.uid, null, stage, Date.now()], noop) : null
}
Spawn.prototype.init = function(app, callback) {
	var self = this
	var repo;
	this.app = app

	this.stage('INIT')

	try {
		repo = this.repo = this.app instanceof repositories.Repository ? this.app : repositories.create(this.app, this.options)
	} catch (ex) {
		return callback(ex)
	}

	if ( repo instanceof Error) {
		return callback(repo);
	}

};

Spawn.prototype.LogHarvesterStopWatch = function() {
	raft.harvester.log_files[type + '-' + self.uid].stopWatch()
};

Spawn.prototype.LogHarvester = function() {
	this.stage('LOGHARVESTER')
	var self = this
	Object.keys(this.logs).forEach(function(type) {
		var log_file = new lf.LogFile(self.logs[type], type + '-' + self.uid, raft.harvester);
		raft.harvester.log_files[type + '-' + self.uid] = log_file;
		if (type !== 'npm') {
			log_file.watch();
		}
	})
	raft.harvester.update()
};

Spawn.prototype.reset = function() {

	this.rpc = raft.mongoose.User.rpc(this.app.user)

	this.responded = false
	this.errState = false;
	this.stdout = []
	this.stderr = []
	this.setLogs()
};

Spawn.prototype.setLogs = function() {

	var file = this.repo.lgosDir + '/';
	this.logs = {
		err : file + this.uid + '.err.log',
		out : file + this.uid + '.out.log',
		npm : file + this.uid + '.npm.log'
	}

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

		self.repo.bootstrap(function(err, existed) {
			if (err) {
				return callback(err);
			} else if (existed) {
				return self.spawn(callback);
			}
			self.stage('REPOBOOTSTRAPFINISH')
			self.repo.npmlog = fs.createWriteStream(self.logs.npm, {
				flags : 'w',
				encoding : null,
				mode : 0666
			})
			self.repo.npmlog.write('NPM START....\n')

			self.stage('REPOINIT')

			self.repo.init(function(err, inited) {
				if (err) {
					return callback(err);
				}
				self.stage('REPOINITFINISH')

				self.setEnv(function(err) {
					if (err) {
						return callback(err)
					}
					self.spawn(function(err) {
						if (err) {
							return callback(err)
						}
						self.stage('TRYSPAWNFINISH')
					});
				})
			})
		});

	})
};

Spawn.prototype.installEngine = function(callback) {
	this.stage('ENGINEINSTALL')
	var app = this.app
	var engine = (app.engines || app.engine || {
		node : process.version
	}).node;
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

		self.stage('ENGINEINSTALLFINISH')
		callback()
	})
}

Spawn.prototype.setEnv = function(callback) {

	this.stage('SETENV')
	var self = this

	if (this.app.env)
		mixin(this.env, this.app.env);
	this.options.env = this.env;
	raft.mongoose.Env.find({
		user : this.app.user,
		name : this.app.name
	}, function(err, envs) {
		if (err) {
			return callback(err)
		}
		envs.forEach(function(_env) {
			self.options.env[_env.key] = _env.value
		})
		self.stage('SETENVFINISH')
		callback()
	})
};

Spawn.prototype.spawn = function(callback) {
	this.stage('SPAWN')
	var repo = this.repo
	var app = this.app
	var options = this.options
	var self = this
	var meta = {
		name : app.name,
		user : app.user
	}
	var foreverOptions = {
		fork : true,
		silent : this.silent,
		stdio : ['ipc', 'pipe', 'pipe'],
		cwd : this.repo.homeDir,
		hideEnv : [],
		env : this.env,
		killTree : true,
		uid : this.uid,
		killTTL : 0,
		minUptime : this.minUptime,
		command : this.options.command,
		options : [this.options.carapaceBin].concat(['--plugin', 'net', this.app.scripts.start]),
		'outFile' : this.logs.out,
		'errFile' : this.logs.err
	};

	foreverOptions.forever = typeof this.maxRestart === 'undefined';

	if ( typeof this.maxRestart !== 'undefined') {
		foreverOptions.max = this.maxRestart;
	}

	//
	// Before we attempt to spawn, let's check if the startPath actually points to a file
	// Trapping this specific error is useful as the error indicates an incorrect
	// scripts.start property in the package.json
	//
	fs.stat(repo.startScript, function(err, stats) {
		if (err) {
			var err = new Error('package.json error: Package.json start script declared but not found ' + 'can\'t find starting script: ' + repo.app.scripts.start);
			err.blame = {
				type : 'user',
				message : 'Package.json start script declared but not found'
			}
			return callback(err);
		}

		foreverOptions.options.push(repo.startScript);
		var carapaceBin = foreverOptions.options.shift();
		self.drone = new forever.Monitor(carapaceBin, foreverOptions);
		self.drone.on('error', function() {
			//
			// 'error' event needs to be caught, otherwise
			// the haibu process will die
			//
		});

		//
		// Log data from `drone.stdout` to haibu
		//

		//
		// Listen to the appropriate events and start the drone process.
		//
		self.drone.on('stdout', self.onStdout.bind(self));
		self.drone.on('stderr', self.onStderr.bind(self));
		self.drone.once('exit', self.onExit.bind(self));
		self.drone.once('error', self.onError.bind(self));
		self.drone.once('start', self.onChildStart.bind(self));
		self.drone.on('restart', self.onChildRestart.bind(self));

		self.drone.on('message', self.onCarapacePort.bind(self));

		self.timeout = setTimeout(self.onTimeout.bind(self), 20000);

		self.drone.start();

		self.stage('SPAWNSTART')

	})
};

Spawn.prototype.restart = function() {

};

Spawn.prototype.restart = function(callback) {
	var self = this

	this.drone.removeListener('exit', self.onExit.bind(self));
	self.drone.removeListener('stdout', self.onStdout.bind(self));
	self.drone.removeListener('stderr', self.onStderr.bind(self));
	self.drone.removeListener('restart', self.onChildRestart.bind(self));
	self.drone.removeListener('message', self.onCarapacePort.bind(self));

	this.drone.once('exit', function() {
		self.trySpawn(callback)
	})
	this.drone.stop();
};

Spawn.prototype.onStdout = function onStdout(data) {
	data = data.toString();

	if (!this.responded) {
		this.stdout = this.stdout.concat(data.split('\n').filter(function(line) {
			return line.length > 0
		}));
	}
}
//
// Log data from `drone.stderr` to haibu
//
Spawn.prototype.onStderr = function onStderr(data) {
	data = data.toString();
	if (!this.responded) {
		this.stderr = this.stderr.concat(data.split('\n').filter(function(line) {
			return line.length > 0
		}));
	}
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
		this.drone.removeListener('exit', this.onExit.bind(this));
		this.drone.removeListener('message', this.onCarapacePort.bind(this));

		this.drone.removeListener('stdout', this.onStdout.bind(this));
		this.drone.removeListener('stderr', this.onStderr.bind(this));
		clearTimeout(this.timeout);
	}
}
//
// When the carapace provides the port that the drone
// has bound to then respond to the callback
//
Spawn.prototype.onCarapacePort = function onCarapacePort(info) {
	if (!this.responded && info && info.event === 'port') {

		this.stage('SPAWNPORT')
		var self = this;
		this.responded = true;
		this.socket = {
			host : info.data.host || raft.common.ipAddress(),
			port : info.data.port
		};

		this.drone.minUptime = 0;
		fs.readFile(this.logs.npm, function(err, data) {
			if (err)
				throw err;
			self.npmput = data.toString()
			self.emit('started')
		});

		//
		// Remove listeners to related events
		//
		this.drone.removeListener('exit', this.onExit.bind(this));
		this.drone.removeListener('error', this.onError.bind(this));

		this.drone.removeListener('stdout', this.onStdout.bind(this));
		this.drone.removeListener('stderr', this.onStderr.bind(this));
		clearTimeout(this.timeout);
		this.LogHarvester()
	}
}
//
// When the drone starts, update the result for monitoring software
//
Spawn.prototype.onChildStart = function onChildStart(monitor, data) {

	this.stage('SPAWNCHILDSTART')
	this.process = monitor.child

	this.monitor = monitor
	this.data = data
	this.pid = monitor.childData.pid
	this.stats = new Stats({
		name : this.app.name,
		user : this.app.user,
		pid : this.pid,
		uid : this.uid,
		dir : this.repo.appDir
	})
}
//
// When the drone stops, update the result for monitoring software
//
Spawn.prototype.onChildRestart = function onChildRestart(monitor, data) {

}
//
// If the drone exits prematurely then respond with an error
// containing the data we receieved from `stderr`
//
Spawn.prototype.onExit = function onExit(data) {
	if (!this.responded) {
		this.stage('SPAWNEXIT')
		this.errState = true;
		this.responded = true;
		var error = new Error('Error spawning drone Script prematurely exited');
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
		this.drone.removeListener('error', this.onError.bind(this));
		this.drone.removeListener('message', this.onCarapacePort.bind(this));
		clearTimeout(this.timeout);
	} else {
		this.LogHarvesterStopWatch()
	}
	this.stats ? this.stats.kill(function() {

	}) : null
}

Spawn.prototype.onTimeout = function onTimeout() {

	this.stage('SPAWNTIMEOUT')

	this.drone.removeListener('exit', this.onExit.bind(this));
	this.drone.stop();
	var error = new Error('Error spawning drone Script took too long to listen on a socket');
	error.blame = {
		type : 'user',
		message : 'Script took too long to listen on a socket'
	};
	error.stdout = this.stdout.join('\n');
	error.stderr = th
	this.emit('error', error)
}
//
// When the drone starts, update the result for monitoring software
//
Spawn.prototype.result = function onChildStart() {
	return {
		socket : this.socket,
		uid : this.uid
	}

}