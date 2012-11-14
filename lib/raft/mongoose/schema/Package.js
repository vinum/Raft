/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var path = require('path');
var util = require('util');
var crypto = require('crypto');
var http = require('http');
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var tar = require('tar');
var raft = require('../../../raft')
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

/**
 * Schema definition
 */
var Timmers = {}

var Stats = {}

var Package = new Schema({
	"name" : String,
	"description" : {
		type : String,
		"default" : 'No description'
	},
	"repository" : {
		"url" : {
			type : String,
			"default" : ''
		},
		"type" : {
			type : String,
			"default" : 'local'
		},
		"directory" : {
			type : String,
			"default" : ''
		}
	},
	"version" : {
		type : String,
		required : true
	},
	"package" : {
		type : Boolean,
		required : true,
		"default" : false
	},
	"minDrone" : Number,
	"maxDrone" : Number,
	"author" : String,
	"keywords" : [String],
	"scripts" : {
		"start" : {
			type : String,
			required : true
		}
	},
	"user" : {
		type : String,
		required : true
	},
	"domain" : {
		type : String,
		required : true
	},
	"subdomain" : {
		type : String,
		required : true
	},
	"zone" : {
		type : String,
		required : true
	},
	"main" : {
		type : String,
		"default" : ''
	},
	"status" : {
		type : Boolean,
		"default" : true
	},
	"dependencies" : {}
});

Package.methods.saveDrone = function(drone, hive, cb) {
	var user = this;

	if (!drone) {
		return cb(new Error('Error spaning drone.'))
	}

	drone.package_id = this._id
	drone.hive_id = hive._id

	raft.mongoose.Proxy.cli('addDrone', [{
		port : drone.port,
		host : drone.host
	}, {
		name : this.name,
		domain : this.domain
	}], function() {

		new raft.mongoose.Drone(drone).save(cb)
	})
};
Package.methods.removeDrones = function(cb) {
	var package = this;
	this._stopStas()

	raft.mongoose.Drone.find({
		package_id : this._id
	}, function(err, drones) {
		for (var i = 0; i < drones.length; i++) {

			raft.mongoose.Proxy.cli('destroyDrone', [{
				port : drones[i].port,
				host : drones[i].host
			}, {
				name : package.name,
				domain : package.domain
			}], function() {

			})
		};
		raft.mongoose.Drone.remove({
			package_id : package._id
		}, cb)
	})
};

Package.methods._start = function(user, cb) {
	var package = this;
	raft.mongoose.Hive.cli(user, function(err, cli) {
		if (err) {
			return cb(err)
		}
		cli.start(package, function(err, result) {
			if (err) {
				return cb(err)
			}
			var drone = result.drone

			if (!drone) {
				if (err) {
					return cb(new Error('System error.'))
				}
			}
			package.saveDrone(drone, cli.hive, function(err) {
				if (err) {
					return cb(err)
				}
				package._startStats()
				cb()
			})
		})
	})
};

Package.methods._startPackage = function(user, drone, cb) {
	var package = this;
	raft.mongoose.Hive.cli(user, function(err, cli) {
		if (err) {
			return cb(err)
		}

		package.saveDrone(drone, cli.hive, function(err) {
			if (err) {
				return cb(err)
			}
			package._startStats()
			cb()
		})
	})
};

Package.methods._stopStas = function() {
	if (Timmers[this._id] !== false)
		clearInterval(Timmers[this._id])
	Timmers[this._id] = false
};

Package.methods._startStats = function() {
	var self = this
	var _id = this._id
	if (Timmers[_id] !== false) {
		return
	}
	function timmer() {
		self._stats(function() {
			if (Timmers[_id] === false) {
				return
			}
			Timmers[_id] = setTimeout(timmer, 30 * 1000)
		})
	}

	Timmers[_id] = setTimeout(timmer, 30 * 1000)
};

Package.methods._updateStats = function(drones, cb) {
	var self = this
	function loop(err) {
		if (err) {
			return cb(err)
		}
		var drone = drones.shift()
		if (!drone) {
			return cb();
		}
		raft.mongoose.Drone.findOne({
			host : drone.host,
			port : drone.port
		}, function(err, _drone) {
			if (!_drone)
				return loop()
			new raft.mongoose.DroneStats({
				"package_id" : self._id,
				"drone_id" : _drone._id,
				"comm" : drone.stats.comm,
				"etime" : drone.stats.etime,
				"pcpu" : drone.stats.pcpu,
				"rssize" : drone.stats.rssize,
				"time" : drone.stats.time,
				"user" : drone.stats.user,
				"vsz" : drone.stats.vsz
			}).save(loop)
		})
	}

	loop()
};

Package.methods._toJson = function(drones, snapshots) {
	var package = this;
	return {
		package : {
			"name" : package.name,
			"zone" : package.zone,
			"description" : package.description,
			"repository" : package.repository,
			"version" : package.version,
			"author" : package.author,
			"keywords" : package.keywords,
			"scripts" : {
				"start" : package.scripts.start
			},
			"user" : package.user,
			"domain" : package.domain,
			"subdomain" : package.subdomain,
			"main" : package.main,
			"status" : package.status,
			"package" : package.package
		},
		drones : drones.map(function(drone) {
			return {
				"ctime" : drone.ctime,
				"foreverPid" : drone.foreverPid,
				"pid" : drone.pid,
				"uid" : drone.uid,
				"stats" : drone.stats || [],
				"spawnWith" : drone.spawnWith,
				"env" : drone.env,
				"online" : true,
				"port" : drone.port,
				"host" : drone.host
			}
		}),
		snapshots : snapshots ? snapshots.map(function(s) {
			return s
		}) : []
	}
};
Package.methods._toJsonStats = function(cb) {
	var package = this;
	raft.mongoose.Drone.find({
		package_id : this._id
	}, function(err, drones) {
		if (err) {
			return cb(err)
		}

		cb(null, drones.map(function(drone) {
			return {
				"ctime" : drone.ctime,
				"pid" : drone.pid,
				"uid" : drone.uid,
				"stats" : Stats[drone._id] || {},
				"port" : drone.port,
				"host" : drone.host
			}
		}))
	})
};

Package.methods._status = function(cb) {
	var package = this;
	raft.mongoose.Drone.find({
		package_id : this._id
	}, function(err, drones) {
		if (err) {
			return cb(err)
		}
		var mapDrones = []
		function loop(callback) {
			var d = drones.shift();

			if (!d) {
				return callback()
			}

			raft.mongoose.DroneStats.find({
				drone_id : d._id
			}).limit(35).sort('-date').select('pcpu rssize vsz date').exec(function(err, stats) {
				if (err) {
					return cb(err)
				}
				d.stats = stats
				console.log(stats)
				mapDrones.push(d)
				loop(callback)
			})
		}

		loop(function() {
			if (package.package) {
				raft.mongoose.SnapShot.find({
					username : package.user,
					appname : package.name
				}, function(err, snapshots) {
					if (err) {
						return cb(err)
					}

					cb(null, package._toJson(mapDrones, snapshots))
				})
			} else {
				cb(null, package._toJson(mapDrones))
			}
		})
	})
};

Package.methods._stop = function(cb) {
	var package = this;
	raft.mongoose.Drone.find({
		package_id : this._id
	}, function(err, drones) {
		if (err) {
			return cb(err)
		}

		var hives = []
		for (var i = 0, j = drones.length; i < j; i++) {
			var drone = drones[i]
			if (hives.indexOf(drone.hive_id) == -1) {
				hives.push(drone.hive_id)
			}
		};

		function loop(err) {
			if (err) {
				return cb(err)
			}
			var hive_id = hives.shift()
			if (!hive_id) {
				return package.removeDrones(cb);
			}
			raft.mongoose.Hive.cli(hive_id, function(err, cli) {
				if (err) {
					return cb(err)
				}
				cli.stop(package.name, function(err) {
					if (err) {
						return cb(err)
					}
					cli.clean(package, loop)
				})
			})
		}

		loop()
	})
};

Package.methods._stats = function(cb) {
	var package = this;
	raft.mongoose.Drone.find({
		package_id : this._id
	}, function(err, drones) {
		if (err) {
			return cb(err)
		}
		var hives = []
		for (var i = 0, j = drones.length; i < j; i++) {
			var drone = drones[i]
			if (hives.indexOf(drone.hive_id) == -1) {
				hives.push(drone.hive_id)
			}

		};
		function loop(err) {
			if (err) {
				return cb(err)
			}
			var hive_id = hives.shift()
			if (!hive_id) {
				return cb();
			}
			raft.mongoose.Hive.cli(hive_id, function(err, cli) {
				if (err) {
					return cb(err)
				}
				cli.get(package.name, function(err, result) {
					if (err) {
						return cb(err)
					}
					var drones = result.drones
					package._updateStats(drones, cb)
				})
			})
		}

		loop()
	})
};

/**
 * Define model.
 */

module.exports = mongoose.model('Package', Package);
module.exports.find(function(err, result) {
	console.log(err, result)
})
