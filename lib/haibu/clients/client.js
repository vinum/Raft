var os = require('os')
var request = require('request')
var base64 = require('util').base64;
var events = require('events');
var util = require('util');
var path = require('path');
var http = require('http');
var querystring = require('querystring');
var haibu = require('../../haibu');
//
// ### function Client (options)
// #### @options {Object} Options to use for this instance.
// Constructor function for the Client to the haibu API.
//
var Client = module.exports = function(options) {
	this.options = options || {};

	if ( typeof this.options.get !== 'function') {
		this.options.get = function(key) {
			return this[key];
		};
	}

	this.config = {
		host : options.host || 'localhost',
		port : options.port || 9002,
		Authorization : "Basic " + new Buffer(options.username + ":" + options.password).toString("base64")
	};
};

Client.prototype.failCodes = {
	400 : 'Bad Request',
	401 : 'Not authorized',
	403 : 'Forbidden',
	404 : 'Item not found',
	500 : 'Internal Server Error'
};

Client.prototype.successCodes = {
	200 : 'OK',
	201 : 'Created'
};

//
// ### @remoteUri {string}
// Full URI for the remote Haibu server this client
// is configured to request against.
//
Client.prototype.__defineGetter__('remoteUri', function() {
	return 'http://' + this.config.host + ':' + this.config.port;
});

//
// ### @private _request (method, uri, [body], callback, success)
// #### @options {Object} Outgoing request options.
// #### @callback {function} Continuation to short-circuit to if request is unsuccessful.
// #### @success {function} Continuation to call if the request is successful
// Core method for making requests against the haibu Drone API. Flexible with respect
// to continuation passing given success and callback.
//
Client.prototype._request = function(options, callback, success) {
	var self = this;
	if ( typeof options === 'string') {
		options = {
			path : options
		};
	}
	options.headers = options.headers || {};

	options.method = options.method || 'GET';
	options.uri = this.remoteUri + options.path;
	options.headers['content-type'] = options.headers['content-type'] || 'application/json';

	options.headers['Authorization'] = this.config.Authorization;

	if (options.headers['content-type'] === 'application/json' && options.body) {
		options.body = JSON.stringify(options.body);
	}

	return request(options, function(err, response, body) {
		if (err) {
			return callback(err);
		}

		var statusCode = response.statusCode.toString(), result, error;

		try {
			result = JSON.parse(body);
		} catch (ex) {
			// Ignore Errors
		}
		if (Object.keys(self.failCodes).indexOf(statusCode) !== -1) {
			error = new Error('haibu Error (' + statusCode + '): ' + self.failCodes[statusCode]);
			error.result = result;
			error.status = statusCode;
			return callback(error);
		}

		success(null, result);
	});
};

Client.prototype._stream = function(options, callback, success) {
	var self = this;
	if ( typeof options === 'string') {
		options = {
			path : options
		};
	}

	options.method = options.method || 'GET';
	options.host = this.options.host
	options.port = this.options.port
	options.headers = options.headers || {};
	options.headers['content-type'] = options.headers['content-type'] || 'application/json';

	options.headers['Authorization'] = this.config.Authorization;
	if (options.type === 'write') {

		options.path += '?' + querystring.stringify(options.body);
		
		var req = http.request(options, function(res) {
			res.on('end', success).on('error', callback).on('close', success)
		})

		options.stream.pipe(req).on('end', callback).on('error', success).on('close', success)
	} else {
		options.path += '?' + querystring.stringify(options.body);

		var req = http.request(options, function(res) {
			if (Object.keys(self.failCodes).indexOf(res.statusCode) !== -1) {
				error = new Error('haibu Error (' + res.statusCode + '): ' + self.failCodes[res.statusCode]);
				error.result = result;
				error.status = res.statusCode;
				return callback(error);
			}
			res.on('end', success).on('error', callback).on('close', success).pipe(options.stream)
		})
		req.end()
	}

};

Client.prototype.auth = function(options, callback, success) {

};
