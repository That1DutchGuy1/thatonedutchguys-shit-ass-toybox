const holes = document.querySelectorAll('.hole');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const finalScoreEl = document.getElementById('final-score');
const gameOverScreen = document.getElementById('game-over');
const hitSound = document.getElementById('hit-sound');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const durationSelect = document.getElementById('duration');
const hammerCursor = document.getElementById('hammer-cursor');

// Audio elements
const mainMenuTheme = document.getElementById('main-menu-theme');
const rickLolSound = document.getElementById('rick-lol-sound');
const noScoreSound = document.getElementById('no-score-sound');
const badScoreSound = document.getElementById('bad-score-sound');
const mediocreScoreSound = document.getElementById('mediocre-score-sound');
const goodScoreSound = document.getElementById('good-score-sound');
const niceScoreSound = document.getElementById('nice-score-sound');
const excellentScoreSound = document.getElementById('excellent-score-sound');

const memes = [
  'Trollface.png', 'Pingas.png', 'Weegee.png', 'Zelda-CD-i.png', 'Ganon-CD-i.png', 'HotelMarioBowser.png', 'HotelMarioPrincessPeach.png',
  'Morshu-CD-i.png', 'yippee-autism-creature.png', 'PepeTheFrog.png', 'Link-CD-i.png', 'Gwonam-CD-i.png',
  'Immafirinmahlazer.png', 'HotelMarioMario.png', 'HotelMarioLuigi.png', 'King-Harkinian-CD-i.png', 'Hampter.png', 'phil-swift.png',
  'Rickroll.png' 
];

// --- IMAGE PRELOADING ENGINE ---
const preloadedImages = [];

function preloadAssets() {
  memes.forEach(memeName => {
    const img = new Image();
    img.src = `assets/memes/${memeName}`;
    preloadedImages.push(img);
  });
  const hammer = new Image();
  hammer.src = 'assets/cursor/Hammer.png';
  preloadedImages.push(hammer);
}

preloadAssets();

let score = 0;
let time = 30;
let gameRunning = false;
let timer;
let spawnRate = 800;

// --- NWOBHM METAL ENGINE ---
let audioCtx;
let isMusicPlaying = false;
let nextNoteTime = 0;
let currentStep = 0;
let musicTimerID;

const tempo = 145; 
const stepDuration = 60 / tempo / 4; 

function playKick(time) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);
  gain.gain.setValueAtTime(0.2, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(time);
  osc.stop(time + 0.1);
}

function playSnare(time) {
  const bufferSize = audioCtx.sampleRate * 0.1;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;
  const noiseFilter = audioCtx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 1000;
  const noiseEnvelope = audioCtx.createGain();
  noiseEnvelope.gain.setValueAtTime(0.15, time);
  noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
  noise.connect(noiseFilter).connect(noiseEnvelope).connect(audioCtx.destination);
  noise.start(time);
  noise.stop(time + 0.1);
}

function playBass(freq, time) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq / 2, time); 
  gain.gain.setValueAtTime(0.05, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(time);
  osc.stop(time + 0.15);
}

function playGuitar(freq, time) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  osc.type = 'square'; 
  osc.frequency.setValueAtTime(freq, time);
  filter.type = 'lowpass';
  filter.frequency.value = 2000;
  gain.gain.setValueAtTime(0.04, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
  osc.connect(filter).connect(gain).connect(audioCtx.destination);
  osc.start(time);
  osc.stop(time + 0.2);
}

function metalScheduler() {
  if (!isMusicPlaying) return;
  while (nextNoteTime < audioCtx.currentTime + 0.1) {
    if (currentStep % 8 === 0 || currentStep % 8 === 4) playKick(nextNoteTime);
    if (currentStep % 8 === 4) playSnare(nextNoteTime);
    const gallopSteps = [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15];
    if (gallopSteps.includes(currentStep % 16)) playBass(82.41, nextNoteTime); 
    if (currentStep % 16 === 0) {
        playGuitar(82.41, nextNoteTime); 
        playGuitar(123.47, nextNoteTime); 
    } else if (currentStep % 16 === 8) {
        playGuitar(110.00, nextNoteTime); 
        playGuitar(164.81, nextNoteTime); 
    }
    nextNoteTime += stepDuration;
    currentStep++;
  }
  musicTimerID = setTimeout(metalScheduler, 25);
}

function startMusic() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  mainMenuTheme.pause();
  mainMenuTheme.currentTime = 0;
  if (!isMusicPlaying) {
    isMusicPlaying = true;
    nextNoteTime = audioCtx.currentTime + 0.05;
    currentStep = 0;
    metalScheduler();
  }
}

function stopMusic() {
  isMusicPlaying = false;
  clearTimeout(musicTimerID);
}

window.addEventListener('mousemove', (e) => {
  hammerCursor.style.left = `${e.clientX}px`;
  hammerCursor.style.top = `${e.clientY}px`;
});

window.addEventListener('mousedown', () => {
  if (gameRunning) {
    hammerCursor.classList.add('whacking');
    setTimeout(() => hammerCursor.classList.remove('whacking'), 100);
  }
});

function randomizeTextColors() {
  const brightColors = ['#ff0000', '#ff00ff', '#00ff00', '#0000ff', '#ff8c00', '#00ffff'];
  const elements = document.querySelectorAll('h1, h2, p, label, #scoreboard, #creator-link');
  elements.forEach(el => {
    el.style.color = brightColors[Math.floor(Math.random() * brightColors.length)];
  });
}

function randomHole() {
  const idx = Math.floor(Math.random() * holes.length);
  const hole = holes[idx];
  if (hole.querySelector('.meme')) return randomHole();
  return hole;
}

function showFloatingText(text, x, y, color = "white") {
  const el = document.createElement('div');
  el.className = 'floating-text';
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.color = color;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 800);
}

function showMeme() {
  if (!gameRunning) return;
  const hole = randomHole();
  const memeName = memes[Math.floor(Math.random() * memes.length)];
  const img = document.createElement('img');
  img.src = `assets/memes/${memeName}`;
  img.classList.add('meme');
  img.dataset.meme = memeName;

  img.addEventListener('mousedown', (e) => {
    if (img.dataset.hit) return;
    img.dataset.hit = "true";
    randomizeTextColors(); 
    if (memeName === 'Rickroll.png') {
      time = Math.max(0, time - 3);
      timeEl.textContent = time;
      showFloatingText("-3s", e.pageX, e.pageY, "#ff4444");
      if (rickLolSound) { rickLolSound.currentTime = 0; rickLolSound.play(); }
    } else {
      score++;
      scoreEl.textContent = score;
      showFloatingText("+1", e.pageX, e.pageY, "#44ff44");
      spawnRate = Math.max(250, spawnRate - 8);
      if (hitSound) { hitSound.currentTime = 0; hitSound.play(); }
    }
    img.classList.add('whacked');
    setTimeout(() => img.remove(), 100);
  });

  hole.appendChild(img);
  setTimeout(() => img.classList.add('up'), 20);
  const displayTime = Math.max(500, 1400 - (score * 12));
  setTimeout(() => {
    if (img.parentNode && !img.dataset.hit) {
      img.classList.remove('up');
      setTimeout(() => img.remove(), 200);
    }
  }, displayTime);
}

function startGame() {
  const chosenTime = parseInt(durationSelect.value);
  score = 0;
  time = chosenTime;
  spawnRate = 800;
  gameRunning = true;
  document.body.classList.add('game-active'); //
  randomizeTextColors(); 
  scoreEl.textContent = score;
  timeEl.textContent = time;
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  startMusic();
  const gameLoop = () => {
    if (!gameRunning) return;
    showMeme();
    setTimeout(gameLoop, spawnRate);
  };
  gameLoop();
  clearInterval(timer);
  timer = setInterval(() => {
    time--;
    timeEl.textContent = time;
    if (time <= 0) endGame();
  }, 1000);
}

function endGame() {
  gameRunning = false;
  clearInterval(timer);
  stopMusic();
  document.body.classList.remove('game-active'); //
  finalScoreEl.textContent = score;
  gameOverScreen.classList.remove('hidden');
  document.querySelectorAll('.meme').forEach(m => m.remove());
  if (score === 0) noScoreSound.play();
  else if (score >= 1 && score <= 9) badScoreSound.play();
  else if (score >= 10 && score <= 18) mediocreScoreSound.play();
  else if (score >= 19 && score <= 27) goodScoreSound.play();
  else if (score >= 28 && score <= 40) niceScoreSound.play();
  else if (score > 40) excellentScoreSound.play();
}

function goBackToMenu() {
  gameOverScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
  document.body.classList.remove('game-active'); //
  mainMenuTheme.play();
}

function handleFirstInteraction() {
  if (mainMenuTheme.paused && !gameRunning) {
    mainMenuTheme.play().catch(e => console.log("Autoplay prevented:", e));
  }
  document.removeEventListener('click', handleFirstInteraction);
}

document.addEventListener('click', handleFirstInteraction);
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
backToMenuBtn.addEventListener('click', goBackToMenu);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !gameRunning) {
    if (!gameOverScreen.classList.contains('hidden')) startGame();
    else if (!startScreen.classList.contains('hidden')) startGame();
  }
});