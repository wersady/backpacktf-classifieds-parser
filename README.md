# Backpack.tf Classifieds Parser
A simple Node-based program that shows new unusual listings on [backpack.tf](https://next.backpack.tf).

![(https://imgur.com/a/kEWDTNN)](https://i.imgur.com/cxE8V1p.png)

## Installation
First, you'll need to install [Node.js](https://nodejs.org) and then download `app.js` from this github repo.

Place `app.js` in a folder somewhere and open it with a text/code editor. Near the top of the file you see `const bpApiToken = "";`. You'll need to put your [backpack.tf access token](https://next.backpack.tf/account/api-access) inside the quotes and save.

Next, open a command prompt,navigate the the folder you put `app.js` in, and install the following Node modules:
```
npm install ws
npm install reconnecting-websocket
```
Once the modules are installed, run `node app.js` to start the program.
