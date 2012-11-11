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
		err.usage = 'tar -cvz . | curl -sSNT- HOST/deploy/USER/APP';
		err.blame = {
			type : 'system',
			message : 'Unable to unpack tarball'
		};
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

			var snapshot = {
				package : require(untarDir + '/package'),
				tar : tarFile,
				dir : untarDir,
				ctime : time,
				hash : sha.digest('hex')

			}
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
		stream.pipe(fs.createWriteStream(tarFile, {
			flags : 'w',
			encoding : null,
			mode : 0666
		}))
		stream.pipe(zlib.Unzip()).on("error", callback).pipe(tar.Extract({
			type : "Directory",
			path : untarDir,
			strip : 1
		})).on("error", onError).on("end", onEnd)
	});

}

UserSchema.methods._startPackage = function(name, req, res, callback) {
	var user = this
	setSnapshot(user.username, name, req, function(err, sanpshot) {

		var _package = require(sanpshot.dir + '/package.json')

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
				_package.package = true
				_package.version = snapshot.package.version

				user.getApp(name, _package, function(err, package) {
					if (err) {
						return callback(err)
					}
					package._startPackage(user, json.drone, callback)
				})
			});
		});

		_req.on('error', callback);

		fs.createReadStream(sanpshot.tar, {
			flags : 'r',
			encoding : null,
			fd : null,
			mode : 0666,
			bufferSize : 64 * 1024
		}).pipe(_req)

	})
};

UserSchema.methods.getApp = function(name, package, cb) {
	var user = this;
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
			raft.mongoose.Package.findOne({
				user : user.username,
				name : name
			}, function(err, _package) {
				if (err) {
					return cb(err)
				}
				cb(null, _package)
			})
		}

		if (package) {
			if (!package.subdomain) {
				return cb(new Error('package.subdomain missing'))
			}
			//
			package.user = user.username
			package.name = name
			package.zone = user.zone
			//
			if (user.zone === 'admin') {
				package.domain = package.subdomain
			} else {
				package.domain = package.subdomain + '.apps.' + (raft.config.get('domain') || 'localhost')
			}
			//
			if (_package) {
				return module.exports.update({
					name : name,
					user : user.username
				}, package, save);
			}
			//
			if (!_package) {

				_package = new raft.mongoose.Package(package)
				raft.service.proxy.addApp({
					name : package.name,
					user : package.user
				})
				return _package.save(save)
			}
		}

		if (!_package) {
			cb(new Error('Bad request package missing.'))
		} else {
			cb(null, _package)
		}

	})
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
