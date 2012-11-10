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
	raft.router.path('/system', function() {

		//
		// ### user available
		// `GET /users/:username/available`
		// Request an password reset email.
		//
		this.post('/mail/invites', raft.system(function() {
			var res = this.res
			raft.mongoose.Confirmation.find({
				sent : false
			}, function(err, docs) {
				function loop() {
					var doc = docs.shift()
					if (!doc) {
						return raft.sendResponse(res, 200, {
							message : 'Mail sent'
						});
					}
					raft.mongoose.User.findOne({
						_id : doc.userid
					}, function(err, user) {
						raft.mongoose.UserProfile.findOne({
							userid : doc.userid
						}, function(err, profile) {
							raft.mail.confirm(profile.email, user.username, doc.code, function(err) {
								if (err) {
									return raft.error(err, res)
								}
								loop()
							})
						})
					})
				}
				loop()
			})
		}));

	})
};
