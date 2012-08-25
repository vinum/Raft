Node.js app container server. PaaS.
=============

Raft is an application container for node.js apps. The Raft systems is built to be multi node/process.



Installing Raft
------------

There are 4 main parts to the system. parts are: raft, raft-node, raft-worker, raft-proxy and raft-cli


### Install and configure

    sudo npm install raft-node
    sudo npm install raft-worker
    sudo npm install raft-proxy
    sudo npm install raft-cli
    mkdir ~/.raft
    mkdir ~/.raft/logs
    mkdir ~/.raft/node
    mkdir ~/.raft/worker



### How to run
To run the system you need the raft-node and raft-worker to be running

    screen raft-node
    screen raft-worker




