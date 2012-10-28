/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');
/**
 * Schema definition
 */

var Users = new Schema({
	username : String,
	fullname : {
		first : String,
		last : String
	},
	email : String,
	confirmed : Boolean,
	last : Date,
	password : String
});
Users.methods.comparePassword = function(candidatePassword, cb) {
	bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
		if (err)
			return cb(err);
		cb(null, isMatch);
	});
}
/**
 * Define model.
 */

module.exports = mongoose.model('Users', Users);

module.exports.find({}).run(function(err, users) {
	console.log(err, users)
})
