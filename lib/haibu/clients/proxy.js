var Client = require('./client')
var util = require('util');

//
// ### function Proxy (options)
// #### @options {Object} Options to use for this instance.
// Constructor function for the Client to the Haibu server.
//
var Proxy = module.exports = function(options) {
	Client.call(this, options);
};

util.inherits(Proxy, Client);

Proxy.prototype.addApp = function(app, callback) {

	console.log('addApp')
	this._request({
		method : 'POST',
		path : '/proxy/add-app',
		body : app
	}, callback, callback);
};

Proxy.prototype.destroyApp = function(app, callback) {
	this._request({
		method : 'POST',
		path : '/proxy/destroy-app',
		body : app
	}, callback, callback);
};
Proxy.prototype.addDrone = function(drone, app, callback) {
	this._request({
		method : 'POST',
		path : '/proxy/add-drone',
		body : {
			drone : drone,
			app : app
		}
	}, callback, callback);
};
Proxy.prototype.destroyDrone = function(hash, app, callback) {
	this._request({
		method : 'POST',
		path : '/proxy/destroy-drone',
		body : {
			hash : hash,
			app : app
		}
	}, callback, callback);
};

Proxy.prototype.list = function(callback) {
	this._request({
		method : 'GET',
		path : '/proxy/list'
	}, callback, callback);
};

Proxy.prototype.listHost = function(host, callback) {
	this._request({
		method : 'GET',
		path : '/proxy/list/' + host
	}, callback, callback);
};
Proxy.prototype.status = function(callback) {
	this._request({
		method : 'GET',
		path : '/proxy/status'
	}, callback, callback);
};
