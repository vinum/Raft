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
	this.data = null
	this.meta = meta
	new raft.mongoose.Stats({
		name : meta.name,
		user : meta.user,
		uid : meta.uid
	}).save(function(err) {
		raft.mongoose.Stats.findOne({
			name : meta.name,
			user : meta.user,
			uid : meta.uid
		}, function(err, statsObject) {
			self.statsObject = statsObject
			self.timmer()
			console.log(self)
		})
	})
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
		statsObject.time.push(Date.now())
		statsObject.pcpu.push(loadData.pcpu)
		statsObject.rssize.push(loadData.rssize)
		statsObject.vsz.push(loadData.vsz)
		statsObject.save(function() {
			self.emit('update')
			setTimeout(function() {
				self.timmer()
			}, 10000)
		})
	})
}
Stats.prototype.kill = function(callback) {
	this.statsObject.end = Date.now()
	this.isKill = true
	this.statsObject.save(callback)
}
