	__________    _____  ______________________
	\______   \  /  _  \ \_   _____/\__    ___/
	 |       _/ /  /_\  \ |    __)    |    |   
	 |    |   \/    |    \|     \     |    |   
	 |____|_  /\____|__  /\___  /     |____|   
	        \/         \/     \/               
	


#Raft - Open-Source PaaS
The idea behind raft and mangoraft.com is to give the node community a fully-featured Platform as a Service (PaaS). 
Raft gives you a provision of CPU, memory, disk space and bandwidth. From this the sky's the limit in what can be build. Sites and services ranging from the weekend projects to large scale production sites are able to take advantage of raft. Full instances of a UNIX system is available from with in the running allocation. Each application is run in its own chroot jail. Keeping all other applications sharing the system safe.
##Convenient 
Deploy your application in under 30 seconds. Fast deploys mean even more time to build and debug your applications.
##Scalable 
Run more than one instance of your application. A global footprint is no problem, run your application independent to any LaaS providers or even run it on your own hardware.
##Distributed
 To take advantage of today's cloud provider. raft has been built to run on more then one server that is running in more than one data center. Raft uses a distributed event system allowing you to run more than one instance of each service. So if you wanted to host tens of thousands of your favorite express app, raft can do it. 
##Open-source
All the code is open source. If you would like to run your own copy of raft you can. Even better then the git repo is that you can install it all with one command. "npm install raft-hooks -g" this will install a program called hooks. Take a look at "hooks -h" for help on how to use the client.
## Status
Lots of work is been done on Raft. If you would like to know more please drop us a line!


# Installation

Install raft

    $ npm install raft

Install raft-hooks

    $ sudo npm install raft-hooks -g
## Core
The core features of raft are a set of hooks that allow ease of adding more Feature latter one. With a distributed process module adding and removing part is no problem

| Feature  | Status | Comment |
| ------------- | ------------- | ------------- |
| Distributed Event System    | complete    | The system used to distribute event to all processes    |
| Router    | complete    | The router is in working state. Over all seems to work well.    |
| Spawner    | complete    | Working copy of the spawn/spawner. All feature are in place    |
| Logger    | complete    | Full package logging in real-time.    |
| Stats    | complete    | Load and memory usage for each spawn.    |
| Deploy/SnapShot Server    | incomplete    | Deploy server creating each package snapshot.    |
| API Server    | incomplete    | REST api server for managing user packages    |

## Hooks
Raft-hooks are a set of command line programs for running raft.

| Command  | Status | Comment |
| ------------- | ------------- | ------------- |
| `hooks hub`    | complete    | The main event server    |
| `hooks router`    | complete    | start the router process    |
| `hooks spawn`    | complete    | start the spawn process    |
| `hooks logger`    | complete    | start the logger process    |

## Cli
The comamnd-line program for managing packages hosted by raft

| Command  | Status | Comment |
| ------------- | ------------- | ------------- |
| `hooks hub`    | incomplete    | Deploy to raft    |

## Addons
Other hooks that could be added on latter. Any action could be an addons to the system.

| Addons  | Status | Comment |
| ------------- | ------------- | ------------- |
| WebUI    | incomplete    | Webui will be the web console to raft. Allowing users to manage their app from the web    |
| Emailer    | incomplete    | Email addon for each package    |
| ffmpeg    | incomplete    | Video encoding service / Image resizeing    |

The raft services are a set of hooks that make up the event system. It consists of 2 modules that are on npm. The first is "raft" and the second is "raft-hooks". Raft is the core components of the system as a whole. Raft-hooks is a command program to run the event system.
#The hub
The hub service is the event distributor for all other services. The hub service is the first service that must start. The idea behind the hub to to start it and forget it. You will never have to interact with the hub once it has started.
#Router 
The Router is used to proxy http and web-sockets to the corresponding application. You can run more than one instance of the Router. The idea is that the Router sit in front all other services and applications and proxy from a URL to host:port. If you where to query test.mangoraft.com your request would first go the the Router then be piped to the next application port. The Router does not have to be on the same server your applications, as long as the two processes can connect to one another thats all it take. To deal with many hundreds of thousands of request you may run 5, 10, 25+ instances of the Router. So that would be 25+ servers running an instance each of the balanRoutercer. The Router uses the native node.js cluster API to take full advantage of multicore processors.
#Spawn
The spawn is the bulk of the "hosting" system for raft. It controls the starting and stopping of the application's. The spawn uses npm to install all needed dependences. Once the dependences are install the spawn will start up your application. Every application is built off the most basic package.json. all that so required is the app name, domain, dependences, start script and version. The package would be the same as npm's package for a module just that it does not need a user value. You can run more than one instance of each application.  This allows for a true scalable node.js environment. The spawn is capable of running your application with versions of node "0.4.x>=". For every server you want to have hosting applications you need the spawn service running. You can have endless count of servers running the spawn.
#Snapshot
The snapshot is all about keeping track of different version of your applications. Every time you push or deploy to raft is creates a snapshot. If ever you need to revert to an earlier version of your application you would do so with the snapshots.
#Logger
The logger is used to keep track of all application stdout, stderr and npu output's. You can watch logs in real-time giving you a better debugging experience. By the end of the spawns life the stdout and stderr will be stored in the storage object.

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
