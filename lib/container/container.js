/***
 * Node modules
 */

var events = require('events');
var util = require('util');
var path = require('path');
var fs = require('fs');
var domain = require('domain');
var _npm = require('npm');

//
var rimraf = require('rimraf')
var raft = require('../../');

var utils = raft.utils;
var uuid = utils.uuid;
var log = raft.log;

//
var Module = require('./module');

/**
 *
 */
var Container = module.exports = function() {
	events.EventEmitter.call(this);
	this.config = {};
};
/***
 * Make it an event
 */
util.inherits(Container, events.EventEmitter);
/**
 *
 */

Container.prototype.loadConfig = function(config, cb) {

	this.config = {
		mongo : raft.config.mongodb,
		paths : raft.config.paths,
		tarPath : config.tarPath,
		userid : config.userid,
		name : config.name,
		user : config.user,
		workerKey : raft.config.workerKey,
		appid : raft.utils.uuid(true)
	};

	this.config.paths.tar = config.tarPath;

	this.config.paths.main = path.join(raft.config.paths.tmp, path.basename(config.tarPath, '.tar'));

	this.log = new raft.Logger();

	this.log.stream = fs.createWriteStream(raft.config.paths.logs + '/' + config.name + '.' + config.userid + '.log', {
		flags : 'a',
		encoding : null,
		mode : 0666
	});

	cb();
}
/**
 *
 */

Container.prototype.loadTar = function(cb) {
	var self = this;
	utils.unCreateTar(this.config.paths.tar, this.config.paths.main, function(err) {
		if (err) {
			self.error('loadTar', err, cb)
		} else {
			cb()
		}
	})
}
/**
 *
 */
Container.prototype.loadPackage = function(cb) {
	var self = this
	raft.utils.readPackage(this.config.paths.main, function(err, package) {
		if (err) {
			self.error('loadPackage', err, cb);
		} else {
			self.package = package;
			if (!package.main) {
				self.error('loadPackage', new Error('The package has not main file.'), cb);
			} else {
				cb();
			}

		}
	});
}
/**
 *
 */

Container.prototype.loadNpm = function(cb) {
	var self = this;
	_npm.on("log", function(message) {
		self.log.info('Raft-NPM', message)
	})
	_npm.load({
		name : 'Raft-App-Server-' + this.config.name,
		dependencies : Object.create(this.package.dependencies)
	}, function(err) {
		if (err) {
			self.error('loadNpm', err, cb);
		} else {
			var keys = Object.keys(self.package.dependencies)
			if (keys.length > 0)
				_npm.commands.install(self.config.paths.main, keys, function(err) {
					if (err) {
						self.error('loadNpm', err, cb);
					} else {
						cb()
					}
				});
			else {
				cb()
			}
		}
	})
}
/**
 *
 */

Container.prototype.loadApp = function(cb) {
	var self = this;
	raft.mongo.WorkerStore.findOne({
		name : this.config.name,
		userid : this.config.userid
	}).run(function(err, app) {

		if (err) {
			self.error('loadApp', err, cb);
		} else if (!app) {

			new raft.mongo.WorkerStore({
				name : self.config.name,
				userid : self.config.userid,
				user : self.config.user,
				running : false,
				version : 0,
				created : new Date,
				worker : {
					key : self.config.workerKey
				}
			}).save(function(err) {
				if (err) {
					self.error('loadApp', err, cb);
				} else {
					self.buildApp(cb)
				}
			})
		} else {
			self.buildApp(cb)
		}
	})
}
/**
 *
 */
Container.prototype.buildApp = function(cb) {
	var self = this;

	var package = self.package;

	var env = self.env = new Env(this);

	env.set('config', self.config);
	env.set('package', package);


	Module._loadRaft({
		init : true,
		env : env,
		console : {
			log : function(a, b, c) {

				console.log(a, b, c)
				self.log.info.apply(self.log, [raft.utils.timestamp()].concat(Array.prototype.slice.call(arguments)))
			},
			info : function(a, b, c) {
				console.log(a, b, c)
				self.log.info.apply(self.log, [raft.utils.timestamp()].concat(Array.prototype.slice.call(arguments)))
			},
			warn : function(a, b, c) {
				console.log(a, b, c)
				self.log.warn.apply(self.log, [raft.utils.timestamp()].concat(Array.prototype.slice.call(arguments)))
			},
			error : function(a, b, c) {
				console.log(a, b, c)
				self.log.error.apply(self.log, [raft.utils.timestamp()].concat(Array.prototype.slice.call(arguments)))
			},
			dir : function(a, b, c) {
				console.log(a, b, c)
				self.log.info.apply(self.log, [raft.utils.timestamp()].concat(Array.prototype.slice.call(arguments)))
			}
		},
		paths : this.config.paths
	});
	var d = domain.create();
	d.on('error', function(err) {
		self.log.error(raft.utils.timestamp(), err)
		self.kill(function() {
			self.log.error(raft.utils.timestamp(), 'App exit now!')
			process.exit(1)

		})
	});
	d.run(function() {
		Module._load(self.config.paths.main + '/' + package.main);
		
	});

	self.log.info(raft.utils.timestamp(), 'App has built')
	cb();
}
/**
 *
 */

Container.prototype.updateStore = function(cb) {
	var self = this;
	raft.mongo.WorkerStore.findOne({
		name : self.config.name,
		userid : self.config.userid
	}).exec(function(err, app) {
		if (err) {
			self.error('updateStore', err, cb);
		} else {

			for (var key in self.env.paths) {
				app.paths[key] = self.env.paths[key]
			}

			app.worker.key = self.config.workerKey;
			app.deployed = new Date;
			app.version = app.version + 1;
			app.running = true;
			app.save(function(err) {
				if (err) {
					self.error('updateStore', err, cb);
				} else {
					cb()
				}
			})
		}
	})
}
/**
 *
 */
Container.prototype.kill = function(cb) {

	var env = this.env;
	var self = this

	rimraf(self.config.paths.main, function(err) {
		log.warn('Raft-Container', 'rimraf file: ' + self.config.paths.main);
		self.updateKillApp(cb)
	})
}
/**
 *
 */
Container.prototype.updateKillApp = function(cb) {

	log.warn('Raft-Container', 'updateKillApp');

	var env = this.env;

	var self = this;

	raft.mongo.BouncyHosts.remove({
		appid : self.config.appid
	}, function(err) {
		if (err) {
			self.error('kill', err, cb);
		} else {
			raft.mongo.WorkerStore.findOne({
				name : self.config.name,
				userid : self.config.userid
			}).exec(function(err, app) {
				if (err) {
					self.error('kill', err, cb);
				} else {
					app.running = false;
					app.save(function() {
						raft.mongo.WorkerStore.findOne({
							name : self.config.name,
							userid : self.config.userid
						}).exec(function(err, app) {
							if (err) {
								self.error('kill', err, cb);
							} else {
								cb()
							}
						});
					});
				}
			});
		}
	})
}
/**
 *
 */

Container.prototype.error = function(func, err, cb) {
	log.error('Raft-Container-' + func, err)
	cb(err)
}
/***
 *
 *
 *
 */

var Env = function(conainer) {
	events.EventEmitter.call(this);
	this.conainer = conainer;
	this.utils = utils;
}
/***
 * Make it an event
 */
util.inherits(Env, events.EventEmitter);
/**
 *
 */
Env.prototype.get = function(name) {
	return this[name];
}
/**
 *
 */
Env.prototype.set = function(name, val) {
	return this[name] = val;
}