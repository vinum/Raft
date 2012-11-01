/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var raft = require('../../../raft')

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
	drone.package_id = this._id
	drone.hive_id = hive._id
	raft.service.proxy.addDrone({
		port : drone.port,
		host : drone.host
	}, {
		name : this.name,
		domain : this.domain
	})
	new raft.mongoose.Drone(drone).save(cb)
};
Package.methods.removeDrones = function(cb) {
	var package = this;
	this._stopStas()

	raft.mongoose.Drone.find({
		package_id : this._id
	}, function(err, drones) {
		for (var i = 0; i < drones.length; i++) {

			raft.service.proxy.destroyDrone({
				port : drones[i].port,
				host : drones[i].host
			}, {
				name : package.name,
				domain : package.domain
			})
		};
		console.log(drones)
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
			Timmers[_id] = setTimeout(timmer, 5 * 1000)
		})
	}

	Timmers[_id] = setTimeout(timmer, 5 * 1000)
};

Package.methods._updateStats = function(drones, cb) {
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
			Stats[_drone._id] = drone.stats
			loop()
		})
	}

	loop()
};

Package.methods._toJson = function(drones) {
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
			"main" : package.main,
			"status" : package.status
		},
		drones : drones.map(function(drone) {
			return {
				"ctime" : drone.ctime,
				"foreverPid" : drone.foreverPid,
				"pid" : drone.pid,
				"uid" : drone.uid,
				"stats" : Stats[drone._id] || {},
				"spawnWith" : drone.spawnWith,
				"env" : drone.env,
				"online" : true,
				"port" : drone.port,
				"host" : drone.host
			}
		})
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
		cb(null, package._toJson(drones))
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

module.exports.remove({}, function() {
})