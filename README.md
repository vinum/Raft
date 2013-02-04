	__________    _____  ______________________
	\______   \  /  _  \ \_   _____/\__    ___/
	 |       _/ /  /_\  \ |    __)    |    |   
	 |    |   \/    |    \|     \     |    |   
	 |____|_  /\____|__  /\___  /     |____|   
	        \/         \/     \/               
	        
# MAIN [MangoRaft](http://mangoraft.com/)

Raft is a PaaS for node. Raft supports a wide range of functions to run multi-user, multi-app, mulit-infa. A lot of inspiration has come from the great people at nodejitu and haibu.

Raft features

 * App spawn-er
   * dependency support with npm
   * File-system chroot
   * scalble apps
   * methods start, stop, restart
   * viewing app logs, npm logs and more.
   * App load and memory usage
   * multi versions of node 0.6.x+

 * Mulit transport RPC
   * nssocket
   * socket.io
   * More to come

 * Proxy/Balancer
   * Scalable
   * Request stats
   * Bandwidth stats
   * Per app bandwidth stats
   * Per app request stats
 * User Accounts
   * Create, Remove, Update


# CONFIG

Basic config setup. Create a file called config.json in the config folder

	{
		"proxy": {
			"port": 8000
		},
		"timmer": {
			"stats": 2500,
			"proxy": 2500
		},
		"system": {
			"username": "system-suer",
			"password": "password",
			"email": "system-noreply@gmail.com"
		},
		"bucket": {
			"port": 9003,
			"directory": "/path/to/files"
		},
		"db": {
			"mongodb": {
				"host": "localhost",
				"port": 27017,
				"path": "/data/db"
			}
		},
		"transports": {
			"http": {
				"load": false,
				"port": 9000,
				"host": "localhost"
			},
			"socket.io": {
				"load": true,
				"port": 9004,
				"host": "localhost"
			},
			"nssocket": {
				"load": true,
				"port": 9002,
				"host": "localhost"
			}
		},
		"mail": {
			"service": "Gmail",
			"auth": {
				"user": "noreply@gmail.com",
				"pass": "password"
			}
		},
		"domain": "mydomain.com"
	}

##Balancer setup

The blancer will listen on what ever port you spesify in `config.proxy.port`
if you want `https` you can generate the `privatekey.pem` and `certificate.csr` files using the following commands:

	openssl genrsa -out privatekey.pem 1024 
	openssl req -new -key config/privatekey.pem -out config/certrequest.csr 
	openssl x509 -req -in config/certrequest.csr -signkey config/privatekey.pem -out config/certificate.pem


##NPM Install
To install Raft just do the normal `npm install`

##Run The Program
	node raft


##Communication Channels
Raft has been build to run on any communication transports `http, tcp, websocket` Raft uses a common JSON RPC v1 that lays ontop of what ever transports avalible. 
This would be a basic rpc request to list all avalible methods on the server.

	{
		"id": "uuid",
		"params": [],
		"method": "list"
	}
and the result would be

	{
		"list": "function",
		"system.proxy.list": "function",
		"system.proxy.destroy.drone": "function",
		"system.proxy.destroy.app": "function",
		"system.proxy.add.drone": "function",
		"system.proxy.add.app": "function",
		"system.scale.proxy.up": "function",
		"system.scale.proxy.down": "function",
		"system.scale.proxy.count": "function",
		"system.user.confirm": "function",
		"system.user.create": "function",
		"system.user.remove": "function",
		"system.user.list.free": "function",
		"system.user.list.user": "function",
		"system.user.list.system": "function",
		"system.user.list.all": "function",
		"system.list": "function",
		"free.list": "function",
		"user.proxy.stats": "function",
		"user.proxy.list.host": "function",
		"user.package.update": "function",
		"user.package.clean": "function",
		"user.package.restart": "function",
		"user.package.stop": "function",
		"user.package.start": "function",
		"user.package.get": "function",
		"user.package.running": "function",
		"user.env.get": "function",
		"user.env.set": "function",
		"user.test": "function",
		"user.scale.package.count": "function",
		"user.scale.package.up": "function",
		"user.scale.package.down": "function",
		"user.stats.proxy": "function",
		"user.stats.proxy.host": "function",
		"user.stats.user.load": "function",
		"user.stats.package.load": "function",
		"user.stats.uid.load": "function",
		"user.stats": "function",
		"user.logs.tail": "function",
		"user.logs.get": "function",
		"user.user": "function",
		"user.list": "function"
	}
	

