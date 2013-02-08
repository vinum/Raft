/*
 *
 * (C) 2013, MangoRaft.
 *
 */

var path = require('path');
var util = require('util');
var raft = require('../../../../raft');

//
// ### function createRouter (dron, logger)
// #### @drone {Drone} Instance of the Drone resource to use in this router.
//
// Creates the Journey router which represents the `raft` Drone webservice.
//
exports.run = function(rpc) {
	rpc.expose('user.create', function listHosts(username, password, email) {
		var exposed = this
		var user = new raft.mongoose.User({
			username : username,
			password : password,
			email : email,
			zone : 'user',
			privileges : ['user']
		})
		user.save(function(err) {
			if (err) {
				return exposed.error(err);
			}
			exposed.send({
				created : true,
				code : user.confirmedCode
			});
		})
	})
	rpc.expose('user.confirm', function listHosts(username, code) {
		var exposed = this
		raft.mongoose.User.findOne({
			username : username
		}, function(err, user) {
			if (err) {
				return exposed.error(err);
			}
			if (!user) {
				return exposed.error(new Error('No user found [' + username + ']'));
			}
			if (user.confirmed) {
				return exposed.error(new Error('User already confirmed'));
			}
			if (user.confirmedCode !== code) {
				return exposed.error(new Error('Bad confirmedCode'));
			}
			user.confirmed = true
			user.save(function(err) {
				if (err) {
					return exposed.error(err);
				}
				exposed.send({
					confirmed : true
				});
			})
		})
	})
};
