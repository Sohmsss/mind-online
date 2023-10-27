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

let rooms = {};

function checkOrder(playedCards) {
    const sortedPlayedCards = [...playedCards].sort((a, b) => a - b);
    return JSON.stringify(sortedPlayedCards) === JSON.stringify(playedCards);
}

function advanceLevel(roomId) {
    const room = rooms[roomId];
    if (room) {
        room.gameState.level++;
        room.gameState.playedCards = [];
        distributeCards(roomId);
    }
}

function loseLife(roomId) {
    const room = rooms[roomId];
    if (room) {
        room.gameState.lives--;
        if (room.gameState.lives === 0) {
            endGame(roomId);
        } else {
            room.gameState.playedCards = [];
        }
    }
}

function distributeCards(roomId) {
    const room = rooms[roomId];
    if (room) {
        const level = room.gameState.level;
        const players = room.players;
        const totalCards = 100;

        room.gameState.playerCards = {};

        players.forEach(playerId => {
            room.gameState.playerCards[playerId] = [];

            for (let i = 0; i < level; i++) {
                let card;
                do {
                    card = Math.floor(Math.random() * totalCards) + 1;
                } while (isCardDistributed(roomId, card));
                room.gameState.playerCards[playerId].push(card);
            }
        });

        players.forEach(playerId => {
            const socket = io.sockets.sockets.get(playerId);
            if (socket) {
                socket.emit('gameStarted', {
                    message: 'Game has started',
                    initialCards: room.gameState.playerCards[playerId],
                    gameState: room.gameState
                });
            }
        });
    }
}

function isCardDistributed(roomId, card) {
    const room = rooms[roomId];
    if (room) {
        for (let playerId in room.gameState.playerCards) {
            if (room.gameState.playerCards[playerId].includes(card)) {
                return true;
            }
        }
    }
    return false;
}

function endGame(roomId) {
    // No idea how yet
}

io.on('connection', (socket) => {
    console.log('New user connected with ID:', socket.id);

    socket.on('error', (error) => {
        console.error('Socket Error:', error);
    });

    socket.on('startGame', (data) => {
        console.log('Received startGame event with data:', data);
        const roomId = data.roomId;

        if (rooms[roomId]) {
            distributeCards(roomId);
        } else {
            console.log(`Room ${roomId} not found.`);
        }
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

            if (checkOrder(room.playedCards)) {
                if (room.playedCards.length === room.gameState.level) {
                    advanceLevel(roomId);
                }
            } else {
                loseLife(roomId);
            }
            io.sockets.in(roomId).emit('updateCard', {
                card,
                playedCards: room.playedCards,
                gameState: room.gameState
            });
            io.sockets.in(roomId).emit('updateCard', {
                card,
                playedCards: room.playedCards,
                gameState: room.gameState
            });

            io.sockets.in(roomId).emit('updateGameState', room);
        }
    });
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
