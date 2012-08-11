#!/usr/bin/env node

var cmd = process.argv[2];
var action = process.argv[3];

var options = process.argv.splice(4, process.argv.length);
var _options = {};

var raft = require('../');


var cli = (new (require('../cli/cli')));

cli.run(cmd, action, options);

