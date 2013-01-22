var mongoose = require('mongoose')
var Schema = mongoose.Schema
var bcrypt = require('bcrypt')

var path = require('path');
var util = require('util');
var crypto = require('crypto');
var http = require('http');
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var tar = require('tar');
var fs = require('fs')
var zlib = require('zlib')
var fstream = require("fstream")
var tar = require('tar')
var path = require('path')
var Packer = require("fstream-npm")
var raft = require('../../../raft')
var SALT_WORK_FACTOR = 10,
// these values can be whatever you want - we're defaulting to a
// max of 5 attempts, resulting in a 2 hour lock
MAX_LOGIN_ATTEMPTS = 5
var LOCK_TIME = 2 * 60 * 60 * 1000;

var UserSchema = new Schema({
	username : {
		type : String,
		required : true,
		index : {
			unique : true
		}
	},
	zone : {
		type : String,
		required : true,
		'default' : 'free'
	},
	limit : {
		type : Number,
		required : true,
		'default' : 1
	},
	confirmed : {
		type : Boolean,
		required : true,
		'default' : false
	},
	password : {
		type : String,
		required : true
	},
	loginAttempts : {
		type : Number,
		required : true,
		'default' : 0
	},
	lockUntil : {
		type : Number
	}
});

UserSchema.virtual('isLocked').get(function() {
	// check for a future lockUntil timestamp
	return !!(this.lockUntil && this.lockUntil > Date.now());
});

UserSchema.pre('save', function(next) {
	var user = this;

	// only hash the password if it has been modified (or is new)
	if (!user.isModified('password'))
		return next();

	// generate a salt
	bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
		if (err)
			return next(err);

		// hash the password using our new salt
		bcrypt.hash(user.password, salt, function(err, hash) {
			if (err)
				return next(err);

			// set the hashed password back on our user document
			user.password = hash;

			module.exports.count(function(err, count) {
				if (count === 1) {
					user.zone = 'admin';
					user.confirmed = true;
				}
				next();
			})
		});
	});
});

UserSchema.methods.comparePassword = function(candidatePassword, cb) {
	bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
		if (err)
			return cb(err);
		cb(null, isMatch);
	});
};

UserSchema.methods.incLoginAttempts = function(cb) {
	// if we have a previous lock that has expired, restart at 1
	if (this.lockUntil && this.lockUntil < Date.now()) {
		return this.update({
			$set : {
				loginAttempts : 1
			},
			$unset : {
				lockUntil : 1
			}
		}, cb);
	}
	// otherwise we're incrementing
	var updates = {
		$inc : {
			loginAttempts : 1
		}
	};
	// lock the account if we've reached max attempts and it's not locked already
	if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
		updates.$set = {
			lockUntil : Date.now() + LOCK_TIME
		};
	}
	return this.update(updates, cb);
};
//
//
//

UserSchema.methods.getApps = function(cb) {
	raft.mongoose.Package.find({
		user : this.username
	}, cb)
};
//
//
//

function setSnapshot(userId, appId, stream, callback) {
	var time = Date.now()
	var dir = [userId, appId, time].join('-')
	var untarDir = path.join(path.join(__dirname, '..', '..', '..', '..', 'snapshot'), dir)
	var tarFile = path.join(__dirname, '..', '..', '..', '..', 'tar', dir + '.tar')

	var sha = crypto.createHash('sha1')
	var self = this;
	function updateSha(chunk) {
		sha.update(chunk);
	}

	//
	// Update the shasum for the package being streamed
	// as it comes in and prehash any buffered chunks.
	//
	stream.on('data', updateSha);
	if (stream.chunks) {
		stream.chunks.forEach(updateSha);
	}

	//
	// Handle error caused by `zlib.Gunzip` or `tar.Extract` failure
	//
	function onError(err) {

		return callback(err);
	}

	function onEnd() {

		//
		// Stop updating the sha since the stream is now closed.
		//
		stream.removeListener('data', updateSha);

		raft.mongoose.SnapShot.count({
			username : userId,
			appname : appId
		}, function(err, count) {
			if (err) {
				callback(err)
			}
			var snapshot = {
				package : require(untarDir + '/package'),
				tar : tarFile,
				dir : untarDir,
				ctime : time,
				hash : sha.digest('hex')

			}
			snapshot.package.package = true
			snapshot.package.version = snapshot.package.version + '-' + count
			var save = new raft.mongoose.SnapShot({
				username : userId,
				appname : appId,
				ctime : time,
				tar : tarFile,
				dir : untarDir,
				version : snapshot.package.version,
				hash : snapshot.hash
			});
			save.save(function(err) {
				if (err) {
					callback(err)
				} else {
					callback(null, snapshot)
				}
			})
		})
	}

	//
	// Create a temporary directory to untar the streamed data
	// into and pipe the stream data to a child `tar` process.
	//
	fs.mkdir(untarDir, '0755', function(err) {
		var write = false
		var pack = false
		function end() {
			if (write && pack) {
				onEnd()
			}
		}


		stream.pipe(fs.createWriteStream(tarFile, {
			flags : 'w'
		}).on('close', function() {
			write = true
			end()
		}))
		stream.pipe(zlib.Unzip()).on("error", onError).pipe(tar.Extract({
			type : "Directory",
			path : untarDir,
			strip : 1
		})).on("entry", function() {
			console.log('entry')
		}).on("error", onError).on("end", function() {
			pack = true
			end()
		})
	});

}

UserSchema.methods._startPackage = function(name, req, res, callback) {
	var user = this
	setSnapshot(user.username, name, req, function(err, sanpshot) {
		if (err) {
			return callback(err)
		}
		var _package = sanpshot.package

		var self = this
		var options = {
			host : 'localhost',
			port : 9002,
			path : '/deploy/' + user.username + '/' + _package.name,
			method : 'POST'
		};
		var _req = http.request(options, function(_res) {
			_res.setEncoding('utf8');
			var body = ''
			_res.on('data', function(chunk) {
				body += chunk
			});
			_res.on('end', function() {
				var json = JSON.parse(body)
				if (json.error) {
					return callback(json.error)
				}

				user.getApp(name, _package, function(err, package) {
					if (err) {
						return callback(err)
					}

					package._startPackage(user, json.drone, callback)

				})
			});
		});

		_req.on('error', callback);
		var a = new Packer({
			path : sanpshot.dir,
			type : "Directory",
			isDirectory : true
		}).pipe(tar.Pack({
			noProprietary : true
		})).on("error", callback).pipe(zlib.Gzip()).on("error", callback).pipe(_req)

	})
};

UserSchema.methods.getApp = function(name, package, cb) {
	raft.debug('UserSchema', 'app "' + name + '" with new package ' + package ? 'YES' : 'NO')
	var user = this;
	function returnPackage(err, _package) {
		if (err) {
			return cb(err)
		}

		raft.debug('UserSchema', 'return package', _package)
		if (!_package) {
			cb(new Error('Bad request package missing. Can not find package "' + name + '"'))
		} else {
			cb(null, _package)
		}
	}

	if (package === false) {

		raft.mongoose.Package.findOne({
			user : user.username,
			name : name
		}, returnPackage)
	} else {
		raft.debug('UserSchema', 'search for user: ' + user.username + ' name: ' + name)
		raft.mongoose.Package.findOne({
			user : user.username,
			name : name
		}, function(err, _package) {

			if (err) {
				return cb(err)
			}
			function save(err) {
				if (err) {
					return cb(err)
				}
				raft.debug('UserSchema', 'package saved')
				raft.mongoose.Package.findOne({
					user : user.username,
					name : name
				}, returnPackage)
			}


			raft.debug('UserSchema', 'search found package: ' + JSON.stringify(_package))
			if (package) {
				raft.debug('UserSchema', 'cleaning new package ')
				if (!package.subdomain) {
					raft.debug('UserSchema', 'package missing subdomain')
					return cb(new Error('package.subdomain missing'))
				}
				raft.debug('UserSchema', 'package subdomain: ' + package.subdomain)
				//
				package.user = user.username
				raft.debug('UserSchema', 'package user: ' + package.user)
				package.name = name
				raft.debug('UserSchema', 'package name: ' + package.name)
				package.zone = user.zone
				raft.debug('UserSchema', 'package zone: ' + package.zone)
				//
				if (user.zone === 'admin') {
					raft.debug('UserSchema', 'package is admin')
					package.domain = package.subdomain
				} else {
					package.domain = package.subdomain + '.apps.' + (raft.config.get('domain') || 'localhost')
				}
				raft.debug('UserSchema', 'package domain: ' + package.domain)

				raft.debug('UserSchema', 'cleaning dependencies')
				var dependencies = package.dependencies || {}
				var key = Object.keys(dependencies)

				raft.debug('UserSchema', 'dependencies keys: ' + key.join(', '))
				package.dependencies = []
				return;
				key.forEach(function(key) {
					package.dependencies.push({
						name : key,
						version : dependencies[key]
					})
				})

				raft.debug('UserSchema', 'dependencies clean: ' + JSON.stringify(package.dependencies))
				//
				if (_package) {

					raft.debug('UserSchema', 'updating old package')
					return raft.mongoose.Package.update({
						_id : _package._id
					}, {
						$set : package
					}, {
						multi : false
					}, function(err, numAffected) {
						save(err)
					});
				} else {

					raft.debug('UserSchema', 'saving new package')
					_package = new raft.mongoose.Package(package)
					return _package.save(save)
				}
			}

			if (!_package) {
				raft.debug('UserSchema', 'Bad request package missing.', _package, package, user)
				cb(new Error('Bad request package missing.'))
			} else {
				cb(null, _package)
			}

		})
	}

};
// expose enum on the model, and provide an internal convenience reference
var reasons = UserSchema.statics.failedLogin = {
	NOT_FOUND : 0,
	PASSWORD_INCORRECT : 1,
	MAX_ATTEMPTS : 2
};

UserSchema.statics.getAuthenticated = function(username, password, cb) {
	this.findOne({
		username : username
	}, function(err, user) {
		if (err)
			return cb(err);

		// make sure the user exists
		if (!user) {
			return cb(null, null, reasons.NOT_FOUND);
		}

		// check if the account is currently locked
		if (false && user.isLocked) {
			// just increment login attempts if account is already locked
			return user.incLoginAttempts(function(err) {
				if (err)
					return cb(err);
				return cb(null, null, reasons.MAX_ATTEMPTS);
			});
		}

		// test for a matching password
		user.comparePassword(password, function(err, isMatch) {
			if (err)
				return cb(err);

			// check if the password was a match
			if (isMatch) {
				// if there's no lock or failed attempts, just return the user
				if (!user.loginAttempts && !user.lockUntil)
					return cb(null, user);
				// reset attempts and lock info
				var updates = {
					$set : {
						loginAttempts : 0
					},
					$unset : {
						lockUntil : 1
					}
				};
				return user.update(updates, function(err) {
					if (err)
						return cb(err);
					return cb(null, user);
				});
			}

			// password is incorrect, so increment login attempts before responding
			user.incLoginAttempts(function(err) {
				if (err)
					return cb(err);
				return cb(null, null, reasons.PASSWORD_INCORRECT);
			});
		});
	});
};

module.exports = mongoose.model('User', UserSchema);
//module.exports.remove({},function(){})
module.exports.find(function(err, result) {
	//console.log(err, result)
})