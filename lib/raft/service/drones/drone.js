/*
 * drone.js: API Client for the haibu Drone API.
 *
 * (C) 2012, Nodejitsu Inc.
 *
 */

var util = require('util')
var raft = require('../../../raft');

var Drone = exports.Drone = function(options) {

};

//
// ### function get (name, callback)
// #### @name {string} name of the application to get from the Haibu server.
// #### @callback {function} Continuation to pass control back to when complete.
// Gets the data about all the drones for the app with the specified `name`
// on the remote Haibu server.
//
Drone.prototype.get = function(name, user, callback) {

};

//
// ### function running (callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Gets the data about all the drones on the hive.
//
Drone.prototype.running = function(user, callback) {

};

//
// ### function start (app, callback)
// #### @app {Object} Application to start on the Haibu server.
// #### @callback {function} Continuation to pass control back to when complete.
// Starts the the app with the specified `app.name` on the remote Haibu server.
//
Drone.prototype.start = function(app, user, callback) {
	var self = this;

	raft.mongoose.Hive.cli(user, function(err, cli) {

		if (err) {
			return callback(err)
		}
		cli.start(app, function(err, result) {
			if (err) {
				return callback(err)
			}

			var drone = result.drone
			self._saveDrone(app, drone, cli.hive, user, callback)
		})
	})
};

//
// ### function update (app, callback)
// #### @app {Object} Application to start on the Haibu server.
// #### @callback {function} Continuation to pass control back to when complete.
// cleans and starts the app with :id on this server.
//
Drone.prototype.update = function(app, user, callback) {

};

//
// ### function stop (name, callback)
// #### @name {string} Name of the application to stop on the Haibu server.
// #### @callback {function} Continuation to pass control back to when complete.
// Stops the application with the specified `name` on the remote Haibu server.
//
Drone.prototype.stop = function(name, user, callback) {
	var self = this
	raft.mongoose.Package.findOne({
		name : name,
		user : user.username
	}, function(err, package) {
		if (err) {
			return callback(err)
		}
		var hiveIds = []
		function loopStop(err) {
			if (err) {
				return callback(err)
			}
			var hive_id = hiveIds.shift()

			console.log(hive_id)
			if (!hive_id) {
				return self._removeDrone({
					name : name
				}, user, callback)
			}

			raft.mongoose.Hive.cli(hive_id, function(err, cli) {
				if (err) {
					return callback(err)
				}
				cli.stop(name, loopStop)
			})
		}


		raft.mongoose.Drone.find({
			package_id : package._id
		}, function(err, drones) {
			if (err) {
				return callback(err)
			}
			for (var i = 0, j = drones.length; i < j; i++) {
				var hive_id = drones[i].hive_id

				if (hiveIds.indexOf(hive_id) === -1) {
					console.log(hive_id)
					hiveIds.push(hive_id)
				}
			};
			loopStop()
		})
	})
};

//
// ### function restart (name, callback)
// #### @name {string} Name of the application to restart on the Haibu server.
// #### @callback {function} Continuation to pass control back to when complete.
// Restarts the application with the specified :id on the remote Haibu server.
//
Drone.prototype.restart = function(name, user, callback) {

};

//
// ### function clean (app, callback)
// #### @app {Object} Application to clean on the Haibu server.
// #### @callback {function} Continuation to pass control back to when complete.
// Attempts to clean the specified `app` from the Haibu server targeted by this instance.
//
Drone.prototype.clean = function(app, user, callback) {

	raft.mongoose.Package.findOne({
		name : app.name,
		user : user.username
	}, function(err, package) {
		if (err) {
			return callback(err)
		}
		var hiveIds = []
		function loopStop(err) {
			if (err) {
				return callback(err)
			}
			var hive_id = hiveIds.shift()

			console.log(hive_id)
			if (!hive_id) {
				return self._removeDrone(app, user, callback)
			}

			raft.mongoose.Hive.cli(hive_id, function(err, cli) {
				if (err) {
					return callback(err)
				}
				cli.clean(app, loopStop)
			})
		}


		raft.mongoose.Drone.find({
			package_id : package._id
		}, function(err, drones) {
			if (err) {
				return callback(err)
			}
			for (var i = 0, j = drones.length; i < j; i++) {
				var hive_id = drones[i].hive_id

				if (hiveIds.indexOf(hive_id) === -1) {
					console.log(hive_id)
					hiveIds.push(hive_id)
				}
			};
			loopStop()
		})
	})
};

//
// ### function cleanAll (app, callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Attempts to clean the all applications from the Haibu server targeted by this instance.
//
Drone.prototype.cleanAll = function(user, callback) {

};
//
// ### function cleanAll (app, callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Attempts to clean the all applications from the Haibu server targeted by this instance.
//
Drone.prototype._saveDrone = function(app, drone, hive, user, callback) {
	var appname = app.name
	var username = user.username

	app.user = user.username;

	raft.mongoose.Package.findOne({
		name : appname,
		user : username
	}, function(err, package) {
		if (err) {
			return callback(err)
		}
		if (!package) {
			package = new raft.mongoose.Package(app)
			package.save(function(err) {
				if (err) {
					return callback(err)
				}
				drone.package_id = package._id
				new raft.mongoose.Drone(drone).save(callback)
			})
		} else {
			drone.package_id = package._id
			drone.hive_id = hive._id

			new raft.mongoose.Drone(drone).save(callback)
		}
	})
};
//
// ### function cleanAll (app, callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Attempts to clean the all applications from the Haibu server targeted by this instance.
//
Drone.prototype._removeDrone = function(app, user, callback) {
	var appname = app.name
	var username = user.username
	raft.mongoose.Package.findOne({
		name : appname,
		user : username
	}, function(err, package) {
		if (err) {
			return callback(err)
		}
		raft.mongoose.Drone.remove({
			package_id : package._id
		}, callback)
	})
};
//
// ### function cleanAll (app, callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Attempts to clean the all applications from the Haibu server targeted by this instance.
//
Drone.prototype._getDrones = function(app, user, callback) {
	var appname = app.name
	var username = user.username

};
//
// ### function cleanAll (app, callback)
// #### @callback {function} Continuation to pass control back to when complete.
// Attempts to clean the all applications from the Haibu server targeted by this instance.
//
Drone.prototype._getAnyDrone = function(user, callback) {
	var username = user.username

};
