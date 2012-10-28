/*
 * service.js: RESTful JSON-based web service for the drone module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var path = require('path');
var bcrypt = require('bcrypt');
var util = require('util');
var fs = require('fs');
var haibu = require('../../haibu');

var mongoose = haibu.mongoose;
var clients = haibu.clients;

//
// ### function createRouter (dron, logger)
// #### @drone {Drone} Instance of the Drone resource to use in this router.
//
// Creates the Journey router which represents the `haibu` Drone webservice.
//
exports.createRouter = function(api) {
	//
	// ### Proxy Resource
	// Routes for RESTful access to the Drone resource.
	//
	haibu.router.path('/snapshots', function() {

		//
		// ### create user
		// `GET /users/:username`
		// Lists all applications for the authenticated user
		//
		this.get(api.notAvailable);
		//
		// ### create user
		// `GET /users/:username`
		// Creates an application with the specified package.json manifest in `app`
		//
		this.get('/:appname', api.request(function(appname) {
			var res = this.res
			api.getSnapshots(this.user.username, appname, function(err, snapshots) {

				if (err) {
					return api.error(err, res)
				}
				haibu.sendResponse(res, 200, {
					snapshots : snapshots
				});
			})
		}));
		//
		// ### create user
		// `GET /users/:username`
		// Creates an application with the specified package.json manifest in `app`
		//
		this.post('/:appname/:version/switch', api.request(function(appname, version) {
			var res = this.res
			var request = this
			var user = this.user
			api.getSnapshots(user.username, appname, function(err, snapshots) {
				if (err) {
					return api.error(err, res)
				}
				for (var i = 0, j = snapshots.length; i < j; i++) {
					var snapshot = snapshots[i]
					if (snapshot.version === version) {
						return (function(_snapshot) {
							api.getPackage({
								username : user.username,
								hash : _snapshot.hash
							}, function(err, package) {
								if (err) {
									return api.error(err, request.res)
								}
								api.deploy(request, {
									package : require(path.join(_snapshot.dir, 'package.json')),
									tar : _snapshot.tar,
									dir : _snapshot.dir,
									ctime : _snapshot.time,
									hash : _snapshot.hash
								}, request.user, function(err, result) {
									haibu.sendResponse(res, 200, result);
								})
							})
						})(snapshot)
					}
				};
				api.error(new Error('Version not found.'), request.res)
			})
		}));
		//
		// ### create user
		// `GET /users/:username`
		// Creates an application with the specified package.json manifest in `app`
		//
		this.get('/:appname/:version/switch', api.request(function(appname, version) {
			var res = this.res
			var request = this
			var user = this.user
			api.getSnapshots(user.username, appname, function(err, snapshots) {
				if (err) {
					return api.error(err, res)
				}
				for (var i = 0, j = snapshots.length; i < j; i++) {
					var snapshot = snapshots[i]
					if (snapshot.version === version) {
						return haibu.sendResponse(res, 200, {
							snapshot : snapshot
						});
					}
				};
				api.error(new Error('Version not found.'), request.res)
			})
		}));
	});

};
