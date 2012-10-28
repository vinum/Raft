var assert = require('assert')
var exec = require('child_process').exec
var fs = require('fs')
var path = require('path')
var util = require('util')
var request = require('request')
var winston = require('winston');
var haibu = require('../lib/haibu');

var cli = new haibu.clients.Storage({
	port : 9002,
	host : 'localhost',
	user : 'bob',
	name : 'test'
})
cli.readdir('bob', 'test', '/', function(err, data) {

	var stream = fs.createReadStream(__filename)
	cli.createWriteStream('bob', 'test', '/server.js', stream, function(err, data) {
		console.log('createWriteStream')
		var stream = fs.createWriteStream(__filename + 'dsf.gfh')
		cli.createReadStream('bob', 'test', '/server.js', stream, function(err, data) {
			console.log('createReadStream')
		})
	})
})
