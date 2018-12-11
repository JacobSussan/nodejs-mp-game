var createP = {player:[],bullet:[]};
var deleteP = {player:[],bullet:[]};

// base type for anything(movable) we will print to the screen
Entity = function(data) {
	var self = {
		x: 300,
		y: 300,
		speedX: 0,
		speedY: 0,
		id: "",
		world:'default',
	};

	if (data) {
		if (data.x) {
			self.x = data.x;
		}

		if (data.y) {
			self.y = data.y;
		}

		if (data.world) {
			self.world = data.world;
		}

		if (data.id) {
			self.id = data.id;
		}
	}

	self.update = () => {
		self.updatePosition();
	}

	self.updatePosition = () => {
		if (World.checkCollision(parseInt(self.y + self.speedY), parseInt(self.x + self.speedX))) {
			self.x += self.speedX;
			self.y += self.speedY;
		}
	}

	self.getDist = (pos) => {
		return Math.sqrt(Math.pow(self.x - pos.x, 2) + Math.pow(self.y - pos.y, 2));
	}

	return self;
}

getAllPacks = () => {
	var pack = {
		createP: {
			player:createP.player,
			projectile:createP.projectile,
		},
		deleteP: {
			player:deleteP.player,
			projectile:deleteP.projectile,
		},
		updateP: {
			player:Player.update(),
			projectile:Projectile.update(),
		}
	}
	// clear the packets to prep for next tick
	createP.player = [];
	createP.projectile = [];
	deleteP.player = [];
	deleteP.projectile = [];

	return pack;
}

// ------------------------ PLAYER ------------------------
Player = function(data) {
	// set defaults
	var self = Entity(data);
	self.sprite = "X";
	self.user = data.user;
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
	self.coolDown = 0;
	self.inventory = new Inventory(data.playerData.items, data.socket, true);

	// self.inventory.addItem('potion', 10);
	// self.inventory.addItem('super', 1);

	var _update = self.update;
	self.update = () => {
		self.updateDirection();
		_update();

		if (self.coolDown > 0) {
			self.coolDown--;
		} else if (self.leftClickPressed) {
			self.coolDown = 6;
			self.shootProjectile(self.mousePos);
		}
	}

	self.shootProjectile = (angle) => {
		var p = Projectile({
			owner:self.id,
			angle:angle,
			x:self.x,
			y:self.y,
			world:self.world,
		});
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
			world:self.world,
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
			world:self.world,
		}
	}

	Player.list[self.id] = self;

	createP.player.push(self.getCreatePack());
	return self;
};

Player.onConnection = function(socket, user, playerData) {
	var world = 'default';
	// if (Math.random() < 0.5) {
		// world = 'alt';
	// }

	var player = Player({
		x:playerData.pos.x,
		y:playerData.pos.y,
		user:user,
		id:socket.id,
		world:world,
		socket:socket,
		playerData:playerData,
	});

	player.inventory.refreshRender();

	// Update players key states
	socket.on('key_press', (data) => {
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

	socket.on('change_world', (data) => {
		if (player.world === 'default') {
			player.world = 'alt';
		} else {
			player.world = 'default';
		}
	});

	// listen to chat messages and send them to all connected sockets
	socket.on('new_chat', (msg) => {
		for (var i in SOCKETS) {
			SOCKETS[i].emit("update_chat", "[" + player.user + "]: " + msg);
		}
	});

	// listen to chat messages and send them to all connected sockets
	socket.on('new_direct_msg', (data) => {
		var recipient = null;
		for (var i in Player.list) {
			if(Player.list[i].user === data.user) {
				recipient = SOCKETS[i];
			}
		}

		if (recipient === null) {
			socket.emit('update_chat', "The player " + data.user + " is not online.");
		} else {
			recipient.emit('update_chat', "From [" + player.user + "]: " + data.msg);
			socket.emit('update_chat', "To [" + data.user + "]: " + data.msg);
		}
	});

	// listen for hotkey updates
	socket.on('hotkey_update', (data) => {
		data.user = Player.list[socket.id].user;
		Database.updateHotkeys(data);
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
		hotbar:playerData.hotbar,
	});
}

Player.onDissconnect = function(socket) {
	let p = Player.list[socket.id];
	if (!p) {
		return;
	}

	Database.savePlayerData({
		user:p.user,
		items:p.inventory.items,
		pos: { x:p.x, y:p.y },
	});

	delete Player.list[socket.id];
	deleteP.player.push(socket.id);
}

Player.update = function() {
	var pack = [];
	for (var i in Player.list) {
		var player = Player.list[i];
		player.update();
		pack.push(player.getUpdatePack());
	}
	return pack;
}

// ------------------------ PROJECTILE ------------------------
Projectile = function(data) {
	var self = Entity(data);
	self.id = Math.random();
	self.speedX = Math.cos(data.angle / 180 * Math.PI) * 20;
	self.speedY = Math.sin(data.angle / 180 * Math.PI) * 20;
	self.angle = data.angle;
	self.owner = data.owner;

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
			if (self.world === p.world && self.getDist(p) < 28 && self.owner !== p.id) {
				p.health -= 5;
				if (p.health <= 0) {
					var shooter = Player.list[self.owner];
					if (shooter) {
						shooter.score++;
					}
					
					p.health = p.maxHealth;
					p.x = 30 + (Math.random() * 570);
					p.y = 30 + (Math.random() * 570);
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
			world:self.world,
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

// update pos of projectile, add it's data to the list
Projectile.update = function() {
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

// GLOBAL LISTS ------------------------------
Player.list = {};
Projectile.list = {};