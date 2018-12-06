var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});

app.use('/client', express.static(__dirname + '/client'));

serv.listen(3000);
console.log('Server started.');

var DEBUG = true;

var SOCKETS = {};

var Entity = () => {
	var self = {
		x: 300,
		y: 300,
		speedX: 0,
		speedY: 0,
		id: "",
	};
	
	self.update = () => {
		self.updatePosition();
	}
	
	self.updatePosition = () => {
		self.x += self.speedX;
		self.y += self.speedY;
	}

	self.getDist = (pt) => {
		return Math.sqrt(Math.pow(self.x-pt.x, 2) + Math.pow(self.y-pt.y, 2));
	}

	return self;
}

var Player = (id) => {
	var self = Entity();
	self.id = id;
	self.sprite = "X";
	self.upPressed = false;
	self.leftPressed = false;
	self.downPressed = false;
	self.rightPressed = false;

	self.leftClickPressed = false;
	self.mousePos = 0;
	self.speed = 10;

	var _update = self.update;
	self.update = () => {
		self.updateDirection();
		_update();

		if (self.leftClickPressed) {
			self.shootProjectile(self.mousePos);
		}
	}

	self.shootProjectile = (angle) => {
		var p = Projectile(self.id, angle);
		p.x = self.x;
		p.y = self.y;
	}

	// Move the player
	self.updateDirection = () => {
		if (self.rightPressed) {
			self.speedX = self.speed;
		} else if (self.leftPressed) {
			self.speedX = -self.speed;
		} else {
			self.speedX = 0;
		}

		if (self.upPressed) {
			self.speedY = -self.speed;
		} else if (self.downPressed) {
			self.speedY = self.speed;
		} else {
			self.speedY = 0;
		}
	}

	Player.list[id] = self;
	return self;
};
Player.list = {};

Player.onConnection = (socket) => {
	var player = Player(socket.id);
	
	// Update players key states
	socket.on('keyPress', (data) => {
		if (data.inputId === 'up') {
			player.upPressed = data.state;
		} else if (data.inputId === 'left') {
			player.leftPressed = data.state;
		} else if (data.inputId === 'down') {
			player.downPressed = data.state;
		} else if (data.inputId === 'right') {
			player.rightPressed = data.state;
		} else if (data.inputId === 'leftClick') {
			player.leftClickPressed = data.state;
		} else if (data.inputId === 'mousePos') {
			player.mousePos = data.state;
		}
	});
}

Player.onDissconnect = (socket) => {
	delete Player.list[socket.id];
}

Player.update = () => {
	// create pack of all sockets position and numer
	var pack = [];
	for (var i in Player.list) {
		var player = Player.list[i];
		player.update();
		pack.push({
			x:player.x,
			y:player.y,
			sprite:player.sprite
		});
	}
	return pack;
}

var Projectile = (owner, angle) => {
	var self = Entity();
	self.id = Math.random();
	self.speedX = Math.cos(angle / 180 * Math.PI) * 10;
	self.speedY = Math.sin(angle / 180 * Math.PI) * 10;
	
	self.parent = owner;

	self.timer = 0;
	self.toDelete = false;

	var _update = self.update;
	self.update = () => {
		if (self.timer++ > 100) {
			self.toDelete = true;
		}

		_update();

		for (var i in Player.list) {
			var p = Player.list[i];
			if (self.getDist(p) < 32 && self.parent !== p.id) {
				// TODO: make player take dmg
				self.toDelete = true;
			}
		}
	}
	
	Projectile.list[self.id] = self;
	return self;
}
Projectile.list = {};

Projectile.update = () => {
	// create pack of all sockets position and numer
	var pack = [];
	for (var i in Projectile.list) {
		var projectile = Projectile.list[i];
		projectile.update();

		if (projectile.toDelete) {
			delete Projectile.list[i];
		} else {
			pack.push({
				x:projectile.x,
				y:projectile.y
			});
		}
	}
	return pack;
}

var io = require('socket.io')(serv,{});
io.sockets.on('connection', (socket) => {
	// set default values for the new socket
	socket.id = Math.random();
	SOCKETS[socket.id] = socket;

	Player.onConnection(socket);

	// delete the socket from list when they disconnect
	socket.on('disconnect', () => {
		delete SOCKETS[socket.id];
		Player.onDissconnect(socket);
	});

	// listen to chat messages and send them to all connected sockets
	socket.on('new_chat', (msg) => {
		var name = ("" + socket.id).slice(2, 6);
		for (var i in SOCKETS) {
			SOCKETS[i].emit("update_chat", name + ": " + msg);
		}
	});

	// listen to chat messages for commands
	socket.on('eval', (data) => {
		if (!DEBUG) {
			return;
		}
		
		var response = eval(data);
		socket.emit("evalResponse", response);
	});
});

// 25tps - send payload to each socket with each players info
setInterval( () => {
	var pack = {
		player: Player.update(),
		projectile: Projectile.update()
	}

	// send pack to each socket
	for (var i in SOCKETS) {
		var socket = SOCKETS[i];
		socket.emit('tick', pack);
	}
}, 1000/25);