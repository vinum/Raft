/*
 * proxy.js: Responsible for proxying across all applications available to raft.
 *
 *
 */

var util = require('util')
var path = require('path')
var fs = require('fs')
var net = require('net')
var events = require('events')
var qs = require('querystring')
var nodemailer = require("nodemailer");
var raft = require("../../raft");
var cache404 = ''
//
//
//

fs.readFile(__dirname + '/static/404.html', function(err, data) {
	if (err)
		throw err;
	cache404 = data.toString();
});
//
// ### function Balancer (options)
// #### @options {Object} Options for this instance.
// Constructor function for the `raft` Balancer responsible
// for load balancing across all applications know to raft on
// this machine.
//
var Mailer = module.exports = function(options) {
	events.EventEmitter.call(this);

	var self = this;

	this.transport = nodemailer.createTransport("SMTP", {
		service : raft.config.get('mail:service'), // use well known service
		auth : {
			user : raft.config.get('mail:auth:user'),
			pass : raft.config.get('mail:auth:pass')
		}
	});
};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(Mailer, events.EventEmitter);

Mailer.prototype.send = function(message, callback) {
	this.transport.sendMail(message, callback);
}
Mailer.prototype.error = function(text, email, name, callback) {
	this.send({

		// sender info
		from : 'Noreply <' + raft.config.get('mail:auth:user') + '>',

		// Comma separated list of recipients
		to : '"' + name + '" <' + email + '>',

		// Subject of the message
		subject : 'Error', //

		text : text,
		html : cache404.replace('{TEXT}', text),

	}, callback)
}
