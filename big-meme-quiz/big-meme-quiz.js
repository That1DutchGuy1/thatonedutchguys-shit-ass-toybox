// =============================================================
// THE BIG MEME QUIZ! - engine
// Reads every .question block inside #quiz-container in DOM order
// and runs it based on its data-type. Duplicate the HTML templates
// to add more questions - this file does not need to change.
// =============================================================

// --- MEME IMAGE LIST ---
// Every filename referenced by a question below, in one place.
// Drop the matching images into assets/memes/ and you're set.
const MEME_IMAGES = [
  'dramatic-chipmunk.png',
  'chuck-norris-facts.png',
  'all-your-base.png',
  'star-wars-kid.png',
  'numa-numa-guy.png',
  'leeroy-jenkins.png',
  'peanut-butter-jelly-time.png',
  'keyboard-cat.png',
  'o-rly-owl.png',
  'trogdor.png',
  'chocolate-rain.png',
  'afro-ninja.png',

  // --- YouTube Poop (YTP) culture set ---
  'n64-cartridge.png',
  'spaghetti-dinner.png',
  'super-mario-bros-3-cartoon.png',
  'pingas.png',
  'dr-robotnik.png',
  'angry-german-kid.png',
  'mama-luigi.png',
  'hotel-mario.png',
  'king-harkinian.png',
  'morshu.png',
  'michael-rosen.png',
  'angry-video-game-nerd.png'
];

// --- IMAGE PRELOADING ENGINE ---
const preloadedImages = [];

function preloadMemeImages() {
  MEME_IMAGES.forEach(memeName => {
    const img = new Image();
    img.src = `assets/memes/${memeName}`;
    preloadedImages.push(img);
  });
}

preloadMemeImages();

const DEFAULT_TIME = {
  mc: 15,
  typing: 25,
  drag: 20
};

const MAX_MISTAKES = 2;

const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const endScreen = document.getElementById('end-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');

const scoreEl = document.getElementById('score');
const mistakeCountEl = document.getElementById('mistake-count');
const timeEl = document.getElementById('time');
const timerBar = document.getElementById('timer-bar');
const finalScoreEl = document.getElementById('final-score');
const quizTheme = document.getElementById('quiz-theme');
const victoryFanfare = document.getElementById('victory-fanfare');

const questions = Array.from(document.querySelectorAll('#quiz-container .question'));

// runQuestions holds the shuffled, no-repeat order for the CURRENT playthrough.
// Rebuilt fresh every time startQuiz() runs.
let runQuestions = [];

let currentIndex = 0;
let score = 0;
let mistakes = 0;
let timeLeft = 0;
let timerInterval = null;
let questionLocked = false; // prevents double-scoring once a question resolves

// Fisher-Yates shuffle - returns a new shuffled array, doesn't mutate the input.
function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Randomizes the DOM order of a container's children (used to reshuffle
// drag-item / drop-zone layouts so the answer position isn't memorizable).
function shuffleChildren(container) {
  const children = Array.from(container.children);
  shuffleArray(children).forEach(child => container.appendChild(child));
}

// Normalizes typed answers: trims, lowercases, and collapses extra whitespace
// so capitalization/spacing never matters, only the actual spelling does.
function normalizeAnswer(str) {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

function initQuestions() {
  questions.forEach(q => q.classList.add('hidden'));
}

function startQuiz() {
  currentIndex = 0;
  score = 0;
  runQuestions = shuffleArray(questions); // fresh random order, each question exactly once
  scoreEl.textContent = score;
  startScreen.classList.add('hidden');
  endScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  document.body.classList.add('game-active');
  initQuestions();
  loadQuestion(currentIndex);

  if (quizTheme) {
    quizTheme.currentTime = 0;
    quizTheme.play().catch(e => console.log("Autoplay prevented:", e));
  }

  if (victoryFanfare) {
    victoryFanfare.pause();
    victoryFanfare.currentTime = 0;
  }
}

function loadQuestion(index) {
  if (index >= runQuestions.length) {
    finishQuiz();
    return;
  }

  questions.forEach(q => q.classList.add('hidden'));
  const q = runQuestions[index];
  q.classList.remove('hidden');

  mistakes = 0;
  questionLocked = false;
  mistakeCountEl.textContent = mistakes;

  resetQuestionVisuals(q);

  // Reshuffle the drag items and drop zones every time this question loads
  // so their on-screen positions aren't memorizable between attempts.
  if (q.dataset.type === 'drag') {
    const dragItemsContainer = q.querySelector('.drag-items');
    const dropZonesContainer = q.querySelector('.drop-zones');
    if (dragItemsContainer) shuffleChildren(dragItemsContainer);
    if (dropZonesContainer) shuffleChildren(dropZonesContainer);
  }

  const type = q.dataset.type;
  const customTime = parseInt(q.dataset.time, 10);
  timeLeft = !isNaN(customTime) ? customTime : (DEFAULT_TIME[type] || 15);
  updateTimerDisplay();

  setupQuestion(q, type);
  startTimer();
}

function resetQuestionVisuals(q) {
  q.querySelectorAll('.option').forEach(opt => {
    opt.disabled = false;
    opt.classList.remove('correct-flash', 'wrong-flash');
  });
  const input = q.querySelector('.typing-input');
  if (input) {
    input.value = '';
    input.classList.remove('correct-flash', 'wrong-flash');
    input.disabled = false;
  }
  q.querySelectorAll('.drag-item').forEach(item => {
    item.classList.remove('placed', 'dragging');
    item.style.display = '';
  });
  q.querySelectorAll('.drop-zone').forEach(zone => {
    zone.classList.remove('drag-over', 'correct-flash', 'wrong-flash', 'filled');
    zone.innerHTML = zone.dataset.originalLabel || zone.textContent;
    zone.dataset.originalLabel = zone.dataset.originalLabel || zone.textContent;
  });
}

function startTimer() {
  clearInterval(timerInterval);
  timerBar.style.transition = 'none';
  timerBar.style.width = '100%';
  timerBar.classList.remove('warning', 'danger');
  // force reflow so the transition re-applies cleanly
  void timerBar.offsetWidth;
  timerBar.style.transition = 'width 1s linear, background-color 0.3s ease';

  const totalTime = timeLeft;

  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();

    const pct = Math.max(0, (timeLeft / totalTime) * 100);
    timerBar.style.width = `${pct}%`;
    if (pct <= 20) timerBar.classList.add('danger');
    else if (pct <= 50) timerBar.classList.add('warning');

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      handleTimeUp();
    }
  }, 1000);
}

function updateTimerDisplay() {
  timeEl.textContent = Math.max(0, timeLeft);
}

function handleTimeUp() {
  if (questionLocked) return;
  questionLocked = true;
  advanceAfterDelay(700);
}

function registerMistake(q) {
  mistakes++;
  mistakeCountEl.textContent = mistakes;
  if (mistakes >= MAX_MISTAKES) {
    questionLocked = true;
    clearInterval(timerInterval);
    advanceAfterDelay(700);
  }
}

function registerCorrect() {
  score++;
  scoreEl.textContent = score;
  questionLocked = true;
  clearInterval(timerInterval);
  advanceAfterDelay(700);
}

function advanceAfterDelay(ms) {
  setTimeout(() => {
    currentIndex++;
    loadQuestion(currentIndex);
  }, ms);
}

// -------------------------------------------------------------
// QUESTION TYPE SETUP
// -------------------------------------------------------------
function setupQuestion(q, type) {
  if (type === 'mc') setupMC(q);
  else if (type === 'typing') setupTyping(q);
  else if (type === 'drag') setupDrag(q);
}

function setupMC(q) {
  const options = Array.from(q.querySelectorAll('.option'));
  options.forEach(opt => {
    opt.onclick = () => {
      if (questionLocked) return;
      const isCorrect = opt.dataset.correct === 'true';
      if (isCorrect) {
        opt.classList.add('correct-flash');
        options.forEach(o => (o.disabled = true));
        registerCorrect();
      } else {
        opt.classList.add('wrong-flash');
        opt.disabled = true;
        registerMistake(q);
      }
    };
  });
}

function setupTyping(q) {
  const input = q.querySelector('.typing-input');
  const submitBtn = q.querySelector('.submit-btn');
  const accepted = (q.dataset.answers || '')
    .split(',')
    .map(a => normalizeAnswer(a))
    .filter(Boolean);

  function submit() {
    if (questionLocked) return;
    const value = normalizeAnswer(input.value);
    if (accepted.includes(value)) {
      input.classList.add('correct-flash');
      input.disabled = true;
      registerCorrect();
    } else {
      input.classList.add('wrong-flash');
      setTimeout(() => input.classList.remove('wrong-flash'), 400);
      registerMistake(q);
    }
  }

  submitBtn.onclick = submit;
  input.onkeydown = (e) => {
    if (e.key === 'Enter') submit();
  };
}

function setupDrag(q) {
  const items = Array.from(q.querySelectorAll('.drag-item'));
  const zones = Array.from(q.querySelectorAll('.drop-zone'));
  let placedCount = 0;
  const totalItems = items.length;

  items.forEach(item => {
    item.ondragstart = (e) => {
      if (questionLocked) return;
      e.dataTransfer.setData('text/plain', item.dataset.dragId);
      item.classList.add('dragging');
    };
    item.ondragend = () => item.classList.remove('dragging');
  });

  zones.forEach(zone => {
    zone.dataset.originalLabel = zone.dataset.originalLabel || zone.textContent;

    zone.ondragover = (e) => {
      if (questionLocked || zone.classList.contains('filled')) return;
      e.preventDefault();
      zone.classList.add('drag-over');
    };
    zone.ondragleave = () => zone.classList.remove('drag-over');

    zone.ondrop = (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      if (questionLocked || zone.classList.contains('filled')) return;

      const dragId = e.dataTransfer.getData('text/plain');
      const draggedItem = items.find(i => i.dataset.dragId === dragId);
      if (!draggedItem) return;

      const isCorrect = zone.dataset.dropTarget === dragId;

      if (isCorrect) {
        zone.classList.add('correct-flash', 'filled');
        zone.innerHTML = '';
        zone.appendChild(draggedItem.cloneNode(true));
        draggedItem.classList.add('placed');
        draggedItem.style.display = 'none';
        placedCount++;
        if (placedCount >= totalItems) {
          registerCorrect();
        }
      } else {
        zone.classList.add('wrong-flash');
        setTimeout(() => zone.classList.remove('wrong-flash'), 400);
        registerMistake(q);
      }
    };
  });
}

// -------------------------------------------------------------
// END OF QUIZ
// -------------------------------------------------------------
function finishQuiz() {
  clearInterval(timerInterval);
  gameScreen.classList.add('hidden');
  document.body.classList.remove('game-active');
  finalScoreEl.textContent = score;
  endScreen.classList.remove('hidden');

  if (quizTheme) {
    quizTheme.pause();
    quizTheme.currentTime = 0;
  }

  if (victoryFanfare) {
    victoryFanfare.currentTime = 0;
    victoryFanfare.play().catch(e => console.log("Victory fanfare autoplay prevented:", e));
  }
}

function backToMenu() {
  clearInterval(timerInterval);
  endScreen.classList.add('hidden');
  gameScreen.classList.add('hidden');
  document.body.classList.remove('game-active');
  startScreen.classList.remove('hidden');

  if (quizTheme) {
    quizTheme.pause();
    quizTheme.currentTime = 0;
  }

  if (victoryFanfare) {
    victoryFanfare.pause();
    victoryFanfare.currentTime = 0;
  }
}

startBtn.addEventListener('click', startQuiz);
restartBtn.addEventListener('click', startQuiz);
backToMenuBtn.addEventListener('click', backToMenu);

initQuestions();