const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const rickSheet = document.getElementById('rickSpriteSheet');

const discImg = new Image();
discImg.src = 'compact_disc.png';

const trollImg = new Image();
trollImg.src = 'Trollface.png';
// Off-screen canvas for alpha-tested Trollface hitbox scanning
const trollCanvas = document.createElement('canvas');
const trollCtx = trollCanvas.getContext('2d', { willReadFrequently: true });
let trollHitbox = { offX: 0, offY: 0, w: 36, h: 36 }; // fallback, computed on load
const TROLL_DRAW_W = 36;
const TROLL_DRAW_H = 36;
trollImg.onload = () => {
    trollCanvas.width = trollImg.naturalWidth;
    trollCanvas.height = trollImg.naturalHeight;
    trollCtx.drawImage(trollImg, 0, 0);
    try {
        const d = trollCtx.getImageData(0, 0, trollImg.naturalWidth, trollImg.naturalHeight).data;
        let minX = trollImg.naturalWidth, maxX = 0, minY = trollImg.naturalHeight, maxY = 0;
        for (let y = 0; y < trollImg.naturalHeight; y++) {
            for (let x = 0; x < trollImg.naturalWidth; x++) {
                if (d[(y * trollImg.naturalWidth + x) * 4 + 3] > 30) {
                    if (x < minX) minX = x; if (x > maxX) maxX = x;
                    if (y < minY) minY = y; if (y > maxY) maxY = y;
                }
            }
        }
        const scaleX = TROLL_DRAW_W / trollImg.naturalWidth;
        const scaleY = TROLL_DRAW_H / trollImg.naturalHeight;
        trollHitbox = {
            offX: minX * scaleX,
            offY: minY * scaleY,
            w: (maxX - minX) * scaleX,
            h: (maxY - minY) * scaleY
        };
    } catch(e) { /* CORS fallback – keep default */ }
};

const bgMusic = document.getElementById('bgMusic');
const deathScream = document.getElementById('deathScream');
const victoryMusic = document.getElementById('victoryMusic');
const loseMusic = document.getElementById('loseMusic');
const menu = document.getElementById('main-menu');
const gameOverScreen = document.getElementById('game-over-screen');
const winScreen = document.getElementById('win-screen');
const startBtn = document.getElementById('start-btn');
const retryBtn = document.getElementById('retry-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const statsBar = document.getElementById('stats-bar');

canvas.width = 800;
canvas.height = 400;

let gameActive = false;
let scanningComplete = false;
let currentLevel = 0;
let lives = 3;
let score = 0;

// Floating score popups: { x, y, text, alpha, vy }
const scorePopups = [];

// ── High Score (localStorage) ────────────────────────────────
const HS_KEY = 'rickRoll2D_highScore';

function getHighScore() {
    return parseInt(localStorage.getItem(HS_KEY) || '0', 10);
}

function saveHighScore(s) {
    if (s > getHighScore()) localStorage.setItem(HS_KEY, s);
}

function highScoreLabel(currentScore) {
    const hs = getHighScore();
    const isNew = currentScore >= hs && currentScore > 0;
    return isNew
        ? `🏆 NEW HIGH SCORE: ${currentScore}!`
        : `🏆 High Score: ${hs}`;
}

function spawnPopup(x, y, text) {
    scorePopups.push({ x, y, text, alpha: 1.0, vy: -1.2 });
}

function addScore(points, x, y) {
    score += points;
    updateUI();
    spawnPopup(x, y, `+${points}`);
}

// Sprite Animation Variables
const totalFrames = 43;
let currentFrame = 0;
let frameCounter = 0;
const frameSpeed = 7;
let frameWidth = 0;
let frameHeight = 0;
let hitboxes = [];
let rickFrozen = false; // true when Rick is killed by a side-hit (freezes dance frame)

// ============================================================
//  Moving platform factory helpers
// ============================================================
function hPlat(x, y, w, h, minX, maxX, speed) {
    return { x, y, width: w, height: h, moving: true,
             moveType: 'h', min: minX, max: maxX, speed,
             _ox: x, _oy: y };
}
function vPlat(x, y, w, h, minY, maxY, speed) {
    return { x, y, width: w, height: h, moving: true,
             moveType: 'v', min: minY, max: maxY, speed,
             _ox: x, _oy: y };
}
function sPlat(x, y, w, h) {
    return { x, y, width: w, height: h };
}
// Trollface enemy factory: walks on a static platform, bouncing between its edges
function troll(platIndex, side) {
    // side: 'left' starts near left edge, 'right' starts near right edge
    // baseSpeed is rolled once here and reused on every respawn — never re-randomized
    const baseSpeed = 1.4 + (Math.random() * 0.8 - 0.4); // range ~1.0–1.8
    return { platIndex, side, x: 0, y: 0, speed: baseSpeed, baseSpeed, dir: side === 'left' ? 1 : -1,
             dead: false, dyingTimer: 0, squishScale: 1 };
}

const levels = [
    // ── LEVEL 1 ──────────────────────────────────────────────
    {
        spawnX: 60, spawnY: 310,
        platforms: [
            sPlat(0,   380, 800, 20),
            sPlat(200, 280, 150, 20),
            sPlat(450, 200, 150, 20),
        ],
        goal: { x: 750, y: 330, width: 30, height: 50 },
        disc: { x: 480, y: 150, width: 30, height: 30, collected: false },
        trolls: [
            troll(1, 'left'),   // most-left aerial platform
        ]
    },
    // ── LEVEL 2 ──────────────────────────────────────────────
    {
        spawnX: 60, spawnY: 310,
        platforms: [
            sPlat(0,   380, 200, 20),
            sPlat(250, 300, 100, 20),
            sPlat(400, 220, 100, 20),
            sPlat(600, 150, 200, 20),
        ],
        goal: { x: 750, y: 100, width: 30, height: 50 },
        disc: { x: 420, y: 170, width: 30, height: 30, collected: false },
        trolls: [
            troll(1, 'left'),   // most-left aerial platform
        ]
    },
    // ── LEVEL 3 ──────────────────────────────────────────────
    {
        spawnX: 60, spawnY: 80,
        platforms: [
            sPlat(0,   150, 200, 20),
            sPlat(250, 220, 100, 20),
            sPlat(400, 300, 100, 20),
            sPlat(550, 380, 250, 20),
        ],
        goal: { x: 750, y: 330, width: 30, height: 50 },
        disc: { x: 420, y: 250, width: 30, height: 30, collected: false },
        trolls: [
            troll(3, 'left'),   // platform where the goal sits
        ]
    },
    // ── LEVEL 4 ──────────────────────────────────────────────
    {
        spawnX: 60, spawnY: 310,
        platforms: [
            sPlat(0,   380, 150, 20),
            sPlat(250, 320,  80, 20),
            sPlat(400, 260,  80, 20),
            sPlat(550, 200,  80, 20),
            sPlat(700, 140, 100, 20),
        ],
        goal: { x: 750, y: 88, width: 30, height: 50 },
        disc: { x: 575, y: 150, width: 30, height: 30, collected: false },
        trolls: [
            troll(2, 'left'),   // most-middle aerial platform
        ]
    },
    // ── LEVEL 5 ──────────────────────────────────────────────
    {
        spawnX: 360, spawnY: 310,
        platforms: [
            sPlat(300, 380, 200, 20),
            sPlat(150, 300, 100, 20),
            sPlat(550, 300, 100, 20),
            sPlat(350, 220, 100, 20),
            sPlat(150, 140, 100, 20),
            sPlat(550, 140, 100, 20),
            sPlat(350,  60, 100, 20),
        ],
        goal: { x: 385, y: 10, width: 30, height: 50 },
        disc: { x: 385, y: 170, width: 30, height: 30, collected: false },
        trolls: [
            troll(1, 'left'),   // bottom-left platform
            troll(5, 'left'),   // top-right platform
        ]
    },

    // ══════════════════════════════════════════════════════════
    //  NEW LEVELS START HERE — buckle up buttercup 🎢
    // ══════════════════════════════════════════════════════════

    // ── LEVEL 6 – "The Conveyor" ──────────────────────────────
    // Wide floor gaps, one horizontal mover bridges the middle
    {
        spawnX: 40, spawnY: 310,
        platforms: [
            sPlat(0,   380, 180, 20),                       // left ground
            hPlat(200, 280, 120, 20, 200, 480, 2),          // 🟡 slow wide mover
            sPlat(510, 200, 100, 20),                       // mid step
            sPlat(650, 130, 150, 20),                       // high shelf
        ],
        goal: { x: 750, y: 78, width: 30, height: 50 },
        disc: { x: 530, y: 150, width: 30, height: 30, collected: false }
    },

    // ── LEVEL 7 – "Vertical Madness" ─────────────────────────
    // Two vertically bouncing lifts, tricky timing
    {
        spawnX: 40, spawnY: 310,
        platforms: [
            sPlat(0,   380, 120, 20),                       // spawn island
            vPlat(170, 200, 100, 20, 120, 360,  2.5),       // 🟡 left lift (fast)
            sPlat(310, 260, 80,  20),                       // static stepping stone
            vPlat(430, 150, 100, 20, 80,  300,  1.8),       // 🟡 right lift (slower)
            sPlat(570, 100, 120, 20),                       // near-top shelf
            sPlat(680,  40, 120, 20),                       // summit
        ],
        goal: { x: 735, y: -10, width: 30, height: 50 },
        disc: { x: 600, y: 50,  width: 30, height: 30, collected: false }
    },

    // ── LEVEL 8 – "The Gauntlet" ─────────────────────────────
    // Mix of horizontal AND vertical movers — choreographed chaos
    {
        spawnX: 40, spawnY: 310,
        platforms: [
            sPlat(0,   380, 100, 20),                       // tiny spawn pad
            hPlat(130, 340, 90,  20, 130, 350, 1.5),        // 🟡 low slider
            vPlat(390, 260, 80,  20, 120, 300, 2.2),        // 🟡 mid bouncer
            hPlat(490, 180, 80,  20, 490, 680, 2.0),        // 🟡 high slider
            sPlat(700, 120, 100, 20),                       // safe landing
        ],
        goal: { x: 750, y: 68, width: 30, height: 50 },
        disc: { x: 420, y: 210, width: 30, height: 30, collected: false }
    },

    // ── LEVEL 9 – "Stairway to Rick" ─────────────────────────
    // Descending then ascending path, vertical lift at the end
    {
        spawnX: 40, spawnY: 60,
        platforms: [
            sPlat(0,   130, 150, 20),                       // high spawn shelf
            sPlat(180, 200, 100, 20),
            sPlat(310, 280, 100, 20),
            sPlat(420, 360, 100, 20),                       // valley floor
            hPlat(540, 280, 100, 20, 540, 680, 1.8),        // 🟡 rising bridge
            vPlat(690, 200, 100, 20, 60,  280, 2.5),        // 🟡 express lift up
        ],
        goal: { x: 730, y: 10, width: 30, height: 50 },
        disc: { x: 450, y: 310, width: 30, height: 30, collected: false }
    },

    // ── LEVEL 10 – "Never Gonna Let You Down" ────────────────
    // Pure chaos: 4 movers, tiny static islands, test of nerve
    {
        spawnX: 340, spawnY: 322,
        platforms: [
            sPlat(300, 380, 130, 20),                       // spawn island (centre)
            hPlat(80,  300,  80, 20, 40,  240, 2.0),        // 🟡 left bouncer
            vPlat(290, 240,  80, 20, 120, 280, 3.0),        // 🟡 centre lift (spicy)
            hPlat(450, 180,  80, 20, 450, 660, 2.5),        // 🟡 upper right slider
            vPlat(130, 140,  90, 20, 60,  200, 2.0),        // 🟡 upper left lift
            sPlat(680,  80, 120, 20),                       // final static shelf
        ],
        goal: { x: 725, y: 28, width: 30, height: 50 },
        disc: { x: 155, y: 90,  width: 30, height: 30, collected: false }
    },

    // ══════════════════════════════════════════════════════════
    //  LEVELS 11–15 – TROLLFACE INVASION 😈
    // ══════════════════════════════════════════════════════════

    // ── LEVEL 11 – "Here Come The Trolls" ────────────────────
    // Introductory troll level — wide platforms, easy jumps
    {
        spawnX: 40, spawnY: 320,
        platforms: [
            sPlat(0,   380, 200, 20),   // [0] spawn ground
            sPlat(250, 300, 180, 20),   // [1] mid-left shelf
            sPlat(480, 220, 180, 20),   // [2] mid-right shelf
            sPlat(680, 140, 120, 20),   // [3] top-right shelf
            sPlat(20,  200, 120, 20),   // [4] top-left shelf
            hPlat(330, 160, 100, 20, 330, 500, 1.5), // 🟡 bridge mover
        ],
        goal: { x: 730, y: 88, width: 30, height: 50 },
        disc: { x: 40, y: 150, width: 30, height: 30, collected: false },
        trolls: [
            troll(1, 'left'),   // on mid-left shelf
            troll(2, 'right'),  // on mid-right shelf
        ]
    },

    // ── LEVEL 12 – "Troll Highway" ───────────────────────────
    // Long platforms packed with trolls, a mover to escape the highway
    {
        spawnX: 30, spawnY: 320,
        platforms: [
            sPlat(0,   380, 300, 20),   // [0] long spawn road
            sPlat(350, 380, 300, 20),   // [1] long continuation (gap in middle)
            sPlat(100, 270, 200, 20),   // [2] upper shelf left
            sPlat(380, 270, 200, 20),   // [3] upper shelf right
            sPlat(620, 160, 180, 20),   // [4] high right
            vPlat(50,  130,  80, 20, 60, 260, 2.0), // 🟡 left express lift
        ],
        goal: { x: 730, y: 108, width: 30, height: 50 },
        disc: { x: 640, y: 110, width: 30, height: 30, collected: false },
        trolls: [
            troll(0, 'right'),
            troll(1, 'left'),
            troll(2, 'left'),
            troll(3, 'right'),
        ]
    },

    // ── LEVEL 13 – "Troll Towers" ────────────────────────────
    // Tall staircase — each platform has a troll guarding it
    {
        spawnX: 30, spawnY: 322,
        platforms: [
            sPlat(0,   380, 150, 20),   // [0] ground
            sPlat(180, 310, 130, 20),   // [1] step 1
            sPlat(340, 240, 130, 20),   // [2] step 2
            sPlat(500, 170, 130, 20),   // [3] step 3
            sPlat(660, 100, 140, 20),   // [4] top
            sPlat(30,  230, 100, 20),   // [5] side pocket (bonus disc)
        ],
        goal: { x: 720, y: 48, width: 30, height: 50 },
        disc: { x: 50, y: 180, width: 30, height: 30, collected: false },
        trolls: [
            troll(1, 'left'),
            troll(2, 'right'),
            troll(3, 'left'),
            troll(4, 'right'),
        ]
    },

    // ── LEVEL 14 – "Troll Sandwich" ──────────────────────────
    // Moving platforms sandwiched between troll-infested static ones
    {
        spawnX: 30, spawnY: 320,
        platforms: [
            sPlat(0,   380, 180, 20),   // [0] spawn pad
            sPlat(500, 380, 180, 20),   // [1] far ground island (troll patrol)
            sPlat(100, 240, 160, 20),   // [2] mid-left
            sPlat(540, 240, 160, 20),   // [3] mid-right
            sPlat(270, 140, 260, 20),   // [4] wide top platform
            hPlat(210, 310,  90, 20, 185, 490, 2.0), // 🟡 low connector
        ],
        goal: { x: 395, y: 88, width: 30, height: 50 },
        disc: { x: 300, y: 90, width: 30, height: 30, collected: false },
        trolls: [
            troll(1, 'left'),
            troll(2, 'right'),
            troll(3, 'left'),
            troll(4, 'left'),
            troll(4, 'right'),
        ]
    },

    // ── LEVEL 15 – "The Final Troll" ─────────────────────────
    // Full chaos: trolls everywhere, tight platforms, a mover gauntlet
    {
        spawnX: 30, spawnY: 322,
        platforms: [
            sPlat(0,   380, 130, 20),   // [0] tiny spawn island
            sPlat(200, 320, 100, 20),   // [1] small step
            sPlat(350, 260, 140, 20),   // [2] mid platform
            sPlat(540, 200, 140, 20),   // [3] upper-mid
            sPlat(680, 120, 120, 20),   // [4] top right
            sPlat(50,  200, 110, 20),   // [5] top left pocket
            sPlat(220, 140, 110, 20),   // [6] second left shelf
            hPlat(370, 100,  90, 20, 350, 560, 2.2), // 🟡 high slider
            vPlat(170, 240,  80, 20, 120, 310, 2.5), // 🟡 mid bouncer
        ],
        goal: { x: 720, y: 68, width: 30, height: 50 },
        disc: { x: 240, y: 90, width: 30, height: 30, collected: false },
        trolls: [
            troll(1, 'left'),
            troll(2, 'right'),
            troll(2, 'left'),
            troll(3, 'left'),
            troll(4, 'right'),
            troll(5, 'left'),
            troll(6, 'right'),
        ]
    },
];

const player = {
    x: 100, y: 300,
    visualWidth: 82, visualHeight: 58,
    speed: 5, dx: 0, dy: 0,
    jumpPower: -13, grounded: false,
    onMovingPlat: null,  // reference to the platform Rick is standing on
    facing: 'right'      // 'right' (default) or 'left' — drives sprite flip
};

const gravity = 0.3;
const keys = { ArrowUp: false, ArrowLeft: false, ArrowRight: false };

// ============================================================
//  🎵 Web Audio Sound Engine
// ============================================================
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playJumpSound() {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.12);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
}

function play1UpSound() {
    const ctx = getAudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5, 880, 1046.5];
    const noteDur = 0.09;
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        const start = ctx.currentTime + i * noteDur;
        gain.gain.setValueAtTime(0.0, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.01);
        gain.gain.setValueAtTime(0.15, start + noteDur - 0.01);
        gain.gain.linearRampToValueAtTime(0.0, start + noteDur);
        osc.start(start);
        osc.stop(start + noteDur + 0.01);
    });
}

function playStompSound() {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2);
}

// ============================================================
//  Troll enemy tick
// ============================================================
function initTrolls() {
    const lvl = levels[currentLevel];
    if (!lvl.trolls) return;
    lvl.trolls.forEach(t => {
        // permaDead means this troll was already stomped this level — it respawns
        // visually but won't grant points if stomped again
        t.dead = false;
        t.dyingTimer = 0;
        t.squishScale = 1;
        const plat = lvl.platforms[t.platIndex];
        if (!plat || plat.moving) return; // only walk on static platforms

        // Restore the fixed speed rolled at level load — never re-randomize on respawn
        t.speed = t.baseSpeed;

        const leftEdge  = plat.x + 4;
        const rightEdge = plat.x + plat.width - TROLL_DRAW_W - 4;
        if (t.side === 'left') {
            // Start somewhere in the left half rather than always the exact edge
            t.x = leftEdge + Math.random() * Math.max(0, (rightEdge - leftEdge) * 0.5);
            t.dir = 1;
        } else {
            // Start somewhere in the right half
            t.x = rightEdge - Math.random() * Math.max(0, (rightEdge - leftEdge) * 0.5);
            t.dir = -1;
        }
        t.y = plat.y - TROLL_DRAW_H;
    });
}

function tickTrolls() {
    const lvl = levels[currentLevel];
    if (!lvl.trolls) return;
    lvl.trolls.forEach(t => {
        if (t.dead) {
            if (t.dyingTimer > 0) t.dyingTimer--;
            return;
        }
        const plat = lvl.platforms[t.platIndex];
        if (!plat || plat.moving) return;

        t.x += t.speed * t.dir;

        // Edge detection: if the troll walks off either edge, reverse
        const leftEdge  = plat.x;
        const rightEdge = plat.x + plat.width - TROLL_DRAW_W;
        if (t.x <= leftEdge)  { t.x = leftEdge;  t.dir =  1; }
        if (t.x >= rightEdge) { t.x = rightEdge; t.dir = -1; }

        // Keep Y glued to platform top
        t.y = plat.y - TROLL_DRAW_H;
    });
}

// ============================================================
//  Moving platform tick — updates position, bounces at limits
// ============================================================
function tickMovingPlatforms() {
    const lvl = levels[currentLevel];
    for (let plat of lvl.platforms) {
        if (!plat.moving) continue;
        const prevX = plat.x;
        const prevY = plat.y;

        if (plat.moveType === 'h') {
            plat.x += plat.speed;
            if (plat.x + plat.width > plat.max || plat.x < plat.min) {
                plat.speed *= -1;
                plat.x += plat.speed; // nudge back so it doesn't stick
            }
        } else {
            plat.y += plat.speed;
            if (plat.y + plat.height > plat.max || plat.y < plat.min) {
                plat.speed *= -1;
                plat.y += plat.speed;
            }
        }

        // Carry Rick along if he's standing on THIS platform
        if (player.onMovingPlat === plat) {
            player.x += (plat.x - prevX);
            player.y += (plat.y - prevY);
        }
    }
}

function calculateHitboxes() {
    frameWidth = rickSheet.naturalWidth / totalFrames;
    frameHeight = rickSheet.naturalHeight;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tempCanvas.width = frameWidth;
    tempCanvas.height = frameHeight;
    try {
        for (let i = 0; i < totalFrames; i++) {
            tempCtx.clearRect(0, 0, frameWidth, frameHeight);
            tempCtx.drawImage(rickSheet, i * frameWidth, 0, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
            const imgData = tempCtx.getImageData(0, 0, frameWidth, frameHeight).data;
            let minX = frameWidth, maxX = 0, minY = frameHeight, maxY = 0;
            let foundPixels = false;
            for (let y = 0; y < frameHeight; y++) {
                for (let x = 0; x < frameWidth; x++) {
                    const alpha = imgData[(y * frameWidth + x) * 4 + 3];
                    if (alpha > 50) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                        foundPixels = true;
                    }
                }
            }
            if (!foundPixels) {
                hitboxes.push({ offX: 0, offY: 0, w: player.visualWidth, h: player.visualHeight });
            } else {
                hitboxes.push({
                    offX: (minX / frameWidth) * player.visualWidth,
                    offY: (minY / frameHeight) * player.visualHeight,
                    w: ((maxX - minX) / frameWidth) * player.visualWidth,
                    h: ((maxY - minY) / frameHeight) * player.visualHeight
                });
            }
        }
    } catch (e) {
        console.warn("CORS/Security error: Falling back to rectangular hitboxes.");
        hitboxes = Array(totalFrames).fill({ offX: 0, offY: 0, w: player.visualWidth, h: player.visualHeight });
    }
    scanningComplete = true;
}

if (rickSheet.complete) {
    calculateHitboxes();
} else {
    rickSheet.onload = calculateHitboxes;
}

// ── Button listeners ────────────────────────────────────────
function startGame() {
    menu.style.display = 'none';
    statsBar.style.display = 'block';
    gameActive = true;
    lives = 3;
    score = 0;
    scorePopups.length = 0;
    currentLevel = 0;
    resetAllLevels();
    updateUI();
    resetPlayer();
    bgMusic.play();
    update();
}

function resetAllLevels() {
    levels.forEach(lvl => {
        lvl.disc.collected = false;
        // Reset moving platforms back to original position
        lvl.platforms.forEach(p => {
            if (p.moving) {
                if (p.moveType === 'h') p.x = p._ox;
                else p.y = p._oy;
                // Ensure speed is positive at start
                p.speed = Math.abs(p.speed);
            }
        });
        // Reset trolls
        if (lvl.trolls) {
            lvl.trolls.forEach(t => {
                t.dead = false;
                t.permaDead = false;
                t.dyingTimer = 0;
                t.squishScale = 1;
            });
        }
    });
}

startBtn.addEventListener('click', () => {
    if (!scanningComplete) return;
    startGame();
});

retryBtn.addEventListener('click', () => {
    gameOverScreen.classList.remove('visible');
    loseMusic.pause();
    loseMusic.currentTime = 0;
    statsBar.style.display = 'block';
    gameActive = true;
    lives = 3;
    score = 0;
    scorePopups.length = 0;
    currentLevel = 0;
    resetAllLevels();
    updateUI();
    resetPlayer();
    bgMusic.play().catch(() => {});
    update();
});

playAgainBtn.addEventListener('click', () => {
    winScreen.classList.remove('visible');
    victoryMusic.pause();
    victoryMusic.currentTime = 0;
    statsBar.style.display = 'block';
    gameActive = true;
    lives = 3;
    score = 0;
    scorePopups.length = 0;
    currentLevel = 0;
    resetAllLevels();
    updateUI();
    resetPlayer();
    bgMusic.currentTime = 0;
    bgMusic.play().catch(() => {});
    update();
});

function updateUI() {
    document.getElementById('lives-display').innerText = `Lives: ${lives}`;
    document.getElementById('level-display').innerText = `Level: ${currentLevel + 1}`;
    document.getElementById('score-display').innerText = `Score: ${score}`;
}

function resetPlayer() {
    const level = levels[currentLevel];
    player.x = level.spawnX;
    player.y = level.spawnY;
    player.dx = 0;
    player.dy = 0;
    player.grounded = false;
    player.onMovingPlat = null;
    player.facing = 'right';
    rickFrozen = false;
    initTrolls();
}

function die() {
    if (!gameActive) return;
    lives--;
    updateUI();
    gameActive = false;
    player.onMovingPlat = null;
    bgMusic.pause();
    deathScream.currentTime = 0;
    deathScream.play().catch(() => {});

    if (lives <= 0) {
        let screamFired = false;
        const onScreamEnd = () => {
            if (screamFired) return;
            screamFired = true;
            deathScream.removeEventListener('ended', onScreamEnd);
            statsBar.style.display = 'none';
            bgMusic.currentTime = 0;
            saveHighScore(score);
            document.getElementById('game-over-highscore').innerText = highScoreLabel(score);
            document.getElementById('game-over-sub').innerText = `Final Score: ${score}`;
            loseMusic.currentTime = 0;
            loseMusic.play().catch(() => {});
            gameOverScreen.classList.add('visible');
        };
        deathScream.addEventListener('ended', onScreamEnd);
        setTimeout(() => {
            if (!gameActive && lives <= 0 && !gameOverScreen.classList.contains('visible')) onScreamEnd();
        }, 4000);
    } else {
        let screamFired = false;
        const onScreamEnd = () => {
            if (screamFired) return;
            screamFired = true;
            deathScream.removeEventListener('ended', onScreamEnd);
            resetPlayer();
            bgMusic.play().catch(() => {});
            gameActive = true;
            update();
        };
        deathScream.addEventListener('ended', onScreamEnd);
        setTimeout(() => {
            if (!gameActive && lives > 0) onScreamEnd();
        }, 4000);
    }
}

function nextLevel() {
    currentLevel++;
    player.onMovingPlat = null;
    if (currentLevel < levels.length) {
        updateUI();
        resetPlayer();
    } else {
        gameActive = false;
        bgMusic.pause();
        bgMusic.currentTime = 0;
        statsBar.style.display = 'none';
        saveHighScore(score);
        document.getElementById('win-highscore').innerText = highScoreLabel(score);
        document.getElementById('win-sub').innerText = `WOAH! YOU DID IT! Final Score: ${score}`;
        victoryMusic.currentTime = 0;
        victoryMusic.play().catch(() => {});
        winScreen.classList.add('visible');
    }
}

// ============================================================
//  Main game loop
// ============================================================
function update() {
    if (!gameActive) return;

    // Proactively reclaim keyboard focus every frame if the document doesn't
    // have it. This is the only reliable fix for Chrome Lens on Linux (and
    // similar overlays on all platforms) — they return focus to the browser
    // chrome rather than the page, so event-based approaches miss it entirely.
    if (!document.hasFocus()) canvas.focus();

    // Animate Rick (frozen if side-killed)
    if (!rickFrozen) {
        frameCounter++;
        if (frameCounter >= frameSpeed) {
            currentFrame = (currentFrame + 1) % totalFrames;
            frameCounter = 0;
        }
    }

    // Tick enemies
    tickTrolls();

    // Tick moving platforms BEFORE applying player physics
    // so Rick gets carried first, then his own input is applied on top
    tickMovingPlatforms();

    // Player input
    if (keys.ArrowRight) { player.dx = player.speed;  player.facing = 'right'; }
    else if (keys.ArrowLeft) { player.dx = -player.speed; player.facing = 'left'; }
    else player.dx = 0;

    if (keys.ArrowUp && player.grounded) {
        player.dy = player.jumpPower;
        player.grounded = false;
        player.onMovingPlat = null;
        playJumpSound();
    }

    player.dy += gravity;
    player.y += player.dy;
    player.x += player.dx;

    // Canvas edge clamping
    if (player.x < 0) player.x = 0;
    if (player.x + player.visualWidth > canvas.width) player.x = canvas.width - player.visualWidth;

    player.grounded = false;
    player.onMovingPlat = null;

    // When Rick is mirrored (facing left) the alpha-scanned offX was measured from
    // the LEFT edge of the unflipped sprite, so it points to the wrong side.
    // Mirror it: mirroredOffX = visualWidth - offX - hb.w
    const hb = hitboxes[currentFrame];
    const hbOffX = player.facing === 'left'
        ? player.visualWidth - hb.offX - hb.w
        : hb.offX;
    const pBodyX = player.x + hbOffX;
    const pBodyY = player.y + hb.offY;

    // Platform collision
    for (let plat of levels[currentLevel].platforms) {
        if (pBodyX < plat.x + plat.width &&
            pBodyX + hb.w > plat.x &&
            pBodyY < plat.y + plat.height &&
            pBodyY + hb.h > plat.y) {

            // How far could Rick + platform have closed the gap in one frame?
            // Account for both Rick's fall speed AND an upward-moving platform's speed,
            // so neither tunnels through the other at high velocities.
            const platVY = plat.moving && plat.moveType === 'v' ? Math.abs(plat.speed) : 0;
            const threshold = Math.abs(player.dy) + platVY + 2;

            if (player.dy >= 0 && pBodyY + hb.h - Math.abs(player.dy) - platVY <= plat.y + threshold) {
                player.dy = 0;
                player.y = plat.y - (hb.offY + hb.h);
                player.grounded = true;
                if (plat.moving) player.onMovingPlat = plat;
            } else if (player.dy < 0) {
                player.dy = 0;
                player.y = (plat.y + plat.height) - hb.offY;
            }
        }
    }

    // Re-compute after collision resolution (use the same mirrored offset)
    const pBodyX2 = player.x + hbOffX;
    const pBodyY2 = player.y + hb.offY;

    // CD pickup
    let disc = levels[currentLevel].disc;
    if (!disc.collected &&
        pBodyX2 < disc.x + disc.width &&
        pBodyX2 + hb.w > disc.x &&
        pBodyY2 < disc.y + disc.height &&
        pBodyY2 + hb.h > disc.y) {
        disc.collected = true;
        lives++;
        addScore(100, disc.x + disc.width / 2, disc.y);
        play1UpSound();
    }

    // Goal check
    let goal = levels[currentLevel].goal;
    if (pBodyX2 < goal.x + goal.width &&
        pBodyX2 + hb.w > goal.x &&
        pBodyY2 < goal.y + goal.height &&
        pBodyY2 + hb.h > goal.y) {
        nextLevel();
    }

    // Troll collisions
    const lvl2 = levels[currentLevel];
    if (lvl2.trolls) {
        // Reuse the same mirrored offset already computed above
        const rLeft   = player.x + hbOffX;
        const rRight  = rLeft + hb.w;
        const rTop    = player.y + hb.offY;
        const rBottom = rTop + hb.h;

        for (let t of lvl2.trolls) {
            if (t.dead) continue;
            const plat = lvl2.platforms[t.platIndex];
            if (!plat || plat.moving) continue;

            // Troll hitbox (alpha-tested offset applied)
            const tLeft   = t.x + trollHitbox.offX;
            const tRight  = tLeft + trollHitbox.w;
            const tTop    = t.y + trollHitbox.offY;
            const tBottom = tTop + trollHitbox.h;

            // AABB overlap check
            if (rRight > tLeft && rLeft < tRight && rBottom > tTop && rTop < tBottom) {
                // Stomp: Rick's feet were above troll's top half when they met
                const prevBottom = rBottom - player.dy;
                if (player.dy > 0 && prevBottom <= tTop + trollHitbox.h * 0.5) {
                    // Squish the troll
                    t.dead = true;
                    t.dyingTimer = 20;
                    t.squishScale = 0.3;
                    player.dy = -9; // bounce Rick up
                    if (!t.permaDead) {
                        // First kill this level — award points
                        addScore(50, t.x + TROLL_DRAW_W / 2, t.y);
                        t.permaDead = true; // no more points for re-kills after respawn
                    }
                    playStompSound();
                } else {
                    // Side hit — freeze Rick's animation and kill him
                    rickFrozen = true;
                    die();
                    return;
                }
            }
        }
    }

    // Death pit
    if (player.y > canvas.height) die();

    // Tick score popups
    for (let i = scorePopups.length - 1; i >= 0; i--) {
        const p = scorePopups[i];
        p.y += p.vy;
        p.alpha -= 0.022;
        if (p.alpha <= 0) scorePopups.splice(i, 1);
    }

    draw();
    requestAnimationFrame(update);
}

// ============================================================
//  Draw
// ============================================================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Platforms — static = white, moving = gold/orange
    levels[currentLevel].platforms.forEach(plat => {
        if (plat.moving) {
            // Glowing gold moving platform
            ctx.save();
            ctx.shadowColor = '#ffaa00';
            ctx.shadowBlur = 8;
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
            ctx.shadowBlur = 0;

            // Clip ALL stripe drawing strictly to the platform rectangle
            ctx.beginPath();
            ctx.rect(plat.x, plat.y, plat.width, plat.height);
            ctx.clip();

            // Diagonal hazard stripes — angled at 45° using platform height as the slant
            ctx.fillStyle = 'rgba(255,80,0,0.45)';
            const stripeW = 12;
            const slant = plat.height; // 45° diagonal = height offset
            for (let sx = plat.x - slant; sx < plat.x + plat.width + slant; sx += stripeW * 2) {
                ctx.beginPath();
                ctx.moveTo(sx,          plat.y);
                ctx.lineTo(sx + stripeW, plat.y);
                ctx.lineTo(sx + stripeW + slant, plat.y + plat.height);
                ctx.lineTo(sx + slant,           plat.y + plat.height);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        } else {
            // White brick wall pattern
            ctx.save();
            ctx.beginPath();
            ctx.rect(plat.x, plat.y, plat.width, plat.height);
            ctx.clip();

            // White fill base
            ctx.fillStyle = '#fff';
            ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

            // Brick dimensions — two rows fit the 20px platform height perfectly
            const brickW = 40;
            const brickH = 10;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;

            for (let row = 0; row * brickH < plat.height; row++) {
                const brickY = plat.y + row * brickH;
                // Odd rows are offset by half a brick width to stagger the joints
                const offsetX = (row % 2 === 0) ? 0 : brickW / 2;
                // Horizontal mortar line across the full platform
                ctx.beginPath();
                ctx.moveTo(plat.x, brickY);
                ctx.lineTo(plat.x + plat.width, brickY);
                ctx.stroke();
                // Vertical joint lines for this row
                for (let col = offsetX; col < plat.width + brickW; col += brickW) {
                    const jx = plat.x + col;
                    ctx.beginPath();
                    ctx.moveTo(jx, brickY);
                    ctx.lineTo(jx, brickY + brickH);
                    ctx.stroke();
                }
            }
            // Bottom edge line
            ctx.beginPath();
            ctx.moveTo(plat.x, plat.y + plat.height);
            ctx.lineTo(plat.x + plat.width, plat.y + plat.height);
            ctx.stroke();

            ctx.restore();
        }
    });

    // Goal — wooden door
    let goal = levels[currentLevel].goal;
    const dx = goal.x, dy = goal.y, dw = goal.width, dh = goal.height;
    ctx.save();

    // Door frame (dark wood border)
    ctx.fillStyle = '#5a3210';
    ctx.fillRect(dx - 2, dy - 2, dw + 4, dh + 4);

    // Door planks background (medium wood)
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(dx, dy, dw, dh);

    // Vertical plank lines
    ctx.strokeStyle = '#6b3410';
    ctx.lineWidth = 1;
    for (let px = dx + 8; px < dx + dw; px += 8) {
        ctx.beginPath();
        ctx.moveTo(px, dy);
        ctx.lineTo(px, dy + dh);
        ctx.stroke();
    }

    // Horizontal rail lines (top, middle, bottom panel dividers)
    const railY = [dy + Math.round(dh * 0.08), dy + Math.round(dh * 0.5), dy + dh - Math.round(dh * 0.08)];
    ctx.strokeStyle = '#5a3210';
    ctx.lineWidth = 2;
    for (const ry of railY) {
        ctx.beginPath();
        ctx.moveTo(dx, ry);
        ctx.lineTo(dx + dw, ry);
        ctx.stroke();
    }

    // Wood grain highlights
    ctx.strokeStyle = 'rgba(180,100,40,0.35)';
    ctx.lineWidth = 1;
    for (let px = dx + 3; px < dx + dw; px += 8) {
        ctx.beginPath();
        ctx.moveTo(px, dy + 2);
        ctx.lineTo(px, dy + dh - 2);
        ctx.stroke();
    }

    // Doorknob
    ctx.fillStyle = '#c8a000';
    ctx.beginPath();
    ctx.arc(dx + 5, dy + Math.round(dh * 0.6), 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a6800';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    // CD — floating
    const lvl = levels[currentLevel];
    let disc = lvl.disc;
    if (!disc.collected) {
        const floatY = disc.y + Math.sin(Date.now() / 200) * 10;
        ctx.drawImage(discImg, disc.x, floatY, disc.width, disc.height);
    }

    // Trollface enemies 😈
    const drawLvl = levels[currentLevel];
    if (drawLvl.trolls) {
        drawLvl.trolls.forEach(t => {
            if (t.dead && t.dyingTimer <= 0) return;
            ctx.save();
            const drawX = t.x + TROLL_DRAW_W / 2;
            const scaleY = t.dead ? 0.3 : 1;
            // Flip horizontally if walking left
            const scaleX = t.dir < 0 ? -1 : 1;
            ctx.translate(drawX, t.y + TROLL_DRAW_H);
            ctx.scale(scaleX, scaleY);
            if (t.dead) ctx.globalAlpha = t.dyingTimer / 20;
            ctx.drawImage(trollImg, -TROLL_DRAW_W / 2, -TROLL_DRAW_H, TROLL_DRAW_W, TROLL_DRAW_H);
            ctx.restore();
        });
    }

    // Rick Astley himself 🕺  (sprite flips to face the direction he's walking)
    ctx.save();
    if (player.facing === 'left') {
        // Mirror around Rick's horizontal centre so he faces left
        ctx.translate(player.x + player.visualWidth, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(
            rickSheet,
            currentFrame * (rickSheet.naturalWidth / totalFrames), 0,
            (rickSheet.naturalWidth / totalFrames), rickSheet.naturalHeight,
            0, player.y, player.visualWidth, player.visualHeight
        );
    } else {
        ctx.drawImage(
            rickSheet,
            currentFrame * (rickSheet.naturalWidth / totalFrames), 0,
            (rickSheet.naturalWidth / totalFrames), rickSheet.naturalHeight,
            player.x, player.y, player.visualWidth, player.visualHeight
        );
    }
    ctx.restore();

    // Floating score popups
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px "Comic Sans MS", cursive, sans-serif';
    for (const p of scorePopups) {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = '#cc99ff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeText(p.text, p.x, p.y);
        ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
}

// Listen on document (not window) so keydown/keyup arrive even when the
// page's window object doesn't have focus (common on Linux after native
// OS overlays like Chrome Lens return control to the browser).
document.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        e.preventDefault();
        keys[e.key] = true;
    }
});
document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
});

// Clear stuck keys whenever the page loses visibility or the window blurs.
function clearKeys() { for (const key in keys) keys[key] = false; }
window.addEventListener('blur', clearKeys);
document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearKeys();
});

// Re-acquire keyboard focus the moment the mouse re-enters the game area —
// no click needed. This is the main fix for Linux + Chrome Lens:
// after the native overlay closes the cursor moves back over the page,
// which fires mouseenter and immediately restores input.
canvas.addEventListener('mouseenter', () => { canvas.focus(); });
document.addEventListener('click',     () => { canvas.focus(); });