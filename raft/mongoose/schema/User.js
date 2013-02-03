var mongoose = require('mongoose')
var Schema = mongoose.Schema
var bcrypt = require('bcrypt')
var util = require('util');
var crypto = require('crypto');
var fs = require('fs')
var path = require('path')
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
	bucketKey : {
		type : String,
		required : true,
		'default' : raft.common.uuid
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
var rpcs = {}
UserSchema.methods.setRpc = function(rpc) {
	console.log('setRpc')
	rpcs[this.username] ? null : rpcs[this.username] = {}
	rpcs[this.username][rpc.id] = rpc
};

UserSchema.methods.removeRpc = function(rpc) {
	console.log('removeRpc')
	delete rpcs[this.username][rpc.id]
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

// expose enum on the model, and provide an internal convenience reference
var reasons = UserSchema.statics.failedLogin = {
	NOT_FOUND : 0,
	PASSWORD_INCORRECT : 1,
	MAX_ATTEMPTS : 2
};

UserSchema.statics.rpc = function(username) {
	return {
		invoke : function(method, params, cb) {
			Object.keys(rpcs).forEach(function(user) {
				Object.keys(rpcs[user]).forEach(function(id) {
					rpcs[user][id].invoke(method, params, cb)
				})
			})
		}
	}
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

UserSchema.statics.testBucketKey = function(bucketKey, cb) {
	this.findOne({
		bucketKey : bucketKey
	}, function(err, user) {
		if (err) {
			return cb(err);
		}
		if (!user) {
			return cb(null, null, reasons.NOT_FOUND);
		}
		return cb(null, user);
	})
}
module.exports = mongoose.model('User', UserSchema);

module.exports.findOne({

}, function(err, user) {
	if (user) {
		return;
	}
	new module.exports({
		username : raft.config.get('system:username'),
		zone : 'user',
		password : raft.config.get('system:password')
	}).save(function() {
		module.exports.find({}, function(err, users) {
			//console.log(users)
		})
	})
})
