let cards = []
let cardContainer = document.getElementById('card-container');
let levelElement = document.getElementById('level');
let livesElement = document.getElementById('lives');
let messageElement = document.getElementById('message');
let playedCardContainer = document.getElementById('played-card-container');
let lastPlayedCardContainer = document.getElementById('last-played-card-container');
let level = 1;
let lives = 3;
let playedCards = [];
let currentRoomId = null;
const socket = io.connect('http://localhost:3000');

document.getElementById('createGame').addEventListener('click', () => {
    socket.emit('createGame');
    console.log('Create Game Clicked');
});

socket.on('connect', () => {
    console.log('Connected to server with ID:', socket.id);
});

socket.on('connect_error', (error) => {
    console.error('Connection Error:', error);
  });

socket.on('newGame', (data) => {
    currentRoomId = data.roomId;
    updateRoomIdDisplay(currentRoomId);
    alert(`New game created! Room ID is ${currentRoomId}. Share this ID with your friends to join the game.`);
});

document.getElementById('joinGame').addEventListener('click', () => {
    const roomId = document.getElementById('roomId').value;
    socket.emit('joinGame', { roomId });
});

document.getElementById('startGame').addEventListener('click', () => {
    console.log('Start Game clicked. Current room ID:', currentRoomId);  // Debug line

    if (currentRoomId) {
        console.log('Emitting startGame event');  // Debug line
        socket.emit('startGame', { roomId: currentRoomId });
    } else {
        console.log('No current room ID available');  // Debug line
        alert("You're not in a game room!");
    }
});

function updateRoomIdDisplay(roomId) {
    document.getElementById('room-id').textContent = roomId || 'Unknown Room';
}

socket.on('roomCreated', (roomId) => {
    console.log("Received roomCreated with ID:", roomId);
    currentRoomId = roomId;
    document.getElementById('room-id').textContent = roomId;
    document.getElementById('room-id').textContent = roomId || "Unknown Room";
    document.getElementById('game-container').style.display = 'block';
    alert(`New game created! Room ID is ${roomId}. Share this ID with your friends to join the game.`);
});

socket.on('newGame', (data) => {
    alert(`New game created! Room ID is ${data.roomId}. Share this ID with your friends to join the game.`);
});

socket.on('playerJoined', (data) => {
    console.log("Player Joined Event Triggered", data);
    currentRoomId = data.roomId;
    updateRoomIdDisplay(currentRoomId);
    document.getElementById('room-id').textContent = data.roomId || "Unknown Room";  
    document.getElementById('game-container').style.display = 'block';
    setTimeout(() => {
        alert(`A new player has joined the game. Total players: ${data.players.length}`);
    }, 1000);
});

function generateCards() {
    console.log("Generating cards...");
    cards = [];
    while (cards.length < level) {
        let randomNumber = Math.floor(Math.random() * 100) + 1;
        if (cards.indexOf(randomNumber) === -1) cards.push(randomNumber);
    }
    cards.sort((a, b) => a - b);
    console.log("Generated cards:", cards);
}

function displayCards() {
    cardContainer.innerHTML = '';
    if (Array.isArray(cards)) {
        cards.forEach(card => {
        let cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.textContent = card;
        cardElement.onclick = () => playCard(card);
        cardContainer.appendChild(cardElement)
        cardElement.setAttribute('data-card-value', card);
        })
    } else {
        console.error('Cards is not an array:', cards);
    };
}

function startGame() {
    if (lives === 0) {
        level = 1;
        lives = 3;
    }
    playedCards = [];
    updateStatusBar();
    generateCards();
    displayCards();
}

function playCard(card) {
    let index = cards.indexOf(card);
    if (index !== -1) {
        playedCards.push(cards.splice(index, 1)[0]);
        displayCards();
        checkOrder();
    }

    let lastPlayedCardElement = document.createElement('div');
    lastPlayedCardElement.className = 'last-played-card';
    lastPlayedCardElement.textContent = card;
    lastPlayedCardContainer.appendChild(lastPlayedCardElement);

    function applyStackingEffect() {
        let lastPlayedCards = lastPlayedCardContainer.querySelectorAll('.last-played-card');
        lastPlayedCards.forEach((card, index) => {
            card.style.zIndex = index;
            card.style.transform = `translate(${index * 5}px, ${index * 5}px)`;
        });
    }

    applyStackingEffect();
    socket.emit('cardPlayed', { card, roomId: currentRoomId });
}

function checkOrder() {
    if (playedCards.length === level) {
        let sortedPlayedCards = [...playedCards].sort((a, b) => a - b);
        if (JSON.stringify(sortedPlayedCards) === JSON.stringify(playedCards)) {
            messageElement.textContent = 'Success! Moving to next level.';
            level++;
            playedCards = [];
            setTimeout(startGame, 2000);
        } else {
            messageElement.textContent = 'Incorrect order. Try again.';
            lives--;
            if (lives === 0) {
                messageElement.textContent = 'Game Over! Click "Start Game" to try again.';
                setTimeout(startGame, 2000);
            } else {
                playedCards = [];
                setTimeout(startGame, 2000);
            }
        }
        updateStatusBar();
    }
}

function removeCardFromDisplay(cardValue) {
    const cardElement = cardContainer.querySelector(`[data-card-value="${cardValue}"]`);
    if (cardElement) {
        cardElement.remove();
    }
}

function addCardToPlayedContainer(cardValue) {
    let playedCardElement = document.createElement('div');
    playedCardElement.className = 'played-card';
    playedCardElement.textContent = cardValue;
    playedCardContainer.appendChild(playedCardElement);
}

function updateStatusBar() {
    levelElement.textContent = 'Level: ' + (level || 'Unknown Level');
    livesElement.textContent = 'Lives: ' + (lives || 'Unknown Lives');
}

socket.on('gameState', (data) => {
    console.log('Received gameState:', data);
    currentRoomId = data.roomId;
    cards = data.cards;
    playedCards = data.playedCards;
    level = data.level;
    lives = data.lives;
    updateRoomIdDisplay(currentRoomId);
    displayCards();
    updateStatusBar();
});

socket.on('updateGameState', (updatedGameState) => {
    console.log('Received updatedGameState:', updatedGameState);
    currentRoomId = updatedGameState.roomId;
    cards = updatedGameState.cards;
    playedCards = updatedGameState.playedCards;
    level = updatedGameState.level;
    lives = updatedGameState.lives;
    displayCards();
    updateStatusBar();
});

socket.on('updateCard', (data) => {
    const { card } = data;
    removeCardFromDisplay(card);
    addCardToPlayedContainer(card);
});

socket.on('gameStarted', (data) => {
    console.log('Game is starting with initial card:', data.initialCard);
    level = data.gameState.level;
    lives = data.gameState.lives;
    cards = [data.initialCard];
    displayCards();
    updateStatusBar();
});

console.log('Current gameState', rooms[roomId].gameState);

document.addEventListener('DOMContentLoaded', (event) => {
    const startButton = document.querySelector('button');
    startButton.addEventListener('click', startGame);
});