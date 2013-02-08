/*
 *
 * (C) 2013, MangoRaft.
 *
 */

var fs = require('fs')
var path = require('path')
var semver = require('semver')
var http = require('http')
var spawn = require('child_process').spawn;
var exec = require('child_process').exec

var Nodev = exports.Nodev = function(options) {
	options = options || {};

	this.install_dir = options.install_dir || __dirname;
	this.tmp_dir = options.tmp_dir || __dirname + 'tmp';
};

Nodev.prototype.getInstalled = function(callback) {
	fs.readdir(this.install_dir, function(err, files) {
		if (err)
			return callback(err)

		return callback(null, files);
	});
};

Nodev.prototype.isInstalled = function(version, callback) {
	this.getInstalled(function(err, node_versions) {
		if (err)
			return callback(err);

		var best_version = semver.maxSatisfying(node_versions, version);

		if (!best_version)
			return callback(new Error('Node ' + version + ' is not installed'))

		return callback(null, best_version);
	});
};

Nodev.prototype.getAvailable = function(callback) {
	http.get({
		host : 'nodejs.org',
		path : '/dist/',
		port : 80
	}, function(result) {
		if (result.statusCode == 200) {
			data = '';
			result.on('data', function(chunk) {
				data += chunk;
			});
			result.on('end', function() {
				//extracting node versions from returned html
				var regex = /<a href="v(.*?)\/">/gi
				var regex = /<a href="node-(.*?)\/">/gi, match, available_node_versions = [];

				while ( match = regex.exec(data)) {
					available_node_versions.push(match[1]);
				}

				return callback(null, available_node_versions);
			});
		} else {
			return callback(new Error('Could not connect to nodejs.org'))
		}
	});
};

Nodev.prototype.isAvailable = function(version, callback) {
	this.getAvailable(function(err, node_versions) {
		if (err)
			return callback(err);

		var best_version = semver.maxSatisfying(node_versions, version);

		if (!best_version)
			return callback(new Error('No matching version available for ' + version));

		return callback(null, best_version);
	});
};

Nodev.prototype.mkdir = function(version, callback) {
	var dir = path.join(this.install_dir, version);

	spawn('mkdir', [dir]).on('exit', function(code) {
		if (code > 0)
			return callback(new Error('Could not create directory'));

		return callback(null);
	});
};

Nodev.prototype.downloadPackage = function(version, callback) {
	var tmp_file = path.join(this.tmp_dir, 'node-v' + version + '.tar.gz'), link = 'http://nodejs.org/dist/v' + version + '/node-v' + version + '.tar.gz';

	spawn('wget', ['-O', tmp_file, link]).on('exit', function(code) {
		if (code > 0)
			return callback(new Error('Error downloading ' + lin));

		return callback(null, tmp_file);
	});
};

Nodev.prototype.extractPackage = function(file, destination, callback) {
	spawn('tar', ['--strip-components=1', '-xzf', file, '-C', destination]).on('exit', function(code) {
		if (code > 0)
			return callback(new Error('Failed to extract Node package'));

		return callback(null);
	});
};

Nodev.prototype.configure = function(node_dir, callback) {
	spawn('./configure', ['--prefix=' + node_dir], {
		cwd : node_dir
	}).on('exit', function(code) {
		if (code)
			return callback(new Error('Failed to configure Node build'));

		return callback(null);
	});
};

Nodev.prototype.make = function(node_dir, callback) {
	spawn('make', [], {
		cwd : node_dir
	}).on('exit', function(code) {
		if (code > 0)
			return callback(new Error('Failed to make Node build'));

		return callback(null);
	});
};

Nodev.prototype.installDeps = function(node_dir, callback) {
	console.log(node_dir + '/bin/npm install daemon')
	exec(node_dir + '/bin/npm install daemon', function(error, stdout, stderr) {

		console.log('stdout: ' + stdout);
		console.log('stderr: ' + stderr);
		if (error !== null) {
			return callback(new Error('Failed to install daemon'));
		}
		return callback(null);
	}, {
		cwd : node_dir + '/lib'
	});

};

Nodev.prototype.install = function(node_dir, callback) {
	spawn('make', ['install'], {
		cwd : node_dir
	}).on('exit', function(code) {
		if (code > 0)
			return callback(new Error('Failed to install Node build'));

		return callback(null);

	});
};

Nodev.prototype.checkInstall = function(version, callback) {
	var self = this;
	return callback(null, version);
	console.log('Nodev:', 'finding install for Node ' + version);
	self.isInstalled(version, function(err, version_match) {
		if (version_match) {
			callback(null, version_match);
		} else {
			console.log('Nodev:', 'no install of Node ' + version + ', checking online');
			self.isAvailable(version, function(err, version_match) {
				if (err) {
					callback(err);
				} else {
					console.log('Nodev:', 'Node ' + version_match + ' available, creating local directory');
					self.mkdir(version_match, function(err) {
						if (err) {
							callback(err);
						} else {
							console.log('Nodev:', 'downloading package for Node ' + version_match);
							self.downloadPackage(version_match, function(err, download_path) {
								if (err) {
									callback(err);
								} else {
									var destination = path.join(self.install_dir, version_match);

									console.log('Nodev:', 'extracting to ' + destination);
									self.extractPackage(download_path, destination, function(err, extract_path) {
										if (err) {
											callback(err);
										} else {
											console.log('Nodev:', 'configuring ' + destination);
											self.configure(destination, function(err) {
												if (err) {
													callback(err);
												} else {
													console.log('Nodev:', 'making ' + destination);
													self.make(destination, function(err) {
														if (err) {
															callback(err);
														} else { installDeps
															self.install(destination, function(err) {
																if (err) {
																	callback(err);
																} else {
																	self.installDeps(destination, function(err) {
																		if (err) {
																			callback(err);
																		} else {
																			console.log('Nodev:', 'installDeps ' + destination);
																			console.log('Nodev:', 'Node ' + version_match + ' was successfully installed');
																			callback(null, version_match);

																		}
																	});
																}
															});
														}
													});
												}
											});
										}
									});
								}
							});
						}
					});
				}
			});
		}
	});
};
