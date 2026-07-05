const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const rickSheet = document.getElementById('rickSpriteSheet');

const discImg = new Image();
discImg.src = 'compact_disc.png';

const bgMusic = document.getElementById('bgMusic');
const menu = document.getElementById('main-menu');
const startBtn = document.getElementById('start-btn');
const statsBar = document.getElementById('stats-bar');

canvas.width = 800;
canvas.height = 400;

let gameActive = false;
let scanningComplete = false;
let currentLevel = 0;
let lives = 3;

// Sprite Animation Variables
const totalFrames = 43;
let currentFrame = 0;
let frameCounter = 0;
const frameSpeed = 7; 
let frameWidth = 0;
let frameHeight = 0;
let hitboxes = []; 

const levels = [
    {
        spawnX: 100, spawnY: 300, 
        platforms: [
            { x: 0, y: 380, width: 800, height: 20 },
            { x: 200, y: 280, width: 150, height: 20 },
            { x: 450, y: 200, width: 150, height: 20 }
        ],
        goal: { x: 750, y: 330, width: 30, height: 50 },
        disc: { x: 480, y: 150, width: 30, height: 30, collected: false }
    },
    {
        spawnX: 100, spawnY: 300,
        platforms: [
            { x: 0, y: 380, width: 200, height: 20 },
            { x: 250, y: 300, width: 100, height: 20 },
            { x: 400, y: 220, width: 100, height: 20 },
            { x: 600, y: 150, width: 200, height: 20 }
        ],
        goal: { x: 750, y: 100, width: 30, height: 50 },
        disc: { x: 420, y: 170, width: 30, height: 30, collected: false }
    },
    {
        spawnX: 100, spawnY: 80,
        platforms: [
            { x: 0, y: 150, width: 200, height: 20 },
            { x: 250, y: 220, width: 100, height: 20 },
            { x: 400, y: 300, width: 100, height: 20 },
            { x: 550, y: 380, width: 250, height: 20 }
        ],
        goal: { x: 750, y: 330, width: 30, height: 50 },
        disc: { x: 420, y: 250, width: 30, height: 30, collected: false }
    },
    {
        spawnX: 100, spawnY: 300,
        platforms: [
            { x: 0, y: 380, width: 150, height: 20 },
            { x: 250, y: 320, width: 80, height: 20 },
            { x: 400, y: 260, width: 80, height: 20 },
            { x: 550, y: 200, width: 80, height: 20 },
            { x: 700, y: 140, width: 100, height: 20 }
        ],
        goal: { x: 750, y: 80, width: 30, height: 50 },
        disc: { x: 575, y: 150, width: 30, height: 30, collected: false }
    },
    {
        spawnX: 360, spawnY: 300,
        platforms: [
            { x: 300, y: 380, width: 200, height: 20 },
            { x: 150, y: 300, width: 100, height: 20 },
            { x: 550, y: 300, width: 100, height: 20 },
            { x: 350, y: 220, width: 100, height: 20 },
            { x: 150, y: 140, width: 100, height: 20 },
            { x: 550, y: 140, width: 100, height: 20 },
            { x: 350, y: 60, width: 100, height: 20 }
        ],
        goal: { x: 385, y: 10, width: 30, height: 50 },
        disc: { x: 385, y: 170, width: 30, height: 30, collected: false }
    }
];

const player = {
    x: 100, y: 300, 
    visualWidth: 82, visualHeight: 58, 
    speed: 5, dx: 0, dy: 0,
    jumpPower: -13, grounded: false
};

const gravity = 0.3;
const keys = { ArrowUp: false, ArrowLeft: false, ArrowRight: false };

function calculateHitboxes() {
    frameWidth = rickSheet.naturalWidth / totalFrames;
    frameHeight = rickSheet.naturalHeight;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
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

startBtn.addEventListener('click', () => {
    if (!scanningComplete) return; 
    menu.style.display = 'none';
    statsBar.style.display = 'block';
    gameActive = true;
    lives = 3;
    currentLevel = 0;
    levels.forEach(lvl => lvl.disc.collected = false);
    updateUI();
    resetPlayer();
    bgMusic.play();
    update();
});

function updateUI() {
    document.getElementById('lives-display').innerText = `Lives: ${lives}`;
    document.getElementById('level-display').innerText = `Level: ${currentLevel + 1}`;
}

function resetPlayer() {
    const level = levels[currentLevel];
    player.x = level.spawnX;
    player.y = level.spawnY;
    player.dx = 0;
    player.dy = 0;
    player.grounded = false;
}

function die() {
    lives--;
    updateUI();
    if (lives <= 0) {
        alert("GAVE YOU UP! Game Over.");
        gameActive = false;
        menu.style.display = 'flex';
        statsBar.style.display = 'none';
        bgMusic.pause();
        bgMusic.currentTime = 0;
    } else {
        resetPlayer();
    }
}

function nextLevel() {
    currentLevel++;
    if (currentLevel < levels.length) {
        updateUI();
        resetPlayer();
    } else {
        alert("YOU NEVER LET US DOWN! You Won!");
        location.reload();
    }
}

function update() {
    if (!gameActive) return;

    frameCounter++;
    if (frameCounter >= frameSpeed) {
        currentFrame = (currentFrame + 1) % totalFrames;
        frameCounter = 0;
    }

    if (keys.ArrowRight) player.dx = player.speed;
    else if (keys.ArrowLeft) player.dx = -player.speed;
    else player.dx = 0;

    if (keys.ArrowUp && player.grounded) {
        player.dy = player.jumpPower;
        player.grounded = false;
    }

    player.dy += gravity;
    player.y += player.dy;
    player.x += player.dx;

    if (player.x < 0) player.x = 0;
    if (player.x + player.visualWidth > canvas.width) player.x = canvas.width - player.visualWidth;

    player.grounded = false;
    
    const hb = hitboxes[currentFrame];
    const pBodyX = player.x + hb.offX;
    const pBodyY = player.y + hb.offY;

    let currentPlats = levels[currentLevel].platforms;
    for (let plat of currentPlats) {
        if (pBodyX < plat.x + plat.width &&
            pBodyX + hb.w > plat.x &&
            pBodyY < plat.y + plat.height &&
            pBodyY + hb.h > plat.y) {
            
            if (player.dy > 0 && pBodyY + hb.h - player.dy <= plat.y) {
                player.dy = 0;
                player.y = plat.y - (hb.offY + hb.h);
                player.grounded = true;
            } 
            else if (player.dy < 0) {
                player.dy = 0;
                player.y = (plat.y + plat.height) - hb.offY;
            }
        }
    }

    let disc = levels[currentLevel].disc;
    if (!disc.collected &&
        pBodyX < disc.x + disc.width &&
        pBodyX + hb.w > disc.x &&
        pBodyY < disc.y + disc.height &&
        pBodyY + hb.h > disc.y) {
        disc.collected = true;
        lives++;
        updateUI();
    }

    let goal = levels[currentLevel].goal;
    if (pBodyX < goal.x + goal.width &&
        pBodyX + hb.w > goal.x &&
        pBodyY < goal.y + goal.height &&
        pBodyY + hb.h > goal.y) {
        nextLevel();
    }

    if (player.y > canvas.height) die();

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#fff';
    levels[currentLevel].platforms.forEach(plat => {
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
    });

    ctx.fillStyle = '#00ff00';
    let goal = levels[currentLevel].goal;
    ctx.fillRect(goal.x, goal.y, goal.width, goal.height);

    let disc = levels[currentLevel].disc;
    if (!disc.collected) {
        let floatY = disc.y + Math.sin(Date.now() / 200) * 10;
        ctx.drawImage(discImg, disc.x, floatY, disc.width, disc.height);
    }

    ctx.drawImage(
        rickSheet,
        currentFrame * (rickSheet.naturalWidth / totalFrames), 0, 
        (rickSheet.naturalWidth / totalFrames), rickSheet.naturalHeight,
        player.x, player.y, player.visualWidth, player.visualHeight
    );
}

window.addEventListener('keydown', (e) => { 
    if (keys.hasOwnProperty(e.key)) {
        e.preventDefault();
        keys[e.key] = true; 
    }
});
window.addEventListener('keyup', (e) => { 
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false; 
});