/**
 * Module dependencies.
 */

var util = require('util');
var crypto = require('crypto');
var http = require('http');
var fs = require('fs');
var path = require('path');
var events = require('events');
var getPid = require('ps-pid');
var restify = require('restify');

var raft = require('../../raft')

function Stats(meta) {
	events.EventEmitter.call(this);
	var self = this
	this.statsObject = null
	this.isKill = false
	this.data = {}
	this.meta = meta

	self.timmer()
};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(Stats, events.EventEmitter);

module.exports = Stats

Stats.prototype.timmer = function() {
	var statsObject = this.statsObject
	var self = this
	getPid(this.meta.pid, function(err, loadData) {
		if (err) {
			return clearInterval(loadWatch);
		}

		if (err || !loadData.pcpu || self.isKill !== false) {
			return
		}
		self.data = loadData
		exec('du -sh ' + self.meta.appDir, function(error, stdout, stderr) {
			console.log(stdout)
			self.data = loadData
			self.data.disk = stdout.split('	')[0]
			new raft.mongoose.Stats({
				pcpu : loadData.pcpu,
				rssize : loadData.rssize,
				vsz : loadData.vsz,
				name : self.meta.name,
				user : self.meta.user,
				uid : self.meta.uid,
				disk : stdout.split('	')[0]
			}).save(function() {
				self.emit('update')
				setTimeout(function() {
					self.timmer()
				}, 10000)
			})
		});
	})
}
Stats.prototype.kill = function(callback) {
	this.statsObject.end = Date.now()
	this.isKill = true
	this.statsObject.save(callback)
}
