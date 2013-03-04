var daemon = require('daemon'),
    path = require('path'),
    fs = require('fs');

module.exports = function chrootPlugin(carapace) {
  if (!carapace.chroot) {
    carapace.chroot = function (value, done) {
      var root = path.resolve(value);
      try {
        daemon.chroot(root);
        process.cwd(root);
      }
      catch (ex) {throw ex; return done ? done(ex) : null }
      
      process.execPath = process.execPath.replace(new RegExp("^"+root.replace(/\W/g,"\\$&")),'');


      return done ? done() : null;
    };

    carapace.on('chroot::root', function () {
      carapace.chroot.apply(this, [].slice.call(arguments, 1));
    });
  }
};