//#!/usr/bin/env node

var path = require('path')
var util = require('util')
var haibu = require('../lib/haibu');

var program = require('commander');


program.version(require('../package').version)

function loop(data) {

	var keys = Object.keys(data)

	for (var i = 0; i < keys.length; i++) {

		var command = data[keys[i]];

		var run1 = program.command(keys[i]);

		run1.description(command.description);

		var options = command.options;
		if (options.length) {
			for (var j = 0; j < options.length; j++) {
				run1.option(options[j].command, options[j].description);
			};
		}

		run1.action(command)
	};
}

loop(require('../lib/haibu/commands/config'));
loop(require('../lib/haibu/commands/servers'));

/**
 *
 */

program.parse(process.argv);
