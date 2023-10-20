let cards = [];
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

socket.on('newGame', (data) => {
    currentRoomId = data.roomId;
    alert(`New game created! Room ID is ${currentRoomId}. Share this ID with your friends to join the game.`);
});

document.getElementById('joinGame').addEventListener('click', () => {
    const roomId = document.getElementById('roomId').value;
    socket.emit('joinGame', { roomId });
});

document.getElementById('startGame').addEventListener('click', () => {
    if (currentRoomId) {
        socket.emit('startGame', { roomId: currentRoomId });
    } else {
        alert("You're not in a game room!");
    }
});

socket.on('roomCreated', (roomId) => {
    document.getElementById('room-id').textContent = roomId;
    document.getElementById('game-container').style.display = 'block';
    alert(`New game created! Room ID is ${roomId}. Share this ID with your friends to join the game.`);
});

socket.on('newGame', (data) => {
    alert(`New game created! Room ID is ${data.roomId}. Share this ID with your friends to join the game.`);
});

socket.on('playerJoined', (data) => {
    console.log("Player Joined Event Triggered", data);
    currentRoomId = data.roomId;
    document.getElementById('room-id').textContent = data.roomId;
    document.getElementById('game-container').style.display = 'block';
    setTimeout(() => {
        alert(`A new player has joined the game. Total players: ${data.players.length}`);
    }, 1000);
});

function generateCards() {
    cards = [];
    while (cards.length < level) {
        let randomNumber = Math.floor(Math.random() * 100) + 1;
        if (cards.indexOf(randomNumber) === -1) cards.push(randomNumber);
    }
    cards.sort((a, b) => a - b);
}

function displayCards() {
    cardContainer.innerHTML = '';
    cards.forEach(card => {
        let cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.textContent = card;
        cardElement.onclick = () => playCard(card);
        cardContainer.appendChild(cardElement)
        cardElement.setAttribute('data-card-value', card);
    });
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

socket.on('updateCard', (data) => {
    const { card } = data;
    removeCardFromDisplay(card);
    addCardToPlayedContainer(card);
});

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
    levelElement.textContent = 'Level: ' + level;
    livesElement.textContent = 'Lives: ' + lives;
}

document.addEventListener('DOMContentLoaded', (event) => {
    const startButton = document.querySelector('button');
    startButton.addEventListener('click', startGame);
});