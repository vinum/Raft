var daemon = require('daemon'), path = require('path');

module.exports = function chrootPlugin(carapace) {
	if (!carapace.chroot) {
		carapace.chroot = function(value, done) {
			var root = path.resolve(value);
			
			
			
			daemon.chroot(root);
			process.chdir('/');
			process.execPath = process.execPath.replace(new RegExp("^" + root.replace(/\W/g, "\\$&")), '');
			//
			// Append the request dir as the default
			//
			//carapace.cli.defaultOptions['chroot'].default = value;
			//carapace.cli.defaultOptions['chroot'].required = true;

			return done ? done() : null;
		};

		carapace.on('chroot::root', function() {
			carapace.chroot.apply(this, [].slice.call(arguments, 1));
		});
	}
};
