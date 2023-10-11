const socket = io();

let cards = [];
let cardContainer = document.getElementById('card-container');
let levelElement = document.getElementById('level');
let livesElement = document.getElementById('lives');
let messageElement = document.getElementById('message');
let level = 1;
let lives = 3;
let playedCards = [];

function generateCards() {
    cards = [];
    while (cards.length < level) {
        let randomNumber = Math.floor(Math.random() * 100) + 1;
        if (cards.indexOf(randomNumber) === -1) cards.push(randomNumber);
    }
    cards.sort((a, b) => a - b);
}

function displayCards() {
    cardContainer.innerHTML = '';  // Clear the card 
    cards.forEach(card => {
        let cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.textContent = card;
        cardElement.onclick = () => playCard(card);
        cardContainer.appendChild(cardElement);
    });
}

function startGame() {
    level = 1;
    lives = 3;
    playedCards = [];
    updateStatusBar();
    generateCards();
    displayCards();
}

function playCard(card) {
    let index = cards.indexOf(card);
    if (index !== -1) {
        playedCards.push(cards.splice(index, 1)[0]);  // Remove the card and add it to playedCards
        displayCards();
        checkOrder();
    }
}

function checkOrder() {
    if (playedCards.length === level) {
        if (JSON.stringify(playedCards) === JSON.stringify(cards.concat(playedCards).sort((a, b) => a - b))) {
            // Correct order
            messageElement.textContent = 'Success! Moving to next level.';
            level++;
            playedCards = [];
            setTimeout(startGame, 2000);  // Move to next level after 2 seconds
        } else {
            // Incorrect order
            messageElement.textContent = 'Incorrect order. Try again.';
            lives--;
            if (lives === 0) {
                messageElement.textContent = 'Game Over! Click "Start Game" to try again.';
            } else {
                playedCards = [];
                setTimeout(startGame, 2000);  // Restart level after 2 seconds
            }
        }
        updateStatusBar();
    }
}

function updateStatusBar() {
    levelElement.textContent = 'Level: ' + level;
    livesElement.textContent = 'Lives: ' + lives;
}

document.addEventListener('DOMContentLoaded', (event) => {
    const startButton = document.querySelector('button');
    startButton.addEventListener('click', startGame);
});