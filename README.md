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

## Core
The core features of raft are a set of hooks that allow ease of adding more Feature latter one. With a distributed process module adding and removing part is no problem

| Feature  | Status | Comment |
| ------------- | ------------- | ------------- |
| Distributed Event System    | incomplete    | The system used to distribute event to all processes    |
| [Router](https://github.com/MangoRaft/Router)    | incomplete    | The router is in working state. Over all seems to work well.    |
| Spawner    | incomplete    | Working copy of the spawn/spawner. All feature are in place    |
| [Logger](https://github.com/MangoRaft/Logger)    | incomplete    | Full package logging in real-time.    |
| [Stats](https://github.com/MangoRaft/Spawn-Stats)    | incomplete    | Load and memory usage for each spawn.    |
| Deploy/SnapShot Server    | incomplete    | Deploy server creating each package snapshot.    |
| API Server    | incomplete    | REST api server for managing user packages    |

## Hooks
Raft-hooks are a set of command line programs for running raft.

| Command  | Status | Comment |
| ------------- | ------------- | ------------- |
| `hooks hub`    | incomplete    | The main event server    |
| `hooks router`    | incomplete    | start the router process    |
| `hooks spawn`    | incomplete    | start the spawn process    |
| `hooks logger`    | incomplete    | start the logger process    |

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
