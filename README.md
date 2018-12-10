# electron-timer-presentation

Timer for presentation & Workshop (maybe?)

## Usage

### Server

To start server, 

0. `cd server`
1. If you never install require module, run

```sh
$ npm i
```

2. make sure that server can connect from the client (You maybe use VPN, or private network)
3. Time to run:

```sh
$ npm start
```

4. Wait until the console log show: 

```log
Server listening at port 3000
```

5. Then, open the main page (ex. http://localhost:3000)

### Monitor
0. Connect to the server's network, and make sure that the server is working.
1. Open the main page (ex. http://localhost:3000)
2. Click the blue-eye button at the bottom right corner to change to viewer's mode.
3. Open the web page to fullscreen mode

### Client

The client app is made by Electron to be easy for display on the top of the page.

To install and use:

0. `cd client`
1. If you never install require module, run

```sh
$ npm i
```

2. Connect to the server's network, and make sure that the server is working.
3. Edit `setting.json` to match with the server's config.
4. Time to run:

```sh
$ npm start
```

### ~~controller~~

The controller is now obsolete due to some reason. So, ¯\\_(ツ)_/¯ .