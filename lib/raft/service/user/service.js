/*
 * service.js: RESTful JSON-based web service for the drone module.
 *
 *
 */

var path = require('path');
var util = require('util');
var raft = require('../../../raft');

exports.createRouter = function(drone) {

	//
	// ### Proxy Resource
	// Routes for RESTful access to the Drone resource.
	//
	raft.router.path('/user', function() {
		//
		// ### Proxy Resource
		// landing page
		//
		this.get(raft.notAvailable);
		//
		// ### create user
		// `GET /users/:username`
		// Creates a new user with the properties specified by `user`.
		//
		this.post('/:username', function(username) {
			var res = this.res
			var password = this.req.body.password

			var newUser = new raft.mongoose.User({
				username : username,
				password : password
			});
			// save user to database
			newUser.save(function(err) {
				if (err) {
					return raft.error(err, res)
				}
				raft.sendResponse(res, 200, {
					message : 'Account created'
				});

			})
		});

		/***
		 *
		 */

		//
		// ### create user
		// `GET /users/:username`
		// Update user account information.
		//
		this.put('/:username', raft.notAvailable);
		//
		// ### view user
		// `GET /users/:username`
		// Retrieves data for the specified user.
		//
		this.get('/:username', raft.notAvailable);
		//
		// ### view user
		// `GET /users/:username`
		// Delete user account. Use with extreme caution.
		//
		// So sad to see you go.
		//

		this['delete']('/:username', raft.notAvailable);
		//
		// ### user available
		// `GET /users/:username/available`
		// Checks the availability of the specified `username`.
		//
		this.get('/:username/available', raft.notAvailable);
		//
		// ### user available
		// `GET /users/:username/available`
		// Confirms the specified `user` by sending the invite code in the `user` specified.
		//
		this.post('/:username/confirm', raft.notAvailable);
		//
		// ### user available
		// `GET /users/:username/available`
		// Request an password reset email.
		//
		this.post('/:username/forgot', raft.notAvailable);
		//
		// ### user available
		// `GET /users/:username/available`
		// Request an password reset email.
		//
		this.post('/:username/test', raft.request(function(username) {
			raft.sendResponse(this.res, 200, {
				message : 'Account working.'
			});
		}));
	});

};
