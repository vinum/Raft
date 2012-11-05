$(document).ready(function() {
	pages = {}
	var Authorization = ''

	ejs.open = '{{';
	ejs.close = '}}';
	function inherits(ctor, superCtor) {
		ctor.super_ = superCtor;
		ctor.prototype = Object.create(superCtor.prototype, {
			constructor : {
				value : ctor,
				enumerable : false,
				writable : true,
				configurable : true
			}
		});
	}

	//
	// ### function Client (options)
	// #### @options {Object} Options to use for this instance.
	// Constructor function for the Client to the haibu API.
	//
	var Client = function(options) {
		this.options = options || {};

		if ( typeof this.options.get !== 'function') {
			this.options.get = function(key) {
				return this[key];
			};
		}

		this.config = {
			host : options.host || 'api.mangoraft',
			port : options.port || 80,
			Authorization : options.authorization ? options.authorization : options.username ? "Basic " + $.base64.encode(options.username + ":" + options.password) : false
		};
	};

	Client.prototype.failCodes = {
		400 : 'Bad Request',
		401 : 'Not authorized',
		403 : 'Forbidden',
		404 : 'Item not found',
		500 : 'Internal Server Error'
	};

	Client.prototype.successCodes = {
		200 : 'OK',
		201 : 'Created'
	};

	//
	// ### @remoteUri {string}
	// Full URI for the remote Haibu server this client
	// is configured to request against.
	//
	Client.prototype.__defineGetter__('remoteUri', function() {
		return 'http://' + this.config.host + ':' + this.config.port;
	});

	//
	// ### @private _request (method, uri, [body], callback, success)
	// #### @options {Object} Outgoing request options.
	// #### @callback {function} Continuation to short-circuit to if request is unsuccessful.
	// #### @success {function} Continuation to call if the request is successful
	// Core method for making requests against the haibu Drone API. Flexible with respect
	// to continuation passing given success and callback.
	//
	Client.prototype._request = function(options, callback, success) {
		var self = this;

		if ( typeof options === 'string') {
			options = {
				path : options
			};
		}

		options.method = options.method || 'GET';
		options.uri = this.remoteUri + options.path;
		options.headers = options.headers || {};
		options.headers['content-type'] = options.headers['content-type'] || 'application/json';
		options.timeout = 8 * 60 * 1000;

		if (options.headers['content-type'] === 'application/json' && options.body) {
			options.body = JSON.stringify(options.body);
		}
		if (options.auth) {
			options.headers['Authorization'] = this.config.Authorization;
		}

		$.ajax({
			type : options.method,
			url : options.uri,
			headers : options.headers
		}).done(function(data) {
			success(null, data)
		}).error(function(data, message) {
			console.log(console.log(data.responseText))
			var err = JSON.parse(data.responseText)

			callback(err)
		});

	};

	//
	// ### function Drone (options)
	// #### @options {Object} Options to use for this instance.
	// Constructor function for the Client to the Haibu server.
	//
	var Application = function(options) {
		Client.call(this, options);
	};
	inherits(Application, Client);

	//
	// ### function get (name, callback)
	// #### @name {string} name of the application to get from the Haibu server.
	// #### @callback {function} Continuation to pass control back to when complete.
	// Gets the data about all the drones for the app with the specified `name`
	// on the remote Haibu server.
	//
	Application.prototype.test = function(callback) {
		this._request({
			path : '/application',
			auth : true
		}, callback, function(res, result) {
			callback(null, result);
		});
	};
	//
	// ### function get (name, callback)
	// #### @name {string} name of the application to get from the Haibu server.
	// #### @callback {function} Continuation to pass control back to when complete.
	// Gets the data about all the drones for the app with the specified `name`
	// on the remote Haibu server.
	//
	Application.prototype.running = function(callback) {
		this._request({
			path : '/drones/running',
			auth : true,
			method : 'GET'
		}, callback, function(res, result) {
			callback(null, result);
		});
	};
	//
	// ### function get (name, callback)
	// #### @name {string} name of the application to get from the Haibu server.
	// #### @callback {function} Continuation to pass control back to when complete.
	// Gets the data about all the drones for the app with the specified `name`
	// on the remote Haibu server.
	//
	Application.prototype.get = function(app, callback) {
		this._request({
			path : '/drones/' + app.name + '/get',
			auth : true,
			method : 'GET'
		}, callback, function(res, result) {
			callback(null, result);
		});
	};
	//
	// ### function get (name, callback)
	// #### @name {string} name of the application to get from the Haibu server.
	// #### @callback {function} Continuation to pass control back to when complete.
	// Gets the data about all the drones for the app with the specified `name`
	// on the remote Haibu server.
	//
	Application.prototype.start = function(app, callback) {
		this._request({
			path : '/drones/' + app.name + '/start',
			auth : true,
			method : 'POST',
			body : {
				start : app
			}
		}, callback, function(res, result) {
			callback(null, result);
		});
	};
	//
	// ### function get (name, callback)
	// #### @name {string} name of the application to get from the Haibu server.
	// #### @callback {function} Continuation to pass control back to when complete.
	// Gets the data about all the drones for the app with the specified `name`
	// on the remote Haibu server.
	//
	Application.prototype.stop = function(name, callback) {
		this._request({
			path : '/drones/' + name + '/stop',
			auth : true,
			method : 'POST',
			body : {
				stop : {
					name : name
				}
			}
		}, callback, function(res, result) {
			callback(null, result);
		});
	};
	//
	// ### function get (name, callback)
	// #### @name {string} name of the application to get from the Haibu server.
	// #### @callback {function} Continuation to pass control back to when complete.
	// Gets the data about all the drones for the app with the specified `name`
	// on the remote Haibu server.
	//
	Application.prototype.restart = function(name, callback) {
		this._request({
			path : '/drones/' + name + '/restart',
			auth : true,
			method : 'POST',
			body : {
				restart : {
					name : name
				}
			}
		}, callback, function(res, result) {
			callback(null, result);
		});
	};
	//
	// ### function get (name, callback)
	// #### @name {string} name of the application to get from the Haibu server.
	// #### @callback {function} Continuation to pass control back to when complete.
	// Gets the data about all the drones for the app with the specified `name`
	// on the remote Haibu server.
	//
	Application.prototype.clean = function(app, callback) {
		this._request({
			path : '/drones/' + app.name + '/clean',
			auth : true,
			method : 'POST',
			body : app
		}, callback, function(res, result) {
			callback(null, result);
		});
	};

	//
	// ### function get (name, callback)
	// #### @name {string} name of the application to get from the Haibu server.
	// #### @callback {function} Continuation to pass control back to when complete.
	// Gets the data about all the drones for the app with the specified `name`
	// on the remote Haibu server.
	//
	Application.prototype.stats = function(app, callback) {
		this._request({
			path : '/drones/' + app.name + '/stats',
			auth : true,
			method : 'GET'
		}, callback, function(res, result) {
			callback(null, result);
		});
	};

	function Pages(options) {
		this.page = options.page
		pages[options.page] = this
		this.compile = function() {
		}
	}


	Pages.prototype.render = function(data) {
		var self = this
		$('#wrapper').append(this.compile(data || {}))
		$('#' + this.page).hide()
		$('.topbar .nav-main').append('<li><a class="btn-' + this.page + '" href="#">' + this.page + '</a></li>').find('.btn-' + this.page)
		$('.btn-' + this.page).click(this.change.bind(this))
	}

	Pages.prototype.init = function(cb) {
		console.log("/admin/view/" + this.page + ".html")
		var self = this
		$.ajax({
			url : "/admin/view/" + this.page + ".html",
			dataType : 'text'
		}).success(function(data) {
			if ( typeof data === 'string') {
				self.compile = ejs.compile(data, {});
			} else {

				console.log($(data))
			}
			cb()
		});
	}

	Pages.prototype.change = function() {
		$('#' + Object.keys(pages).join(',#')).hide()
		$('#' + this.page).show()
	}

	Pages.prototype.on = function(event, el, callback) {
		$('#' + this.page).on(event, el, callback)
	}

	Pages.prototype.el = function(el) {
		return $('#' + this.page + ' ' + el)
	}

	Pages.prototype.remove = function() {
		delete pages[this.page]
		$('.btn-' + this.page).remove()
		$('#' + this.page).remove()
	};
	var Site = function() {
		this.Authorization = localStorage.getItem('Authorization') || ''
		this.api = {}
		if (this.Authorization === '') {

			this.login()
		} else {
			var self = this
			self.api.Application = new Application({
				host : 'api.mangoraft.com',
				port : 80,
				authorization : this.Authorization
			})
			self.appPage()
		}
	}
	Site.prototype.auth = function(username, password, cb) {
		var self = this;
		$.ajax({
			type : "POST",
			url : "/user/" + username + '/test',
			headers : {
				Authorization : $.base64.encode(username + ':' + password)
			}
		}).done(function(data) {
			self.Authorization = $.base64.encode(username + ':' + password)
			cb()
		}).error(function(data, message) {
			console.log(console.log(arguments))
			cb(new Error(message))
		});
	}
	/**
	 *
	 *
	 */

	Site.prototype.homePage = function() {
		var self = this
		var page = new this.Pages({
			page : 'home'
		})
		page.init(function() {
			page.render()
			page.change()
			self.appPage()
		})
	}
	var fuzzy = function(time, local) {

		(!local) && ( local = Date.now());

		if ( typeof time !== 'number' || typeof local !== 'number') {
			return;
		}

		var offset = Math.abs((local - time) / 1000), span = [], MINUTE = 60, HOUR = 3600, DAY = 86400, WEEK = 604800, MONTH = 2629744, YEAR = 31556926;
		DECADE = 315569260;

		if (offset <= MINUTE)
			span = ['', 'moments'];
		else if (offset < (MINUTE * 60))
			span = [Math.round(Math.abs(offset / MINUTE)), 'min'];
		else if (offset < (HOUR * 24))
			span = [Math.round(Math.abs(offset / HOUR)), 'hr'];
		else if (offset < (DAY * 7))
			span = [Math.round(Math.abs(offset / DAY)), 'day'];
		else if (offset < (WEEK * 52))
			span = [Math.round(Math.abs(offset / WEEK)), 'week'];
		else if (offset < (YEAR * 10))
			span = [Math.round(Math.abs(offset / YEAR)), 'year'];
		else if (offset < (DECADE * 100))
			span = [Math.round(Math.abs(offset / DECADE)), 'decade'];
		else
			span = ['', 'a long time'];

		span[1] += (span[0] === 0 || span[0] > 1) ? 's' : '';
		span = span.join(' ');

		return (time <= local) ? span + ' ago' : 'in ' + span;
	};
	Site.prototype.dronesPage = function(drones) {
		var self = this

		if (this._dronesPage) {
			this._dronesPage.remove()
			return this._dronesPage.render({
				drones : drones
			})

		}

		var page = this._dronesPage = new this.Pages({
			page : 'drones'
		})
		page.init(function() {
			for (var i = 0; i < drones.length; i++) {
				drones[i].ctime = fuzzy(drones[i].ctime)
				console.log(drones[i].ctime)
			};
			page.render({
				drones : drones
			})
		})
	}
	Site.prototype.appPage = function() {
		var self = this
		var page = new this.Pages({
			page : 'apps'
		})
		page.init(function() {
			self.api.Application.running(function(err, result) {

				page.render(result)
			})
		})
	}

	Site.prototype.login = function() {
		var self = this
		var page = new this.Pages({
			page : 'login'
		})
		page.init(function() {
			page.render()

			var el = page.el('#sign-in-form')

			var fn = function() {
				var el = page.el('#sign-in-form')
				var username = el.find('#username_in').val()
				var password = el.find('#pwd_in').val()
				self.auth(username, password, function(err) {
					if (err) {
						alert('Bad auth')
					} else {
						if (el.find('#remember_in').attr('checked', 'checked')) {
							localStorage.setItem('Authorization', $.base64.encode(username + ':' + password))
						}

						self.api.Application = new Application({
							host : 'api.manograft.com',
							port : 80,
							username : username,
							password : password
						})

						self.homePage()
						page.remove()
					}
				})
				return false
			}

			el.submit(fn)
			el.find('#submit_in').click(fn)
			page.change()
		})
	}
	/**
	 *
	 *
	 *
	 *
	 */
	Site.prototype.Pages = Pages
	Site.prototype.Application = Application
	try {
		site = new Site()

	} catch(err) {
		alert(err.stack)
	}
	/***
	 *
	 *
	 *
	 *
	 */

})
