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
	haibu.router.path('/apps', function() {

		//
		// ### create user
		// `GET /users/:username`
		// Creates an application with the specified package.json manifest in `app`
		//
		this.post('/:appname/package', {
			stream : true
		}, api.request(function(appname) {
			var self = this;
			var request = this
			var res = this.res
			var user = request.user;

			function done(err, result) {
				if (err) {
					return api.error(err, self.res)
				}
				haibu.sendResponse(res, 200, result);
			}


			api.setSnapshot(user.username, appname, this.req, function(err, snapshot) {
				if (err) {
					return api.error(err, self.res)
				}
				api.startApp(user.username, appname, snapshot, function(err) {

					api.status(user.username, appname, done)
				})
			})
		}));
		//
		// ### create user
		// `GET /users/:username`
		// Creates an application with the specified package.json manifest in `app`
		//
		this.get('/info/running', function() {
			var self = this;
			var request = this
			var res = this.res
			var user = request.user;
			api.running(function(err, result) {
				if (err) {
					return api.error(err, self.res)
				}
				haibu.sendResponse(res, 200, {
					running : result
				});

			})
		});

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
		this.post('/:appname', api.notAvailable);
		//
		// ### create user
		// `GET /users/:username`
		// Views the application specified by `name`.
		//
		this.get('/:appname', api.notAvailable);
		//
		// ### create user
		// `GET /users/:username`
		// Updates the application with `name` with the specified attributes in `attrs`
		//
		this.put('/:appname', api.notAvailable);
		//
		// ### create user
		// `GET /users/:username`
		// Destroys the application with `name` for the authenticated user.
		//
		this['delete']('/:appname', api.notAvailable);
		//
		// ### create user
		// `GET /users/:username`
		// Starts the application with `name` for the authenticated user.
		//
		this.post('/:appname/start', api.request(function(appname) {
			var request = this
			var res = request.res
			var user = request.user;
			function done(err, result) {
				if (err) {
					return api.error(err, res)
				}
				haibu.sendResponse(res, 200, result);
			}


			api.startDrone(user.username, appname, function(err) {
				api.status(user.username, appname, done)
			})
		}));
		//
		// ### create user
		// `GET /users/:username`
		// Starts the application with `name` for the authenticated user.
		//
		this.post('/:appname/restart', api.notAvailable);
		//
		// ### create user
		// `GET /users/:username`
		// Stops the application with `name` for the authenticated user.
		//
		this.post('/:appname/stop', api.notAvailable);
		//
		// ### create user
		// `GET /users/:username`
		// Checks the availability of the `app.name` / `app.subdomain` combo
		// in the current Nodejitsu environment.
		//
		this.post('/:appname/available', api.notAvailable);
		//
		// ### create user
		// `GET /users/:username`
		// Checks the availability of the `app.name` / `app.subdomain` combo
		// in the current Nodejitsu environment.
		//
		this.get('/:appname/stats', api.request(function(appname) {
			var request = this
			var res = this.res
			var user = request.user;
			function done(err, result) {
				if (err) {
					return api.error(err, res)
				}
				haibu.sendResponse(res, 200, result);
			}


			api.stats(user.username, appname, done)
		}));
		//
		// ### create user
		// `GET /users/:username`
		// Checks the availability of the `app.name` / `app.subdomain` combo
		// in the current Nodejitsu environment.
		//
		this.get('/:appname/status', api.request(function(appname) {
			var request = this
			var res = this.res
			var user = request.user;
			function done(err, result) {
				if (err) {
					return api.error(err, res)
				}
				haibu.sendResponse(res, 200, result);
			}


			api.status(user.username, appname, done)
		}));

		//
		// ### create user
		// `GET /users/:username`
		// Checks the availability of the `app.name` / `app.subdomain` combo
		// in the current Nodejitsu environment.
		//
		this.get('/:appname/:host/host', api.request(function(appname, host) {
			var request = this
			var res = this.res
			var user = request.user;
			function done(err, result) {
				if (err) {
					return api.error(err, res)
				}
				haibu.sendResponse(res, 200, result);
			}


			api.proxy.listHost(host, done)

		}));
		//
		// ### create user
		// `GET /users/:username`
		// Checks the availability of the `app.name` / `app.subdomain` combo
		// in the current Nodejitsu environment.
		//
		this.get('/:appname/host', api.request(function(appname, host) {
			var request = this
			var res = this.res
			var user = request.user;
			function done(err, result) {
				if (err) {
					return api.error(err, res)
				}
				haibu.sendResponse(res, 200, result);
			}


			api.proxy.list(done)

		}));
	});

};
