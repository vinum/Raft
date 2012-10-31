/*
 * spawner.js: Spawner object responsible for starting carapace processes.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var fs = require('fs'), path = require('path'), forever = require('forever-monitor'), semver = require('semver'), mixin = require('flatiron').common.mixin, raft = require('../../raft');

raft.getSpawnOptions = function getSpawnOptions(app) {
	var engine = (app.engines || app.engine || {
		node : app.engine
	}).node, engineDir = raft.config.get('directories:node-installs'), nodeVersions = engineDir && fs.readdirSync(engineDir), carapaceDir = raft.config.get('directories:carapace-installs'), carapaceVersions = carapaceDir && fs.readdirSync(carapaceDir), env = {}, command = 'node', nodeDir, version, cwd;

	var options = {};
	if (nodeVersions) {
		engine = (app.engines || app.engine || {
			node : app.engine
		}).node;
		if ( typeof engine !== 'string') {
			engine = '0.6.x';
		}
		version = semver.maxSatisfying(nodeVersions, engine);
		if (!version) {
			var err = new Error(['raft could not find a node.js version satisfying specified', 'node.js engine `' + String(engine) + '`. Try specifying a different ' + 'version of node.js', 'in your package.json, such as `0.8.x`.'].join('\n'));
			err.blame = {
				type : 'user',
				message : 'Repository configuration'
			}
			throw err;
		}
		nodeDir = path.join(engineDir, version);
	}
	if (carapaceVersions) {
		if ( typeof engine !== 'string') {
			engine = '0.4.x';
		}
		version = semver.maxSatisfying(carapaceVersions, engine);
		if (!version) {
			var err = new Error('Error spawning drone: no matching carapace found');
			err.blame = {
				type : 'user',
				message : 'Repository configuration'
			}
			throw err;
		}
		options.carapaceBin = path.join(carapaceDir, version, 'node_modules', 'raft-carapace', 'bin', 'carapace');
	} else {
		options.carapaceBin = path.join(require.resolve('raft-carapace'), '..', '..', 'bin', 'carapace');
	}

	//options.carapaceBin = path.join(__dirname, '..', '..', '..', '..', 'raft-carapace', 'bin', 'carapace.js');
	if (version) {
		//
		// Add node (should be configured with --no-npm) and -g modules to path of repo
		//
		if (semver.lt(version, '0.6.5')) {
			options.forkShim = carapaceVersions ? path.join(options.carapaceBin, '..', '..', '..', 'node-fork', 'lib', 'fork.js') : true;
		}
		env.NODE_VERSION = 'v' + version;
		env.NODE_PREFIX = nodeDir;
		env.NODE_PATH = path.join(nodeDir, 'lib', 'node_modules');
		env.NODE_CHANNEL_FD = 0;
		var concatPATH = (process.env.PATH ? ':' + process.env.PATH : '');
		env.PATH = path.join(nodeDir, 'bin') + ':' + path.join(nodeDir, 'node_modules') + concatPATH;
		var concatCPATH = (process.env.CPATH ? ':' + process.env.CPATH : '');
		env.CPATH = path.join(nodeDir, 'include') + ':' + path.join(nodeDir, 'include', 'node') + concatCPATH;
		var concatLIBRARY_PATH = (process.env.LIBRARY_PATH ? ':' + process.env.LIBRARY_PATH : '');
		env.LIBRARY_PATH = path.join(nodeDir, 'lib') + ':' + path.join(nodeDir, 'lib', 'node') + concatLIBRARY_PATH;

		options.cwd = nodeDir;
		command = path.join(nodeDir, 'bin', 'node');
	}

	var carapaceEnv = raft.config.get('carapace:env');
	if (carapaceEnv)
		mixin(env, carapaceEnv);
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
	this.packageDir = options.packageDir || raft.config.get('directories:packages');
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
		repo = app instanceof raft.repository.Repository ? app : raft.repository.create(app)
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

			self.spawn(repo, callback);
		});
	});
};

//
// ### function spawn (app, callback)
// #### @repo {Repository} App code repository to spawn from on this server.
// #### @callback {function} Continuation passed to respond to.
// spawns the appropriate carapace for an Application repository and bootstraps with the events listed
//
Spawner.prototype.spawn = function spawn(repo, callback) {
	if (!( repo instanceof raft.repository.Repository)) {
		var err = new Error('Error spawning drone: no repository defined');
		err.blame = {
			type : 'user',
			message : 'Repository configuration'
		}
		return callback();
	}

	var self = this, app = repo.app, meta = {
		app : app.name,
		user : app.user
	}, script = repo.startScript, result, responded = false, stderr = [], stdout = [], options = ['--plugin', 'net'], foreverOptions, carapaceBin, timeout, error, drone;

	raft.emit('spawn:setup', 'info', meta);

	try {
		var spawnOptions = raft.getSpawnOptions(app);
	} catch (e) {
		return callback(e);
	}

	foreverOptions = {
		fork : true,
		silent : false,
		stdio : ['ipc', 'pipe', 'pipe'],
		cwd : repo.homeDir,
		hideEnv : raft.config.get('hideEnv'),
		env : spawnOptions.env,
		killTree : true,
		killTTL : 0,
		minUptime : this.minUptime,
		command : spawnOptions.command,
		options : [spawnOptions.carapaceBin].concat(options)
	};

	//
	// Concatenate the `argv` of any plugins onto the options
	// to be passed to the carapace script.
	//
	Object.keys(raft.plugins).forEach(function(plugin) {
		var spawn;

		if (raft.plugins[plugin].argv) {
			raft.emit('plugin:argv', 'info', {
				app : app.name,
				user : app.user,
				plugin : plugin
			});

			spawn = raft.plugins[plugin].argv(repo);

			if (spawn.script) {
				script = spawn.script
			}

			if (spawn.argv) {
				foreverOptions.options = foreverOptions.options.concat(spawn.argv);
			}
		}
	});

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
		var monitor = drone = new forever.Monitor(carapaceBin, foreverOptions);
		drone.on('error', function() {
			//
			// 'error' event needs to be caught, otherwise
			// the raft process will die
			//
		});

		drone.timmer = 0
		drone.stats = {}

		raft.emit(['spawn', 'begin'], 'info', {
			options : foreverOptions.options.join(' '),
			app : meta.app,
			user : meta.user,
			drone : drone,
			pkg : app
		});

		//
		// Log data from `drone.stdout` to raft
		//
		function onStdout(data) {
			data = data.toString();
			raft.emit('drone:stdout', 'info', data, meta);

			if (!responded) {
				stdout = stdout.concat(data.split('\n').filter(function(line) {
					return line.length > 0
				}));
			}
		}

		//
		// Log data from `drone.stderr` to raft
		//
		function onStderr(data) {
			data = data.toString();
			raft.emit('drone:stderr', 'error', data, meta);

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
		// (remark) this may not work if raft starts two apps at the same time
		//
		function onError(err) {
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

				raft.emit('drone:port', 'info', {
					pkg : app,
					info : info
				});

				raft.common.bcryptHash(raft.common.uuid(), function(err, hash) {
					result.droneHash = hash
					callback(null, result);
				})
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
		function onChildStart(_monitor, data) {
			result = {
				monitor : monitor,
				process : monitor.child,
				data : data,
				pid : monitor.childData.pid,
				pkg : app
			};

			raft.emit(['drone', 'start'], 'info', {
				process : data,
				pkg : result.pkg
			});
		}

		//
		// When the drone stops, update the result for monitoring software
		//
		function onChildRestart(monitor, data) {
			raft.emit(['drone', 'stop'], 'info', {
				process : result.data,
				pkg : result.pkg
			});

			raft.emit(['drone', 'start'], 'info', {
				process : data,
				pkg : result.pkg
			});
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
				console.log(error)
				callback(error);

				//
				// Remove listeners to related events.
				//
				drone.removeListener('error', onError);
				drone.removeListener('message', onCarapacePort);
				clearTimeout(timeout);
			}
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

		timeout = setTimeout(onTimeout, raft.config.get('portTimeout') || 20000);
console.log(foreverOptions)
		drone.start();
	});
};

