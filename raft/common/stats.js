/*
 *
 * (C) 2013, MangoRaft.
 *
 */
var util = require('util');
var crypto = require('crypto');
var http = require('http');
var fs = require('fs');
var path = require('path');
var events = require('events');
var exec = require('child_process').exec;
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
	var self = this
	getPid(this.meta.pid, function(err, loadData) {
		if (err) {
			return clearInterval(loadWatch);
		}

		if (err || !loadData.pcpu || self.isKill !== false) {
			return
		}
		self.data = loadData

		new raft.mongoose.Stats({
			pcpu : loadData.pcpu,
			rssize : loadData.rssize,
			vsz : loadData.vsz,
			name : self.meta.name,
			user : self.meta.user,
			uid : self.meta.uid
		}).save(function() {
			self.emit('update')
			setTimeout(function() {
				self.timmer()
			}, raft.config.get('timmer:stats') || 5000)
		})
	})
}
Stats.prototype.get = function() {
	return {
		pcpu : Number(this.data.pcpu),
		rssize : Number(this.data.rssize),
		vsz : Number(this.data.vsz),
		name : this.meta.name,
		user : this.meta.user,
		uid : this.meta.uid,
	}
}
Stats.prototype.kill = function(callback) {
	this.isKill = true
}
