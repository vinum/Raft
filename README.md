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
		"proxy": {
			"port": 80
		},
		"system": {
			"username": "system-user",
			"password": "password",
			"email": "system-noreply@gmail.com"
		},
		"db": {
			"mongodb": {
				"host": "localhost",
				"port": 27017,
				"path": "/data/db"
			}
		},
		"mail": {
			"service": "Gmail",
			"auth": {
				"user": "noreply@gmail.com",
				"pass": "password"
			}
		},
		"domain": "your-domain.com"
	}


if you want https support.

	cd ./config
	openssl genrsa -out privatekey.pem 1024 
	openssl req -new -key privatekey.pem -out certificate.csr
	openssl x509 -req -in certificate.csr -signkey privatekey.pem -out certificate.csr


# HOW TO RUN

OKEY so how to start it.

It will be..

	node bin/cli services

but is

	node lib/raft



# WHAT IS IT?

Raft is an open source project to create a Node.JS PaaS host. All code is written in javascript so it can run on almost any platform. Raft has been developed on a linux platform’s Debian/Red Hat.

 * Raft uses haibu from nodejitsu to spawn the hosted node apps. 
 * Management for create updating user accounts. 
 * Full REST support.
 * Uses MongoDB as the database
 * Uses bouncy fro substack to proxy requests to each drone.


# USAGE

Once you have started raft you can now interact with raft through the REST HTTP API. The domain for the api is http://api.mangoraft.com replacing mangoraft.com with you domain.


# Base URL:
    http://api.mangoraft.com

<table class="bordered-table zebra-striped">
   <tr>
      <td><b>/user</b></td>
      <td>AUTH Required</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
   </tr>
   <tr>
      <td>&nbsp;</td>
      <td>No</td>
      <td>POST</td>
      <td><b>/:username</b> - Create a new user.
      </td>
   </tr>
   <tr>
      <td>&nbsp;</td>
      <td>Yes</td>
      <td>PUT</td>
      <td><b>/</b> - update user info.
      </td>
   </tr>
   <tr>
      <td>&nbsp;</td>
      <td>Yes</td>
      <td>GET</td>
      <td><b>/</b> - Get user info
      </td>
   </tr>
   <tr>
      <td>&nbsp;</td>
      <td>No</td>
      <td>GET</td>
      <td><b>/:code/confirm</b> - The code is sent in an email to confirm it.
      </td>
   </tr>
   <tr>
      <td>&nbsp;</td>
      <td>Yes</td>
      <td>POST</td>
      <td><b>/test</b> - Test the user accounts auth.
      </td>
   </tr>
   
   <tr>
      <td><b>/drones</b></td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
      <td>&nbsp;</td>
   </tr>
   <tr>
      <td>&nbsp;</td>
      <td>Yes</td>
      <td>GET</td>
      <td><b>/running</b> - Get a list of running drones.
      </td>
   </tr>
</table>

