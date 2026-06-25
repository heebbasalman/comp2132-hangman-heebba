'use strict';

const correctSound = new Audio('assets/sounds/correct.mp3');
const wrongSound = new Audio('assets/sounds/wrong.mp3');
const winSound = new Audio('assets/sounds/win.mp3');
const loseSound = new Audio('assets/sounds/lose.mp3');

function stopAllSounds() {
  [correctSound, wrongSound, winSound, loseSound].forEach((sound) => {
    sound.pause();
    sound.currentTime = 0;
  });
}

function playSound(sound) {
  if (!gameState.soundOn) {
    return;
  }

  sound.currentTime = 0;
  sound.play();
}

const gameState = {
  word: '',
  hint: '',
  category: '',
  guessedLetters: [],
  wrongGuesses: 0,
  maxWrongGuesses: 7,
  gameOver: false,
  hintsLeft: 3,
  shieldReady: true,
  soundOn: true,
  wordBank: [],
  stats: {
    wins: 0,
    losses: 0,
    streak: 0,
    bestStreak: 0
  }
};


const fallbackWordBank = [
  { word: 'CANADA', hint: 'A country with maple leaves and hockey', category: 'Countries' },
  { word: 'JAVASCRIPT', hint: 'The language making this game interactive', category: 'Technology' },
  { word: 'CARNIVAL', hint: 'A place with rides, lights, and games', category: 'Places' },
  { word: 'PUMPKIN', hint: 'A round orange fall decoration', category: 'Halloween' },
  { word: 'VAMPIRE', hint: 'A classic spooky character with a cape', category: 'Halloween' },
  { word: 'KEYBOARD', hint: 'You use it to type letters', category: 'Technology' },
  { word: 'RAINBOW', hint: 'Colourful arc after rain', category: 'Nature' },
  { word: 'GALAXY', hint: 'A huge group of stars', category: 'Space' },
  { word: 'DRAGON', hint: 'A legendary creature that can fly', category: 'Fantasy' },
  { word: 'TREASURE', hint: 'Pirates love finding this', category: 'Adventure' },
  { word: 'MYSTERY', hint: 'Something waiting to be solved', category: 'Puzzle' },
  { word: 'VICTORY', hint: 'What you get when you win', category: 'Game Words' }
];

const elements = {
  wordDisplay: document.querySelector('#wordDisplay'),
  hintText: document.querySelector('#hintText'),
  categoryBadge: document.querySelector('#categoryBadge'),
  mistakes: document.querySelector('#mistakes'),
  message: document.querySelector('#message'),
  keyboard: document.querySelector('#keyboard'),
  buddyImage: document.querySelector('#buddyImage'),
  dangerFill: document.querySelector('#dangerFill'),
  hintButton: document.querySelector('#hintButton'),
  shieldButton: document.querySelector('#shieldButton'),
  newGameButton: document.querySelector('#newGameButton'),
  soundButton: document.querySelector('#soundButton'),
  resetStatsButton: document.querySelector('#resetStatsButton'),
  hintsLeft: document.querySelector('#hintsLeft'),
  wins: document.querySelector('#wins'),
  losses: document.querySelector('#losses'),
  streak: document.querySelector('#streak'),
  bestStreak: document.querySelector('#bestStreak'),
  achievementToast: document.querySelector('#achievementToast'),
  confettiCanvas: document.querySelector('#confettiCanvas')
};

const buddyImages = [
  'assets/images/buddy-normal.svg',
  'assets/images/buddy-worried.svg',
  'assets/images/buddy-sweat.svg',
  'assets/images/buddy-nervous.svg',
  'assets/images/buddy-cloudy.svg',
  'assets/images/buddy-scared.svg',
  'assets/images/buddy-close.svg',
  'assets/images/buddy-lost.svg'
];

class RescueAchievement {
  constructor(name, testFunction) {
    this.name = name;
    this.testFunction = testFunction;
  }

  check() {
    if (this.testFunction()) {
      showAchievement(this.name);
    }
  }
}

const achievements = [
  new RescueAchievement('🏆 First Victory!', () => gameState.stats.wins === 1),
  new RescueAchievement('🔥 Three Win Streak!', () => gameState.stats.streak === 3),
  new RescueAchievement('✨ Perfect Rescue!', () => gameState.wrongGuesses === 0 && gameState.gameOver)
];

async function loadWords() {
  try {
    const response = await fetch('data/words.json');
    if (!response.ok) {
      throw new Error('Could not load words.json');
    }
    gameState.wordBank = await response.json();
  } catch (error) {
    // Chrome blocks fetch() when index.html is opened directly with file://.
    // This fallback keeps the game playable while the submitted project still
    // satisfies the requirement of loading the JSON file through fetch() on Live Server.
    console.warn('Using fallback word list because words.json could not be fetched.', error);
    gameState.wordBank = fallbackWordBank;
    elements.message.textContent = 'Offline mode: using the built-in word list. Live Server will load data/words.json.';
  }

  startNewGame();
}

function startNewGame() {
  stopAllSounds();
  const randomIndex = Math.floor(Math.random() * gameState.wordBank.length);
  const selectedWord = gameState.wordBank[randomIndex];

  gameState.word = selectedWord.word.toUpperCase();
  gameState.hint = selectedWord.hint;
  gameState.category = selectedWord.category;
  gameState.guessedLetters = [];
  gameState.wrongGuesses = 0;
  gameState.gameOver = false;
  gameState.hintsLeft = 3;
  gameState.shieldReady = true;

  elements.message.textContent = 'Pick a letter to start the rescue mission!';
  elements.hintButton.disabled = false;
  elements.shieldButton.disabled = false;
  elements.shieldButton.textContent = '🛡 Shield Ready';
  elements.buddyImage.src = buddyImages[0];
  elements.buddyImage.className = 'buddy-image';
  document.body.classList.remove('shake');

  createKeyboard();
  updateDisplay();
}

function createKeyboard() {
  elements.keyboard.innerHTML = '';
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((letter) => {
    const button = document.createElement('button');
    button.textContent = letter;
    button.className = 'letter-button';
    button.type = 'button';
    button.addEventListener('click', () => handleGuess(letter, button));
    elements.keyboard.appendChild(button);
  });
}

function handleGuess(letter, button) {
  if (gameState.gameOver || gameState.guessedLetters.includes(letter)) {
    return;
  }

  gameState.guessedLetters.push(letter);
  button.disabled = true;

  if (gameState.word.includes(letter)) {
    button.classList.add('correct');
    elements.message.textContent = `Nice! ${letter} is in the word.`;
    correctSound.currentTime = 0;
    playSound(correctSound);
    animateBuddy('jump');
  } else if (gameState.shieldReady) {
    button.classList.add('wrong');
    gameState.shieldReady = false;
    elements.shieldButton.textContent = '🛡 Shield Used';
    elements.shieldButton.disabled = true;
    elements.message.textContent = `Shield blocked the wrong guess for ${letter}!`;
    playTone(330);
  } else {
    button.classList.add('wrong');
    gameState.wrongGuesses += 1;
    elements.message.textContent = `${letter} is not in the word. Buddy needs you!`;
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 450);
    animateBuddy('wobble');
    wrongSound.currentTime = 0;
    playSound(wrongSound);
  }

  updateDisplay();
  checkGameStatus();
}

function updateDisplay() {
  const displayedWord = gameState.word
    .split('')
    .map((letter) => gameState.guessedLetters.includes(letter) ? letter : '_')
    .join('');;

  elements.wordDisplay.textContent = displayedWord;
  elements.hintText.textContent = gameState.hint;
  elements.categoryBadge.textContent = `Category: ${gameState.category}`;
  elements.mistakes.textContent = `Mistakes: ${gameState.wrongGuesses} / ${gameState.maxWrongGuesses}`;
  elements.hintsLeft.textContent = gameState.hintsLeft;
  elements.dangerFill.style.width = `${(gameState.wrongGuesses / gameState.maxWrongGuesses) * 100}%`;
  elements.buddyImage.src = buddyImages[gameState.wrongGuesses];
  updateStatsDisplay();
}

function checkGameStatus() {
  const playerWon = gameState.word.split('').every((letter) => gameState.guessedLetters.includes(letter));
  const playerLost = gameState.wrongGuesses >= gameState.maxWrongGuesses;

  if (playerWon) {
    endGame(true);
  } else if (playerLost) {
    endGame(false);
  }
}

function endGame(playerWon) {
  gameState.gameOver = true;
  disableKeyboard();
  elements.hintButton.disabled = true;
  elements.shieldButton.disabled = true;

  if (playerWon) {
    gameState.stats.wins += 1;
    gameState.stats.streak += 1;
    gameState.stats.bestStreak = Math.max(gameState.stats.bestStreak, gameState.stats.streak);
    elements.message.textContent = `🎉 You saved Buddy! The word was ${gameState.word}.`;
    elements.buddyImage.src = 'assets/images/buddy-win.svg';
    animateBuddy('jump');
    launchConfetti();
    achievements.forEach((achievement) => achievement.check());
    winSound.currentTime = 0;
    playSound(winSound);
  } else {
    gameState.stats.losses += 1;
    gameState.stats.streak = 0;
    elements.message.textContent = `Game over! The word was ${gameState.word}. Try again!`;
    elements.buddyImage.src = 'assets/images/buddy-lost.svg';
    document.body.classList.add('shake');
    loseSound.currentTime = 0;
    playSound(loseSound);
  }

  saveStats();
  updateStatsDisplay();
}

function disableKeyboard() {
  document.querySelectorAll('.letter-button').forEach((button) => {
    button.disabled = true;
  });
}

function useHint() {
  if (gameState.gameOver || gameState.hintsLeft <= 0) {
    return;
  }

  const hiddenLetters = gameState.word
    .split('')
    .filter((letter) => !gameState.guessedLetters.includes(letter));

  if (hiddenLetters.length === 0) {
    return;
  }

  const revealedLetter = hiddenLetters[Math.floor(Math.random() * hiddenLetters.length)];
  gameState.guessedLetters.push(revealedLetter);
  gameState.hintsLeft -= 1;

  const matchingButton = [...document.querySelectorAll('.letter-button')]
    .find((button) => button.textContent === revealedLetter);

  if (matchingButton) {
    matchingButton.disabled = true;
    matchingButton.classList.add('correct');
  }

  elements.message.textContent = `💡 Hint revealed the letter ${revealedLetter}!`;
  if (gameState.hintsLeft === 0) {
    elements.hintButton.disabled = true;
  }

  updateDisplay();
  checkGameStatus();
}

function animateBuddy(animationClass) {
  elements.buddyImage.classList.remove('jump', 'wobble');
  void elements.buddyImage.offsetWidth;
  elements.buddyImage.classList.add(animationClass);
}

function loadStats() {
  const savedStats = localStorage.getItem('saveBuddyStats');
  if (savedStats) {
    gameState.stats = JSON.parse(savedStats);
  }
  updateStatsDisplay();
}

function saveStats() {
  localStorage.setItem('saveBuddyStats', JSON.stringify(gameState.stats));
}

function updateStatsDisplay() {
  elements.wins.textContent = gameState.stats.wins;
  elements.losses.textContent = gameState.stats.losses;
  elements.streak.textContent = gameState.stats.streak;
  elements.bestStreak.textContent = gameState.stats.bestStreak;
}

function resetStats() {
  gameState.stats = { wins: 0, losses: 0, streak: 0, bestStreak: 0 };
  saveStats();
  updateStatsDisplay();
  showAchievement('Stats reset!');
}

function showAchievement(text) {
  elements.achievementToast.textContent = text;
  elements.achievementToast.classList.add('show');
  setTimeout(() => elements.achievementToast.classList.remove('show'), 2400);
}

function launchConfetti() {
  const canvas = elements.confettiCanvas;
  const context = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const pieces = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * -canvas.height,
    size: Math.random() * 8 + 4,
    speed: Math.random() * 4 + 2,
    rotation: Math.random() * 360
  }));

  let frame = 0;
  function drawConfetti() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach((piece) => {
      piece.y += piece.speed;
      piece.rotation += 6;
      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.rotation * Math.PI / 180);
      context.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size);
      context.restore();
    });
    frame += 1;
    if (frame < 130) {
      requestAnimationFrame(drawConfetti);
    } else {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }
  drawConfetti();
}

function playTone(frequency) {
  if (!gameState.soundOn) {
    return;
  }

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) {
    return;
  }

  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.frequency.value = frequency;
  oscillator.type = 'sine';
  gainNode.gain.setValueAtTime(0.07, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.22);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.22);
}

elements.newGameButton.addEventListener('click', startNewGame);
elements.hintButton.addEventListener('click', useHint);
elements.resetStatsButton.addEventListener('click', resetStats);
elements.soundButton.addEventListener('click', () => {
  gameState.soundOn = !gameState.soundOn;

  if (!gameState.soundOn) {
    stopAllSounds();
  }

  elements.soundButton.textContent = gameState.soundOn ? '🔊 Sound On' : '🔇 Sound Off';
});

loadStats();
loadWords();
