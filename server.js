const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Serve the HTML file
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

const server = http.Server(app);
const io = socketIO(server);

// Generate a unique room ID
function generateRoomId() {
    return Math.random().toString(36).substr(2, 5).toUpperCase();
}


let rooms = {};

io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('startGame', (data) => {
        const roomId = data.roomId;
        if (rooms[roomId]) {  // Make sure the room exists
            io.sockets.in(roomId).emit('gameStarted', { message: 'Game has started' });
        }
    });

    // Handle disconnections
    socket.on('disconnect', () => {
        console.log('User disconnected');
        // Handle removing this player from the room, etc.
    });

    // Join the game room and notify all members of the room.
    socket.on('joinGame', (data) => {
        const roomId = data.roomId;
        if (rooms[roomId]) {
            rooms[roomId].players.push(socket.id);
            socket.join(roomId);
            io.sockets.in(roomId).emit('playerJoined', rooms[roomId]);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
        // Remove this player from any rooms they were in
        for (let roomId in rooms) {
            const index = rooms[roomId].players.indexOf(socket.id);
            if (index > -1) {
                rooms[roomId].players.splice(index, 1);
                io.sockets.in(roomId).emit('playerLeft', rooms[roomId]);
            }
        }
    });

    socket.on('createGame', () => {
        const roomId = generateRoomId();
        rooms[roomId] = { players: [socket.id] };
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
        console.log('Generated Room ID:', roomId);
        console.log('Create Game Received');
    });


    socket.on('cardPlayed', (data) => {
        const { card, roomId } = data;
        io.sockets.in(roomId).emit('updateCard', { card });
    });



});



server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
