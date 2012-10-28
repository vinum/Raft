/*
 * service.js: RESTful JSON-based web service for the drone module.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var path = require('path');
var util = require('util');
var haibu = require('../../haibu');
var bcrypt = require('bcrypt')
var SALT_WORK_FACTOR = 10;
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
	haibu.router.path('/users', function() {
		//
		// ### Proxy Resource
		// landing page
		//
		this.get(function() {
			haibu.sendResponse(this.res, 400, {
				message : 'No username specified'
			});
		});
		//
		// ### create user
		// `GET /users/:username`
		// Creates a new user with the properties specified by `user`.
		//
		this.post('/:username', function(username) {
			var res = this.res
			var email = this.req.body.email
			var password = this.req.body.password
			bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
				if (err)
					return dbError(err, res);

				// hash the password using our new salt
				bcrypt.hash(password, salt, function(err, hash) {
					if (err)
						return dbError(err, res);

					// override the cleartext password with the hashed one
					password = hash;

					new haibu.mongoose.User({
						username : username,
						password : password,
						email : email,
						confirmed : false
					}).save(function(err) {
						if (err)
							return dbError(err, res);
						haibu.sendResponse(res, 200, {
							registered : true
						});
					})
				});
			});
		});

		/***
		 *
		 */

		//
		// ### create user
		// `GET /users/:username`
		// Update user account information.
		//
		this.put('/:username', api.notAvailable);
		//
		// ### view user
		// `GET /users/:username`
		// Retrieves data for the specified user.
		//
		this.get('/:username', api.notAvailable);
		//
		// ### view user
		// `GET /users/:username`
		// Delete user account. Use with extreme caution.
		//
		// So sad to see you go.
		//

		this['delete']('/:username', api.notAvailable);
		//
		// ### user available
		// `GET /users/:username/available`
		// Checks the availability of the specified `username`.
		//
		this.get('/:username/available', api.notAvailable);
		//
		// ### user available
		// `GET /users/:username/available`
		// Confirms the specified `user` by sending the invite code in the `user` specified.
		//
		this.post('/:username/confirm', api.notAvailable);
		//
		// ### user available
		// `GET /users/:username/available`
		// Request an password reset email.
		//
		this.post('/:username/forgot', api.notAvailable);
	});

};
