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
				}).limit(35).sort('-time').exec(function(err, stats) {
					if (err) {
						return raft.error(err, res)
					}
					raft.sendResponse(res, 200, {
						stats : stats
					});
				})
			})
		}));

		this.get('/app/:name', raft.request(function(name) {
			var user = this.user;
			var res = this.res;
			var req = this.req;

			user.getApp(name, false, function(err, package) {
				if (err) {
					return raft.error(err, res)
				}
				if (package === null) {
					return raft.error(new Error('No package found. Please start the app first'), res, 404)
				}
				package._toJsonStats(function(err, drones) {
					if (err) {
						return raft.error(err, res)
					}

					raft.sendResponse(res, 200, {
						drones : drones
					});

				})
			})
		}));
	})
};
