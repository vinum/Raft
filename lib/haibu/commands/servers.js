var path = require('path')
var util = require('util')

var haibu = require(path.join(__dirname, '..', '..', 'haibu'));

var cliOptons = [{
	command : "-a, --mongo-path <mongoPath>",
	description : ""
}, {
	command : "-b, --mongo-port <mongoPort>",
	description : ""
}, {
	command : "-c, --mongo-host <mongoHost>",
	description : ""
}, {
	command : "-d, --proxy-port <proxyPort>",
	description : ""
}, {
	command : "-e, --proxy-host <proxyHost>",
	description : ""
}, {
	command : "-f, --drone-port <dronePort>",
	description : ""
}, {
	command : "-g, --drone-host <droneHost>",
	description : ""
}, {
	command : "-h, --api-host <apiHost>",
	description : ""
}, {
	command : "-i, --api-port <apiHost>",
	description : ""
}, {
	command : "-H, --env <env>",
	description : ""
}]

var commands = module.exports = {}

/**
 *
 * @param {Object} options
 */
commands.run = function(options) {

	options = getOptions(options)

	initMongo(options, function() {
		initDrone(options, function(err, server) {
			initProxy(options, function(err, server) {
				haibu.utils.showWelcome([['api', options.droneHost, options.dronePort], ['proxy', options.proxyHost, options.proxyPort]]);
			})
		})
	})
}
commands.run.description = ''

commands.run.options = [].concat(cliOptons)

/**
 *
 * @param {Object} options
 */
commands.api = function(options) {
	options = getOptions(options)
	initMongo(options, function() {
		initApi(options, function(err, server) {
			haibu.utils.showWelcome('api', options.apiHost, options.apiPort);
		})
	})
}
commands.api.description = 'Run the file server. Used for persistent storage'

commands.api.options = [].concat(cliOptons)

/**
 *
 * @param {Object} options
 */
commands.drone = function(options) {
	options = getOptions(options)
	initMongo(options, function() {
		initDrone(options, function(err, server) {
			haibu.utils.showWelcome('drone', options.droneHost, options.dronePort);
		})
	})
}
commands.drone.description = 'Run the file server. Used for persistent storage'

commands.drone.options = [].concat(cliOptons)

/**
 *
 * @param {Object} options
 */
commands.proxy = function(options) {
	options = getOptions(options)
	initMongo(options, function() {
		initProxy(options, function(err, server) {
			haibu.utils.showWelcome('proxy', options.proxyHost, options.proxyPort);
		})
	})
}
commands.proxy.description = 'Run the file server. Used for persistent storage'

commands.proxy.options = [].concat(cliOptons)

function getOptions(options) {
	var _options = {}
	_options.address = options.address || haibu.common.ipAddress()

	var ports = 9000;

	_options.dronePort = options.dronePort || haibu.config.get('drone:port') || ports
	_options.droneHost = options.droneHost || haibu.config.get('drone:host') || _options.address

	_options.proxyPort = options.proxyPort || haibu.config.get('proxy:port') || ++ports
	_options.proxyHost = options.proxyHost || haibu.config.get('proxy:host') || _options.address

	_options.storagePort = options.storagePort || haibu.config.get('storage:port') || ++ports
	_options.storageHost = options.storageHost || haibu.config.get('storage:host') || _options.address

	_options.apiPort = options.apiPort || haibu.config.get('api:port') || ++ports
	_options.apiHost = options.apiHost || haibu.config.get('api:host') || _options.address

	_options.mongoPort = options.mongoPort || haibu.config.get('mongo:port') || 27017
	_options.mongoHost = options.mongoHost || haibu.config.get('mongo:host') || _options.address
	_options.mongoPath = options.mongoPath || haibu.config.get('mongo:path') || '/data/db'

	_options.env = options.env || haibu.config.get('env') || 'development';
	console.log(_options)
	return _options;
}

function initMongo(options, cb) {
	haibu.mongoose.start({
		path : options.mongoPath,
		port : options.mongoPort,
		host : options.mongoHost
	}, cb)
}

function initApi(options, cb) {
	haibu.api.start({
		port : options.apiPort,
		host : options.apiHost
	}, cb)
}

function initDrone(options, cb) {
	haibu.drone.start({
		env : options.env,
		port : options.dronePort,
		host : options.droneHost
	}, cb);
}

function initProxy(options, cb) {
	haibu.proxy.start({
		env : options.env,
		port : options.proxyPort,
		host : options.proxyHost
	}, cb);
}
