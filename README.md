	__________    _____  ______________________
	\______   \  /  _  \ \_   _____/\__    ___/
	 |       _/ /  /_\  \ |    __)    |    |   
	 |    |   \/    |    \|     \     |    |   
	 |____|_  /\____|__  /\___  /     |____|   
	        \/         \/     \/               
	


#Raft
The idea behind raft is to give the node community a fully-featured Platform as a Service (PaaS) for inhouse work. 
Raft gives you a provision of CPU, memory, disk space and bandwidth. From this the sky's the limit in what can be build. 
Sites and services ranging from the weekend projects to large scale production sites are able to take advantage of raft. 


## NOTES

## Configure

```json

	{
		"router": {
			"http": {
				"port": 8000
			}
		},
		"nats": {
			"user": "3005",
			"pass": "3005",
			"port": 3005,
			"host": "localhost"
		},
		"logs": {
			"log": {
				"port": 3000,
				"host": "localhost"
			},
			"view": {
				"port": 3001,
				"host": "localhost"
			}
		},
		"dea": {
			"base_dir": "/home/fedora/raft/development/dea/raft",
			"local_route": "127.0.0.1",
			"filer_port": 12345,
			"intervals": {
				"heartbeat": 10,
				"advertise": 5
			},
			"logging": {
				"level": "debug"
			},
			"multi_tenant": true,
			"max_memory": 4096,
			"secure": false,
			"enforce_ulimit": false,
			"prod": false,
			"force_http_sharing": true,
			"runtimes": {
				"node08": {
					"executable": "node",
					"version": "0.8.2",
					"version_flag": "-v",
					"environment": {
						"debug_env": {
							"run": {
								"NODE_ARGS": "--debug=$VCAP_DEBUG_PORT",
								"suspend": {
									"NODE_ARGS": "--debug-brk=$VCAP_DEBUG_PORT"
								}
							}
						}
					}
				}
			}
		}
	}
```


## Core

| Feature  | Status | Comment |
| ------------- | ------------- | ------------- |
| [NATS](https://github.com/MangoRaft/Nats)   | complete    | Using Ruby gem nats thanks!    |
| [Router](https://github.com/MangoRaft/Router)    | broken    | This is an older version of the rotuer. Uses bouncy.    |
| [route-machine](https://github.com/MangoRaft/route-machine)    | working    | This is some what like the router from vcap. Uses http-proxy.    |
| [Spawn](https://github.com/MangoRaft/Spawn)    | working    | Working copy of the `spawn@0.0.2`. Most feature are in place    |
| [Logger](https://github.com/MangoRaft/Logger)    | working    | Full package logging in real-time with server, client and logger.    |
| [Stats](https://github.com/MangoRaft/Spawn-Stats)    | working    | Load and memory usage for each spawn.    |
| [SnapShot](https://github.com/MangoRaft/SnapShot)    | working    | Untar's a tar fine and installs all npm stuff.    |
| Stage    | incomplete    | Deploy server creating each package snapshot.    |
| API Server    | incomplete    | REST api server for managing user packages    |



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
