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

var raft = require('../raft')

var Stats = module.exports.Stats = function(options) {
	events.EventEmitter.call(this);
	this.statsObject = null
	this.isKill = false
	this.data = {}
	this.options = options

	this.timmer()
};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(Stats, events.EventEmitter);

Stats.prototype.timmer = function() {
	var self = this
	getPid(this.options.pid, function(err, loadData) {
		if (err) {
			return clearInterval(loadWatch);
		}

		if (err || !loadData.pcpu || self.isKill !== false) {
			return
		}
		exec("du -s /home/bob", function(err, resp, b) {
			self.data = {
				cpu : Number(loadData.pcpu),
				memory : Number(loadData.rssize),
				disk : Number(resp.split('\t')[0])
			}

			self.emit('update', self.data)

			setTimeout(function() {
				self.timmer()
			}, 5000)
		});
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
