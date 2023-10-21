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

    socket.on('error', (error) => {
        console.error('Socket Error:', error);
      });
      

    socket.on('startGame', (data) => {
    console.log('Received startGame event with data:', data);
    const roomId = data.roomId;

    if (rooms[roomId]) {
        const players = rooms[roomId].players;
        const playerCards = {};
        players.forEach(playerId => {
            const card = Math.floor(Math.random() * 100) + 1;
            playerCards[playerId] = card;
        });

        rooms[roomId].gameState = {
            turn: 0,
            currentPlayer: players[0],
            playerCards,
            playedCards: []
        };

        players.forEach(playerId => {
            const socket = io.sockets.sockets.get(playerId);
            socket.emit('gameStarted', {
                message: 'Game has started',
                initialCard: playerCards[playerId],
                gameState: rooms[roomId].gameState
            });
        });
    } else {
        console.log(`Room ${roomId} not found.`);
    }
});

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

    socket.on('joinGame', (data) => {
        const roomId = data.roomId;
        console.log(`Attempting to join room ${roomId}. Current state:`, rooms[roomId]);
        if (rooms[roomId]) {
            if (!rooms[roomId].players.includes(socket.id)) {
                rooms[roomId].players.push(socket.id);
                socket.join(roomId);
            }
            console.log(`After joining room ${roomId}, room state:`, rooms[roomId]);
            socket.emit('gameState', rooms[roomId].gameState);
            io.sockets.in(roomId).emit('playerJoined', { roomId, players: rooms[roomId].players });
            console.log(`Emitting gameState for new joiner in room ${roomId}`, rooms[roomId].gameState);
        } else {
            console.log(`Room with ID ${roomId} does not exist.`);
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
            },
            playedCards: []
        };
        socket.join(roomId);
        socket.emit('roomCreated', { roomId, gameState: rooms[roomId].gameState });        
    });
    

    socket.on('cardPlayed', (data) => {
        const { card, roomId } = data;
        const room = rooms[roomId]; 
        
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
