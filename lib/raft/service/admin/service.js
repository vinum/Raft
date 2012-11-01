/*
 * service.js: RESTful JSON-based web service for the drone module.
 *
 *
 */

var path = require('path');
var util = require('util');
var fs = require('fs');
var raft = require('../../../raft');

exports.createRouter = function(drone) {

	//
	// ### Proxy Resource
	// Routes for RESTful access to the Drone resource.
	//
	raft.router.path('/admin', function() {

		this.get(function() {
			var res = this.res
			fs.readFile(__dirname + '/static/index.html', function(err, data) {
				if (err) {
					res.writeHead(500);
					return res.end('Error loading index.html');
				}
				res.writeHead(200);
				res.end(data);
			});

		});
		this.get('/js/:file', function(file) {
			var res = this.res
			fs.readFile(__dirname + '/static/js/' + file, function(err, data) {
				if (err) {
					res.writeHead(500);
					return res.end('Error loading index.html');
				}
				res.writeHead(200);
				res.end(data);
			});

		});
		this.get('/css/:file', function(file) {
			var res = this.res
			fs.readFile(__dirname + '/static/css/' + file, function(err, data) {
				if (err) {
					res.writeHead(500);
					return res.end('Error loading index.html');
				}
				res.writeHead(200);
				res.end(data);
			});

		});
		this.get('/ico/:file', function(file) {
			var res = this.res
			fs.readFile(__dirname + '/static/ico/' + file, function(err, data) {
				if (err) {
					res.writeHead(500);
					return res.end('Error loading index.html');
				}
				res.writeHead(200);
				res.end(data);
			});

		});
		this.get('/view/:file', function(file) {
			var res = this.res
			fs.readFile(__dirname + '/static/view/' + file, function(err, data) {
				if (err) {
					res.writeHead(500);
					return res.end('Error loading index.html');
				}
				res.writeHead(200);
				res.end(data);
			});

		});
	});
};
