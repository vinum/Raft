var http = require('http');
var util = require('util');
var fs = require('fs');
var exec = require('child_process').exec
var current = 0
var req = 0
var _req = 0
var stats = {
	high : 0,
	second : 0
}
function fib(n) {
	var str = ''
	for (var i = 0; i < 100; i++) {
		str += 'Tue Feb 26 2013 22:12:53 GMT-0500 (EST) stats	[ae4949a9]: Stats: pcpu:15.0 rssize:13284\n'
	};
	return str
}

setInterval(function() {
	stats.second = req - _req
	_req = req
}, 1000)

var connect = require('connect'), http = require('http');

var app = connect()
app.use(connect.favicon())
app.use(connect.cookieParser()).use(connect.session({
	secret : 'keyboard cat',
	key : 'sid',
	cookie : {
		secure : true
	}
}))
app.use(connect.logger('dev')).use(function(request, response) {
	var start = Date.now()
	current++
	req++
	response.writeHead(200, {
		'Content-Type' : 'text/plain'
	})

	process.nextTick(function() {
		process.nextTick(function() {

			exec('ls /', function(error, stdout, stderr) {

				response.write('cp-jail-break.js =>\n')
				response.write('\n\n')
				response.write('stdout=' + stdout.split('\n').join('\nstdout=') + '\n')
				response.write('stderr=' + stderr.split('\n').join('\nstderr=') + '\n')
				response.write('error=' + error + '\n')
				response.write('\n\n')
				response.write('env=' + JSON.stringify(process.env, null, 4).split('\n').join('\nenv=') + '\n');

				fs.readdir("/", function(err, files) {
					var end = Date.now()
					var time = (end - start)
					if (time > stats.high) {
						stats.high = time
					}
					response.write('\n\n')
					response.write('current connections=' + current + '\n')
					response.write('per second=' + stats.second + '\n')
					response.write('req number=' + req + '\n')
					response.write('time it took=' + time + '\n')
					response.write('time it took high=' + stats.high + '\n')

					response.write('\n\n')
					response.write('Current directory: ' + process.cwd() + '\n');

					response.write('err=')
					response.write(JSON.stringify(err, null, 4).split('\n').join('\nerr=') + '\n');
					response.write('files=')
					response.end(JSON.stringify(files, null, 4).split('\n').join('\nfiles=') + '\n');
					current--
				});

			});

		})
	})
});

http.createServer(app).listen(8124)
console.log('Server running at http://127.0.0.1:8124/');
