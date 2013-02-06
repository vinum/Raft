/**
 * Module dependencies.
 */

var fs = require('fs')
var path = require('path')
var forever = require('forever-monitor')
var semver = require('semver')
var events = require('events')
var mixin = require('flatiron').common.mixin
var async = require('flatiron').common.async
var rimraf = require('flatiron').common.rimraf
var repositories = require('haibu-repo')
var Repository = repositories.Repository
var getPid = require('ps-pid');
var tar = require('tar')
var util = require('util')
var Packer = require("fstream-npm")
var fs = require('fs')
var zlib = require('zlib')
var exec = require('child_process').exec;
var crypto = require('crypto');
var fstream = require("fstream")
var raft = require('../../raft')
var Stats = require('./stats')

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
	this._stage = -1
	this._stages = ['CREATE', 'INIT', 'TRYSPAWN', 'INSTALLENGINE', 'REPOBOOTSTRAP', 'REPOINIT', 'SPAWN', 'CHILDSTART', 'APPSTART', 'RUNNING', 'STOPPED', 'RESTART']

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

module.exports = Spawn
function noop() {

}

Spawn.prototype.stage = function(i) {

	i ? null : this._stage++
	this.emit(this._stages[i || this._stage])
	this.rpc ? this.rpc.invoke('spawn.stage', [this.app.name, this.uid, this._stage, this._stages[i || this._stage], Date.now()], noop) : null
}
Spawn.prototype.init = function(app, callback) {
	var self = this
	var repo;
	this.app = app

	this.rpc = raft.mongoose.User.rpc(self.app.user)
	this.stage()

	try {
		repo = this.repo = this.app instanceof repositories.Repository ? this.app : repositories.create(this.app, this.options)
	} catch (ex) {
		return callback(ex)
	}

	if ( repo instanceof Error) {
		return callback(repo);
	}

};
Spawn.prototype.trySpawn = function(callback) {
	var self = this
	this._stage = 1
	this.stage()

	var file = self.repo.lgosDir + '/'
	self.logs = {
		err : file + self.uid + '.err.log',
		out : file + self.uid + '.out.log',
		npm : file + self.uid + '.npm.log'
	}
	this.stage()
	self.installEngine(function(err) {
		if (err) {
			return callback(err);
		}

		self.stage()

		self.repo.bootstrap(function(err, existed) {
			if (err) {
				return callback(err);
			} else if (existed) {
				return self.spawn(callback);
			}
			self.stage()
			console.log('self.logs.npm', self.logs.npm, self.id)
			self.repo.npmlog = fs.createWriteStream(self.logs.npm, {
				flags : 'w',
				encoding : null,
				mode : 0666
			})
			self.repo.npmlog.write('NPM START....\n')
			self.repo.init(function(err, inited) {
				if (err) {
					return callback(err);
				}
				self.stage()

				self.spawn(callback);

			})
		});
	})
};

Spawn.prototype.installEngine = function(callback) {
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

		//fix env
		self.env.NODE_VERSION = 'v' + version;
		self.env.NODE_PREFIX = self.engine.node;
		self.env.NODE_PATH = path.join(self.engine.dir, 'lib', 'node_modules');
		self.env.NODE_CHANNEL_FD = 0;
		var concatPATH = (process.env.PATH ? ':' + process.env.PATH : '');
		self.env.PATH = path.join(self.engine.dir, 'bin') + ':' + path.join(self.engine.dir, 'node_modules') + concatPATH;
		var concatCPATH = (process.env.CPATH ? ':' + process.env.CPATH : '');
		self.env.CPATH = path.join(self.engine.dir, 'include') + ':' + path.join(self.engine.dir, 'include', 'node') + concatCPATH;
		var concatLIBRARY_PATH = (process.env.LIBRARY_PATH ? ':' + process.env.LIBRARY_PATH : '');
		self.env.LIBRARY_PATH = path.join(self.engine.dir, 'lib') + ':' + path.join(self.engine.dir, 'lib', 'node') + concatLIBRARY_PATH;

		self.options.cwd = self.engine.dir;
		self.options.command = 'node'// self.engine.node;

		self.options.carapaceBin = path.join(__dirname, 'haibu-carapace', 'bin', 'carapace');

		callback()
	})
}

Spawn.prototype.setEnv = function(callback) {

	var self = this

	if (this.app.env)
		mixin(this.env, this.app.env);
	this.options.env = this.env;
	raft.mongoose.Env.find({
		user : app.user,
		name : app.name
	}, function(err, envs) {
		envs.forEach(function(_env) {
			self.options.env[_env.key] = _env.value
		})
		callback()
	})
};

Spawn.prototype.spawn = function(callback) {
	this.stage()
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

	})
};

Spawn.prototype.restart = function() {

};

Spawn.prototype.restart = function() {
	this.stage(11)
	var self = this
	this.drone.removeListener('exit', self.onExit.bind(self));

	self.drone.removeListener('stdout', self.onStdout.bind(self));
	self.drone.removeListener('stderr', self.onStderr.bind(self));
	self.drone.removeListener('restart', self.onChildRestart.bind(self));
	self.drone.removeListener('message', self.onCarapacePort.bind(self));

	this.drone.once('exit', function() {
		self.stage(10)
		self.trySpawn()
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

		this.stage()
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

	}
}
//
// When the drone starts, update the result for monitoring software
//
Spawn.prototype.onChildStart = function onChildStart(monitor, data) {

	this.stage()
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
	}
	this.stats ? this.stats.kill(function() {

	}) : null
}

Spawn.prototype.onTimeout = function onTimeout() {
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