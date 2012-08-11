#!/usr/bin/env node

var raft = require('../');

raft.init('bouncy');

var Cluster = require('../cluster/cluster');

var cluster = new Cluster();

cluster.bouncy();
