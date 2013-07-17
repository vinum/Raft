var raft = require('../raft');
var path = require('path');
var repl = require('repl')
var clc = require('cli-color');
var eyes = require('eyes')
var connect = require('connect')
var http = require('http');

var app = connect()
app.use(function(req, res) {
	res.end('Hello from Connect!\n');
});

http.createServer(app).listen(3000);

raft.balancer.start(function() {

})