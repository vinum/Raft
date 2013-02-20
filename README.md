	__________    _____  ______________________
	\______   \  /  _  \ \_   _____/\__    ___/
	 |       _/ /  /_\  \ |    __)    |    |   
	 |    |   \/    |    \|     \     |    |   
	 |____|_  /\____|__  /\___  /     |____|   
	        \/         \/     \/               
	        
# MAIN [MangoRaft](http://mangoraft.com/)

#NOTE
As we speak this is the working branch. Dont use this branch will release


Raft is a PaaS for node. Raft supports a wide range of functions to run multi-user, multi-app, mulit-infa. 
A lot of inspiration has come from the great people at nodejitu, nodester and AppFog.

Raft features

 * App spawn-er
   * Dependency support with npm
   * File-system `chroot`
   * Scalable
   * Methods start, stop, restart
   * Viewing `app` logs, `npm` logs and more.
   * App load and memory usage
   * Multi versions of `node` 0.6.x`+`
 * Mulit transport RPC
   * nssocket
   * socket.io
   * More to come
 * Proxy/Balancer
   * Scalable
   * Request stats
   * Bandwidth stats
   * Per app `bandwidth` stats
   * Per app `request` stats
 * User Accounts
   * `Create`, `Remove`, `Update`



##Install
To install just git clone.
```
	git clone https://github.com/MangoRaft/Raft.git
	cd Raft
```

# CONFIG

Basic config setup. Create a file called config.json in the config folder
```json
	{
		"proxy": {
			"port": 8000
		},
		"timmer": {
			"stats": 2500,
			"proxy": 2500
		},
		"system": {
			"username": "admin",
			"password": "password",
			"email": "system-noreply@gmail.com"
		},
		"nodetime": {
			"accountKey": "your-node-time-key",
			"appName": "raft"
		},
		"db": {
			"mongodb": {
				"host": "localhost",
				"port": 27017,
				"path": "/data/db"
			}
		},
		"harvester": {
			"server": {
				"host": "you-log-harvester.com",
				"port": 8998
			},
			"log_file_paths": {
				"logio_harvester": "/var/log/log.io/harvester.log"
			},
			"instance_name": ""
		},
		"transports": {
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
		"domain": "yoursite.com"
	}
```
##Balancer setup

The blancer will listen on what ever port you spesify in `config.proxy.port`
if you want `https` you can generate the `privatekey.pem` and `certificate.csr` files using the following commands:
```
	openssl genrsa -out privatekey.pem 1024 
	openssl req -new -key config/privatekey.pem -out config/certrequest.csr 
	openssl x509 -req -in config/certrequest.csr -signkey config/privatekey.pem -out config/certificate.pem
```

##NPM Install
To install Raft just do the normal `npm install`

##Run The Program
	sudo node raft
Note: Needs sudo for the chrroting of the apps.

##Communication Channels
Raft has been build to run on any communication transports `http, tcp, websocket` Raft uses a common JSON RPC v1 that lays ontop of what ever transports avalible. 
This would be a basic rpc request to list all avalible methods on the server.
```json
	{
		"id": "uuid",
		"params": [],
		"method": "list"
	}
```	
The result would be

	{
		"id": "uuid",
		"error": null,
		"result": {
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
	}




#RPC Methods

Package we will use

	var package = {
	    repository: { type: 'git', url: 'https://github.com/FLYBYME/node-tracker.git' },
	    name: 'node-bittorrent-tracker',
	    license: 'BSD',
	    domain: '192.168.1.101',
	    scripts: { start: 'lib/tracker.js' },
	    description: 'Run node example.js to start the tracker.',
	    main: 'lib/tracker.js',
	    author: '',
	    version: '0.0.0'
	}

##package.start

###Request
	{
		"id": "uuid",
		"params": [package],
		"method": "user.package.start"
	}
###Result
	{
	    drone: {
	        port: 8080,
	        uid: 'c50a89a9',
	        stdout: [],
	        npmput: '',
	        name: 'node-bittorrent-tracker',
	        stderr: [],
	        status: 'RUNNING',
	        ctime: 1360023226252,
	        user: 'bob',
	        host: '192.168.1.101',
	        stats: {
	            pcpu: '0.0',
	            time: '00:00:00',
	            etime: '00:00',
	            vsz: '34020',
	            user: 'root',
	            rssize: '6088',
	            comm: 'node'
	        }
	    }
	}

##package.get

###Request
	{
		"id": "uuid",
		"params": [],
		"method": "user.package.running"
	}
###Result
	{
	    running: [
	        {
	            port: 8080,
	            host2: '192.168.1.101',
	            raftPort: 8080,
	            uid: 'c50a89a9',
	            name: 'node-bittorrent-tracker',
	            domain: '192.168.1.101',
	            version: '0.0.0',
	            ctime: 1360023226252,
	            user: 'bob',
	            host: '192.168.1.101'
	        }
	    ]
	}

##package.get

###Request
	{
		"id": "uuid",
		"params": [{ name : package.name }],
		"method": "user.package.get"
	}
###Result
	{
	    app: {
	        version: '0.0.0',
	        license: 'BSD',
	        author: '',
	        dependencies: {},
	        main: 'lib/tracker.js',
	        scripts: { start: 'lib/tracker.js' },
	        nameClean: 'node-bittorrent-tracker-27e3d8ff73e3d45f657015f4431bda3ea1214e8f',
	        _id: 'node-bittorrent-tracker',
	        name: 'node-bittorrent-tracker',
	        user: 'bob',
	        versionCode: 1,
	        directories: { home: 'node-tracker' },
	        description: 'Run node example.js to start the tracker.',
	        domain: '192.168.1.101'
	    },
	    drones: [
	        {
	            port: 8080,
	            uid: 'c50a89a9',
	            stdout: [],
	            npmput: '',
	            name: 'node-bittorrent-tracker',
	            stderr: [],
	            status: 'RUNNING',
	            ctime: 1360023226252,
	            user: 'bob',
	            host: '192.168.1.101',
	            stats: {
	                pcpu: '0.0',
	                time: '00:00:00',
	                etime: '07:15',
	                vsz: '39016',
	                user: 'root',
	                rssize: '8540',
	                comm: 'node'
	            }
	        }
	    ]
	}


##package.clean

###Request
	{
		"id": "uuid",
		"params": [{ name : package.name }],
		"method": "user.package.clean"
	}
###Result
	{ clean: true }



##scale.package.count

###Request
	{
		"id": "uuid",
		"params": [{ name : package.name }],
		"method": "user.scale.package.count"
	}
###Result
	{ count : 1 }


##scale.package.up

###Request
	{
		"id": "uuid",
		"params": [ package ],
		"method": "user.scale.package.up"
	}
###Result
	{ scale: true, before: 1, count: 2 }


##scale.package.down

###Request
	{
		"id": "uuid",
		"params": [ package ],
		"method": "user.scale.package.down"
	}
###Result
	{ scale: true, before: 2, count: 1 }


##env.set

###Request
	{
		"id": "uuid",
		"params": [ 'MY_GRATE_VAL', 'say word', package.name ],
		"method": "user.env.set"
	}
###Result
	{ set: true }


##env.get

###Request
	{
		"id": "uuid",
		"params": [ 'MY_GRATE_VAL', package.name ],
		"method": "user.env.get"
	}
###Result
	{
		"drones": {
			"user": "bob",
			"name": "node-bittorrent-tracker",
			"key": "MY_GRATE_VAL",
			"value": "say word"
		}
	}





##LICENSE
	Copyright (c) 2011-2013 MangoRaft.
	
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:
	
	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.
	
	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
