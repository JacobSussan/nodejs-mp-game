WIDTH = 600;
HEIGHT = 600;

var socket = io();

// ACCOUNTS
var account = document.getElementById("account");
var user = document.getElementById("user");
var pass = document.getElementById("pass");
var login = document.getElementById("login");
var signup = document.getElementById("signup");
var lower = document.getElementById("lower");
var game = document.getElementById("game");

login.onclick = () => {
	socket.emit('login', {user:user.value, pass:pass.value})
};

signup.onclick = () => {
	socket.emit('signup', {user:user.value, pass:pass.value})
};

socket.on('loginResponse', (data) => {
	if (data.success) {
		account.style.display = 'none';
		game.style.display = 'inline-block';
		lower.style.display = 'inline-block';
		game.focus();
	} else {
		alert("No records matching for that username/password combo. Please check your details and try again.");
	}
});

socket.on('signUpResponse', (data) => {
	if (data.success) {
		alert("You have been signed up!");
	} else {
		alert("There was a problem signing you up. Please make sure your password matches the requirements or try another username.");
	}
});

// CHAT
var chat_logs = document.getElementById('chat_logs');
var chat_msg = document.getElementById('chat_msg');
var chat_form = document.getElementById('chat_form');

// add a message to the chatbox
socket.on("update_chat", (data) => {
	chat_logs.innerHTML += "<div>" + data.replace(/(<([^>]+)>)/ig,"") + "</div>";
});

// response from command
socket.on("evalResponse", (data) => {
	console.log(data);
});

// send new chat message to the server
chat_form.onsubmit = (e) => {
	e.preventDefault();

	if (chat_msg.value[0] === "/") {
		if (chat_msg.value[1] === "w" && chat_msg.value.split(' ')[1] !== undefined) {
			socket.emit('new_direct_msg', {
				user:chat_msg.value.split(' ')[1],
				msg:chat_msg.value.slice(chat_msg.value.indexOf(' ') + 2),
			});
		} else {
			socket.emit('eval', chat_msg.value.slice(1));
		}
	} else {
		socket.emit('new_chat', chat_msg.value);
	}

	chat_msg.value = '';
}

// GAME
var Img = {};
Img.player = new Image();
Img.player.src = "/client/img/player.png";
Img.projectile = new Image();
Img.projectile.src = "/client/img/projectile.png";
Img.world = {};
Img.world['default'] = new Image();
Img.world['default'].src = "/client/img/default.png";
Img.world['alt'] = new Image();
Img.world['alt'].src = "/client/img/alt.png";

var can = document.getElementById("cv").getContext("2d");
var gui_can = document.getElementById("gui-cv").getContext("2d");
gui_can.font = '20px Arial';

// ------------------------ PLAYER ------------------------
var Player = function(initP) {
	var self = {};
	self.id = initP.id;
	self.sprite = initP.sprite;
	self.x = initP.x;
	self.y = initP.y;
	self.health = initP.health;
	self.maxHealth = initP.maxHealth;
	self.score = initP.score;
	self.world = initP.world;
	Player.list[self.id] = self;

	self.draw = () => {
		if (Player.list[myId].world !== self.world) {
			return;
		}
		var x = self.x - Player.list[myId].x + WIDTH / 2;
		var y = self.y - Player.list[myId].y + HEIGHT / 2;

		var healthWidth = 40 * self.health / self.maxHealth;
		can.fillStyle = 'red';
		can.fillRect(x - healthWidth / 2, y - 50, healthWidth, 4);

		var w = Img.player.width;
		var h = Img.player.height;

		can.drawImage(Img.player, 0, 0, Img.player.width, Img.player.height, x - w / 2, y - h / 2, w, h);
	}

	return self;
}

// ------------------------ PROJECTILE ------------------------
var Projectile = function (initP) {
	var self = {};
	self.id = initP.id;
	self.x = initP.x;
	self.y = initP.y;
	self.world = initP.world;
	Projectile.list[self.id] = self;

	self.draw = () => {
		if (Player.list[myId].world !== self.world) {
			return;
		}
		var w = Img.projectile.width;
		var h = Img.projectile.height;

		var x = self.x - Player.list[myId].x + WIDTH / 2;
		var y = self.y - Player.list[myId].y + HEIGHT / 2;

		can.drawImage(Img.projectile, 0, 0, Img.projectile.width, Img.projectile.height, x - w / 2, y - h / 2, w, h);
	}

	return self;
}

// add a new entity
socket.on("create", (data) => {
	if (data.myId) {
		myId = data.myId;
	}

	for (var i = 0; i < data.player.length; i++) {
		new Player(data.player[i]);
	}

	for (var i = 0; i < data.projectile.length; i++) {
		new Projectile(data.projectile[i]);
	}

	if (data.hotbar) {
		hotbar = data.hotbar;
		inventory.refreshRender();
	}
});

// update an entity
socket.on("update", (data) => {
	// check & update players
	for (var i = 0; i < data.player.length; i++) {
		var pack = data.player[i];
		var player = Player.list[pack.id];
		if (player) {
			if (pack.x !== undefined) {
				player.x = pack.x;
			}

			if (pack.y !== undefined) {
				player.y = pack.y;
			}

			if (pack.health !== undefined) {
				player.health = pack.health;
			}

			if (pack.score !== undefined) {
				player.score = pack.score;
			}

			if (pack.world !== undefined) {
				player.world = pack.world;
			}
		}
	}
	// check & update projectiles
	for (var i = 0; i < data.projectile.length; i++) {
		var pack = data.projectile[i];
		var projectile = Projectile.list[data.projectile[i].id];
		if (projectile) {
			if (pack.x !== undefined) {
				projectile.x = pack.x;
			}

			if (pack.y !== undefined) {
				projectile.y = pack.y;
			}
		}
	}
});

// remove an entity
socket.on("delete", (data) => {
	for (var i = 0; i < data.player.length; i++) {
		delete Player.list[data.player[i]];
	}
	for (var i = 0; i < data.projectile.length; i++) {
		delete Projectile.list[data.projectile[i]];
	}
});

// GLOBALs -------------
Projectile.list = {};
Player.list = {};
var myId = null;
var lastScore = null;

// drawgame loop
setInterval(() => {
	if (!myId) {
		return;
	}
	can.clearRect(0, 0, 600, 600);
	drawWorld();
	drawScore();

	for (var i in Player.list) {
		Player.list[i].draw();
	}
	for (var i in Projectile.list) {
		Projectile.list[i].draw();
	}
}, 1000/25);

var drawWorld = () => {
	var p = Player.list[myId];
	var x = WIDTH / 2 - p.x;
	var y = HEIGHT / 2 - p.y;
	can.drawImage(Img.world[p.world], x, y);
}

var drawScore = () => {
	if (lastScore === Player.list[myId].score) {
		return;
	}

	if (myId) {
		lastScore = Player.list[myId].score;
		gui_can.clearRect(0, 0, 600, 600);
		gui_can.fillStyle = 'black';
		gui_can.fillText("Score: " + Player.list[myId].score, 0, 600);
	}
}

// INPUT
var hotbar = { 'pot':49, 'ult':50 };

game.onkeydown = (e) => {
	if (e.keyCode === 87) {
		socket.emit('key_press', {inputId:'up', state:true}); // W
	} else if (e.keyCode === 65) {
		socket.emit('key_press', {inputId:'left', state:true}); // A
	} else if (e.keyCode === 83) {
		socket.emit('key_press', {inputId:'down', state:true}); // S
	} else if (e.keyCode === 68) {
		socket.emit('key_press', {inputId:'right', state:true}); // D
	}

	var hotbarKeys = Object.keys(hotbar);
	var hotbarValues = Object.values(hotbar);
	for (var i = 0; i < hotbarKeys.length; i++) {
		if (hotbarValues[i] == e.keyCode) {
			self.socket.emit('use_item', hotbarKeys[i]);
		}
	}
};

game.onkeyup = (e) => {
	if (e.keyCode === 87) {
		socket.emit('key_press', {inputId:'up', state:false}); // W
	} else if (e.keyCode === 65) {
		socket.emit('key_press', {inputId:'left', state:false}); // A
	} else if (e.keyCode === 83) {
		socket.emit('key_press', {inputId:'down', state:false}); // S
	} else if (e.keyCode === 68) {
		socket.emit('key_press', {inputId:'right', state:false}); // D
	}
};

// shoot
game.onmousedown = (e) => {
	socket.emit('key_press', {inputId:'leftClick', state:true}); // left click
}

game.onmouseup = (e) => {
	socket.emit('key_press', {inputId:'leftClick', state:false}); // left click
}

// update mouse pos
game.onmousemove = (e) => {
	// 9, 42 = hardcoded for padding/margins in css... fix later
	var x = -300 + e.clientX - 9;
	var y = -300 + e.clientY - 42;
	var angle = Math.atan2(y, x) / Math.PI * 180;
	socket.emit('key_press', {inputId:'mousePos', state:angle});
}

game.oncontextmenu = (e) => {
	e.preventDefault();
}

// GUI
var changeWorld = () => {
	socket.emit('change_world');
}

var settings = document.getElementById("settings");

var addHotkey = function(data) {
	let item = Item.list[data.id];
	let btn = document.createElement('button');
	let input = document.createElement('input');
	input.value = String.fromCharCode(hotbar[item.id].toString().toUpperCase())
	btn.onclick = function() {
		let charCode = input.value.toUpperCase().charCodeAt(0);
		hotbar[item.id] = charCode;
		socket.emit('hotkey_update', {hotbar:hotbar});
	}
	btn.innerText = "Set " + item.name;
	settings.appendChild(input);
	settings.appendChild(btn);
}

// INVENTORY
inventory = new Inventory([], socket, false);

socket.on('update_inventory', (items) => {
	inventory.items = items;
	inventory.refreshRender();
});