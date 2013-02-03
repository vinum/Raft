var path = require('path');

module.exports = function chrootPlugin(carapace) {
	if (!carapace.chroot) {
		carapace.chroot = function(value, done) {

			try {
				require('daemon').chroot(process.cwd());
			} catch (ex) {
				return done ? done(ex) : null
			}
			//process.execPath = process.execPath.replace(new RegExp("^" + root.replace(/\W/g, "\\$&")), '');

			//
			// Append the request dir as the default
			//

			return done ? done() : null;

		};

	}
};
