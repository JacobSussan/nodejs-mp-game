var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});

app.use('/client', express.static(__dirname + '/client'));

serv.listen(3000);
console.log('Server started.');

var SOCKET_LIST = {};
var PLAYER_LIST = {};

var Player = function(id) {
	var self = {
		x:250,
		y:250,
		id:id,
		sprite: "X",
		pressingUp:false,
		pressingLeft:false,
		pressingDown:false,
		pressingRight:false,
		maxSpeed:10,
	};

	// Move the player
	self.updatePosition = function() {
		if (self.pressingUp) {
			self.y -= self.maxSpeed;
		} else if (self.pressingLeft) {
			self.x -= self.maxSpeed;
		} else if (self.pressingDown) {
			self.y += self.maxSpeed;
		} else if (self.pressingRight) {
			self.x += self.maxSpeed;
		}
	};

	return self;
};

var io = require('socket.io')(serv,{});
io.sockets.on('connection', (socket) => {
	// set default values for the new socket
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;

	var player = Player(socket.id);
	PLAYER_LIST[socket.id] = player;

	// delete the socket from list when they disconnect
	socket.on('disconnect', () => {
		delete SOCKET_LIST[socket.id];
		delete PLAYER_LIST[socket.id];
	});

	// Update players key states
	socket.on('keyPress', (data) => {
		if (data.inputId === 'up') {
			player.pressingUp = data.state;
		} else if (data.inputId === 'left') {
			player.pressingLeft = data.state;
		} else if (data.inputId === 'down') {
			player.pressingDown = data.state;
		} else if (data.inputId === 'right') {
			player.pressingRight = data.state;
		}
	});
});

// 25tps - send payload to each socket with each players info
setInterval(function() {
	// create pack of all sockets position and numer
	var pack = [];
	for (var i in PLAYER_LIST) {
		var player = PLAYER_LIST[i];
		player.updatePosition();
		pack.push({
			x:player.x,
			y:player.y,
			sprite:player.sprite
		});
	}
	// send pack to each socket
	for (var i in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		socket.emit('newPositions', pack);
	}
}, 1000/25);