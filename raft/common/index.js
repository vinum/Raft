/*
 * index.js: Top level module include for utils module.
 *
 */
var mkdirp = require('mkdirp');
var crypto = require('crypto')
var fs = require('fs')
var http = require('http')
var os = require('os')
var path = require('path')
var exec = require('child_process').exec
var spawn = require('child_process').spawn

var raft = require('../../raft');

var common = module.exports;

//
common.Services = require('./services')
//
common.Module = require('./rpc-module')
//

common.mkdir = function(directories) {
	var keys = Object.keys(directories)

	for (var i = 0, j = keys.length; i < j; i++) {

		mkdirp(directories[keys[i]], function(err) {
			if (err)
				console.error(err)
			else
				console.log('pow!')
		});
	};
	return directories
}
/**
 *
 */
var S4 = function() {
	return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
}
common.uuid = function uuid(a) {
	if (a) {
		return (S4() + S4() + S4() + S4() + S4() + S4() + S4() + S4());
	}
	return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}