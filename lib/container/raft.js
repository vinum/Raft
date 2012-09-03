


module.exports = {};

var net = require('net')

var listen = net.Server.prototype.listen;
var close = net.Server.prototype.close;

net.Server.prototype.listen = function(domain, cb) {
	var self = this
	this._domain = domain
	listen.call(this, function() {
		new raft.mongo.BouncyHosts({
			host : raft.ip,
			port : self.address().port,
			domain : domain,
			appid : env.config.appid,
			workerKey : raft.config.workerKey
		}).save(function() {
			if (cb) {
				cb()
			}
		})
	});
}
net.Server.prototype.close = function(cb) {
	var self = this
	raft.mongo.BouncyHosts.remove({
		host : raft.ip,
		port : self.address().port,
		domain : self._domain,
		appid : env.config.appid
	}, function() {
		close.call(self, cb);
	})
}