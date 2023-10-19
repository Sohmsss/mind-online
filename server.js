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
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
