const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const app = express();

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

const server = http.Server(app);
const io = socketIO(server);

function generateRoomId() {
    return Math.random().toString(36).substr(2, 5).toUpperCase();
}

function changeTurn(roomId) {
    const room = rooms[roomId];
    if (room) {
        const players = room.players;
        const gameState = room.gameState;
        gameState.turn = (gameState.turn + 1) % players.length;
        gameState.currentPlayer = players[gameState.turn];
        io.sockets.in(roomId).emit('gameStateUpdated', gameState);
    }
}

let rooms = {};

io.on('connection', (socket) => {
    console.log('New user connected with ID:', socket.id);
    socket.on('startGame', (data) => {
        const roomId = data.roomId;
        if (rooms[roomId]) {
            io.sockets.in(roomId).emit('gameStarted', { message: 'Game has started' });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });


    socket.on('joinGame', (data) => {
        const roomId = data.roomId;
        if (rooms[roomId]) {
            rooms[roomId].players.push(socket.id);
            socket.join(roomId);
            rooms[roomId].gameState.cards = rooms[roomId].gameState.cards || [];
            rooms[roomId].gameState.playedCards = rooms[roomId].gameState.playedCards || [];
            socket.emit('gameState', rooms[roomId].gameState);
            io.sockets.in(roomId).emit('playerJoined', rooms[roomId]);
            console.log(`Emitting gameState for new joiner in room ${roomId}`, rooms[roomId].gameState);
        }
    });
    
    socket.on('disconnect', () => {
        console.log('User disconnected');
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
        rooms[roomId] = {
            players: [socket.id],
            gameState: {
                turn: 0,
                currentPlayer: socket.id,
                level: 1,
                lives: 3 
            }
        };
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
    });

    socket.on('cardPlayed', (data) => {
        const { card, roomId } = data;
        const room = rooms[roomId]; // Get the room object
        
        if (room) {
            room.playedCards.push(card);
            io.sockets.in(roomId).emit('updateCard', { card });
            io.sockets.in(roomId).emit('updateGameState', room);
            changeTurn(roomId);
        }
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
