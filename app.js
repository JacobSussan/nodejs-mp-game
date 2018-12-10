var express = require('express');
var app = express();
var serv = require('http').Server(app);
var io = require('socket.io')(serv,{});

require('./server/Database');
require('./server/Entity');
require('./client/js/Inventory');
require('./client/js/World');

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});

app.use('/client', express.static(__dirname + '/client'));

serv.listen(3000);
console.log('Server started.');

var DEBUG = true;
SOCKETS = {};

// CONNECTIONS -------------------------------
io.sockets.on('connection', function(socket) {
	// set default values for the new socket
	socket.id = Math.random();
	SOCKETS[socket.id] = socket;

	// if there exists a user with matching user and pass, connect the socket
	socket.on('login', (data) => {
		Database.checkPassword(data, function(response) {
			if (!response) {
				return socket.emit('loginResponse', {success:false});
			}

			Database.getPlayerData(data.user, function(playerData) {
				Player.onConnection(socket, data.user, playerData);
				socket.emit('loginResponse', {success:true});
			})
		});
	});

	// check if username is taken, if it's not, create the user in the database
	socket.on('signup', (data) => {
		Database.usernameExists(data, (response) => {
			if (response){
				socket.emit('signUpResponse', {success:false});
			} else {
				Database.createUser(data, () => {
					socket.emit('signUpResponse', {success:true});
				});
			}
		});
	});

	// delete the socket from list when they disconnect
	socket.on('disconnect', () => {
		delete SOCKETS[socket.id];
		Player.onDissconnect(socket);
	});

	// listen to chat messages for commands
	socket.on('eval', (data) => {
		if (!DEBUG) {
			return false;
		}
		
		var response = eval(data);
		socket.emit("evalResponse", response);
	});
});

// 25tps - send payload to each socket with each players info
setInterval(() => {
	var packs = getAllPacks();

	// send packets to each socket
	for (var i in SOCKETS) {
		var socket = SOCKETS[i];
		socket.emit('update', packs.updateP);
		socket.emit('create', packs.createP);
		socket.emit('delete', packs.deleteP);
	}

}, 1000/25);


/*
var perf_profiler = require('v8-profiler');
var fs = require('fs');
var beginProfiling = function(duration) {
	perf_profiler.beginProfiling('1', true);
	setTimeout(function(){
		var profile = perf_profiler.stopProfiling('1');
		
		profile.export(function(error, result) {
			fs.writeFile('./profile.cpuprofile', result);
			profile.delete();
			console.log("Profile saved to disk.");
		});
	},duration);	
}
beginProfiling(10000);
*/
