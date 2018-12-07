var mongojs = require('mongojs');
var db = mongojs('localhost:27017/game', ['users']);
var express = require('express');
var app = express();
var serv = require('http').Server(app);
var io = require('socket.io')(serv,{});

app.get('/', function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});

app.use('/client', express.static(__dirname + '/client'));

serv.listen(3000);
console.log('Server started.');

var DEBUG = true;
var SOCKETS = {};

// base type for anything(movable) we will print to the screen
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

	self.getDist = (pos) => {
		return Math.sqrt(Math.pow(self.x - pos.x, 2) + Math.pow(self.y - pos.y, 2));
	}

	return self;
}

var Player = (id) => {
	// set defaults
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
	self.health = 100;
	self.maxHealth = 100;
	self.score = 0;

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

	self.getCreatePack = () => {
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			sprite:self.sprite,
			health:self.health,
			maxHealth:self.maxHealth,
			score:self.score,
		}
	}

	self.getUpdatePack = () => {
		return {
			id:self.id,
			x:self.x,
			y:self.y,
			sprite:self.sprite,
			health:self.health,
			score:self.score,
		}
	}

	Player.list[id] = self;

	createP.player.push(self.getCreatePack());
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

	var players = [];
	for (var i in Player.list) {
		players.push(Player.list[i].getCreatePack())
	}

	var projectile = [];
	for (var i in Projectile.list) {
		projectile.push(Projectile.list[i].getCreatePack())
	}

	socket.emit('create', {
		myId:socket.id,
		player:players,
		projectile:projectile,
	});
}

Player.onDissconnect = (socket) => {
	delete Player.list[socket.id];
	deleteP.player.push(socket.id);
}

Player.update = () => {
	var pack = [];
	for (var i in Player.list) {
		var player = Player.list[i];
		player.update();
		pack.push(player.getUpdatePack());
	}
	return pack;
}

var Projectile = (owner, angle) => {
	var self = Entity();
	self.id = Math.random();
	self.speedX = Math.cos(angle / 180 * Math.PI) * 10;
	self.speedY = Math.sin(angle / 180 * Math.PI) * 10;
	
	self.owner = owner;

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
			if (self.getDist(p) < 32 && self.owner !== p.id) {
				p.health -= 5;
				if (p.health <= 0) {
					var shooter = Player.list[self.owner];
					if (shooter) {
						shooter.score++;
					}
					
					p.health = p.maxHealth;
					p.x = Math.random() * 600;
					p.y = Math.random() * 600;
				}
				self.toDelete = true;
			}
		}
	}

	self.getCreatePack = () => {
		return {
			id:self.id,
			x:self.x,
			y:self.y,
		}
	}
	
	self.getUpdatePack = () => {
		return {
			id:self.id,
			x:self.x,
			y:self.y,
		}
	}

	Projectile.list[self.id] = self;
	createP.projectile.push(self.getCreatePack());
	return self;
}
Projectile.list = {};

// update pos of projectile, add it's data to the list
Projectile.update = () => {
	var pack = [];
	for (var i in Projectile.list) {
		var projectile = Projectile.list[i];
		projectile.update();

		if (projectile.toDelete) {
			delete Projectile.list[i];
			deleteP.projectile.push(projectile.id);
		} else {
			pack.push(projectile.getUpdatePack());
		}
	}
	return pack;
}

// database helper functions ----------
var checkPassword = (data, callBack) => {
	db.users.find({user:data.user, pass:data.pass}, (error, result) => {
		if (result.length > 0) {
			callBack(true);
		} else {
			callBack(false);
		}
	});
}

var usernameExists = (data, callBack) => {
	db.users.find({user:data.user}, (error, result) => {
		if (result.length > 0) {
			callBack(true);
		} else {
			callBack(false);
		}
	});
}

var createUser = (data, callBack) => {
	db.users.insert({user:data.user, pass:data.pass}, (error) => {
		callBack();
	});
}
// ------------------------------

io.sockets.on('connection', (socket) => {
	// set default values for the new socket
	socket.id = Math.random();
	SOCKETS[socket.id] = socket;

	// if there exists a user with matching user and pass, connect the socket
	socket.on('login', (data) => {
		checkPassword(data, (response) => {
			if (response) {
				Player.onConnection(socket);
				socket.emit('loginResponse', {success:true});
			} else {
				socket.emit('loginResponse', {success:false});
			}
		});
	});

	// check if username is taken, if it's not, create the user in the database
	socket.on('signup', (data) => {
		usernameExists(data, (response) => {
			if (response){
				socket.emit('signUpResponse', {success:false});
			} else {
				createUser(data, () => {
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
			return false;
		}
		
		var response = eval(data);
		socket.emit("evalResponse", response);
	});
});

// packets to be sent to the client
var createP = {player:[], projectile:[]};
var deleteP = {player:[], projectile:[]};

// 25tps - send payload to each socket with each players info
setInterval(() => {
	var pack = {
		player: Player.update(),
		projectile: Projectile.update()
	}

	// send packets to each socket
	for (var i in SOCKETS) {
		var socket = SOCKETS[i];
		socket.emit('update', pack);
		socket.emit('create', createP);
		socket.emit('delete', deleteP);
	}

	// clear the packets to prep for next tick
	createP.player = [];
	createP.projectile = [];
	deleteP.player = [];
	deleteP.projectile = [];

}, 1000/25);