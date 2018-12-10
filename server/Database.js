var mongojs = require('mongojs');
var db = mongojs('localhost:27017/game', ['users']);

// ------------------------------------
Database = {};
Database.checkPassword = function(data, callBack) {
	db.users.findOne({user:data.user, pass:data.pass}, (error, result) => {
		if (result) {
			callBack(true);
		} else {
			callBack(false);
		}
	});
}

Database.usernameExists = function(data, callBack) {
	db.users.findOne({user:data.user}, (error, result) => {
		if (result) {
			callBack(true);
		} else {
			callBack(false);
		}
	});
}

Database.createUser = function(data, callBack) {
	db.users.insert({user:data.user, pass:data.pass, items:[]}, (error) => {
		callBack();
	});
}

Database.getPlayerData = function(user, callBack) {
	db.users.findOne({user:user}, function(error, result) {
		callBack({
			items:result.items,
		});
	});
}

Database.savePlayerData = function(data, callBack) {
	db.users.update( { user:data.user }, { $set: {items:data.items} }, callBack );
}