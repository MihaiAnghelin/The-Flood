// Require necessary modules
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var admin = require("./admin.js");

var mapseed = 1004; // i love this seed

var Generator = require("../shared/terraingenerator.js")

admin.notify("Server booted");

// For serverside checks
console.log("Generating terrain...");
var heightmap = Generator.generateTerrain(mapseed);
var initialTotemMap = Generator.generateTotemMap(heightmap,mapseed);
console.log("Done!");

var totemMap = []; // a clone of the initial, the initial one is left unaltered for keeping track of changes
// note : The generator can recompute amy specific tile, but caching is faster
// if ram explodes, switch to computing each tile every time

var deltaBuffer = []; // delta data for people that join later, useful for spectate mode

for ( let x = 0; x < 5*16; x++ ){
	totemMap[x] = [];
	for ( let y = 0; y < 5*16; y++ ){
		totemMap[x][y] = initialTotemMap[x][y];
	}
}

// Some sort of getters and setters for the map, that compute deltas
function placeTotem( x, y, type ){
	totemMap[x][y] = type;
	deltaBuffer = deltaBuffer.filter(function (entry) { return  !(entry.x == x && entry.y == y); });
	
	if ( initialTotemMap[x][y] != totemMap[x][y] ){
		deltaBuffer.push( {x:x,y:y,type:type} );
	}
	//console.log(deltaBuffer);
}

function removeTotem( x, y ){
	totemMap[x][y] = 0;
	deltaBuffer = deltaBuffer.filter(function (entry) { return !(entry.x == x && entry.y == y); });
	
	if ( initialTotemMap[x][y] != 0 ){
		deltaBuffer.push( {x:x,y:y,type:0} );
	}
	
	//console.log(deltaBuffer);
}

app.get('/', function(req, res){
  //res.sendFile(__dirname + '/index.html');
  res.send("Blaze Project SocketIO server");
});

http.listen(port, function(){
  console.log('Listening on *:' + port);
});

io.on('connection', function(socket){
	
	console.log("User connected!");
	admin.notify("User connected!");
	
	socket.on('requestseed', function(msg){
		console.log("Serving seed");
		socket.emit('mapseed', mapseed);
	});
	
	socket.on('requestdeltas', function(){
		if ( deltaBuffer.length > 0 ){
			console.log("Serving deltas. size : " + deltaBuffer.length);
			socket.emit("deltas",deltaBuffer);
		}
	});
	
	socket.on('placeTotem', function(x,y,type){
		//console.log("placed totem " + type + " at coords : " + x + " " + y);
		placeTotem(x,y,type);
		socket.broadcast.emit('placeTotem',x,y,type);
	});
	
	socket.on('removeTotem', function(x,y){
		//console.log("removed totem at coords : " + x + " " + y);
		removeTotem(x,y);
		socket.broadcast.emit('removeTotem',x,y);
	});
	
	
	socket.on("disconnect", function(){
		console.log("User disconnected!")
		admin.notify("User disconnected!");
	});
	
});

