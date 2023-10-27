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
    console.log('Start Game clicked. Current room ID:', currentRoomId);

    if (currentRoomId) {
        console.log('Emitting startGame event');
        socket.emit('startGame', { roomId: currentRoomId });
    } else {
        console.log('No current room ID available');
        alert("You're not in a game room!");
    }
});

function updateRoomIdDisplay(roomId) {
    document.getElementById('room-id').textContent = roomId || 'Unknown Room';
}

socket.on('roomCreated', (data) => {
    console.log("Received roomCreated data:", data);
    currentRoomId = data.roomId;
    updateRoomIdDisplay(currentRoomId);
    document.getElementById('room-id').textContent = currentRoomId || "Unknown Room";
    document.getElementById('game-container').style.display = 'block';
    alert(`New game created! Room ID is ${currentRoomId}. Share this ID with your friends to join the game.`);
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

function displayCards() {
    cardContainer.innerHTML = '';
    if (Array.isArray(cards)) {
        cards.forEach(card => {
            let cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.textContent = card;
            cardElement.onclick = () => playCard(card);
            cardContainer.appendChild(cardElement);
            cardElement.setAttribute('data-card-value', card);
        })
    } else {
        console.error('Cards is not an array:', cards);
    };
}

function startGame() {
    playedCards = [];
    updateStatusBar();
}

function playCard(card) {
    let index = cards.indexOf(card);
    if (index !== -1) {
        cards.splice(index, 1);
        displayCards();
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

function updateStatusBar() {
    levelElement.textContent = 'Level: ' + (level || 'Unknown Level');
    livesElement.textContent = 'Lives: ' + (lives || 'Unknown Lives');
}

function removeCardFromDisplay(cardValue) {
    const cardElement = cardContainer.querySelector(`[data-card-value="${cardValue}"]`);
    if (cardElement) {
        cardElement.remove();
    }
}

function addCardToPlayedContainer(cardValue) {
    let playedCardContainer = document.getElementById('played-card-container');
    if (playedCardContainer) {
        let playedCardElement = document.createElement('div');
        playedCardElement.className = 'played-card';
        playedCardElement.textContent = cardValue;
        playedCardContainer.appendChild(playedCardElement);
    } else {
        console.error('Played card container not found');
    }
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
    const { gameState } = updatedGameState;

    if (gameState) {
        currentRoomId = updatedGameState.roomId;
        cards = gameState.playerCards[socket.id];
        playedCards = updatedGameState.playedCards;
        level = gameState.level;
        lives = gameState.lives;
        displayCards();
        displayPlayedCards(playedCards);
        updateStatusBar();
    } else {
        console.error('gameState is undefined:', updatedGameState);
    }
});


socket.on('updateCard', (data) => {
    console.log(data);
    const { card, playedCards: newPlayedCards, gameState } = data;

    if (gameState) {
        level = gameState.level;
        lives = gameState.lives;
        cards = gameState.playerCards[socket.id];
        playedCards = newPlayedCards;

        displayCards();
        displayPlayedCards(playedCards);
        updateStatusBar();
    } else {
        console.error('gameState is undefined:', data);
    }
});

function displayPlayedCards(playedCards) {
    let playedCardContainer = document.getElementById('played-card-container');
    playedCardContainer.innerHTML = '';
    playedCards.forEach(cardValue => {
        let playedCardElement = document.createElement('div');
        playedCardElement.className = 'played-card';
        playedCardElement.textContent = cardValue;
        playedCardContainer.appendChild(playedCardElement);
    });
}

socket.on('gameStarted', (data) => {
    console.log('Game is starting with initial cards:', data.initialCards);
    level = data.gameState.level;
    lives = data.gameState.lives;
    cards = data.initialCards;
    displayCards();
    updateStatusBar();
});

document.addEventListener('DOMContentLoaded', (event) => {
    const startButton = document.querySelector('button');
    startButton.addEventListener('click', startGame);
});
