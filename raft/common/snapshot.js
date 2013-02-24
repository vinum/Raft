/*
 *
 * (C) 2013, MangoRaft.
 *
 */

var fs = require('fs');
var path = require('path');
var util = require('util');
var fs = require('fs');
var exec = require('child_process').exec
var events = require('events');
var url = require('url');
var zlib = require('zlib')

var semver = require('semver');
var request = require('request')
var tar = require('tar')
var NPM = require('npm')

var raft = require('../../raft')

var mixin = raft.common.mixin
var async = raft.common.async
var rimraf = raft.common.rimraf

/**
 * NPM stuff
 */

var npm = {}

npm.install = function(dir, dependencies, callback) {
	if (!dir) {
		var err = new Error('Cannot install npm dependencies without a target directory.');
		err.blame = {
			type : 'system',
			message : 'NPM configuration'
		}
		return callback();
	}

	var deps = Object.keys(dependencies).map(function(key) {
		return key + '@' + dependencies[ley]
	});

	exec('npm install ' + deps.join(' '), {
		cwd : dir
	}, function(err, stdout, stderr) {
		if (err) {
			err.stdout = stdout
			err.stderr = stderr
			return callback(err);
		} else {
			callback(null, {
				stdout : stdout,
				stderr : stderr
			})
		}
	});
};

/***
 *
 */

var SnapShot = exports.SnapShot = function(meta, options) {
	events.EventEmitter.call(this);
	options = options || {};
	this.meta = meta;
	this.snapshot = meta.snapshot;
	this.snapshot._id = meta.package.name.replace(' ', '-');
	this.package = {};
	var id = raft.common.uuid().split('-')[0]
	this.directories = {
		user : path.join(raft.directories.package, meta.user.username),
		package : path.join(raft.directories.package, meta.user.username, id),
		logs : path.join(raft.directories.logs, meta.user.username),
		tmp : path.join(raft.directories.tmp),
		home : path.join(raft.directories.package, meta.user.username, id, meta.package.name)
	}
	this.files = {
		tmp : null
	}
	this.scripts = {
		start : null
	}
	this.dependencies = {}
};
//
// Inherit from `events.EventEmitter`.
//
util.inherits(SnapShot, events.EventEmitter);

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

SnapShot.prototype.clean = function() {
	var self = this
	raft.common.rimraf(this.directories.package, function() {
		raft.common.rimraf(self.files.tmp, function() {

		});
	});
}

SnapShot.prototype.installDependencies = function(callback) {
	var self = this;
	var package

	fs.readFile(path.join(this.directories.home, 'package.json'), function(err, data) {
		if (!err) {
			try {
				package = self.package = JSON.parse(data);
				package.dependencies = pkg.dependencies || {};
				self.dependencies = mixin({}, package.dependencies, self.dependencies || {});
			} catch (err) {
				//
				// Ignore errors
				//
			}
			npm.install(self.directories.home, self.dependencies, function(err, std) {
				self.npmlog = std
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

SnapShot.prototype.mkdir = function(callback) {
	var self = this;
	function createDir(dir, cb) {
		fs.stat(dir, function(droneErr, stats) {
			if (droneErr) {
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


	fs.stat(self.directories.user, function(userErr, stats) {

		return createDir(self.directories.user, function(err) {
			if (err) {
				return callback(err)
			}
			createDir(self.directories.package, function(err) {
				if (err) {
					return callback(err)
				}
				createDir(self.directories.logs, function(err) {
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
	Object.keys(this.package.scripts).forEach(function(key) {
		self.scripts[key] = path.join(self.package.scripts[key])
	})
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

			callback()
		});
	});
};
SnapShot.prototype.init = function(callback) {
	var self = this;
	this.unTar(function(err) {
		if (err) {
			return callback(err);
		}
		self.installDependencies(function(err, packages) {
			if (err) {
				return callback(err);
			}
			self._setScripts()
			callback(null, true, packages);
		});
	})
};
