/*
 * service.js: RESTful JSON-based web service for the drone module.
 *
 * (C) 2010, Nodejitsu Inc.
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
	rpc.expose('user.list.all', function listHosts(host) {
		var exposed = this
		raft.mongoose.User.find({
			//
		}, function(err, users) {
			if (err) {
				return exposed.error(err);
			}
			exposed.send({
				users : users
			});
		})
	})
	rpc.expose('user.list.system', function listHosts(host) {
		var exposed = this
		raft.mongoose.User.find({
			zone : 'system'
		}, function(err, users) {
			if (err) {
				return exposed.error(err);
			}
			exposed.send({
				users : users
			});
		})
	})
	rpc.expose('user.list.user', function listHosts(host) {
		var exposed = this
		raft.mongoose.User.find({
			zone : 'user'
		}, function(err, users) {
			if (err) {
				return exposed.error(err);
			}
			exposed.send({
				users : users
			});
		})
	})

	rpc.expose('user.list.free', function listHosts(host) {
		var exposed = this
		raft.mongoose.User.find({
			zone : 'free'
		}, function(err, users) {
			if (err) {
				return exposed.error(err);
			}
			exposed.send({
				users : users
			});
		})
	})

	rpc.expose('user.remove', function listHosts(username) {
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
			user.remove(function(err) {
				if (err) {
					return exposed.error(err);
				}
				exposed.send({
					removed : true
				});
			})
		})
	})
	rpc.expose('user.create', function listHosts(username, password, email, zone) {
		var exposed = this
		var user = new raft.mongoose.User({
			username : username,
			password : password,
			email : email,
			zone : zone
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
		}).save(function(err, user) {
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
