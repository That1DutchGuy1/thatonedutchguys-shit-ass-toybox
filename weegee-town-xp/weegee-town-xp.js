const startMenu = document.getElementById('start-menu');
const playButton = document.getElementById('play-button');
const weegee = document.getElementById('weegee');
const scoreVal = document.getElementById('score-val');
const missedVal = document.getElementById('missed-val');
const errorDialog = document.getElementById('error-dialog');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');
const townScaler = document.getElementById('town-scaler');

// --- CUSTOM AUDIO THEME CONFIGURATION ---
const bgMusic = new Audio('Weegee-Town-XP-Theme.wav');
bgMusic.loop = true;

// --- GAME OVER SOUND CONFIGURATION ---
const errorSound = new Audio('XP-Error.wav');

let score = 0;
let missed = 0;
let baseDuration = 2200;
let currentDuration = baseDuration;
let gameActive = false;
let retreatTimer = null;
let spawnTimer = null;
let currentHideout = null;

// Dynamically registers every single structural port location
const hideouts = Array.from(document.querySelectorAll('.hideout'));

// -----------------------------------------------------------------------
// FIXED-PIXEL CANVAS SCALING
//
// The inner .town-environment is a fixed 1920×1035 px canvas.
// The outer #town-scaler fills the viewport area below the HUD and is
// the ONLY element that gets a transform.  Its transform-origin is
// bottom center, so scale() always anchors to the bottom of the screen.
//
// Separating centering (margin-left: -960px on .town-environment)
// from scaling (#town-scaler transform) means that toggling fullscreen
// only changes the scale number — the layout never drifts.
// -----------------------------------------------------------------------
const REF_WIDTH  = 1920;
const REF_HEIGHT = 1035; // 1080 minus 45px HUD

function scaleTown() {
    const vw = window.innerWidth;
    const vh = window.innerHeight - 45;
    const scale = Math.min(vw / REF_WIDTH, vh / REF_HEIGHT);
    townScaler.style.setProperty('--town-scale', scale);
}

scaleTown();
window.addEventListener('resize', scaleTown);

// -----------------------------------------------------------------------

playButton.addEventListener('click', () => {
    startMenu.style.display = 'none';
    startGame();
});

function startGame() {
    score = 0;
    missed = 0;
    currentDuration = baseDuration;
    gameActive = true;

    scoreVal.textContent = score;
    missedVal.textContent = missed;
    errorDialog.style.display = 'none';

    bgMusic.currentTime = 0;
    bgMusic.play().catch(err => console.log("Audio playback delayed or blocked:", err));

    queueNextSpawn();
}

function queueNextSpawn() {
    if (!gameActive) return;
    const spawnDelay = Math.random() * 900 + 500;
    spawnTimer = setTimeout(spawnWeegee, spawnDelay);
}

function spawnWeegee() {
    if (!gameActive) return;

    currentHideout = hideouts[Math.floor(Math.random() * hideouts.length)];

    const directionalSprite = currentHideout.getAttribute('data-sprite');
    weegee.src = directionalSprite;

    currentHideout.appendChild(weegee);

    setTimeout(() => {
        if (gameActive) weegee.classList.add('visible');
    }, 10);

    retreatTimer = setTimeout(() => {
        weegee.classList.remove('visible');
        missed++;
        missedVal.textContent = missed;

        if (missed >= 5) {
            triggerGameOver();
        } else {
            queueNextSpawn();
        }
    }, currentDuration);
}

weegee.addEventListener('mousedown', (e) => {
    e.stopPropagation();

    if (!gameActive || !weegee.classList.contains('visible')) return;

    clearTimeout(retreatTimer);
    weegee.classList.remove('visible');

    score++;
    scoreVal.textContent = score;

    if (score % 5 === 0) {
        currentDuration = Math.max(500, currentDuration - 250);
    }

    queueNextSpawn();
});

function triggerGameOver() {
    gameActive = false;
    weegee.classList.remove('visible');
    clearTimeout(retreatTimer);
    clearTimeout(spawnTimer);

    bgMusic.pause();
    bgMusic.currentTime = 0;

    errorSound.play().catch(err => console.log("Error sound playback delayed or blocked:", err));

    setTimeout(() => {
        errorDialog.style.display = 'block';
    }, 250);
}

restartBtn.addEventListener('click', startGame);

menuBtn.addEventListener('click', () => {
    errorDialog.style.display = 'none';
    startMenu.style.display = 'flex';
});