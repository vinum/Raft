var Rpc = require('../../../rpc-module')

module.exports = function(carapace) {
	carapace.rpc = function env(a, done) {
		var rpc = new Rpc(function(data) {
			carapace.send({
				cmd : 'rpc',
				data : data
			})
		})
		process.on('message', function(message) {
			if (message.data && message.cmd && message.cmd === 'rpc') {
				rpc.requestEvent(message.data);
			}
		})
		process.rpc = rpc
		done()
	};
};
