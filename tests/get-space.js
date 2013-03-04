var sys = require('util'), exec = require('child_process').exec, fs = require('fs'), os = require('os');

exec("du -s /home/bob", function(err, resp, b) {
	console.log(err, Number(resp.split('\t')[0]) / 1024, b)

});
