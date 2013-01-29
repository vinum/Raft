var raft = require('../../../../raft');

exports.run = function(rpc) {
	rpc.expose('proxy.list.host', function listHosts(host) {
		this.send({
			host : raft.balancer.balancer.domains[host]
		}, 200);
	})
};
