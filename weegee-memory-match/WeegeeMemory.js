const COLS = 4, ROWS = 4;
const TOTAL_TIME = 60;

// Audio Configuration
const bgMusic = new Audio('Theme.mp3');
bgMusic.loop = true;
const jumpscareSound = new Audio('weegee-evil-laugh.wav');
const winSound = new Audio('yay.mp3'); // Added winning sound effect

// Web Audio API Context (Initialized lazily on first user interaction)
let audioCtx = null;

function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// Synthesizes a short, retro ascending jingle for correct pairs
function playCorrectJingle() {
    initAudioContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    
    // First note (E5)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Second note (A5) slightly delayed
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880.00, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.4);
}

// Synthesizes a short, retro buzzer for mismatched pairs
function playWrongBuzzer() {
    initAudioContext();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const duration = 0.25;

    // Use two detuned oscillators for a thicker, harsher "buzz" sound
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(130.81, now); // C3
    
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(127.81, now); // Slightly detuned

    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.linearRampToValueAtTime(0.01, now + duration);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
}

const CARD_IMAGES = [
    'Weegee_Front.png',
    'Mega_Weegee.png',
    'Weegee-Head-Front.png',
    'Weegee-Head-Right.png',
    '__tint_front_red',
    '__tint_front_blue',
    '__tint_front_purple',
    '__tint_mega_green',
    '__tint_mega_yellow',
    '__tint_mega_orange',
    '__tint_head_cyan',
    '__tint_head_pink',
    '__tint_head_lime',
    '__tint_head_right_red',
    '__tint_head_right_blue',
    '__tint_head_right_purple'
];

const TINT_MAP = {
    '__tint_front_red':          { base: 'Weegee_Front.png', color: '#ff2020' },
    '__tint_front_blue':         { base: 'Weegee_Front.png', color: '#2040ff' },
    '__tint_front_purple':       { base: 'Weegee_Front.png', color: '#aa00cc' },
    '__tint_mega_green':         { base: 'Mega_Weegee.png',  color: '#00cc44' },
    '__tint_mega_yellow':        { base: 'Mega_Weegee.png',  color: '#ffdd00' },
    '__tint_mega_orange':        { base: 'Mega_Weegee.png',  color: '#ff8800' },
    '__tint_head_cyan':          { base: 'Weegee-Head-Front.png', color: '#00ffff' },
    '__tint_head_pink':          { base: 'Weegee-Head-Front.png', color: '#ff66cc' },
    '__tint_head_lime':          { base: 'Weegee-Head-Front.png', color: '#33ff33' },
    '__tint_head_right_red':     { base: 'Weegee-Head-Right.png', color: '#ff2020' },
    '__tint_head_right_blue':    { base: 'Weegee-Head-Right.png', color: '#2040ff' },
    '__tint_head_right_purple':  { base: 'Weegee-Head-Right.png', color: '#aa00cc' }
};

let cards = [], flipped = [], pairsFound = 0, moves = 0, timeLeft = TOTAL_TIME;
let canFlip = false, timerInterval = null, gameActive = false;
let frontImg = null, megaImg = null, headImg = null, headRightImg = null;

function preloadImage(src) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

async function prepareAssets() {
    if (frontImg && megaImg && headImg && headRightImg) return;
    frontImg     = await preloadImage('Weegee_Front.png');
    megaImg      = await preloadImage('Mega_Weegee.png');
    headImg      = await preloadImage('Weegee-Head-Front.png');
    headRightImg = await preloadImage('Weegee-Head-Right.png');
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function buildGridDOM() {
    const tbody = document.getElementById('grid-body');
    tbody.innerHTML = '';
    
    // Pick 8 random image unique keys from the list for this match round
    const pool = shuffle([...CARD_IMAGES]);
    const chosenImages = pool.slice(0, 8);
    
    // Duplicate chosen images to form matching pairs, then scramble the board
    const pairs = shuffle([...chosenImages, ...chosenImages]);
    cards = [];

    for (let r = 0; r < ROWS; r++) {
        const tr = document.createElement('tr');
        for (let c = 0; c < COLS; c++) {
            const index = r * COLS + c;
            const imgKey = pairs[index];
            
            const td = document.createElement('td');
            td.className = 'card-slot';
            td.id = 'slot-' + index;
            td.innerHTML = '<span class="card-back-text">?</span>';
            td.onclick = (function(idx) {
                return function() { cardClicked(idx); };
            })(index);
            
            tr.appendChild(td);
            
            cards.push({
                id: index,
                imgKey: imgKey,
                faceUp: false,
                matched: false
            });
        }
        tbody.appendChild(tr);
    }
}

function renderCardFace(td, imgKey) {
    td.innerHTML = '';
    const isTinted = !!TINT_MAP[imgKey];
    const baseKey = isTinted ? TINT_MAP[imgKey].base : imgKey;
    const color = isTinted ? TINT_MAP[imgKey].color : null;
    
    let label = isTinted ? imgKey.replace('__tint_', '').toUpperCase() : imgKey.replace('.png', '').toUpperCase();
    label = label.replace(/_/g, ' ');

    let baseImg = null;
    if (baseKey === 'Weegee_Front.png') {
        baseImg = frontImg;
    } else if (baseKey === 'Mega_Weegee.png') {
        baseImg = megaImg;
    } else if (baseKey === 'Weegee-Head-Front.png') {
        baseImg = headImg;
    } else if (baseKey === 'Weegee-Head-Right.png') {
        baseImg = headRightImg;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 124;
    canvas.height = 154;
    canvas.style.display = 'block';
    canvas.style.margin = 'auto';
    const ctx = canvas.getContext('2d');

    if (baseImg) {
        ctx.drawImage(baseImg, 0, 0, 124, 154);
        if (color) {
            ctx.globalCompositeOperation = 'source-atop';
            ctx.globalAlpha = 0.50;
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, 124, 154);
        }
    } else {
        ctx.fillStyle = color ? color : '#3a5fcd';
        ctx.fillRect(0, 0, 124, 154);
        
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px Tahoma';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 62, 77);
    }
    td.appendChild(canvas);
}

function cardClicked(idx) {
    if (!gameActive || !canFlip) return;
    const card = cards[idx];
    if (card.faceUp || card.matched) return;

    // Initialize/resume audio context on user click to comply with browser autoplay policies
    initAudioContext();

    const td = document.getElementById('slot-' + idx);
    
    card.faceUp = true;
    td.style.backgroundColor = '#FFFFFF';
    td.style.background = '#FFFFFF';
    td.style.border = '1px solid #0054e3';
    
    renderCardFace(td, card.imgKey);
    
    flipped.push(card);

    if (flipped.length === 2) {
        moves++;
        document.getElementById('hud-moves').innerText = moves;
        canFlip = false;
        setTimeout(checkMatch, 800);
    }
}

function checkMatch() {
    const [a, b] = flipped;
    const tdA = document.getElementById('slot-' + a.id);
    const tdB = document.getElementById('slot-' + b.id);

    if (a.imgKey === b.imgKey) {
        a.matched = b.matched = true;
        
        tdA.style.backgroundColor = '#ffffe1';
        tdB.style.backgroundColor = '#ffffe1';
        tdA.style.border = '2px solid #ff8000';
        tdB.style.border = '2px solid #ff8000';
        
        // Play synthesized Web Audio correct jingle
        playCorrectJingle();

        pairsFound++;
        document.getElementById('hud-pairs').innerText = pairsFound;
        if (pairsFound === 8) setTimeout(showWin, 300);
    } else {
        a.faceUp = b.faceUp = false;
        
        tdA.style.border = '1px solid #7f9db9';
        tdA.style.background = 'linear-gradient(to bottom, #ffffff 0%, #e3efff 100%)';
        tdA.innerHTML = '<span class="card-back-text">?</span>';
        
        tdB.style.border = '1px solid #7f9db9';
        tdB.style.background = 'linear-gradient(to bottom, #ffffff 0%, #e3efff 100%)';
        tdB.innerHTML = '<span class="card-back-text">?</span>';

        // Play synthesized Web Audio incorrect buzzer
        playWrongBuzzer();

        // Apply a 1-second penalty for a mismatch (clamped so it never drops below 0)
        timeLeft = Math.max(0, timeLeft - 1);
        document.getElementById('hud-time').innerText = timeLeft;
        
        // Immediately check if the penalty triggered a game over condition
        if (timeLeft <= 0 && pairsFound < 8) {
            showLose();
            return;
        }
    }
    flipped = [];
    if (gameActive) {
        canFlip = true;
    }
}

function hideAllScreens() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('win-screen').style.display = 'none';
    document.getElementById('lose-screen').style.display = 'none';
    document.getElementById('game-table').style.display = 'none'; // Hides the grid on overlay screens
}

function showWin() {
    gameActive = false;
    canFlip = false;
    clearInterval(timerInterval);
    hideAllScreens();

    // Pause background music and trigger the victory audio track
    bgMusic.pause();
    winSound.currentTime = 0;
    winSound.play().catch(err => console.log("Audio playing error:", err));

    document.getElementById('win-stats').innerHTML = 
        'Total Moves: ' + moves + ' | Time Remaining: ' + timeLeft + ' seconds!';
    document.getElementById('win-screen').style.display = 'block';

    // Resumes the background track from exactly where it paused after yay.mp3 plays through
    // Using a 3-second delay assuming a standard short "yay" sound byte length
    setTimeout(function() {
        if (!gameActive) { 
            bgMusic.play().catch(err => console.log("Audio resume error:", err));
        }
    }, 3000);
}

function showLose() {
    gameActive = false;
    canFlip = false;
    clearInterval(timerInterval);
    hideAllScreens();

    // Temporarily halt background music and trigger the evil laugh track
    bgMusic.pause();
    jumpscareSound.currentTime = 0;
    jumpscareSound.play().catch(err => console.log("Audio playing error:", err));

    // Reset and trigger the 5-second jumpscare sequence
    const overlay = document.getElementById('jumpscare-overlay');
    const img = document.getElementById('jumpscare-img');
    
    // Forces the CSS zoom animation to reset fresh on every failure
    img.style.animation = 'none';
    img.offsetHeight; 
    img.style.animation = null;

    overlay.style.display = 'flex';

    // After 5 seconds, fade it out, open the menu window, and resume BGM
    setTimeout(function() {
        overlay.style.display = 'none';
        document.getElementById('lose-screen').style.display = 'block';
        bgMusic.play().catch(err => console.log("Audio resume error:", err));
    }, 5000);
}

function startTimer() {
    clearInterval(timerInterval);
    timeLeft = TOTAL_TIME;
    document.getElementById('hud-time').innerText = timeLeft;
    
    timerInterval = setInterval(function() {
        timeLeft--;
        document.getElementById('hud-time').innerText = timeLeft;
        if (timeLeft <= 0) {
            if (pairsFound < 8) showLose();
        }
    }, 1000);
}

async function startGame() {
    // Initialize Web Audio Context if it hasn't been yet
    initAudioContext();

    // Hide jumpscare overlay if a game is abruptly restarted
    document.getElementById('jumpscare-overlay').style.display = 'none';
    
    // Stop victory sound if restarting right after a win to avoid overlapping audio
    winSound.pause();
    
    hideAllScreens();
    document.getElementById('game-table').style.display = 'table'; // Reveal the board when play begins
    moves = 0; 
    pairsFound = 0; 
    flipped = []; 
    canFlip = true;
    gameActive = true;
    
    document.getElementById('hud-moves').innerText = '0';
    document.getElementById('hud-pairs').innerText = '0';
    
    await prepareAssets();
    buildGridDOM();
    
    // Ensure background music track resumes normally on manual quick-restarts
    bgMusic.play().catch(err => console.log("Audio resume error:", err));
    
    startTimer();
}

// Global hook to spin up the music theme on first core page interaction
function initBGMOnInteraction() {
    initAudioContext();
    bgMusic.play().then(() => {
        document.removeEventListener('click', initBGMOnInteraction);
        document.removeEventListener('keydown', initBGMOnInteraction);
    }).catch(err => console.log("Autoplay context initialization waiting...", err));
}
document.addEventListener('click', initBGMOnInteraction);
document.addEventListener('keydown', initBGMOnInteraction);

window.onload = function() {
    prepareAssets();
};