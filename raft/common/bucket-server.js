var express = require('express')
var fs = require('fs')
var path = require('path')
var raft = require('../../raft')

exports.start = function(cb) {
	var server = express.createServer();

	function bucketPath(req) {
		return raft.config.get('bucket:directory') + "/" + req.user.username + "/" + req.params.bucket;
	}


	server.use(function(req, res, next) {
		var bucketKey = req.headers['bucket-key'];
		if (!bucketKey) {
			return next(new Error('bucket-key missing'))
		}
		raft.mongoose.User.testBucketKey(bucketKey, function(err, user) {
			if (err) {
				return next(err)
			}
			req.user = user

			next();
		})
	})

	server.put('/buckets/:bucket/files/:fileName', function(req, res, next) {

		if (!req.params.bucket) {
			return next(new Error('Bad bucket name'))
		}
		fs.exists(bucketPath(req), function(exists) {
			if (exists) {
				var bucket = req.params.bucket
				var fileName = req.params.fileName
				var bpath = bucketPath(req) + '/' + req.params.fileName;

				req.pipe(fs.createWriteStream(bpath));

				req.on("end", function() {
					res.send({
						good : true
					})
				});
			} else {
				next(new Error('Bad bucket name'))
			}
		})
	});

	server.get('/buckets/:bucket/files/:fileName', function(req, res, next) {

		if (!req.params.bucket) {
			return next(new Error('Bad bucket name'))
		}
		fs.exists(bucketPath(req), function(exists) {
			if (exists) {
				fs.exists(bucketPath(req) + '/' + req.params.fileName, function(exists) {
					if (exists) {
						res.download(bucketPath(req) + '/' + req.params.fileName, req.params.fileName);
					} else {
						next(new Error('Bad file name'))
					}
				})
			} else {
				next(new Error('Bad bucket name'))
			}
		})
	});

	server['delete']('/buckets/:bucket/files/:fileName', function(req, res) {
		if (!req.params.bucket) {
			return next(new Error('Bad bucket name'))
		}
		fs.exists(bucketPath(req), function(exists) {
			if (exists) {
				fs.exists(bucketPath(req) + '/' + req.params.fileName, function(exists) {
					if (exists) {
						var bpath = bucketPath(req) + '/' + req.params.fileName;
						fs.unlink(bpath);
						res.send({
							good : true
						});
					} else {
						next(new Error('Bad file name'))
					}
				})
			} else {
				next(new Error('Bad bucket name'))
			}
		})
	});

	server.listen(raft.config.get('bucket:port'));
	cb()

}
