/**
 *
 *
 */

var Exposed = module.exports = function(data, id, cb) {
	//
	this.id = data.id;
	this.method = data.method;
	this.params = data.params;
	this.from = data.from;
	this.callBack = cb;

	//
	this.result = {};
	this.err = {};
	this.hasSent = false;

};

Exposed.prototype.send = Exposed.prototype.end = function(data) {
	if (this.hasSent) {
		throw new Error('should not sent twice.');
	}

	if ( typeof data === 'object') {
		for (var key in data) {
			this.set(key, data[key]);
		}
	} else if (arguments.length >= 1) {
		this.set(arguments[0], arguments[1]);
	}
	if (this.err['code'])
		this.callBack({
			to : this.from,
			id : this.id,
			result : this.result,
			error : this.err['code'] ? this.err : null

		});
	else {
		this.callBack(null, {
			to : this.from,
			id : this.id,
			result : this.result,
			error : this.err['code'] ? this.err : null

		});
	}
	this.hasSent = true;
	return this;
};
Exposed.prototype.add = Exposed.prototype.set = function(key, val) {
	this.result[key] = val;
	return this;
};
Exposed.prototype.broadcast = function(method, parmas, callBack) {
	this.peer.servent.broadcastInvoke(method, parmas, callBack);
	return this;
};
Exposed.prototype.get = function(key) {
	return this.result[key];
};
Exposed.prototype.error = function(err, code) {

	if (err.stack) {

		this.err = {
			message : err.stack,
			code : code || 1000,
			method : this.method,
			params : this.params
		};
	} else {

		this.err = {
			message : err,
			code : code || 1000,
			method : this.method,
			params : this.params
		};
	}

	return this.send();
};
