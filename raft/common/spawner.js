/*
 * spawner.js: Spawner object responsible for starting carapace processes.
 *
 * (C) 2010, Nodejitsu Inc.
 *
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
var Packer = require("fstream-npm")
var fs = require('fs')
var zlib = require('zlib')
var exec = require('child_process').exec;
var crypto = require('crypto');
var fstream = require("fstream")
var raft = require('../../raft')
var Stats = require('./stats')

function getSpawnOptions(app) {
	var engine = (app.engines || app.engine || {
		node : app.engine
	}).node;
	var env = {}
	var command = 'node'
	var nodeDir
	var version
	var cwd;

	var options = {};

	options.carapaceBin = path.join(__dirname, 'haibu-carapace', 'bin', 'carapace');

	if (app.env)
		mixin(env, app.env);
	options.env = env;
	options.command = command;
	return options;
}

var Spawner = exports.Spawner = function Spawner(options) {
	options = options || {};

	this.maxRestart = options.maxRestart;
	this.options = options
	this.silent = options.silent || false;
	this.host = options.host || '127.0.0.1';
	this.packageDir = options.packageDir
	this.logsDir = options.logsDir
	this.minUptime = typeof options.minUptime !== 'undefined' ? options.minUptime : 2000;
};

//
// ### function trySpawn (app, callback)
// #### @app {App} Application to attempt to spawn on this server.
// #### @callback {function} Continuation passed to respond to.
// Attempts to spawn the application with the package.json manifest
// represented by @app, then responds to @callback.
//
Spawner.prototype.trySpawn = function(app, callback) {
	var self = this, repo;

	try {
		repo = app instanceof repositories.Repository ? app : repositories.create(app, this.options)
	} catch (ex) {
		return callback(ex)
	}

	if ( repo instanceof Error) {
		return callback(repo);
	}

	repo.bootstrap(function(err, existed) {
		if (err) {
			return callback(err);
		} else if (existed) {
			return self.spawn(repo, callback);
		}

		repo.init(function(err, inited) {
			if (err) {
				return callback(err);
			}
			console.log('dsfsdfsdfsdf')
			self.spawn(repo, callback);

		})
	});
};

//
// ### function rmApp (appsDir, app, callback)
// #### @appsDir {string} Root for all application source files.
// #### @app {App} Application to remove directories for.
// #### @callback {function} Continuation passed to respond to.
// Removes all source code associated with the specified `app`.
//
Spawner.prototype.snapshot = function(repo, app, callback) {
	var sha = crypto.createHash('sha1')
	console.log(repo.appDir)
	var id = raft.common.uuid()
	var tarPath = path.join(raft.directories.tmp, id)
	var tar = new Packer({
		path : repo.appDir,
		type : "Directory",
		isDirectory : true
	})

	function updateSha(chunk) {
		console.log(chunk)
		sha.update(chunk);
	}

	function onError(err) {
		err.usage = 'tar -cvz . | curl -sSNT- HOST/deploy/USER/APP';
		err.blame = {
			type : 'system',
			message : 'Unable to unpack tarball'
		};
		console.log(err)
		return callback(err);
	}

	function onEnd() {
		//
		// Stop updating the sha since the stream is now closed.
		//
		tar.removeListener('data', updateSha);

		var hash = sha.digest('hex');

		raft.mongoose.Snapshot.find({
			hash : hash
		}, function(err, snapshot) {
			if (err) {
				return callback(err);
			}
			console.log(tarPath, path.join(repo._snapshotDir, app.user, hash + '.tar'))
			if (!snapshot) {
				fs.rename(tarPath, path.join(repo._snapshotDir, app.user, hash + '.tar'), function(err) {
					if (err) {
						return callback(err);
					}

					new raft.mongoose.Snapshot({
						hash : hash,
						tar : path.join(repo._snapshotDir, app.user, hash + '.tar'),
						user : app.user,
						name : app.name
					}).save(function(err) {
						if (err) {
							return callback(err);
						}
						raft.mongoose.Snapshot.find({
							hash : hash
						}, function(err, snapshot) {
							if (err) {
								return callback(err);
							}

							callback(null, snapshot)
						})
					})
				});
			} else {
				fs.unlink(tarPath, function(err) {
					if (err) {
						return callback(err);
					}
					callback(null, snapshot)

				})
			}
		})
	}


	console.log(tar)
	tar.on("error", onError).pipe(zlib.Gzip()).on("error", onError).on('data', updateSha).pipe(fstream.Writer({
		type : "File",
		path : tarPath
	})).on("error", onError).on("end", onEnd)
	if (tar.chunks) {
		tar.chunks.forEach(updateSha);
	}

};
//
// ### function rmApp (appsDir, app, callback)
// #### @appsDir {string} Root for all application source files.
// #### @app {App} Application to remove directories for.
// #### @callback {function} Continuation passed to respond to.
// Removes all source code associated with the specified `app`.
//
Spawner.prototype.rmApp = function(appsDir, app, callback) {
	return rimraf(path.join(appsDir, app.user, app.name), callback);
};

//
// ### function rmApps (appsDir, callback)
// #### @appsDir {string} Root for all application source files.
// #### @callback {function} Continuation passed to respond to.
// Removes all source code associated with all users and all applications
// from this Haibu process.
//
Spawner.prototype.rmApps = function(appsDir, callback) {
	if (!callback && typeof appsDir === 'function') {
		callback = appsDir;
		appsDir = null;
	}
	fs.readdir(appsDir, function(err, users) {
		if (err) {
			return callback(err);
		}

		async.forEach(users, function rmUser(user, next) {
			rimraf(path.join(appsDir, user), next);
		}, callback);
	});
};

//
// ### function spawn (app, callback)
// #### @repo {Repository} App code repository to spawn from on this server.
// #### @callback {function} Continuation passed to respond to.
// spawns the appropriate carapace for an Application repository and bootstraps with the events listed
//
Spawner.prototype.spawn = function spawn(repo, callback) {
	if (!( repo instanceof repositories.Repository)) {
		var err = new Error('Error spawning drone: no repository defined');
		err.blame = {
			type : 'user',
			message : 'Repository configuration'
		}
		return callback();
	}
	var self = this
	var app = repo.app
	var meta = {
		name : app.name,
		user : app.user
	}
	var script = repo.startScript;
	var result = new events.EventEmitter();
	var responded = false;
	var stderr = [];
	var stdout = [];
	var options = ['--plugin', 'net', '--plugin', 'rpc', '--plugin', 'env'];
	var foreverOptions;
	var carapaceBin;
	var timeout;
	var error;

	try {
		var spawnOptions = getSpawnOptions(app);
	} catch (e) {
		return callback(e);
	}

	var uid = (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1)

	var logFile = this.logsDir + '/' + meta.user + '.' + meta.name + '.logFile.' + uid + '.log'
	var outFile = this.logsDir + '/' + meta.user + '.' + meta.name + '.outFile.' + uid + '.log'
	var errFile = this.logsDir + '/' + meta.user + '.' + meta.name + '.errFile.' + uid + '.log'

	foreverOptions = {
		fork : true,
		silent : true,
		stdio : ['ipc', 'pipe', 'pipe'],
		cwd : repo.homeDir,
		hideEnv : [],
		env : spawnOptions.env,
		killTree : true,
		uid : uid,
		killTTL : 0,
		minUptime : this.minUptime,
		command : spawnOptions.command,
		options : [spawnOptions.carapaceBin].concat(options),
		'outFile' : outFile,
		'errFile' : errFile
	};

	foreverOptions.forever = typeof self.maxRestart === 'undefined';

	if ( typeof self.maxRestart !== 'undefined') {
		foreverOptions.max = self.maxRestart;
	}

	//
	// Before we attempt to spawn, let's check if the startPath actually points to a file
	// Trapping this specific error is useful as the error indicates an incorrect
	// scripts.start property in the package.json
	//
	fs.stat(repo.startScript, function(err, stats) {
		if (err) {
			var err = new Error('package.json error: ' + 'can\'t find starting script: ' + repo.app.scripts.start);
			err.blame = {
				type : 'user',
				message : 'Package.json start script declared but not found'
			}
			return callback(err);
		}

		foreverOptions.options.push(script);
		carapaceBin = foreverOptions.options.shift();
		console.log(foreverOptions)
		var drone = new forever.Monitor(carapaceBin, foreverOptions);
		drone.on('error', function() {
			//
			// 'error' event needs to be caught, otherwise
			// the haibu process will die
			//
		});

		//
		// Log data from `drone.stdout` to haibu
		//
		function onStdout(data) {
			data = data.toString();

			if (!responded) {
				stdout = stdout.concat(data.split('\n').filter(function(line) {
					return line.length > 0
				}));
			}
		}

		//
		// Log data from `drone.stderr` to haibu
		//
		function onStderr(data) {
			data = data.toString();

			if (!responded) {
				stderr = stderr.concat(data.split('\n').filter(function(line) {
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
		function onError(err) {
			console.log(err)
			if (!responded) {
				errState = true;
				responded = true;
				callback(err);

				//
				// Remove listeners to related events.
				//
				drone.removeListener('exit', onExit);
				drone.removeListener('message', onCarapacePort);
				clearTimeout(timeout);
			}
		}

		//
		// When the carapace provides the port that the drone
		// has bound to then respond to the callback
		//
		function onCarapacePort(info) {
			if (!responded && info && info.event === 'port') {
				responded = true;
				result.socket = {
					host : self.host,
					port : info.data.port
				};

				drone.minUptime = 0;

				callback(null, result);

				//
				// Remove listeners to related events
				//
				drone.removeListener('exit', onExit);
				drone.removeListener('error', onError);
				clearTimeout(timeout);

			}
		}

		//
		// When the drone starts, update the result for monitoring software
		//
		function onChildStart(monitor, data) {

			result.process = monitor.child
			result.monitor = drone

			result.data = data
			result.pid = monitor.childData.pid
			result.pkg = app
			result.logs = {
				outFile : outFile,
				errFile : errFile
			}
			result.stats = new Stats({
				name : meta.name,
				user : meta.user,
				pid : result.pid,
				uid : uid
			})

			var rpc = result.rpc = new raft.common.Module(function(data) {
				drone.child.send({
					cmd : 'rpc',
					data : data
				})
			})
			drone.child.on('message', function(message) {
				if (message.data && message.cmd && message.cmd === 'rpc') {
					result.rpc.requestEvent(message.data);
				}
			})
		}

		//
		// When the drone stops, update the result for monitoring software
		//
		function onChildRestart(monitor, data) {

		}

		//
		// If the drone exits prematurely then respond with an error
		// containing the data we receieved from `stderr`
		//
		function onExit() {
			if (!responded) {
				errState = true;
				responded = true;
				error = new Error('Error spawning drone');
				error.blame = {
					type : 'user',
					message : 'Script prematurely exited'
				}
				error.stdout = stdout.join('\n');
				error.stderr = stderr.join('\n');
				callback(error);

				//
				// Remove listeners to related events.
				//
				drone.removeListener('error', onError);
				drone.removeListener('message', onCarapacePort);
				clearTimeout(timeout);
			}
			result.stats ? result.stats.kill(function() {

			}) : null
		}

		function onTimeout() {
			drone.removeListener('exit', onExit);

			drone.stop();
			error = new Error('Error spawning drone');
			error.blame = {
				type : 'user',
				message : 'Script took too long to listen on a socket'
			};
			error.stdout = stdout.join('\n');
			error.stderr = stderr.join('\n');

			callback(error);
		}

		//
		// Listen to the appropriate events and start the drone process.
		//
		drone.on('stdout', onStdout);
		drone.on('stderr', onStderr);
		drone.once('exit', onExit);
		drone.once('error', onError);
		drone.once('start', onChildStart);
		drone.on('restart', onChildRestart);

		drone.on('message', onCarapacePort);

		timeout = setTimeout(onTimeout, 20000);

		drone.start();

	});
};

