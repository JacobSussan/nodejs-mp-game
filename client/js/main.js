var chat_logs = document.getElementById('chat_logs');
var chat_msg = document.getElementById('chat_msg');
var chat_form = document.getElementById('chat_form');

// create canvas and init socket
var can = document.getElementById("cv").getContext("2d");
can.font = '20px Arial';
var socket = io();

// update positions for all sockets
socket.on("tick", function(data) {
	can.clearRect(0, 0, 600, 600);
	for (var i = 0; i < data.player.length; i++) {
		can.fillText(data.player[i].sprite, data.player[i].x, data.player[i].y);
	}
	for (var i = 0; i < data.projectile.length; i++) {
		can.fillRect(data.projectile[i].x-3, data.projectile[i].y-3, 6, 6);
	}
});

// add a message to the chatbox
socket.on("update_chat", function(data) {
	chat_logs.innerHTML += "<div>" + data.replace(/(<([^>]+)>)/ig,"") + "</div>";
});

// response from command
socket.on("evalResponse", function(data) {
	console.log(data);
});

// send new chat message to the server
chat_form.onsubmit = function(e) {
	e.preventDefault();

	if (chat_msg.value[0] === "/") {
		socket.emit('eval', chat_msg.value.slice(1));
	} else {
		socket.emit('new_chat', chat_msg.value);
	}

	chat_msg.value = '';
}

// emit payload to server when a key is pressed or unpressed
document.onkeydown = function(e) {
	if (e.keyCode === 87) {
		socket.emit('keyPress', {inputId:'up', state:true}); // W
	} else if (e.keyCode === 65) {
		socket.emit('keyPress', {inputId:'left', state:true}); // A
	} else if (e.keyCode === 83) {
		socket.emit('keyPress', {inputId:'down', state:true}); // S
	} else if (e.keyCode === 68) {
		socket.emit('keyPress', {inputId:'right', state:true}); // D
	}
};

document.onkeyup = function(e) {
	if (e.keyCode === 87) {
		socket.emit('keyPress', {inputId:'up', state:false}); // W
	} else if (e.keyCode === 65) {
		socket.emit('keyPress', {inputId:'left', state:false}); // A
	} else if (e.keyCode === 83) {
		socket.emit('keyPress', {inputId:'down', state:false}); // S
	} else if (e.keyCode === 68) {
		socket.emit('keyPress', {inputId:'right', state:false}); // D
	}
};

// shoot
document.onmousedown = function(e) {
	socket.emit('keyPress', {inputId:'leftClick', state:true}); // left click
}

document.onmouseup = function(e) {
	socket.emit('keyPress', {inputId:'leftClick', state:false}); // left click
}

// update mouse pos
document.onmousemove = function(e) {
	var x = -300 + e.clientX;
	var y = -300 + e.clientY;
	var angle = Math.atan2(y, x) / Math.PI * 180;
	socket.emit('keyPress', {inputId:'mousePos', state:angle});
}