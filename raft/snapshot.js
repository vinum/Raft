/*
 *
 * (C) 2013, MangoRaft.
 *
 */

var fs = require('fs');
var path = require('path');
var util = require('util');
var fs = require('fs');
var spawn = require('child_process').spawn
var exec = require('child_process').exec
var events = require('events');
var url = require('url');
var zlib = require('zlib')
var EventEmitter2 = require('eventemitter2').EventEmitter2;

var semver = require('semver');
var request = require('request')
var tar = require('tar')
var NPM = require('npm')

var raft = require('../raft')

var mixin = raft.common.mixin
var async = raft.common.async
var rimraf = raft.common.rimraf

/**
 * NPM stuff
 */

var npm = {}

npm.install = function(snapshot, dir, dependencies, callback) {
	if (!dir) {
		var err = new Error('Cannot install npm dependencies without a target directory.');
		err.blame = {
			type : 'system',
			message : 'NPM configuration'
		}
		return callback();
	}

	var deps = Object.keys(dependencies).map(function(key) {
		return key + '@' + dependencies[key]
	});

	deps.unshift('install')
	var cp = spawn('npm', deps, {
		cwd : dir
	});
	var bufferOut = []
	var bufferErr = []
	function onOutData(data) {
		data = data.toString();

		snapshot.emit('npmout', data)
	}


	cp.stdout.on('data', onOutData);

	cp.stderr.on('data', onOutData);

	cp.on('exit', function(code) {
		callback()
	});

	snapshot.sendEvent('npm', deps)
};

/***
 *
 */

var SnapShot = exports.SnapShot = function(meta, options) {
	EventEmitter2.call(this, {
		wildcard : true, // should the event emitter use wildcards.
		delimiter : '::', // the delimiter used to segment namespaces, defaults to `.`.
		newListener : false, // if you want to emit the newListener event set to true.
		maxListeners : 200, // the max number of listeners that can be assigned to an event, defaults to 10.
	});
	options = options || {};
	this.meta = meta;
	this.snapshot = meta.snapshot;
	this.spawn = options.spawn;
	this.snapshot._id = meta.package.name.replace(' ', '-');
	this.package = {};
	var uid = options.uid || raft.common.uuid().split('-')[0]
	this.directories = {
		user : path.join(raft.directories.package, meta.user.username),
		package : path.join(raft.directories.package, meta.user.username, uid),
		logs : path.join(raft.directories.logs, meta.user.username),
		tmp : path.join(raft.directories.tmp),
		home : path.join(raft.directories.package, meta.user.username, uid, meta.package.name)
	}
	this.files = {
		tmp : null
	}
	this._event = 'nostart'
	this.mounts = []
	this.scripts = {
		start : null
	}
	this.dependencies = {}
};
//
// Inherit from `events.EventEmitter`.
//
util.inherits(SnapShot, EventEmitter2);

//
// ### function validate ()
// #### @keys {Array||String} The keys to check in app. (i.e. 'scripts.start')
// #### @app {Object} (optional) The app object to check. if not given this.app will be used.
// #### @return {Error|| undefined} undefined if valid, Error if not
// Checks Application configuration attributes used by this repository type
//
SnapShot.prototype.validate = function(keys, app) {
	var i, i2, required, props, check;

	// Check for the basic required properties needed for haibu repositories + requested ones
	keys = keys || [];
	required = ['name', 'user', 'repository.type', 'scripts.start'].concat(keys);

	for ( i = 0; i < required.length; i++) {
		// split property if needed and run over each part
		props = required[i].split('.');
		check = app || this.app;

		for ( i2 = 0; i2 < props.length; i2++) {
			if ( typeof (check[props[i2]]) == 'undefined') {
				var message = ['Property', required[i], 'is required.'].join(' ');
				var err = new Error(message);
				err.blame = {
					type : 'user',
					message : 'Missing properties in repository configuration'
				}
				throw err;
				return;
			}

			check = check[props[i2]];
		}
	}
	// all ok!
	return;
}

SnapShot.prototype.sendEvent = function(event, data) {
	var meta = {
		//
	}

	meta.data = data
	meta.time = Date.now()
	meta.uid = this.uid
	meta.event = event

	this._event = event

	this.emit(event, meta)
}
SnapShot.prototype.clean = function() {
	var self = this
	function clean() {
		raft.common.rimraf(self.directories.package, function() {
			raft.common.rimraf(self.files.tmp, function() {
				self.sendEvent('clean', self.directories)
			});
		});
	}

	if (self.mounts.length) {
		self.unmount(self.mounts, clean)
	} else {
		clean()
	}
}

SnapShot.prototype.installDependencies = function(callback) {
	var self = this;
	var package;
	fs.readFile(path.join(this.directories.home, 'package.json'), function(err, data) {

		if (!err) {
			try {
				package = self.package = JSON.parse(data);
				package.dependencies = package.dependencies || {};
				self.dependencies = mixin({}, package.dependencies, self.dependencies || {});
			} catch (err) {
				//
				// Ignore errors
				//
			}

			self.sendEvent('dependencies', self.dependencies)
			npm.install(self, self.directories.home, self.dependencies, function(err, std) {

				callback()
			});
		} else {
			callback(err)
		}
	});
};

SnapShot.prototype.stat = function(callback) {
	var self = this;

	fs.readdir(this.directories.package, function(err, files) {
		if (err) {

			err.blame = {
				type : 'system',
				message : 'Cannot find application directories'
			}

			return callback(err, false);
		} else if (files.length === 0) {

			err = new Error('Application directory is empty');
			err.blame = {
				type : 'user',
				message : 'Repository local directory empty'
			}

			return callback(err);
		}

		// Now that we know the home directory, set it on the app managed by this repository
		var firstNonDot = files.filter(function (f) { return f[0] !== '.' })[0]
		var sourceDir = path.join(self.directories.package, firstNonDot);

		self._setHome(firstNonDot);

		callback(null, true);
	});
};

SnapShot.prototype.createDir = function createDir(dir, cb) {
	fs.stat(dir, function(spawnErr, stats) {
		if (spawnErr) {
			return fs.mkdir(dir, 0755, function(mkAppErr) {
				if (mkAppErr) {

					return cb(mkAppErr, false);
				}
				cb(null, true);
			});
		}
		cb(null, true);
	});
}
SnapShot.prototype.mkdir = function(callback) {
	var self = this;

	fs.stat(self.directories.user, function(userErr, stats) {

		return self.createDir(self.directories.user, function(err) {
			if (err) {
				return callback(err)
			}
			self.createDir(self.directories.package, function(err) {
				if (err) {
					return callback(err)
				}
				self.createDir(self.directories.logs, function(err) {
					if (err) {
						return callback(err)
					}

					setTimeout(function() {

						callback(null, false);
					}, 1000)
				})
			})
		})
		callback(null, true);
	});
};

SnapShot.prototype.bootstrap = function(callback) {
	var self = this;
	self.sendEvent('bootstrap', {})
	this.stat(function(err, exists) {
		if (err) {
			return self.mkdir(function(err, created) {
				if (err) {
					return callback(err)
				}

				callback(null, false);

			});
		}

		// If it already exists assume mkdir and init have also been called

		callback(null, true)
	});
};

SnapShot.prototype._setHome = function(path) {
	this.directories.home = path;
};

SnapShot.prototype._setScripts = function() {
	var self = this
	this.scripts.start = this.meta.instance.script
};

SnapShot.prototype.is_mounted = function(pat, cb) {
	var self = this
	exec('mount | grep \'' + pat + '\'', function(err, stdout, stderr) {
		var pos = stdout.indexOf(pat);
		if (pos > -1) {
			cb(null, true);
		} else {
			cb(null, false);
		}
	});
};

SnapShot.prototype.ensure_mounted = function(src, tgt, opts, cb) {
	var self = this
	self.is_mounted(tgt, function(err, resp) {
		if (resp === true) {
			cb(null, true);
		} else {
			var cmd = 'sudo mount ' + opts + ' ' + src + ' ' + tgt;
			exec(cmd, function(err, stdout, stderr) {
				self.is_mounted(tgt, function(err, resp) {
					if (resp === true) {
						cb(null, true);
					} else {
						cb(null, false);
					}
				});
			});
		}
	});
};
SnapShot.prototype.mount = function(paths, callback) {
	var self = this
	function mount(p, next) {

		var mountPath = path.join(self.directories.home, p)

		self.mounts.push(mountPath)

		fs.exists(mountPath, function(exists) {
			if (!exists) {
				fs.mkdir(mountPath, '0777', function(err) {
					self.ensure_mounted(p, mountPath, '--bind', function(err, resp) {
						if (err) {
							return callback(err)
						}

						if (resp === true) {
							next(null, true);
						} else {
							callback(new Error(mountPath + ' is not mounted'));
						}
					})
				})
			} else {
				next(null, true);
			}
		});
	}


	async.forEach(paths, function(p, next) {
		mount(p, function(err) {
			if (err) {
				return callback(err)
			}
			next()
		})
	}, function() {
		self.sendEvent('mount', {})
		callback()
	});
};

SnapShot.prototype.unmount = function(paths, callback) {
	var self = this

	function unmount(p, next) {
		exec('sudo umount ' + p, function(err, stdout, stderr) {
			if (err) {
				throw err
			}
			self.is_mounted(p, function(err, resp) {
				if (err) {
					return callback(err)
				}
				if (resp === true) {
					next(null, true);
				} else {
					next(null, false);
				}
			});
		});
	}


	async.forEach(paths, function(p, next) {
		unmount(p, function(err, resp) {
			if (err) {
				return callback(err)
			}
			next(null, true)
		})
	}, function() {
		self.sendEvent('unmount', {})
		callback()
	});

};

SnapShot.prototype.fetchHttp = function(callback) {
	var remotePath = this.snapshot.url
	var self = this;
	var out;
	var filename = url.parse(remotePath).pathname.split('/').pop();
	var localFile = this.files.tmp = path.join(this.directories.tmp, raft.common.uuid());
	var localStream = fs.createWriteStream(localFile);
	out = request({
		uri : remotePath
	});
	out.pipe(localStream);
	localStream.once('close', function() {
		self.sendEvent('fetch', {
			uri : remotePath
		})
		callback(null, localFile);
	});
};
SnapShot.prototype.unTar = function(callback) {
	var self = this;
	var stderr = ''
	this.fetchHttp(function(err, packageFile) {
		if (err) {
			return callback(err);
		}
		var child = require('child_process').spawn('tar', ['-C', self.directories.package, '-xzf', '-']), files = [];

		fs.createReadStream(packageFile).pipe(child.stdin);

		child.stderr.on('data', function(data) {
			stderr += data.toString()
		})
		child.on('exit', function(statusCode) {
			if (statusCode) {
				return callback(new Error('tar exited with code: ' + statusCode + ' \n' + stderr));
			}
			self.sendEvent('untar', {

			})

			callback()
		});
	});
};
SnapShot.prototype.init = function(callback) {
	var self = this;
	self.sendEvent('init', {})
	this.unTar(function(err) {
		if (err) {
			return callback(err);
		}
		self.installDependencies(function(err, packages) {
			if (err) {
				return callback(err);
			}
			self._setScripts()
			if (self.meta.instance.mounts && Array.isArray(self.meta.instance.mounts)) {
				self.mount(self.meta.instance.mounts, function(err) {
					if (err) {
						return callback(err)
					}
					callback(null, true, packages);
				})
			} else {
				callback(null, true, packages);
			}
		});
	})
};
