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
var ejs = require('ejs');

var compiled = {}

//
//
//

fs.readFile(__dirname + '/static/404.html', function(err, data) {
	if (err)
		throw err;
	compiled['404'] = ejs.compile(data.toString(), {});
});
fs.readFile(__dirname + '/static/confirmation-mail.html', function(err, data) {
	if (err)
		throw err;
	compiled['confirmation-mail'] = ejs.compile(data.toString(), {});
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
		from : '"' + raft.config.get('site-name') + '" <' + raft.config.get('mail:auth:user') + '>',
		to : '"' + name + '" <' + email + '>',
		subject : 'Error',
		text : text,
		html : compiled['404']({
			text : text
		}, {}),
	}, callback)
}
Mailer.prototype.confirm = function(email, name, code, callback) {
	this.send({
		from : '"' + raft.config.get('site-name') + '" <' + raft.config.get('mail:auth:user') + '>',
		to : '"' + name + '" <' + email + '>',
		subject : 'Thanks for registering',
		text : 'http://api.' + raft.config.get('domain') + '/user/' + code + '/confirm',
		html : compiled['confirmation-mail']({
			href : 'http://api.' + raft.config.get('domain') + '/user/' + code + '/confirm'
		}, {}),
	}, callback)
}
