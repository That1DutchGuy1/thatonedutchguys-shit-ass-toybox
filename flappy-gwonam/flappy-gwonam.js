// FLAPPY GWONAM - The most unhinged Zelda CD-i game ever made
// "Squadala! We're off!" - Gwonam, probably

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- VIEWPORT SIZING ---
// Canvas always fills the full window. All game logic runs in a fixed
// internal coordinate space (VIRT_W x VIRT_H) and we scale to fit.
const VIRT_W = 704;
const VIRT_H = 440;
let scale = 1;

const bgGif = document.getElementById('bgGif');

function resizeCanvas() {
  const ww = window.innerWidth;
  const wh = window.innerHeight;
  scale = Math.min(ww / VIRT_W, wh / VIRT_H);
  const cw = Math.floor(VIRT_W * scale);
  const ch = Math.floor(VIRT_H * scale);
  canvas.width  = cw;
  canvas.height = ch;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  // Resizing resets canvas state — keep smoothing off so pixel art stays crisp
  ctx.imageSmoothingEnabled = false;
  // Snap the GIF to exactly the same position and size as the canvas
  const left = Math.floor((ww - cw) / 2);
  const top  = Math.floor((wh - ch) / 2);
  bgGif.style.left   = left + 'px';
  bgGif.style.top    = top  + 'px';
  bgGif.style.width  = cw   + 'px';
  bgGif.style.height = ch   + 'px';
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- ASSETS ---
const assets = {};
let assetsLoaded = 0;
const totalAssets = 4;

function loadAsset(key, src) {
  const img = new Image();
  img.onload  = () => { assets[key] = img; assetsLoaded++; if (assetsLoaded === totalAssets) init(); };
  img.onerror = () => { console.error('Failed to load:', src); assetsLoaded++; if (assetsLoaded === totalAssets) init(); };
  img.src = src;
}

// Background GIF is now a plain <img id="bgGif"> in the HTML, animated natively by the browser.
// Canvas is transparent so the GIF shows through underneath. No asset loading needed for bg.
assetsLoaded++; // account for the bg slot so totalAssets count still works
loadAsset('gwonam', './assets/sprites/gwonam-spritesheet.png');
loadAsset('pillar', './assets/sprites/pillar.png');
loadAsset('rubies', './assets/sprites/rubies-spritesheet.png');

// --- AUDIO ---
let squadalaBuffer = null;
let youLoseBuffer  = null;
let musicBuffer    = null;
let musicSource    = null;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

async function loadAudio(url) {
  const res    = await fetch(url);
  const arrBuf = await res.arrayBuffer();
  return await audioCtx.decodeAudioData(arrBuf);
}

async function loadAllAudio() {
  [squadalaBuffer, youLoseBuffer, musicBuffer] = await Promise.all([
    loadAudio('./assets/audio/squadala.mp3'),
    loadAudio('./assets/audio/you-lose.mp3'),
    loadAudio('./assets/music/faces-of-evil-map-theme.mp3'),
  ]);
}
loadAllAudio();

function playSound(buffer) {
  if (!buffer) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const src = audioCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(audioCtx.destination);
  src.start(0);
}

function playSquadalaEarrape() {
  if (!squadalaBuffer) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  // Gain cranked to 6x — obnoxiously loud 🔊🔊🔊
  const gain = audioCtx.createGain();
  gain.gain.value = 6.0;

  // Compressor so it doesn't turn into digital garbage — just LOUD garbage
  const comp = audioCtx.createDynamicsCompressor();
  comp.threshold.value = -6;
  comp.knee.value      = 0;
  comp.ratio.value     = 20;
  comp.attack.value    = 0.001;
  comp.release.value   = 0.1;

  const src = audioCtx.createBufferSource();
  src.buffer = squadalaBuffer;
  src.connect(gain);
  gain.connect(comp);
  comp.connect(audioCtx.destination);
  src.start(0);
}

function playRubyJingle(value) {
  // Chiptune collect jingle — different pitch/notes per ruby tier
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;

  // Note frequencies per tier: red=simple 2-note, green=3-note, blue=4-note arp
  const sequences = {
    1:  [{ f: 880, t: 0,     d: 0.07 }, { f: 1320, t: 0.07, d: 0.10 }],
    5:  [{ f: 880, t: 0,     d: 0.06 }, { f: 1108, t: 0.06, d: 0.06 }, { f: 1480, t: 0.12, d: 0.12 }],
    10: [{ f: 880, t: 0,     d: 0.05 }, { f: 1108, t: 0.05, d: 0.05 },
         { f: 1480, t: 0.10, d: 0.05 }, { f: 1760, t: 0.15, d: 0.15 }],
  };
  const notes = sequences[value] || sequences[1];

  for (const note of notes) {
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type            = 'square';
    osc.frequency.value = note.f;
    gain.gain.setValueAtTime(0.18, now + note.t);
    gain.gain.exponentialRampToValueAtTime(0.001, now + note.t + note.d);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now + note.t);
    osc.stop(now  + note.t + note.d + 0.01);
  }
}

function playSquishSound() {
  // Cartoon splat: fast pitch-drop noise burst
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);
  gain.gain.setValueAtTime(0.55, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.25);
  // Add a noise thud on top
  const bufSize = audioCtx.sampleRate * 0.12;
  const nBuf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data  = nBuf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
  const nSrc  = audioCtx.createBufferSource();
  const nGain = audioCtx.createGain();
  nSrc.buffer = nBuf;
  nGain.gain.setValueAtTime(0.4, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  nSrc.connect(nGain);
  nGain.connect(audioCtx.destination);
  nSrc.start(now);
}

function playBoingSound() {
  // Spring boing for headbump
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);
  osc.frequency.exponentialRampToValueAtTime(150, now + 0.35);
  gain.gain.setValueAtTime(0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.4);
}

function playCarpetBonkSound() {
  // Dull thud + wobble for carpet bonk
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const now = audioCtx.currentTime;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(300, now);
  osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);
  gain.gain.setValueAtTime(0.5, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.32);
}

function startMusic() {
  if (!musicBuffer) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  if (musicSource) { try { musicSource.stop(); } catch(e){} }
  musicSource = audioCtx.createBufferSource();
  musicSource.buffer = musicBuffer;
  musicSource.loop   = true;
  musicSource.connect(audioCtx.destination);
  musicSource.start(0);
}

// --- SPRITESHEET FRAME DATA ---
// Exact frame boundaries measured from the spritesheet (212x62, RGBA)
// Zero-alpha gap columns: 0-1 | 68-72 | 140-144 | 210-211
const FRAMES = [
  { x: 2,   w: 66 },
  { x: 73,  w: 67 },
  { x: 145, w: 65 },
];
const FRAME_COUNT    = 3;
const SHEET_H        = 62;
const GWONAM_DISP_W  = 90;   // rendered width  (upscaled a bit for readability)
const GWONAM_DISP_H  = Math.round(SHEET_H * (GWONAM_DISP_W / 67)); // ~83
const PILLAR_DISP_W  = 90;   // rendered pillar width

// --- RUBY SPRITESHEET DATA ---
// Row 0 y=0  h=16: RED   (value 1)  — 3 animation frames
// Row 1 y=21 h=16: GREEN (value 5)  — 5 animation frames
// Row 2 y=42 h=16: BLUE  (value 10) — 4 animation frames
// Each frame cell: w=11, x positions = [0,16,32,48,64]
const RUBY_CELL_W  = 11;
const RUBY_CELL_H  = 16;
const RUBY_CELL_XS = [0, 16, 32, 48, 64];
const RUBY_TYPES = [
  { name: 'red',   sheetY: 0,  frameCount: 3, value: 1  },
  { name: 'green', sheetY: 21, frameCount: 5, value: 5  },
  { name: 'blue',  sheetY: 42, frameCount: 4, value: 10 },
];
const RUBY_DISP_W        = 22;   // rendered size (2x upscale)
const RUBY_DISP_H        = 32;
const RUBY_FRAME_DUR     = 0.14; // seconds per animation frame
const RUBY_FLOAT_AMP     = 5;    // px up/down float amplitude
const RUBY_FLOAT_SPEED   = 2.2;  // radians/sec for float sine wave
const RUBY_SPAWN_CHANCE  = 0.65; // probability a gap spawns a ruby

// --- RUBY GAME STATE ---
let rubies        = [];   // active collectibles in the world
let rubyScore     = 0;    // current run ruby count
let rubyHighScore = parseInt(localStorage.getItem('flappyGwonamRubyHS') || '0', 10);

// Collect-jingle state (synthesized chiptune, one per collection)
// Played via Web Audio — no sample needed

// --- PRE-BAKED ALPHA MASKS ---
// We bake all alpha data into flat Uint8Arrays at their SOURCE resolution
// so collision checks are just array lookups — no getImageData per frame!

// gwonamMasks[frameIndex] = Uint8Array of alpha at source resolution
const gwonamMasks = [];
let gwonamMaskW = 0, gwonamMaskH = 0;

// pillarMask: Uint8Array of alpha at source resolution (full 2048x2048)
let pillarMask = null;
let pillarMaskW = 0, pillarMaskH = 0;

// Per-frame opaque pixel bounds in SOURCE space — used for floor/ceiling alpha kill
// gwonamBounds[frameIndex] = { topRow, bottomRow } first/last rows with any opaque pixel
const gwonamBounds = [];

function bakeGwonamMasks() {
  if (!assets.gwonam) return;
  const off = document.createElement('canvas');
  off.width  = assets.gwonam.width;
  off.height = assets.gwonam.height;
  const octx = off.getContext('2d');
  octx.drawImage(assets.gwonam, 0, 0);
  const imgData = octx.getImageData(0, 0, off.width, off.height);
  const src = imgData.data; // RGBA flat array

  gwonamMaskW = assets.gwonam.width;
  gwonamMaskH = assets.gwonam.height;

  for (const f of FRAMES) {
    const mask = new Uint8Array(f.w * SHEET_H);
    let topRow = SHEET_H, bottomRow = 0;
    for (let row = 0; row < SHEET_H; row++) {
      let rowHasOpaque = false;
      for (let col = 0; col < f.w; col++) {
        const srcIdx = (row * gwonamMaskW + (f.x + col)) * 4;
        const alpha = src[srcIdx + 3];
        mask[row * f.w + col] = alpha;
        if (alpha >= ALPHA_THRESH) rowHasOpaque = true;
      }
      if (rowHasOpaque) {
        if (row < topRow)    topRow    = row;
        if (row > bottomRow) bottomRow = row;
      }
    }
    gwonamMasks.push(mask);
    // Convert source-space rows to display-space offsets (fraction of GWONAM_DISP_H)
    gwonamBounds.push({
      topOffset:    Math.floor(topRow    / SHEET_H * GWONAM_DISP_H),
      bottomOffset: Math.ceil((bottomRow + 1) / SHEET_H * GWONAM_DISP_H),
    });
  }
}

function bakePillarMask() {
  if (!assets.pillar) return;
  const pw = assets.pillar.width;
  const ph = assets.pillar.height;
  const off = document.createElement('canvas');
  off.width  = pw;
  off.height = ph;
  const octx = off.getContext('2d');
  octx.drawImage(assets.pillar, 0, 0);
  const imgData = octx.getImageData(0, 0, pw, ph);
  const src = imgData.data;

  pillarMask  = new Uint8Array(pw * ph);
  pillarMaskW = pw;
  pillarMaskH = ph;

  for (let i = 0; i < pw * ph; i++) {
    pillarMask[i] = src[i * 4 + 3];
  }
}

// Find the leftmost opaque display-pixel column of a pillar at a given display-Y range.
// Scans left-to-right across the pillar's display width and returns the first column
// that has any opaque pixel within [dispYmin, dispYmax] (in virtual coords relative to
// the pillar's own top).  Returns PILLAR_DISP_W (no opaque pixel found) as fallback.
function pillarLeftOpaqueCol(pipe, dispYmin, dispYmax, isPipeTop) {
  for (let col = 0; col < PILLAR_DISP_W; col++) {
    const pilSrcX = (col / PILLAR_DISP_W) * pillarMaskW;
    for (let dy = dispYmin; dy <= dispYmax; dy += 2) {
      let pilSrcY;
      if (isPipeTop) {
        // Top pillar is flipped: display top of pipe corresponds to source bottom
        // The pipe is drawn from y=0 up to pipe.topH, flipped vertically.
        // dy here is in [0..pipe.topH], 0=screen top, pipe.topH=screen bottom of top pipe.
        pilSrcY = (1 - dy / pipe.topH) * pillarMaskH;
      } else {
        // Bottom pillar: dy is relative to the bottom pipe's top (pipe.topH + PIPE_GAP)
        const dispH = VIRT_H - (pipe.topH + PIPE_GAP);
        pilSrcY = (dy / Math.max(dispH, 1)) * pillarMaskH;
      }
      if (pillarAlphaAt(pilSrcX, pilSrcY) >= ALPHA_THRESH) return col;
    }
  }
  return PILLAR_DISP_W; // fallback: no opaque pixels found
}

// Sample pillar alpha at a source-space pixel (clamped)
function pillarAlphaAt(srcX, srcY) {
  const x = Math.round(srcX);
  const y = Math.round(srcY);
  if (x < 0 || x >= pillarMaskW || y < 0 || y >= pillarMaskH) return 0;
  return pillarMask[y * pillarMaskW + x];
}

// Sample Gwonam alpha at a source-space pixel within a frame
function gwonamAlphaAt(frameIdx, srcX, srcY) {
  const f = FRAMES[frameIdx];
  const x = Math.round(srcX);
  const y = Math.round(srcY);
  if (x < 0 || x >= f.w || y < 0 || y >= SHEET_H) return 0;
  return gwonamMasks[frameIdx][y * f.w + x];
}

// --- GAME STATE ---
const GRAVITY           = 1500;  // px/s² (virtual space)
const FLAP_FORCE        = -500;  // px/s  (virtual space)
const PIPE_SPEED        = 230;   // px/s  (virtual space)
const PIPE_GAP          = 160;   // px    (virtual space)
const PIPE_SPAWN_INTERVAL = 1.6; // seconds
const GWONAM_X          = 120;   // fixed X in virtual space

let gameState  = 'waiting'; // waiting | playing | dead
let score      = 0;
let highScore  = 0;
let lastTime   = null;
let pipeTimer  = 0;
let musicStarted = false;

// --- SQUADALA METER ---
const SQUADALA_MAX        = 5;    // pipes to fill meter
const SQUADALA_INVINCE_T  = 5.0;  // seconds of invincibility
const SQUADALA_BOOST_SPD  = 120;  // extra px/s during boost
let squadalaMeter     = 0;        // 0..SQUADALA_MAX (can be fractional during drain)
let squadalaActive    = false;    // is boost/invincibility running?
let squadalaTimer     = 0;        // countdown while active
// Flash effect for the meter when it hits full
let meterFullFlash    = 0;        // countdown timer for the "FULL!" flash

let gwonam = {
  y: VIRT_H / 2 - GWONAM_DISP_H / 2,
  vy: 0,
  frame: 0,
  frameTimer: 0,
  frameDuration: 0.13,
  rotation: 0,
};

// --- IDLE ANIMATION STATE (waiting screen) ---
let idleT = 0; // time accumulator for float sine wave

// --- DEATH ANIMATION STATE ---
// deathType: null | 'squish' | 'headbump' | 'carpetbonk'
// deathAnim: tracks per-type animation progress
let deathType  = null;
let deathAnim  = null;
// How long before the YOU LOSE overlay fades in
const DEATH_OVERLAY_DELAY = 1.6; // seconds
let deathTimer = 0;

let pipes = [];

// --- DEATH MESSAGE STATE ---
let consecutiveDeathsWithoutRuby = 0; // increments each death with rubyScore===0, resets otherwise
let lastDeathType = null; // 'fall_bottom' | 'fall_top' | 'squish' | 'headbump' | 'carpetbonk'

const DEATH_MESSAGES = {
  fall_bottom: [
    '"It is written... the floor claims you."',
    '"Into the void below, Gwonam descends."',
    '"The magic carpet has abandoned ship."',
    '"Gravity: 1. Gwonam: 0."',
    '"Down, down, into the depths!"',
  ],
  fall_top: [
    '"Too ambitious, Gwonam."',
    '"The sky rejects you."',
    '"Flew too close to the ceiling..."',
    '"Even magic carpets have limits."',
    '"Perhaps aim slightly lower next time."',
  ],
  squish: [
    '"OUCH! That pillar came out of nowhere!"',
    '"Squished like a Hylian pancake."',
    '"The stone does not yield to carpet."',
    '"Gwonam, meet wall. Wall, meet Gwonam."',
    '"A flat Gwonam is an ineffective Gwonam."',
  ],
  headbump: [
    '"Watch your head, Gwonam!"',
    '"Bonked by the heavens themselves."',
    '"Low ceiling detected, too late."',
    '"The top pillar disagrees with your route."',
    '"That had to hurt... the carpet, mostly."',
  ],
  carpetbonk: [
    '"The bottom pillar sends its regards."',
    '"Carpet vs stone. Stone wins again."',
    '"A carpet bonk most undignified."',
    '"Next time, maybe fly a bit higher."',
    '"Gwonam bounced. Briefly."',
  ],
};

function resetGame() {
  gwonam.y         = VIRT_H / 2 - GWONAM_DISP_H / 2;
  gwonam.vy        = 0;
  gwonam.frame     = 0;
  gwonam.frameTimer = 0;
  gwonam.rotation  = 0;
  gwonam.deathPipe  = null;
  pipes          = [];
  rubies         = [];
  score          = 0;
  rubyScore      = 0;
  pipeTimer      = 0;
  squadalaMeter  = 0;
  squadalaActive = false;
  squadalaTimer  = 0;
  meterFullFlash = 0;
  deathType      = null;
  deathAnim      = null;
  deathTimer     = 0;
  idleT          = 0;
  gameState      = 'playing';
  lastTime       = null;
  updateYtCredit();
}

// --- PIXEL-PERFECT COLLISION ---
// For each pixel of Gwonam (sampled on a grid), we:
//   1. Map from display space -> Gwonam source frame space
//   2. Check Gwonam alpha (skip transparent Gwonam pixels)
//   3. Map same display point -> pillar source space
//   4. Check pillar alpha (skip transparent pillar pixels)
// A hit requires BOTH pixels to be opaque.

const ALPHA_THRESH = 50;
const SAMPLE_STEP  = 3; // check every N virtual pixels (3 is plenty accurate & fast)

// Returns null (no hit), or one of: 'squish' | 'headbump' | 'carpetbonk'
// squish    = side hit (Gwonam flies into pillar column from the left)
// headbump  = Gwonam's top hits the BOTTOM face of the top (upside-down) pillar
// carpetbonk= Gwonam's carpet hits the TOP face of the bottom pillar
function checkCollisionWithPipe(pipe) {
  const f        = FRAMES[Math.floor(gwonam.frame)];
  const frameIdx = Math.floor(gwonam.frame);

  const gx = GWONAM_X;
  const gy = gwonam.y;

  const gwScaleX = f.w     / GWONAM_DISP_W;
  const gwScaleY = SHEET_H / GWONAM_DISP_H;

  // Track which zone(s) got a hit so we can classify
  let hitTop    = false;
  let hitBottom = false;
  let hitSide   = false;

  for (let dy = 0; dy < GWONAM_DISP_H; dy += SAMPLE_STEP) {
    for (let dx = 0; dx < GWONAM_DISP_W; dx += SAMPLE_STEP) {
      const wx = gx + dx;
      const wy = gy + dy;

      const gwSrcX = dx * gwScaleX;
      const gwSrcY = dy * gwScaleY;
      if (gwonamAlphaAt(frameIdx, gwSrcX, gwSrcY) < ALPHA_THRESH) continue;

      const pipeLocalX = wx - pipe.x;
      if (pipeLocalX < 0 || pipeLocalX >= PILLAR_DISP_W) continue;

      const pilSrcX = (pipeLocalX / PILLAR_DISP_W) * pillarMaskW;

      // Top pillar (upside-down) — bottom face = pipe.topH
      if (wy < pipe.topH) {
        const pilSrcY = (1 - wy / pipe.topH) * pillarMaskH;
        if (pillarAlphaAt(pilSrcX, pilSrcY) >= ALPHA_THRESH) {
          // If the hit is near the very bottom face of the top pillar it's a headbump,
          // otherwise it's a side squish
          if (wy > pipe.topH - GWONAM_DISP_H * 0.4) hitTop = true;
          else hitSide = true;
        }
      }

      // Bottom pillar — top face = pipe.topH + PIPE_GAP
      const bottomStart = pipe.topH + PIPE_GAP;
      if (wy >= bottomStart) {
        const dispY   = wy - bottomStart;
        const dispH   = VIRT_H - bottomStart;
        if (dispH <= 0) continue;
        const pilSrcY = (dispY / dispH) * pillarMaskH;
        if (pillarAlphaAt(pilSrcX, pilSrcY) >= ALPHA_THRESH) {
          // Near the top face of the bottom pillar = carpetbonk, else squish
          if (wy < bottomStart + GWONAM_DISP_H * 0.4) hitBottom = true;
          else hitSide = true;
        }
      }
    }
  }

  if (!hitTop && !hitBottom && !hitSide) return null;
  // Priority: side squish > head bump > carpet bonk
  if (hitSide)   return 'squish';
  if (hitTop)    return 'headbump';
  if (hitBottom) return 'carpetbonk';
  return null;
}

// --- DRAW ---
function drawBackground() {
  // GIF background is a native <img id="bgGif"> behind the canvas in the DOM.
  // Canvas is transparent so it shows through — nothing to draw here!
  // We DO need to clear the canvas each frame though so old frames don't stack up.
  ctx.clearRect(0, 0, VIRT_W, VIRT_H);
}

function drawPipes() {
  if (!assets.pillar) return;
  for (const pipe of pipes) {
    // TOP pillar: flipped upside-down, bottom edge = pipe.topH
    ctx.save();
    ctx.translate(pipe.x, pipe.topH);
    ctx.scale(1, -1);
    ctx.drawImage(assets.pillar, 0, 0, PILLAR_DISP_W, pipe.topH);
    ctx.restore();

    // BOTTOM pillar
    const bottomY = pipe.topH + PIPE_GAP;
    const bottomH = VIRT_H - bottomY;
    if (bottomH > 0) {
      ctx.drawImage(assets.pillar, pipe.x, bottomY, PILLAR_DISP_W, bottomH);
    }
  }
}

function drawGwonam() {
  if (!assets.gwonam) return;

  // --- DEATH ANIMATIONS ---
  if (gameState === 'dead' && deathAnim) {

    if (deathType === 'squish') {
      // contactX is the actual opaque left face of the pillar at the moment of impact.
      // Gwonam's RIGHT edge is pinned to contactX; as scaleX shrinks he flattens against it.
      const fi    = Math.floor(gwonam.frame);
      const f     = FRAMES[fi];
      const drawW = GWONAM_DISP_W * deathAnim.scaleX;
      const drawX = deathAnim.contactX - drawW; // right edge stays on the stone face
      const drawY = deathAnim.squishY;
      ctx.save();
      ctx.drawImage(
        assets.gwonam,
        f.x, 0, f.w, SHEET_H,
        drawX, drawY, drawW, GWONAM_DISP_H
      );
      ctx.restore();
      return;
    }

    if (deathType === 'headbump' || deathType === 'carpetbonk' ||
        deathType === 'fall_top' || deathType === 'fall_bottom') {
      const fi = Math.floor(gwonam.frame);
      const f  = FRAMES[fi];
      ctx.save();
      const cx = deathAnim.x + GWONAM_DISP_W / 2;
      const cy = deathAnim.y + GWONAM_DISP_H / 2;
      ctx.translate(cx, cy);
      ctx.rotate(deathAnim.rot);
      ctx.drawImage(
        assets.gwonam,
        f.x, 0, f.w, SHEET_H,
        -GWONAM_DISP_W / 2, -GWONAM_DISP_H / 2,
        GWONAM_DISP_W, GWONAM_DISP_H
      );
      ctx.restore();
      return;
    }
  }

  // --- NORMAL / IDLE DRAW ---
  const fi = Math.floor(gwonam.frame);
  const f  = FRAMES[fi];
  const drawX = gameState === 'waiting' ? GWONAM_X : GWONAM_X;
  ctx.save();
  const cx = GWONAM_X + GWONAM_DISP_W / 2;
  const cy = gwonam.y  + GWONAM_DISP_H / 2;
  ctx.translate(cx, cy);
  ctx.rotate(gwonam.rotation);
  ctx.drawImage(
    assets.gwonam,
    f.x, 0, f.w, SHEET_H,
    -GWONAM_DISP_W / 2, -GWONAM_DISP_H / 2,
    GWONAM_DISP_W, GWONAM_DISP_H
  );
  ctx.restore();
}

function drawRubies() {
  if (!assets.rubies) return;
  for (const ruby of rubies) {
    if (ruby.collected) continue;
    const type   = RUBY_TYPES[ruby.typeIdx];
    const frameX = RUBY_CELL_XS[ruby.frame];
    const drawY  = ruby.y + Math.sin(ruby.floatT) * RUBY_FLOAT_AMP;
    ctx.drawImage(
      assets.rubies,
      frameX, type.sheetY, RUBY_CELL_W, RUBY_CELL_H,
      ruby.x, drawY, RUBY_DISP_W, RUBY_DISP_H
    );
  }
}

function drawHUD() {
  ctx.lineWidth = 3;

  // --- TOP LEFT: pillar score ---
  ctx.font        = '30px "Charlemagne Std Bold", sans-serif';
  ctx.textAlign   = 'left';
  ctx.strokeStyle = '#000';
  ctx.fillStyle   = '#FFD700';
  ctx.strokeText(score, 14, 38);
  ctx.fillText(score,   14, 38);

  // --- TOP RIGHT: ruby icon + count ---
  const iconW = RUBY_DISP_W;
  const iconH = RUBY_DISP_H;
  const countStr = String(rubyScore);
  ctx.font = '24px "Charlemagne Std Bold", sans-serif';
  const textW = ctx.measureText(countStr).width;
  const pad   = 8;
  const totalW = iconW + pad + textW;
  const startX = VIRT_W - 14 - totalW;
  const iconY  = 6;

  // Draw a static green ruby frame 0 as the icon
  if (assets.rubies) {
    ctx.drawImage(
      assets.rubies,
      RUBY_CELL_XS[0], RUBY_TYPES[1].sheetY, RUBY_CELL_W, RUBY_CELL_H,
      startX, iconY, iconW, iconH
    );
  }

  ctx.textAlign   = 'left';
  ctx.strokeStyle = '#000';
  ctx.fillStyle   = '#44FF88';
  ctx.lineWidth   = 2.5;
  ctx.strokeText(countStr, startX + iconW + pad, iconY + iconH * 0.78);
  ctx.fillText(countStr,   startX + iconW + pad, iconY + iconH * 0.78);
}

function drawSquadalaMeter() {
  const barW       = 220;
  const barH       = 22;
  const barX       = (VIRT_W - barW) / 2;
  const barY       = VIRT_H - 38;
  const fillRatio  = squadalaMeter / SQUADALA_MAX;
  const isFull     = squadalaMeter >= SQUADALA_MAX;
  const isActive   = squadalaActive;

  // Label above bar
  ctx.font      = '13px "Zelda CD-i Font", cursive';
  ctx.textAlign = 'center';

  if (isActive) {
    // Pulsing "SQUADALA MODE!!" label while active
    const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 120);
    ctx.fillStyle   = `rgba(255,${Math.floor(80 + 175 * pulse)},0,1)`;
    ctx.strokeStyle = '#000';
    ctx.lineWidth   = 2;
    ctx.strokeText('✨ SQUADALA MODE!! ✨', VIRT_W / 2, barY - 4);
    ctx.fillText('✨ SQUADALA MODE!! ✨',   VIRT_W / 2, barY - 4);
  } else if (isFull && meterFullFlash > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 80);
    ctx.fillStyle   = `rgba(255,${Math.floor(200 + 55 * pulse)},0,1)`;
    ctx.strokeStyle = '#000';
    ctx.lineWidth   = 2;
    ctx.strokeText('PRESS SPACE!!', VIRT_W / 2, barY - 4);
    ctx.fillText('PRESS SPACE!!',   VIRT_W / 2, barY - 4);
  } else {
    ctx.fillStyle   = '#FFD700';
    ctx.strokeStyle = '#000';
    ctx.lineWidth   = 1.5;
    ctx.strokeText('SQUADALA METER', VIRT_W / 2, barY - 4);
    ctx.fillText('SQUADALA METER',   VIRT_W / 2, barY - 4);
  }

  // Bar background
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  roundRect(ctx, barX - 2, barY - 2, barW + 4, barH + 4, 5);
  ctx.fill();

  // Bar border
  ctx.strokeStyle = isActive ? '#FF8800' : (isFull ? '#FFD700' : '#884400');
  ctx.lineWidth   = isActive ? 2.5 : 1.5;
  roundRect(ctx, barX - 2, barY - 2, barW + 4, barH + 4, 5);
  ctx.stroke();

  // Fill segments (5 pips)
  for (let i = 0; i < SQUADALA_MAX; i++) {
    const segW   = barW / SQUADALA_MAX;
    const segX   = barX + i * segW;
    const filled = squadalaMeter > i
      ? Math.min(1, squadalaMeter - i)   // partial fill for smooth look
      : 0;
    if (filled <= 0) continue;

    const fillW = segW * filled - 2; // 2px gap between pips

    if (isActive) {
      // Rainbow shimmer during active mode
      const hue = (Date.now() / 8 + i * 60) % 360;
      ctx.fillStyle = `hsl(${hue},100%,55%)`;
    } else if (isFull) {
      // Gold glow when full
      const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 150 + i);
      ctx.fillStyle = `rgba(255,${Math.floor(180 + 75 * pulse)},0,1)`;
    } else {
      // Normal: green -> yellow -> orange gradient across segments
      const t   = i / (SQUADALA_MAX - 1);
      const r   = Math.floor(50  + 205 * t);
      const g   = Math.floor(220 - 100 * t);
      ctx.fillStyle = `rgb(${r},${g},20)`;
    }

    roundRect(ctx, segX + 1, barY + 1, fillW, barH - 2, 3);
    ctx.fill();
  }

  // Active timer bar on top of everything — shows time remaining
  if (isActive) {
    const timeRatio = squadalaTimer / SQUADALA_INVINCE_T;
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(ctx, barX, barY, barW * timeRatio, barH, 3);
    ctx.fill();
  }

  // Gwonam golden star glow effect while invincible
  if (isActive) {
    const glow = 8 + 6 * Math.sin(Date.now() / 100);
    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur  = glow;
    ctx.globalAlpha = 0.6;
    const fi = Math.floor(gwonam.frame);
    const f  = FRAMES[fi];
    ctx.drawImage(
      assets.gwonam,
      f.x, 0, f.w, SHEET_H,
      GWONAM_X - 4, gwonam.y - 4,
      GWONAM_DISP_W + 8, GWONAM_DISP_H + 8
    );
    ctx.restore();
  }
}

// Canvas roundRect helper (works on all browsers)
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h,     x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y,         x + r, y);
  ctx.closePath();
}

function drawOverlay(alpha) {
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.fillRect(0, 0, VIRT_W, VIRT_H);
}

function drawText(text, x, y, size, fill, stroke, sw) {
  ctx.fillStyle   = fill;
  ctx.strokeStyle = stroke || '#000';
  ctx.lineWidth   = sw || 3;
  ctx.textAlign   = 'center';

  // Split text into runs of digits vs non-digits.
  // Digits use Charlemagne Std Bold (the Zelda CD-i font has no number glyphs).
  // Everything else uses the Zelda CD-i font.
  const runs = [];
  let cur = '';
  let curIsNum = null;
  for (const ch of String(text)) {
    const isNum = /[0-9]/.test(ch);
    if (curIsNum === null) { curIsNum = isNum; }
    if (isNum !== curIsNum) { runs.push({ str: cur, num: curIsNum }); cur = ''; curIsNum = isNum; }
    cur += ch;
  }
  if (cur.length) runs.push({ str: cur, num: curIsNum });

  if (runs.length <= 1) {
    // Fast path: no font switching needed
    ctx.font = runs.length === 1 && runs[0].num
      ? `${size}px "Charlemagne Std Bold", serif`
      : `${size}px "Zelda CD-i Font", cursive`;
    ctx.strokeText(text, x, y);
    ctx.fillText(text,   x, y);
    return;
  }

  // Measure total width so we can centre the whole string manually.
  let totalW = 0;
  for (const run of runs) {
    ctx.font = run.num
      ? `${size}px "Charlemagne Std Bold", serif`
      : `${size}px "Zelda CD-i Font", cursive`;
    run.w = ctx.measureText(run.str).width;
    totalW += run.w;
  }

  let curX = x - totalW / 2;
  ctx.textAlign = 'left';
  for (const run of runs) {
    ctx.font = run.num
      ? `${size}px "Charlemagne Std Bold", serif`
      : `${size}px "Zelda CD-i Font", cursive`;
    ctx.strokeText(run.str, curX, y);
    ctx.fillText(run.str,   curX, y);
    curX += run.w;
  }
  ctx.textAlign = 'center'; // restore
}

function drawWaitScreen() {
  drawOverlay(0.55);
  const mx = VIRT_W / 2;
  drawText('FLAPPY GWONAM',           mx, 140, 52, '#FFD700', '#5500AA', 4);
  drawText('"Squadala! We\'re off!"', mx, 192, 26, '#e53af1',    '#000',    2);
  drawText('Press SPACE to begin',    mx, 258, 22, '#FFD700', '#000',    2);
  if (highScore > 0)
    drawText('Best pillars: ' + highScore,       mx, 292, 18, '#FF66FF', '#000', 2);
  if (rubyHighScore > 0)
    drawText('Best rubies: ' + rubyHighScore,    mx, 316, 18, '#44FF88', '#000', 2);
}

function getDeathMessage() {
  // The original message fires when you've died 3+ times in a row without any ruby
  if (consecutiveDeathsWithoutRuby >= 3) {
    return '"Maybe magic carpet riding isn\'t for you..."';
  }
  // Otherwise pick a message based on how Gwonam died
  const pool = DEATH_MESSAGES[lastDeathType];
  if (!pool) return '"Squadala... not."';
  // Deterministic-ish pick so it doesn't flicker each frame: seed on score+rubyScore
  return pool[(score + rubyScore) % pool.length];
}

function drawDeadScreen() {
  drawOverlay(0.60);
  const mx = VIRT_W / 2;
  drawText('YOU LOSE!',                         mx, 148, 52, '#FF2222', '#000', 4);
  drawText('Pillars: ' + score,                 mx, 202, 22, '#FFD700', '#000', 2);
  drawText('Best pillars: ' + highScore,        mx, 230, 18, '#FF66FF', '#000', 2);
  drawText('Rubies: ' + rubyScore,              mx, 262, 22, '#44FF88', '#000', 2);
  drawText('Best rubies: '  + rubyHighScore,    mx, 288, 18, '#44FF88', '#000', 2);
  drawText('Press SPACE to try again',          mx, 326, 22, '#fcffd9', '#000', 2);
  drawText(getDeathMessage(),                   mx, 362, 16, '#aaa',    '#000', 1);
}

// --- UPDATE ---
function spawnPipe() {
  const minTop = 70;
  const maxTop = VIRT_H - PIPE_GAP - 70;
  const topH   = Math.floor(Math.random() * (maxTop - minTop + 1)) + minTop;
  pipes.push({ x: VIRT_W + 10, topH, scored: false });

  // Maybe spawn a ruby floating in the gap
  if (Math.random() < RUBY_SPAWN_CHANCE) {
    // Weighted random type: red=60%, green=30%, blue=10%
    const roll = Math.random();
    const typeIdx = roll < 0.60 ? 0 : roll < 0.90 ? 1 : 2;
    const type = RUBY_TYPES[typeIdx];
    // Centre it in the gap vertically, random horizontal offset inside next gap zone
    const gapCentreY = topH + PIPE_GAP / 2 - RUBY_DISP_H / 2;
    rubies.push({
      x:          VIRT_W + 10 + PILLAR_DISP_W / 2 - RUBY_DISP_W / 2,
      y:          gapCentreY,
      typeIdx,
      frame:      0,
      frameTimer: Math.random() * RUBY_FRAME_DUR, // stagger so they don't all sync
      floatT:     Math.random() * Math.PI * 2,    // random float phase
      collected:  false,
    });
  }
}

function updateIdleAnim(dt) {
  // Advance Gwonam's frame animation on the wait screen
  idleT += dt;
  gwonam.frameTimer += dt;
  if (gwonam.frameTimer >= gwonam.frameDuration) {
    gwonam.frameTimer -= gwonam.frameDuration;
    gwonam.frame = (Math.floor(gwonam.frame) + 1) % FRAME_COUNT;
  }
  // Gentle float: sine wave up/down
  gwonam.y = VIRT_H / 2 - GWONAM_DISP_H / 2 + Math.sin(idleT * 1.8) * 10;
  // Slight rotation sway
  gwonam.rotation = Math.sin(idleT * 1.4) * 0.08;
}

function updateDeathAnim(dt) {
  if (!deathAnim) return;
  deathAnim.elapsed += dt;

  if (deathType === 'squish') {
    // Phase 1 (0–0.18s): squish flat against pillar's opaque face (contactX)
    // Phase 2 (0.18–0.75s): hold squished, stuck to pillar
    // Phase 3 (0.75s+): slide down off pillar under gravity
    const t = deathAnim.elapsed;
    if (t < 0.18) {
      deathAnim.scaleX = 1.0 - (t / 0.18) * 0.88; // squish to 0.12
    } else if (t < 0.75) {
      deathAnim.scaleX = 0.12;
    } else {
      // Slide phase: contactX is already frozen from the moment of impact, just fall
      deathAnim.scaleX  = 0.12;
      deathAnim.slideVy += GRAVITY * 0.55 * dt;
      deathAnim.squishY += deathAnim.slideVy * dt;
    }
    // Fire you-lose sound once at ~0.45s
    if (!deathAnim.soundPlayed && t >= 0.45) {
      deathAnim.soundPlayed = true;
      playSound(youLoseBuffer);
    }

  } else if (deathType === 'headbump' || deathType === 'carpetbonk') {
    deathAnim.vy  += GRAVITY * dt;
    deathAnim.x   += deathAnim.vx  * dt;
    deathAnim.y   += deathAnim.vy  * dt;
    deathAnim.rot += deathAnim.rotSpd * dt;
    // Fire you-lose sound once at ~0.3s
    if (!deathAnim.soundPlayed && deathAnim.elapsed >= 0.3) {
      deathAnim.soundPlayed = true;
      playSound(youLoseBuffer);
    }

  } else if (deathType === 'fall_top') {
    // Arc upward, peak, then nose-dive with accelerating rotation
    deathAnim.vy += GRAVITY * dt;
    deathAnim.x  += deathAnim.vx * dt;
    deathAnim.y  += deathAnim.vy * dt;
    // Spin faster once the arc tips over into the dive
    const noseAccel = deathAnim.vy > 0 ? 2.0 : 1.0;
    deathAnim.rot += deathAnim.rotSpd * noseAccel * dt;
    if (!deathAnim.soundPlayed && deathAnim.y > VIRT_H + 10) {
      deathAnim.soundPlayed = true;
      playSound(youLoseBuffer);
    }
  } else if (deathType === 'fall_bottom') {
    // Straight down into the void — no lateral drift
    deathAnim.vy += GRAVITY * 0.9 * dt;
    deathAnim.y  += deathAnim.vy * dt;
    deathAnim.rot += deathAnim.rotSpd * dt;
    if (!deathAnim.soundPlayed && deathAnim.y > VIRT_H + 10) {
      deathAnim.soundPlayed = true;
      playSound(youLoseBuffer);
    }
  }
}

function update(dt) {
  if (gameState === 'waiting') { updateIdleAnim(dt); return; }
  if (gameState === 'dead')    { updateDeathAnim(dt); deathTimer += dt; return; }
  if (gameState !== 'playing') return;

  // Physics
  gwonam.vy += GRAVITY * dt;
  gwonam.y  += gwonam.vy * dt;

  // Rotation
  const targetRot = Math.max(-0.45, Math.min(0.55, gwonam.vy / 900));
  gwonam.rotation += (targetRot - gwonam.rotation) * 12 * dt;

  // Animate
  gwonam.frameTimer += dt;
  if (gwonam.frameTimer >= gwonam.frameDuration) {
    gwonam.frameTimer -= gwonam.frameDuration;
    gwonam.frame = (Math.floor(gwonam.frame) + 1) % FRAME_COUNT;
  }

  // Spawn pipes
  pipeTimer += dt;
  if (pipeTimer >= PIPE_SPAWN_INTERVAL) {
    pipeTimer -= PIPE_SPAWN_INTERVAL;
    spawnPipe();
  }

  // Active boost speed modifier
  const currentSpeed = PIPE_SPEED + (squadalaActive ? SQUADALA_BOOST_SPD : 0);

  // Move & cull pipes
  for (const pipe of pipes) pipe.x -= currentSpeed * dt;
  pipes = pipes.filter(p => p.x + PILLAR_DISP_W > 0);

  // Score + meter fill
  for (const pipe of pipes) {
    if (!pipe.scored && pipe.x + PILLAR_DISP_W < GWONAM_X) {
      pipe.scored = true;
      score++;
      if (!squadalaActive && squadalaMeter < SQUADALA_MAX) {
        squadalaMeter = Math.min(SQUADALA_MAX, squadalaMeter + 1);
        if (squadalaMeter === SQUADALA_MAX) meterFullFlash = 1.2;
      }
    }
  }

  // Tick Squadala active timer
  if (squadalaActive) {
    squadalaTimer -= dt;
    if (squadalaTimer <= 0) {
      squadalaActive = false;
      squadalaTimer  = 0;
      squadalaMeter  = 0;
    }
  }

  // Tick the full-meter flash
  if (meterFullFlash > 0) meterFullFlash -= dt;

  // --- RUBY UPDATE ---
  for (const ruby of rubies) {
    if (ruby.collected) continue;
    ruby.x      -= currentSpeed * dt;
    ruby.floatT += RUBY_FLOAT_SPEED * dt;

    // Spritesheet frame animation
    ruby.frameTimer += dt;
    if (ruby.frameTimer >= RUBY_FRAME_DUR) {
      ruby.frameTimer -= RUBY_FRAME_DUR;
      ruby.frame = (ruby.frame + 1) % RUBY_TYPES[ruby.typeIdx].frameCount;
    }

    // Collection — simple AABB (rubies are small, pixel-perfect overkill)
    const ry = ruby.y + Math.sin(ruby.floatT) * RUBY_FLOAT_AMP;
    if (
      GWONAM_X + GWONAM_DISP_W > ruby.x           &&
      GWONAM_X                  < ruby.x + RUBY_DISP_W &&
      gwonam.y + GWONAM_DISP_H  > ry               &&
      gwonam.y                  < ry + RUBY_DISP_H
    ) {
      ruby.collected = true;
      const val = RUBY_TYPES[ruby.typeIdx].value;
      rubyScore += val;
      playRubyJingle(val);
    }
  }
  // Cull off-screen and collected rubies
  rubies = rubies.filter(r => !r.collected && r.x + RUBY_DISP_W > 0);

  // Floor / ceiling — use alpha-tested pixel bounds so the kill fires on actual sprite pixels
  {
    const fi = Math.floor(gwonam.frame);
    const b  = gwonamBounds[fi] || { topOffset: 0, bottomOffset: GWONAM_DISP_H };
    const spriteTop    = gwonam.y + b.topOffset;
    const spriteBottom = gwonam.y + b.bottomOffset;
    if (spriteTop <= 0 || spriteBottom >= VIRT_H) { die(null, gwonam.y); return; }
  }

  // Pipe pixel-perfect collision (skipped while invincible)
  if (!squadalaActive) {
    for (const pipe of pipes) {
      const gRight = GWONAM_X + GWONAM_DISP_W;
      const pRight = pipe.x   + PILLAR_DISP_W;
      if (gRight < pipe.x || GWONAM_X > pRight) continue;
      const hitType = checkCollisionWithPipe(pipe);
      if (hitType) {
        gwonam.deathPipe = pipe; // squish needs a live reference so it tracks the pipe
        die(hitType);
        return;
      }
    }
  }
}

function die(collisionType, rawGwonamY) {
  gameState = 'dead';
  deathTimer = 0;
  updateYtCredit();
  if (score > highScore) highScore = score;
  if (rubyScore > rubyHighScore) {
    rubyHighScore = rubyScore;
    localStorage.setItem('flappyGwonamRubyHS', rubyHighScore);
  }
  if (musicSource) { try { musicSource.stop(); } catch(e){} musicSource = null; }

  // Floor/ceiling kills have no pipe collision type — distinguish top vs bottom
  if (!collisionType) {
    const fi = Math.floor(gwonam.frame);
    const b  = gwonamBounds[fi] || { topOffset: 0, bottomOffset: GWONAM_DISP_H };
    const checkY = (rawGwonamY !== undefined) ? rawGwonamY : gwonam.y;
    deathType = (checkY + b.topOffset <= 0) ? 'fall_top' : 'fall_bottom';
  } else {
    deathType = collisionType;
  }

  // Update "no-ruby" death streak for the special message
  if (rubyScore === 0) {
    consecutiveDeathsWithoutRuby++;
  } else {
    consecutiveDeathsWithoutRuby = 0;
  }
  lastDeathType = deathType;

  if (deathType === 'squish') {
    // Work out exactly where the visible stone surface of the pillar is at Gwonam's Y.
    // The pillar sprite has transparent edges, so pipe.x is NOT the visible face —
    // we scan the pillar mask left-to-right at Gwonam's display-Y band to find the
    // first opaque column, then convert that to virtual X. That is the true contact X.
    const pipe    = gwonam.deathPipe;
    const gy      = gwonam.y;
    const inTopPipe    = gy < pipe.topH;
    const inBottomPipe = gy + GWONAM_DISP_H > pipe.topH + PIPE_GAP;

    let opaqueCol = PILLAR_DISP_W; // fallback

    if (inTopPipe) {
      // Gwonam is overlapping the top (inverted) pillar — scan at his Y within it
      const yMin = Math.max(0, gy);
      const yMax = Math.min(pipe.topH, gy + GWONAM_DISP_H);
      opaqueCol = pillarLeftOpaqueCol(pipe, yMin, yMax, true);
    } else if (inBottomPipe) {
      // Overlapping the bottom pillar — dy is relative to bottom pipe's top
      const bottomTop = pipe.topH + PIPE_GAP;
      const yMin = Math.max(0, gy - bottomTop);
      const yMax = Math.min(VIRT_H - bottomTop, gy + GWONAM_DISP_H - bottomTop);
      opaqueCol = pillarLeftOpaqueCol(pipe, yMin, yMax, false);
    }

    // contactX = pipe.x + opaqueCol (display pixels) — the actual stone face
    // Gwonam's right edge is pinned here; as he squishes, his left edge moves right
    const contactX = pipe.x + opaqueCol;

    deathAnim = {
      contactX,          // frozen: the true visible left face of the pillar at impact
      squishY:   gy,     // Y locked at moment of impact
      scaleX:    1.0,    // animates down to ~0.12
      slideVy:   0,      // velocity for the slide-down phase
      elapsed:   0,
      soundPlayed: false,
    };
    playSquishSound();
  } else if (deathType === 'headbump') {
    deathAnim = {
      x:       GWONAM_X,
      y:       gwonam.y,
      vy:      gwonam.vy * 0.3 - 80, // slight upward kick
      vx:      -60,
      rot:     gwonam.rotation,
      rotSpd:  -5.5,
      elapsed: 0,
    };
    playBoingSound();
  } else if (deathType === 'carpetbonk') {
    deathAnim = {
      x:       GWONAM_X,
      y:       gwonam.y,
      vy:      120,   // fall downward
      vx:      -40,
      rot:     gwonam.rotation,
      rotSpd:  4.0,
      elapsed: 0,
    };
    playCarpetBonkSound();
  } else if (deathType === 'fall_bottom') {
    // Fell to the floor — fall straight down into the void, no drift
    deathAnim = {
      x:       GWONAM_X,
      y:       gwonam.y,
      vy:      Math.max(gwonam.vy, 150), // ensure solid downward momentum
      vx:      0,                         // dead straight
      rot:     gwonam.rotation,
      rotSpd:  0.4,  // gentle forward tip as the carpet loses control
      elapsed: 0,
      soundPlayed: false,
    };
    playCarpetBonkSound();
  } else if (deathType === 'fall_top') {
    // Hit ceiling — arc upward then nose-dive the carpet into the void
    deathAnim = {
      x:       GWONAM_X,
      y:       gwonam.y,
      vy:      -320,  // strong upward arc off the ceiling
      vx:      15,    // slight rightward drift so the arc reads clearly
      rot:     gwonam.rotation,
      rotSpd:  2.2,   // rotates nose-down as gravity takes over
      elapsed: 0,
      soundPlayed: false,
    };
    playBoingSound();
  }
}

// --- MAIN LOOP ---
function gameLoop(timestamp) {
  if (lastTime === null) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  update(dt);

  drawBackground();
  drawPipes();
  drawRubies();
  drawGwonam();
  drawHUD();

  if (gameState === 'playing') drawSquadalaMeter();

  if (gameState === 'waiting') {
    drawWaitScreen();
  }

  if (gameState === 'dead') {
    drawSquadalaMeter();
    // Delay the YOU LOSE overlay so the death animation has room to breathe
    if (deathTimer >= DEATH_OVERLAY_DELAY) {
      drawDeadScreen();
    }
  }

  requestAnimationFrame(gameLoop);
}

// --- INPUT ---
function flap() {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  // Start music on very first interaction
  if (!musicStarted) {
    musicStarted = true;
    startMusic();
  }

  if (gameState === 'waiting') {
    resetGame();
    startMusic();
    return;
  }
  if (gameState === 'dead') {
    // Don't allow retry until the YOU LOSE overlay is up and the sound has played.
    // For squish/headbump/carpetbonk the sound is fired via deathAnim.soundPlayed;
    // for a plain fall it fires immediately in die(), so deathAnim is null.
    const overlayUp   = deathTimer >= DEATH_OVERLAY_DELAY;
    const soundPlayed = deathAnim ? deathAnim.soundPlayed : true;
    if (!overlayUp || !soundPlayed) return;
    resetGame();
    startMusic();
    return;
  }
  if (gameState === 'playing') {
    // If meter is full and not already active, trigger Squadala mode!
    if (squadalaMeter >= SQUADALA_MAX && !squadalaActive) {
      squadalaActive = true;
      squadalaTimer  = SQUADALA_INVINCE_T;
      meterFullFlash = 0;
      playSquadalaEarrape(); // 🔊🔊🔊 EARRAPE SQUADALA!!
    } else {
      playSound(squadalaBuffer); // normal flap squadala
    }
    gwonam.vy       = FLAP_FORCE;
    gwonam.rotation = -0.45;
  }
}

function goToMenu() {
  // Return to the waiting/main-menu screen from the death screen.
  // Resets all game state but lands on 'waiting' instead of immediately playing.
  if (musicSource) { try { musicSource.stop(); } catch(e){} musicSource = null; }
  gwonam.y          = VIRT_H / 2 - GWONAM_DISP_H / 2;
  gwonam.vy         = 0;
  gwonam.frame      = 0;
  gwonam.frameTimer = 0;
  gwonam.rotation   = 0;
  gwonam.deathPipe  = null;
  pipes          = [];
  rubies         = [];
  score          = 0;
  rubyScore      = 0;
  pipeTimer      = 0;
  squadalaMeter  = 0;
  squadalaActive = false;
  squadalaTimer  = 0;
  meterFullFlash = 0;
  deathType      = null;
  deathAnim      = null;
  deathTimer     = 0;
  lastDeathType  = null;
  idleT          = 0;
  gameState      = 'waiting';
  lastTime       = null;
  updateYtCredit();
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space')  { e.preventDefault(); flap(); }
  if (e.code === 'Escape' && gameState === 'dead') { e.preventDefault(); goToMenu(); }
});

// --- YT CREDIT VISIBILITY ---
const ytCredit = document.getElementById('yt-credit');

function updateYtCredit() {
  if (gameState === 'waiting') {
    ytCredit.classList.remove('hidden');
  } else {
    ytCredit.classList.add('hidden');
  }
}

// --- INIT ---
function init() {
  bakeGwonamMasks();
  bakePillarMask();
  updateYtCredit(); // set initial state
  requestAnimationFrame(gameLoop);
}