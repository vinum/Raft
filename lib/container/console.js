// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var timestamp = require('../utils').timestamp;

var util = require('util');

function Console(log) {
	this._log = log;
	this._times = {}
}

Console.prototype.log = function() {
	this._log.info(timestamp(), util.format.apply(this, arguments));
};

Console.prototype.info = Console.prototype.log;

Console.prototype.warn = function() {
	this._log.warn(timestamp(), util.format.apply(this, arguments));
};

Console.prototype.error = function() {
	this._log.error(timestamp(), util.format.apply(this, arguments));
};

Console.prototype.dir = function(object) {
	this._log.info(timestamp(), util.inspect(object));
};

Console.prototype.time = function(label) {
	this._times[label] = Date.now();
};

Console.prototype.timeEnd = function(label) {
	var time = this._times[label];
	if (!time) {
		throw new Error('No such label: ' + label);
	}
	var duration = Date.now() - time;
	this.log('%s: %dms', label, duration);
};

Console.prototype.trace = function(label) {
	// TODO probably can to do this better with V8's debug object once that is
	// exposed.
	var err = new Error;
	err.name = 'Trace';
	err.message = label || '';
	Error.captureStackTrace(err, arguments.callee);
	this.error(err.stack);
};

Console.prototype.assert = function(expression) {
	if (!expression) {
		var arr = Array.prototype.slice.call(arguments, 1);
		require('assert').ok(false, util.format.apply(this, arr));
	}
};

module.exports = Console