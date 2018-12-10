Inventory = function(items, socket, server) {
	var self = {
		items:items,
		socket:socket,
		server:server,
	}

	self.addItem = function(id, amount) {
		for (var i = 0 ; i < self.items.length; i++) {
			if (self.items[i].id === id) {
				self.items[i].amount += amount;
				self.refreshRender();
				return;
			}
		}
		self.items.push({id:id, amount:amount});
		self.refreshRender();
	}

	self.removeItem = function(id, amount) {
		for (var i = 0 ; i < self.items.length; i++) {
			if (self.items[i].id === id) {
				self.items[i].amount -= amount;
				
				if (self.items[i].amount <= 0) {
					self.items.splice(i,1);
				}

				self.refreshRender();
				return;
			}
		}
	}

	self.hasItem = function(id,amount) {
		for (var i = 0 ; i < self.items.length; i++) {
			if (self.items[i].id === id) {
				return self.items[i].amount >= amount;
			}
		}
		return false;
	}

	self.refreshRender = function() {
		//server
		if (self.server) {
			self.socket.emit('update_inventory', self.items);
			return;
		}

		// client only
		var inv = document.getElementById("inventory");
		inv.innerHTML = "";
		var addBtn = function(data) {
			let item = Item.list[data.id];
			let btn = document.createElement('button');
			btn.onclick = function() {
				self.socket.emit('use_item', item.id);
			}
			btn.innerText = item.name + " x " + data.amount;
			inv.appendChild(btn);
		}

		for (var i = 0 ; i < self.items.length; i++) {
			addBtn(self.items[i]);
		}
		
		// Update settings
		settings.innerHTML = "";
		for (var i = 0 ; i < inventory.items.length; i++) {
			addHotkey(inventory.items[i]);
		}
	}

	if (self.server) {
		self.socket.on("use_item", function(itemId) {
			if(!self.hasItem(itemId, 1)) {
				return;
			}
			let item = Item.list[itemId];
			item.event(Player.list[self.socket.id]);
		});
	}

	return self;
}

Item = function(id, name, event) {
	var self = {
		id:id,
		name:name,
		event:event,
	}

	Item.list[self.id] = self;
	
	return self;
}
Item.list = {};

Item("pot", "Potion", function(player) {
	if (player.health + 10 <= player.maxHealth) {
		player.health += 10;
	}
	player.inventory.removeItem("pot", 1);
});

Item("ult", "Ultimate", function(player) {
	for (var i = 0; i < 36; i++) {
		player.shootProjectile(i * 10);
	}
});
