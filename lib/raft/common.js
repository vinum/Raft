/*
 *
 * (C) 2013, MangoRaft.
 *
 */
var mkdirp = require('mkdirp');
var crypto = require('crypto')
var fs = require('fs')
var http = require('http')
var os = require('os')
var path = require('path')
var exec = require('child_process').exec
var spawn = require('child_process').spawn

var flatiron = require('flatiron');

var async = flatiron.common.async;
var rimraf = flatiron.common.rimraf;

var common = module.exports = flatiron.common;

//
// **REALLY DONT DO THIS HERE! But where?**
//
if (!Error.prototype.toJSON) {
	Object.defineProperty(Error.prototype, "toJSON", {
		enumerable : false,
		value : function() {
			return flatiron.common.mixin({
				message : this.message,
				stack : this.stack,
				arguments : this.arguments
			}, flatiron.common.clone(this));
		}
	});
}

/**
 * raft logo for cmd
 *
 */
/**
 *
 */
common.logo = function(cb) {
	fs.readFile(__dirname + '/../../static/logo.txt', 'utf8', cb);
};
common.printLogo = function() {
	common.logo(function(err, logo) {
		if (err) {
			throw err
		}
		console.log('   * ');
		console.log('   * ' + logo.split('\n').join('\n   * '));
		console.log('   * ');
		console.log('   * (C) 2014, MangoRaft.');
	});
};

//
// ### function getEndKey (startKey)
// #### @startKey {string} Startkey paramater for querying CouchDB.
// Returns the 'endkey' associated with the `startKey`, that is,
// the same string except with the last character alphabetically incremented.
//
// e.g. `char ==> chas`
//
common.getEndKey = function(startKey) {
	var length = startKey.length;
	return startKey.slice(0, length - 1) + String.fromCharCode(startKey.charCodeAt(length - 1) + 1);
};

common.rmApp = function(packagesDir, app, callback) {
	return rimraf(path.join(packagesDir, app.user, common.sanitizeAppname(app.name)), callback);
};
common.rimraf = function(path, callback) {
	return rimraf(path, callback);
};

common.rmApps = function(appsDir, callback) {
	if (!callback && typeof appsDir === 'function') {
		callback = appsDir;
		appsDir = null;
	}
	fs.readdir(appsDir, function(err, users) {
		if (err) {
			return callback(err);
		}

		async.forEach(users, function(user, next) {
			rimraf(path.join(appsDir, user), next);
		}, callback);
	});
};

//
// ### sanitizeAppname (name)
// Returns sanitized appname (with removed characters) concatenated with
// original name's hash
//
common.sanitizeAppname = function(name) {
	var sha1 = crypto.createHash('sha1');
	sha1.update(name);
	return name.replace(/[^a-z0-9\-\_]+/g, '-') + '-' + sha1.digest('hex');
};

//
// ### function ipAddress (name)
// #### @name {string} **Optional** Name of the network interface
// Returns the address for the network interface on the current
// system with the specified `name`. If no interface or `IPv4`
// family is found return the loopback addres `127.0.0.1`.
//
common.ipAddress = function(name) {
	var interfaces = os.networkInterfaces();

	var addresses = Object.keys(interfaces).map(function(nic) {
		var addrs = interfaces[nic].filter(function(details) {
			return details.address !== '127.0.0.1' && details.family === 'IPv4'
		});
		return addrs.length ? addrs[0].address : undefined;
	}).filter(Boolean);
	return addresses.length ? addresses[0] : '127.0.0.1';
};
//

common.mkdir = function(directories, callback) {
	var keys = Object.keys(directories)
	async.forEach(keys, function(dir, next) {
		mkdirp(directories[dir], function(err) {
			if (err) {
				throw err
			}
			next()
		});
	}, callback);
	return directories
}
common.buffLine = function(stream) {
	var buffer = []
	function onData(data) {
		data = data.toString();

		if (data.indexOf('\n') > -1) {
			var line = buffer.join('');
			data = data.split('\n');
			line += data.shift();
			buffer = [];
			if (line.length > 0) {
				stream.emit('line', line)
			}
			data = data.join('\n');
			if (data.length) {
				onData(data);
			}
		} else {
			buffer.push(data);
		}
	}

}
/**
 *
 */
var S4 = function() {
	return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}
common.uuid = function uuid(a) {
	if (a) {
		return (S4() + S4());
	}
	return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}
//
//
//
var SIGINTFn = []

//
//
//
common.onSIGINT = function(fn) {
	SIGINTFn.push(fn)
}
//
//
//
var loop = function() {
	var fn = SIGINTFn.shift()
	if (!fn) {
		return //process.exit(1);
	}
	process.nextTick(function() {
		fn(loop)
	});
};
//
//
//
//process.on('SIGINT', loop);

common.version = function(bin, callback) {
	var cp = spawn(bin, ['-v']);
	var data = ''
	var err
	cp.stdout.on('data', function(c) {
		data += c.toString()
	});

	cp.stderr.on('data', function(c) {
		err = c.toString()
	});

	cp.on('exit', function(code) {
		if (err) {
			callback(err)
		} else {
			callback(null, data.replace('\n', ''))
		}
	});
};
