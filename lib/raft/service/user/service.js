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
		// ### create user
		// `GET /users/:username`
		// Creates a new user with the properties specified by `user`.
		//
		this.post('/:username', function(username) {
			var res = this.res
			var req = this.req
			var password = req.body.password
			var email = req.body.email

			if (!password) {
				return raft.error(new Error('Password missing'), res)
			}
			if (!email) {
				return raft.error(new Error('Email missing'), res)
			}

			var newUser = new raft.mongoose.User({
				username : username,
				password : password
			});
			var newUserProfile = new raft.mongoose.UserProfile({
				userid : newUser._id,
				email : email
			});
			var newUserConfirmation = new raft.mongoose.Confirmation({
				userid : newUser._id,
				code : newUserProfile._id
			});
			// save user to database
			newUser.save(function(err) {
				if (err) {
					return raft.error(err, res)
				}
				newUserProfile.save(function(err) {
					if (err) {
						return raft.error(err, res)
					}
					newUserConfirmation.save(function(err) {
						if (err) {
							return raft.error(err, res)
						}

						raft.mail.confirm(email, username, newUserConfirmation.code, function(err) {
							if (err) {
								return raft.error(err, res)
							}
							raft.sendResponse(res, 200, {
								message : 'Account created'
							});
						})
					})
				})
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
		this.put('/', raft.request(function() {

			var user = this.user;
			var profile = this.profile;
			var res = this.res;
			var req = this.req;
			var body = req.body
			if (body.names) {
				if (body.names.first) {
					profile.names.first = body.names.first
				}
				if (body.names.last) {
					profile.names.last = body.names.last
				}
			}
			if (body.location) {
				if (body.location.streetname) {
					profile.location.streetname = body.location.streetname
				}
				if (body.location.number) {
					profile.location.number = body.location.number
				}
				if (body.location.state) {
					profile.location.state = body.location.state
				}
				if (body.location.postcode) {
					profile.location.postcode = body.location.postcode
				}
			}
			profile.save(function(err) {
				if (err) {
					return raft.error(err, res)
				}
				raft.sendResponse(res, 200, {
					message : 'Account updated'
				});
			})
		}));
		//
		// ### view user
		// `GET /users/:username`
		// Retrieves data for the specified user.
		//
		this.get('/', raft.request(function() {

			var user = this.user;
			var profile = this.profile;
			var res = this.res;
			var req = this.req;
			var body = req.body

			raft.sendResponse(res, 200, {
				account : {
					username : user.username,
					zone : user.zone,
					location : profile.location,
					names : profile.names,
					email : profile.email
				}
			});

		}));
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
		this.get('/:code/confirm', function(code) {

			var res = this.res;
			var req = this.req;

			raft.mongoose.Confirmation.findOne({
				code : code
			}, function(err, confirmation) {
				if (err) {
					return raft.error(err, res)
				}
				if (confirmation === null) {
					return raft.error(new Error('Bad code'), res)
				}

				if (confirmation.confirmed) {
					raft.sendResponse(res, 200, {
						message : 'Account is confirmed'
					});
				} else {
					raft.mongoose.User.findOne({
						_id : confirmation.userid
					}, function(err, user) {
						if (err) {
							return raft.error(err, res)
						}
						
						user.confirmed = confirmation.confirmed = true
						
						user.save(function(err) {
							if (err) {
								return raft.error(err, res)
							}

							confirmation.save(function(err) {
								if (err) {
									return raft.error(err, res)
								}
								raft.sendResponse(res, 200, {
									message : 'Account confirmed'
								});

							})
						})
					})
				}
			})
		});
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
