module.exports = {}

module.exports.auth = function(user, pass, cb) {
	if (user !== 'admin') {
		return cb(new Error('bad user name'))
	}
	if (pass !== 'pass') {
		return cb(new Error('bad password'))
	}

	cb(null, {
		username : user,
		privilege : 'system'
	})
}

module.exports.create = function() {

}

module.exports.test = function() {

}
