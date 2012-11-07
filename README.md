	__________    _____  ______________________
	\______   \  /  _  \ \_   _____/\__    ___/
	 |       _/ /  /_\  \ |    __)    |    |   
	 |    |   \/    |    \|     \     |    |   
	 |____|_  /\____|__  /\___  /     |____|   
	        \/         \/     \/               
	        
# MAIN

[MangoRaft](http://mangoraft.com/)


# CONFIG

Basic config setup. Create a file called config.json in the config folder

	{
		"proxy":{
			"port":80
		},
		"db":{
			"mongodb":{
				"host":"localhost",
				"port":27017,
				"path":"/data/db"
			}
		},
		"domain":"mangoraft.com"
	}


# HOW TO RUN

OKEY so how to start it.

It will be..
	node bin/raft
but is
	node lib/raft


# WHAT IS IT?

Raft is an open source project to create a Node.JS PaaS host. All code is written in javascript so it can run on almost any platform. Raft has been developed on linux platform’s Debian/Red Hat.

 * Raft uses haibu from nodejitsu to spawn the hosted node apps. 
 * Management for create updating user accounts. 
 * Full REST support.
 * Uses MongoDB as the database
 * Uses bouncy fro substack to proxy requests to each drone.
