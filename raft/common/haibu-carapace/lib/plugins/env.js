module.exports = function(carapace) {
	carapace.env = function env(a, done) {
		process.rpc.expose('env', {
			get : function(key) {
				this.send({
					env : process.env,
					val : process.env[key]
				})
			},
			set : function(key, val) {
				process.env[key] = val
				this.send({
					env : process.env
				})
			}
		})

		done()
	};
};
