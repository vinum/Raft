/*
 *
 * (C) 2013, MangoRaft.
 *
 */
var util = require('util');
var fs = require('fs');
var path = require('path');
var events = require('events');
var exec = require('child_process').exec;
var getPid = require('ps-pid');

var raft = require('../../raft')

function Stats(meta) {
	events.EventEmitter.call(this);
	this.statsObject = null
	this.isKill = false
	this.data = {}
	this.meta = meta

	this.timmer()
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

		self.emit('update')

		if (raft.hook) {
			raft.hook.emit('stats::update', self.get())
		}
		setTimeout(function() {
			self.timmer()
		}, raft.config.get('timmer:stats') || 5000)
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
