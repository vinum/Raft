/*
 * proxy.js: Responsible for proxying across all applications available to raft.
 *
 * (C) 2010, Nodejitsu Inc.
 *
 */

var util = require('util')
var path = require('path')
var fs = require('fs')
var net = require('net')
var events = require('events')
var qs = require('querystring')


var raft = require('../../raft');

var mongoose = raft.mongoose;
var clients = raft.clients;
var FAKE = {
	ctime : 1351370845992,
	command : 'node',
	file : '/home/bob/Documents/node/Raft/node_modules/raft-carapace/bin/carapace',
	foreverPid : 9819,
	options : ['--plugin', 'net', '/home/bob/Documents/node/Raft/local/bob/home-page/bob-home-page-1351370755146/server.js'],
	pid : 9834,
	silent : true,
	uid : 'Cj72',
	spawnWith : {
		cwd : '/home/bob/Documents/node/Raft/local/bob/home-page/bob-home-page-1351370755146',
		env : {
			XDG_VTNR : '1',
			XDG_SESSION_ID : '2',
			HOSTNAME : 'bob-workstation',
			IMSETTINGS_INTEGRATE_DESKTOP : 'yes',
			GPG_AGENT_INFO : '/run/user/bob/keyring-T3Th8h/gpg:0:1',
			TERM : 'xterm',
			SHELL : '/bin/bash',
			HISTSIZE : '1000',
			XDG_SESSION_COOKIE : '5f4ed16fe63a021f0eb787e700000008-1351262549.825842-1529989472',
			GJS_DEBUG_OUTPUT : 'stderr',
			WINDOWID : '14680301',
			GNOME_KEYRING_CONTROL : '/run/user/bob/keyring-T3Th8h',
			QTDIR : '/usr/lib/qt-3.3',
			QTINC : '/usr/lib/qt-3.3/include',
			GJS_DEBUG_TOPICS : 'JS ERROR;JS LOG',
			IMSETTINGS_MODULE : 'none',
			QT_GRAPHICSSYSTEM_CHECKED : '1',
			USER : 'bob',
			LS_COLORS : 'rs=0:di=01;34:ln=01;36:mh=00:pi=40;33:so=01;35:do=01;35:bd=40;33;01:cd=40;33;01:or=40;31;01:mi=01;05;37;41:su=37;41:sg=30;43:ca=30;41:tw=30;42:ow=34;42:st=37;44:ex=01;32:*.tar=01;31:*.tgz=01;31:*.arj=01;31:*.taz=01;31:*.lzh=01;31:*.lzma=01;31:*.tlz=01;31:*.txz=01;31:*.zip=01;31:*.z=01;31:*.Z=01;31:*.dz=01;31:*.gz=01;31:*.lz=01;31:*.xz=01;31:*.bz2=01;31:*.tbz=01;31:*.tbz2=01;31:*.bz=01;31:*.tz=01;31:*.deb=01;31:*.rpm=01;31:*.jar=01;31:*.war=01;31:*.ear=01;31:*.sar=01;31:*.rar=01;31:*.ace=01;31:*.zoo=01;31:*.cpio=01;31:*.7z=01;31:*.rz=01;31:*.jpg=01;35:*.jpeg=01;35:*.gif=01;35:*.bmp=01;35:*.pbm=01;35:*.pgm=01;35:*.ppm=01;35:*.tga=01;35:*.xbm=01;35:*.xpm=01;35:*.tif=01;35:*.tiff=01;35:*.png=01;35:*.svg=01;35:*.svgz=01;35:*.mng=01;35:*.pcx=01;35:*.mov=01;35:*.mpg=01;35:*.mpeg=01;35:*.m2v=01;35:*.mkv=01;35:*.ogm=01;35:*.mp4=01;35:*.m4v=01;35:*.mp4v=01;35:*.vob=01;35:*.qt=01;35:*.nuv=01;35:*.wmv=01;35:*.asf=01;35:*.rm=01;35:*.rmvb=01;35:*.flc=01;35:*.avi=01;35:*.fli=01;35:*.flv=01;35:*.gl=01;35:*.dl=01;35:*.xcf=01;35:*.xwd=01;35:*.yuv=01;35:*.cgm=01;35:*.emf=01;35:*.axv=01;35:*.anx=01;35:*.ogv=01;35:*.ogx=01;35:*.aac=01;36:*.au=01;36:*.flac=01;36:*.mid=01;36:*.midi=01;36:*.mka=01;36:*.mp3=01;36:*.mpc=01;36:*.ogg=01;36:*.ra=01;36:*.wav=01;36:*.axa=01;36:*.oga=01;36:*.spx=01;36:*.xspf=01;36:*.pdf=00;33:*.ps=00;33:*.ps.gz=00;33:*.txt=00;33:*.patch=00;33:*.diff=00;33:*.log=00;33:*.tex=00;33:*.xls=00;33:*.xlsx=00;33:*.ppt=00;33:*.pptx=00;33:*.rtf=00;33:*.doc=00;33:*.docx=00;33:*.odt=00;33:*.ods=00;33:*.odp=00;33:*.xml=00;33:*.epub=00;33:*.abw=00;33:*.htm=00;33:*.html=00;33:*.shtml=00;33:*.wpd=00;33:',
			SSH_AUTH_SOCK : '/run/user/bob/keyring-T3Th8h/ssh',
			USERNAME : 'bob',
			SESSION_MANAGER : 'local/unix:@/tmp/.ICE-unix/1108,unix/unix:/tmp/.ICE-unix/1108',
			PATH : '/usr/lib/qt-3.3/bin:/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/home/bob/.local/bin:/home/bob/bin',
			MAIL : '/var/spool/mail/bob',
			DESKTOP_SESSION : 'gnome',
			QT_IM_MODULE : 'xim',
			PWD : '/home/bob/Documents/node/Raft',
			XMODIFIERS : '@im=none',
			GNOME_KEYRING_PID : '1104',
			LANG : 'en_US.UTF-8',
			GDMSESSION : 'gnome',
			HISTCONTROL : 'ignoredups',
			HOME : '/home/bob',
			XDG_SEAT : 'seat0',
			SHLVL : '2',
			GNOME_DESKTOP_SESSION_ID : 'this-is-deprecated',
			LOGNAME : 'bob',
			QTLIB : '/usr/lib/qt-3.3/lib',
			DBUS_SESSION_BUS_ADDRESS : 'unix:abstract=/tmp/dbus-XgsRBish3I,guid=0833014f51b95ee57f0ad3cd0000001c',
			LESSOPEN : '||/usr/bin/lesspipe.sh %s',
			WINDOWPATH : '1',
			XDG_RUNTIME_DIR : '/run/user/bob',
			DISPLAY : ':0',
			COLORTERM : 'gnome-terminal',
			XAUTHORITY : '/var/run/gdm/auth-for-bob-P7udLe/database',
			OLDPWD : '/home/bob',
			_ : '/usr/local/bin/node'
		},
		stdio : ['ipc', 'pipe', 'pipe']
	},
	env : 'development',
	cwd : '/home/bob/Documents/node/Raft/local/bob/home-page/bob-home-page-1351370755146',
	port : 41049,
	host : '192.168.1.25',
	hash : '77e427e4f2d8aef0cca4c37021886fcb',
	droneHash : '77e427e4f2d8aef0cca4c37021886fcb',
	hiveHash : '91c77ac6ca98da5aa9223220b32d0437',
	package : {
		name : 'home-page',
		description : 'A node.js application server - spawn your own node.js clouds, on your own hardware',
		version : '0.7.14',
		author : 'Tim <flybyme@wiyc.info>',
		keywords : ['cloud computing', 'automated deployment', 'platform-as-a-service'],
		otherDomains : [],
		scripts : {
			start : './server.js'
		},
		user : 'bob',
		domain : '192.168.1.25',
		main : 'server.js',
		hash : '4cdc92d2e70b711d9549883a79c430e08e867254',
		repository : {
			type : 'local',
			directory : '/home/bob/Documents/node/Raft/packages/bob-home-page-1351370845978'
		},
		_id : 'home-page',
		directories : {
			home : 'bob-home-page-1351370755146'
		}
	},
	name : 'home-page',
	user : 'bob'
}
//
// ### function Balancer (options)
// #### @options {Object} Options for this instance.
// Constructor function for the `raft` Balancer responsible
// for load balancing across all applications know to raft on
// this machine.
//
var Drone = function(info, packageHash) {
	console.log(info)
	events.EventEmitter.call(this);
	this.info = info.drone
	this.package = info.package
	this.stats = []
	this.hash = this.info.droneHash
	this.hive = raft.api.hives[this.info.hiveHash]
	this.packageHash = packageHash
};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(Drone, events.EventEmitter);

Drone.prototype.save = function(callback) {
	var self = this
	var drone = this.info
	new raft.mongoose.Drone({
		"ctime" : drone.ctime,
		"command" : drone.command,
		"file" : drone.file,
		"foreverPid" : drone.foreverPid,
		"options" : drone.options,
		"pid" : drone.pid,
		"silent" : drone.silent,
		"uid" : drone.uid,
		"spawnWith" : drone.spawnWith,
		"env" : drone.env,
		"cwd" : drone.cwd,
		"repository" : drone.repository,
		"port" : drone.port,
		"host" : drone.host,
		"hash" : drone.droneHash,
		"hivehash" : drone.hiveHash,
		"packagehash" : this.packageHash
	}).save(callback)
}
Drone.prototype.remove = function(callback) {
	var self = this
	var drone = this.info
	raft.mongoose.Drone.findOne({
		"hash" : this.hash,
		"packagehash" : this.packageHash
	}).run(function(err, drone) {
		drone.online = false
		drone.save(callback)
	})
}
/**
 *
 */
Drone.prototype.stop = function(callback) {
	var self = this;
	this.hive.stopOne(this.hash, function(err) {
		self.remove(callback)
	})
}
/**
 *
 */
Drone.prototype.status = function(callback) {
	var self = this;
	this.hive.showHash({
		name : this.package.name
	}, this.hash, callback)
}
/**
 *
 */
Drone.prototype.stats = function(callback) {

}
//
// ### function Balancer (options)
// #### @options {Object} Options for this instance.
// Constructor function for the `raft` Balancer responsible
// for load balancing across all applications know to raft on
// this machine.
//
var App = module.exports = function(username, appname) {
	events.EventEmitter.call(this);
	this.username = username;
	this.appname = appname;
	this.drones = {}
	this.hives = {}
	this.package = null
	this.version = null
};

//
// Inherit from `events.EventEmitter`.
//
util.inherits(App, events.EventEmitter);
/**
 *
 */
App.prototype.init = function(package, callback) {
	var self = this;
	if (this.package) {
		return this.stop(function() {
			self.init(package, callback)
		})
	}

	function onPackageSave(err) {
		if (err) {
			throw err
		}
		self.package = package
		self.version = package.version

		self._startDrone(callback)
	}


	raft.mongoose.Package.findOne({
		name : this.appname,
		user : this.username,
		status : true
	}).run(function(err, oldPackage) {
		if (err) {
			throw err
		}
		if (oldPackage) {
			oldPackage.status = false
			oldPackage.save(function() {

				new raft.mongoose.Package(package).save(onPackageSave)
			})
		} else {

			new raft.mongoose.Package(package).save(onPackageSave)
		}
	})
}
/**
 *
 */
App.prototype.status = function(callback) {
	var self = this;
	var status = {
		app : this.package,
		drones : []
	}

	var drones = this.drones;

	var keys = Object.keys(drones)
	function loop(err, data) {
		if (err) {
			throw err
		}
		if (data) {
			status.drones.push(data)
		}

		var key = keys.shift()

		if (!key) {
			return callback(null, status)
		}

		var drone = drones[key]

		drone.status(loop)
	}

	loop()

}
/**
 *
 */
App.prototype.stats = function(callback) {
	var self = this;

	var self = this;
	var data = []
	var hives = this.hives;
	var keys = Object.keys(hives)
	function loop(err, _data) {
		if (err) {
			throw err
		}
		if (_data)
			data = data.concat(_data.stats)
		var key = keys.shift()
		if (!key) {

			return callback(null, data)
		}
		var hive = hives[key]
		hive.stats(self.appname, loop)
	}

	loop()
}
/**
 *
 */
App.prototype.start = function(callback) {
	var self = this;
	this._startDrone(callback)
}
/**
 *
 */
App.prototype.update = function(package, callback) {
	var self = this;

}
/**
 *
 */
App.prototype.stop = function(callback) {
	var self = this;
	var drones = this.drones;
	console.log(drones)
	var keys = Object.keys(drones)
	function loop() {
		var key = keys.shift()

		if (!key) {

			self.package = null
			self.version = null
			return callback()
		}

		var drone = drones[key]
		delete drones[key]
		drone.stop(loop)
	}

	loop()
}
/**
 *
 */
App.prototype.restart = function(callback) {
	var self = this;

}
/**
 *
 */
App.prototype.clean = function(callback) {
	var self = this;

}
/**
 *
 */
App.prototype.drone = function(callback) {
	var self = this;

}

App.prototype._getHive = function(callback) {
	var self = this

	raft.mongoose.Hive.findOne({
		online : true
	}).run(function cb(err, hive) {
		if (err) {
			throw err
		}
		var cli
		if (!( cli = raft.api.hives[hive.hash])) {
			cli = raft.api.hives[hive.hash] = new raft.clients.Drone(hive)
		}
		self.hives[hive.hash] = cli
		callback(null, cli)
	})
}
App.prototype._getCli = function(hash) {
	var self = this
	return raft.api.hives[hash]
}

App.prototype._getSnapShot = function(callback) {
	var self = this
	console.log(this.version)
	raft.mongoose.SnapShot.findOne({
		username : this.username,
		appname : this.appname,
		version : this.version
	}).run(callback)
}

App.prototype._startDrone = function(callback) {
	var self = this

	this._getHive(function(err, cli) {
		if (err) {
			throw err
		}
		self._getSnapShot(function(err, snapshot) {
			if (err) {
				throw err
			}
			console.log(snapshot.version)

			cli.package(self.package, snapshot.dir, function(err, result) {
				if (err) {
					throw err
				}
				console.log(result)
				var drone = new Drone({
					drone : result.drone,
					package : self.package
				})
				self.drones[drone.hash] = drone
				drone.save(callback)
			})
		})
	});
}
