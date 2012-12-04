/*
 * service.js: RESTful JSON-based web service for the drone module.
 *
 *
 */

var path = require('path');
var util = require('util');
var crypto = require('crypto');
var http = require('http');
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var tar = require('tar');

var raft = require('../../../raft');

exports.createRouter = function(stats) {
	//
	// ### Proxy Resource
	// Routes for RESTful access to the Drone resource.
	//
	raft.router.path('/stats', function() {

		this.get('/domain/:domain', raft.request(function(domain) {
			var user = this.user;
			var res = this.res;
			var req = this.req;
			var limit = req.query && req.query.limit ? req.query.limit : 100
			var date = req.query && req.query.date ? Number(req.query.date) : Date.now() - 60 * 60 * 1000

			raft.mongoose.Package.count({
				user : user.username,
				domain : domain
			}, function(err, count) {
				if (err) {
					return raft.error(err, res)
				}
				if (count === 0) {
					return raft.error(new Error('Domain is not linked with user'), res)
				}
				raft.mongoose.ProxyStats.find({
					domain : domain
				}).limit(limit).gte('time', date).sort('-time').exec(function(err, stats) {
					console.log(date)
					if (err) {
						return raft.error(err, res)
					}
					raft.sendResponse(res, 200, {
						stats : stats,
						length : stats.length
					});
				})
			})
		}));

		this.get('/app/:name', raft.request(function(name) {
			var user = this.user;
			var res = this.res;
			var req = this.req;
			var limit = req.query && req.query.limit ? req.query.limit : 30
			var date = req.query && req.query.date ? Number(req.query.date) : Date.now() - 60 * 60 * 1000

			user.getApp(name, false, function(err, package) {
				if (err) {
					return raft.error(err, res)
				}
				if (package === null) {
					return raft.error(new Error('No package found. Please start the app first'), res, 404)
				}
				raft.mongoose.Drone.find({
					package_id : package._id
				}, function(err, drones) {
					if (err) {
						return cb(err)
					}
					var mapDrones = []
					function loop(callback) {
						var drone = drones.shift();

						if (!drone) {
							return callback()
						}

						raft.mongoose.DroneStats.find({
							drone_id : drone._id
						}).limit(limit).gte('date', date).sort('-date').select('pcpu rssize vsz date').exec(function(err, stats) {
							if (err) {
								return cb(err)
							}
							var a = {
								uid : drone.uid,
								stats : stats
							}
							mapDrones.push(a)
							loop(callback)
						})
					}

					loop(function() {
						raft.sendResponse(res, 200, {
							drones : mapDrones
						});
					})
				})
			})
		}));
	})
};
