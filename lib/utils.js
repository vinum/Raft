require('./proto');
var tar = require('tar')
var Packer = require("fstream-npm")
var fs = require('fs')
var zlib = require('zlib')
var exec = require('child_process').exec;
var crypto = require('crypto');
var fstream = require("fstream")
var cp = require('child_process');
var os = require('os');
var events = require('events');
var http = require('http');
var util = require('util');
var mongoose = require('mongoose');

/***
 *
 *
 */
var raft = require('../');

exports = module.exports = {};
/**
 *
 */
var S4 = function() {
	return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}
var uuid = exports.uuid = function(a) {
	if (a) {
		return (S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4());
	}
	return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}
/*
 *
 */
var createTar = exports.createTar = function(inPath, outPath, callBack) {
	var a = new Packer({
		path : inPath,
		type : "Directory",
		isDirectory : true
	})
	a.pipe(tar.Pack({
		noProprietary : true
	})).on("error", function(error) {
		throw error
	}).pipe(zlib.Gzip()).on("error", function(error) {
		throw error
	}).pipe(fstream.Writer({
		type : "File",
		path : outPath
	})).on("error", function(error) {
		throw error
	}).on("end", function(error) {
		callBack(null)
	})
}
var unCreateTar = exports.unCreateTar = function(inPath, outPath, callBack) {
	var fst = fs.createReadStream(inPath).on("entry", function(error) {

	})
	fst.pipe(zlib.Unzip()).on("error", function(error) {

	}).pipe(tar.Extract({
		type : "Directory",
		path : outPath,
		strip : 1
	})).on("entry", function(error) {

	}).on("error", function(error) {
		throw error
	}).on("end", function(error) {
		callBack(null)
	})
}
/**
 *
 */
var getIp = exports.getIp = function() {
	var ifaces = os.networkInterfaces();
	for (var dev in ifaces) {
		var alias = 0;
		for (var i = 0; i < ifaces[dev].length; i++) {
			var details = ifaces[dev][i]
			if (details.family == 'IPv4' && !details.internal) {
				return details
			}
		};
	}
}
var getIp = exports.getExternalIp = function(cb) {
	var ip = '';
	http.get("http://icanhazip.com/", function(res) {
		res.on('data', function(chunk) {
			ip = chunk.toString('utf8');
		}).once('end', function() {
			cb(null, ip.substring(0, ip.length - 1))
		})
	}).on('error', function(error) {
		cb(error)
	});
}
/*
 *
 */
var initConfig = exports.initConfig = function(tmp, cb) {
	fs.writeFile(tmp + '/config.json', '{"userid":"' + uuid() + '"}', function(err) {
		err ? cb(err) : cb()
	});
}
var writeConfig = exports.writeConfig = function(tmp, data, cb) {
	fs.writeFile(tmp + '/config.json', JSON.stringify(data), function(err) {
		err ? cb(err) : cb()
	});
}
var readConfig = exports.readConfig = function(tmp, cb) {
	fs.readFile(tmp + '/config.json', 'utf8', function(err, data) {
		if (err)
			cb(err);
		else
			cb(null, JSON.parse(data))
	});
}
/*
 *
 */
var readPackage = exports.readPackage = function(path, cb) {
	fs.readFile(path + '/package.json', 'utf8', function(err, data) {
		if (err)
			cb(err);
		else
			cb(null, JSON.parse(data))
	});
}
/*
 *
 */

var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(n) {
	return n < 10 ? '0' + n.toString(10) : n.toString(10);
}

exports.timestamp = function timestamp() {
	var d = new Date();
	return [d.getDate(), months[d.getMonth()], [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds()), (d.getTime() + "").substr(-4, 4)].join(':')].join(' ');
};
/**
 *
 */
exports.monitor = function(pid, cb) {
	var types = ['pcpu', 'etime', 'time', 'vsz', 'user', 'rssize', 'comm']

	var child = exec('ps -p ' + pid + '  -o ' + types.join(','), function(error, stdout, stderr) {
		var split = stdout.split('\n');

		split.shift();
		split = split[0].split(' ');

		var _split = {};
		for (var i = 0; i < split.length; i++) {
			var _ = split[i]

			if (_ !== '') {
				_split[types.shift()] = _;
			}
		};
		cb(null, _split);
	});

};
/**
 *
 */
exports.logo = function(cb) {
	fs.readFile(__dirname + '/logo.txt', 'utf8', cb);
};

