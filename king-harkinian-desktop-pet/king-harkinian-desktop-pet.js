"use strict";

// ─── Constants ────────────────────────────────────────────────────────────────
const BASE_W = 268, BASE_H = 230;
const SPEED   = 3;
const TICK_MS = 16;
const VOICE_CHECK_EVERY = 300;
const VOICE_CHANCE = 0.55;
const FOOD_DISPLAY_SIZE = 180;
const FAT_EXPLODE_THRESHOLD = 300;
const POOP_SIZE = 128;
const FIST_SIZE = 96;
const SPONGE_SIZE = 128;

const FOOD_FAT_POINTS = {
  "./assets/sprites/food/pizza.png": 8, "./assets/sprites/food/panini.png": 5, "./assets/sprites/food/happy-meal.png": 6,
  "./assets/sprites/food/chicken-bucket.png": 10, "./assets/sprites/food/cheesecake.png": 12, "./assets/sprites/food/ice-cream-cone.png": 7,
  "./assets/sprites/food/taco.png": 5, "./assets/sprites/food/burger.png": 9, "./assets/sprites/food/spaghetti.png": 3, "./assets/sprites/food/fish-and-chips.png": 8,
  "./assets/sprites/food/steak.png": 11, "./assets/sprites/food/cheese.png": 7, "./assets/sprites/food/salmon.png": 2, "./assets/sprites/food/hot-dog.png": 6,
  "./assets/sprites/food/french-fries.png": 4, "./assets/sprites/food/strawberry-cake.png": 15,
};
const FOOD_IMAGES = Object.keys(FOOD_FAT_POINTS);

const VOICE_LINES = [
  "./assets/audio/voice-lines/Dinner.mp3","./assets/audio/voice-lines/Mah-Boi.mp3","./assets/audio/voice-lines/King-Harkinian-Laugh.mp3",
  "./assets/audio/voice-lines/This-Peace-Is-What-All-True-Warriors-Strive-For.mp3",
  "./assets/audio/voice-lines/scrub-all-the-floors-in-hyrule.mp3","./assets/audio/voice-lines/duke-onkled-under-attack.mp3",
  "./assets/audio/voice-lines/enough.mp3","./assets/audio/voice-lines/im-going-to-gamelon.mp3","./assets/audio/voice-lines/hmm.mp3","./assets/audio/voice-lines/piece-of-shit.mp3",
  "./assets/audio/voice-lines/triforce-of-courage.mp3","./assets/audio/voice-lines/ship-sails.mp3","./assets/audio/voice-lines/wonder-whats-for-dinner.mp3",
  "./assets/audio/voice-lines/you-saved-me.mp3",
];
const AUDIO_FILES = [...new Set([
  ...VOICE_LINES,
  "./assets/audio/voice-lines/king-oah.mp3", "./assets/audio/voice-lines/king-hoa.mp3", "./assets/audio/other/eating.mp3", "./assets/audio/other/burp.mp3", "./assets/audio/other/hit.mp3",
  "./assets/audio/voice-lines/piece-of-shit.mp3", "./assets/audio/other/explode.mp3", "./assets/audio/voice-lines/enough.mp3", "./assets/audio/voice-lines/King-Harkinian-Laugh.mp3",
  "./assets/audio/voice-lines/hmm.mp3", "./assets/audio/other/shit.mp3", "./assets/audio/other/sponge-scrub.mp3",
])];
const AUDIO_PATH_BY_FILENAME = new Map(AUDIO_FILES.map(path => [path.slice(path.lastIndexOf("/") + 1), path]));

const BEHAVIOURS = [
  ["walk",120],["bounce",90],["spin",60],["squish",80],["shake",50],
  ["zoom",70],["tilt",100],["stomp",60],["panic",80],["nod",70],
  ["moonwalk",90],["vibrate",45],["warp",75],["chalice",90],["flatline",100],
  ["dizzy",80],["creep",110],["glitch",55],["royalwave",80],["teleport",60],
  ["stretch",90],["helicopter",70],["hiccup",75],["microwave",65],
];

// ─── Canvas setup ─────────────────────────────────────────────────────────────
const desktop   = document.getElementById("desktop");
const mainC     = document.getElementById("mainCanvas");
const foodC     = document.getElementById("foodCanvas");
const particleC = document.getElementById("particleCanvas");
const poopC     = document.getElementById("poopCanvas");
const ctx       = mainC.getContext("2d");
const fctx      = foodC.getContext("2d");
const pctx      = particleC.getContext("2d");
const dctx      = poopC.getContext("2d");

function resizeCanvases() {
  const w = desktop.clientWidth, h = desktop.clientHeight;
  [mainC, foodC, particleC, poopC].forEach(c => { c.width = w; c.height = h; });
}
resizeCanvases();
window.addEventListener("resize", handleViewportChange);
document.addEventListener("fullscreenchange", handleViewportChange);

function handleViewportChange() {
  resizeCanvases();
  redrawPoopLayer();
}

const deskW = () => desktop.clientWidth;
const deskH = () => desktop.clientHeight;

// ─── Image loading ────────────────────────────────────────────────────────────
const imgCache = {};
function loadImg(src) {
  if (imgCache[src]) return imgCache[src];
  const im = new Image();
  im.src = src;
  imgCache[src] = im;
  return im;
}
const kingImg  = loadImg("./assets/sprites/king-harkinian/King-Harkinian-CD-i.png");
const fistImg  = loadImg("./assets/sprites/components/fist.png");
const spongeImg= loadImg("./assets/sprites/components/Sponge.png");
const shitImg  = loadImg("./assets/sprites/components/shit.png");

// Pre-load all food images
FOOD_IMAGES.forEach(f => loadImg(f));

// ─── Alpha map ────────────────────────────────────────────────────────────────
let kingAlphaMap = null, kingAlphaW = 0, kingAlphaH = 0;
const ALPHA_THRESHOLD = 30;
const _alphaCanvas = document.createElement("canvas");
const _alphaCTX    = _alphaCanvas.getContext("2d");

function buildAlphaMap(img) {
  _alphaCanvas.width  = img.naturalWidth  || img.width;
  _alphaCanvas.height = img.naturalHeight || img.height;
  _alphaCTX.clearRect(0, 0, _alphaCanvas.width, _alphaCanvas.height);
  _alphaCTX.drawImage(img, 0, 0);
  const data = _alphaCTX.getImageData(0, 0, _alphaCanvas.width, _alphaCanvas.height).data;
  const map  = new Uint8Array(_alphaCanvas.width * _alphaCanvas.height);
  for (let i = 0; i < map.length; i++) map[i] = data[i * 4 + 3];
  return { map, w: _alphaCanvas.width, h: _alphaCanvas.height };
}
kingImg.onload = () => {
  const r = buildAlphaMap(kingImg);
  kingAlphaMap = r.map; kingAlphaW = r.w; kingAlphaH = r.h;
};
if (kingImg.complete && kingImg.naturalWidth > 0) {
  const r = buildAlphaMap(kingImg);
  kingAlphaMap = r.map; kingAlphaW = r.w; kingAlphaH = r.h;
}

function cursorOnSprite(sx, sy, px, py, sqX, sqY, facing) {
  if (!kingAlphaMap) return true;
  const effW = Math.max(1, Math.round(BASE_W * Math.abs(sqX)));
  const effH = Math.max(1, Math.round(BASE_H * Math.abs(sqY)));
  let lx = sx - px, ly = sy - py;
  if (lx < 0 || lx >= effW || ly < 0 || ly >= effH) return false;
  if (facing === -1) lx = effW - 1 - lx;
  const srcX = Math.min(Math.floor(lx * kingAlphaW / effW), kingAlphaW - 1);
  const srcY = Math.min(Math.floor(ly * kingAlphaH / effH), kingAlphaH - 1);
  return kingAlphaMap[srcY * kingAlphaW + srcX] > ALPHA_THRESHOLD;
}

// ─── Audio ────────────────────────────────────────────────────────────────────
const audioCache = new Map();
const audioReady = new Map();
const audioObjectUrls = [];
for (const path of AUDIO_FILES) {
  const audio = new Audio();
  audio.preload = "auto";
  audioCache.set(path, audio);
  const ready = fetch(path).then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.blob();
  }).then(blob => {
    const objectUrl = URL.createObjectURL(blob);
    audioObjectUrls.push(objectUrl);
    audio.src = objectUrl;
    audio.load();
  }).catch(error => {
    console.warn(`Could not preload audio "${path}":`, error);
    audio.src = path;
    audio.load();
  });
  audioReady.set(path, ready);
}

let audioPlaying = false;
let currentVoiceAudio = null;

window.addEventListener("beforeunload", () => {
  for (const objectUrl of audioObjectUrls) URL.revokeObjectURL(objectUrl);
});

function resolveAudioPath(path) {
  return audioReady.has(path) ? path : AUDIO_PATH_BY_FILENAME.get(path) || path;
}

function createAudio(path, loop = false) {
  path = resolveAudioPath(path);
  let audio = audioCache.get(path);
  if (!audio) {
    audio = new Audio(path);
    audio.preload = "auto";
    audioCache.set(path, audio);
  }
  audio.pause();
  audio.currentTime = 0;
  audio.preload = "auto";
  audio.loop = loop;
  return audio;
}

function startAudio(audio, path, onError, shouldPlay = () => true) {
  path = resolveAudioPath(path);
  const start = () => {
    if (!shouldPlay()) return;
    const playing = audio.play();
    if (playing) {
      playing.catch(error => {
        console.warn(`Could not play audio "${path}":`, error);
        if (onError) onError();
      });
    }
  };
  (audioReady.get(path) || Promise.resolve()).then(start);
}

function playVoice(path) {
  if (audioPlaying || !path) return;
  audioPlaying = true;
  const a = createAudio(path);
  currentVoiceAudio = a;
  const clearCurrent = () => {
    if (currentVoiceAudio !== a) return;
    audioPlaying = false;
    currentVoiceAudio = null;
  };
  a.addEventListener("ended", clearCurrent, { once: true });
  a.addEventListener("error", clearCurrent, { once: true });
  startAudio(a, path, clearCurrent, () => currentVoiceAudio === a);
}
function stopVoice() {
  if (currentVoiceAudio) { currentVoiceAudio.pause(); currentVoiceAudio = null; }
  audioPlaying = false;
}
function playSFX(path) {
  if (!path) return;
  const audio = createAudio(path);
  startAudio(audio, path);
  return audio;
}
function playOverlappingSFX(path) {
  if (!path) return;
  path = resolveAudioPath(path);
  (audioReady.get(path) || Promise.resolve()).then(() => {
    const source = audioCache.get(path)?.currentSrc;
    if (!source) return;
    const audio = new Audio(source);
    audio.preload = "auto";
    const cleanup = () => {
      audio.removeEventListener("ended", cleanup);
      audio.removeEventListener("error", cleanup);
      audio.removeAttribute("src");
      audio.load();
    };
    audio.addEventListener("ended", cleanup, { once: true });
    audio.addEventListener("error", cleanup, { once: true });
    const playing = audio.play();
    if (playing) {
      playing.catch(error => {
        console.warn(`Could not play audio "${path}":`, error);
        cleanup();
      });
    }
  });
}
function playSFXThen(path, cb) {
  if (!path) { setTimeout(cb, 0); return; }
  const a = createAudio(path);
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    a.removeEventListener("ended", finish);
    a.removeEventListener("error", finish);
    cb();
  };
  a.addEventListener("ended", finish, { once: true });
  a.addEventListener("error", finish, { once: true });
  startAudio(a, path, finish);
}
function maybeSpeak() {
  if (!audioPlaying && Math.random() < VOICE_CHANCE && VOICE_LINES.length) {
    playVoice(VOICE_LINES[Math.floor(Math.random() * VOICE_LINES.length)]);
  }
}

// ─── State ────────────────────────────────────────────────────────────────────
let tick = 0;
let x = 0, y = 0, vx = SPEED, vy = SPEED;
let anim = "walk", animTimer = 120;
let squishX = 1.0, squishY = 1.0, angle = 0;
let facing = 1;
let bouncePhase = 0;
let dieAlpha = 1.0;
let dying = false, dieTick = 0;
let visible = true;
let quitAfterDeath = false, deathNavigationRequested = false;
let voiceCounter = VOICE_CHECK_EVERY;

// Per-animation scratch
let creepFrozen = 0;
let glitchSX = 1, glitchSY = 1, glitchAng = 0, glitchNext = 0;
let hiccupActive = 0;

// Tickle
let tickleActive = false, tickleRecovery = false;
let tickleTick = 0, tickleRecoveryT = 0;
let lastCursorX = -9999, lastCursorY = -9999;
let cursorVxPrev = 0, cursorReversals = 0, reversalDecay = 0;
let savedAnimTickle = "walk", savedVxTickle = SPEED, savedVyTickle = SPEED;
const TICKLE_MIN_SPEED = 18, TICKLE_REV_NEEDED = 4;
const REVERSAL_WINDOW = 20, TICKLE_STOP_TICKS = 30;

// Hit mode
let hitMode = false;
let hitActive = false, hitRecovering = false;
let hitTick = 0, hitRecoverTick = 0;
let hitVx = 0, hitVy = 0, hitAngularV = 0;
let hitSoundCooldown = 0, ohSoundCooldown = 0;
const HIT_SOUND_COOLDOWN = 14, OH_SOUND_COOLDOWN = 22;
const HIT_RECOVER_TICKS = 44;
const HIT_SWIPE_SPEED = 20;
let fistX = 0, fistY = 0, fistAngle = 0;
let fistPrevX = -9999, fistPrevY = -9999;
let fistCursorVx = 0, fistCursorVy = 0;
let comboScore = 0, comboLocked = null, comboVisible = false, comboAirborne = false;
let savedAnim = "walk", savedVxS = SPEED, savedVyS = SPEED;

// Fat
let fatPoints = 0, fatScale = 1.0;
let explodeArmed = false, exploding = false;
let explodeTick = 0, explodeHidden = false, explodeHideT = 0;
let explodeWalkIn = false, explodeWalkTick = 0, explodeWalkSide = 1;
let explodeRecovery = false, explodeRecoverT = 0;
const EXPLODE_HIDE_TICKS = 300;
const EXPL_SWELL_END = 36, EXPL_BOOM_TICK = 234;

// Food / eating
let foodDragging = false, foodPlaced = false, eating = false;
let foodPath = "", foodImg = null;
let foodX = 0, foodY = 0, foodAlpha = 1.0, foodScale = 1.0;
let eatPhase = "", eatTick = 0, eatFoodDevour = 0;
let eatTargetX = 0, eatTargetY = 0;
let savedVx2 = SPEED, savedVy2 = SPEED, savedAnim2 = "walk";
let foodDragX = 0, foodDragY = 0;

// Defecation
let shittingEnabled = true;
let defecating = false, defecationPending = false;
let defecationDueAt = null, defecationTick = 0;
let defSavedAnim = "walk", defSavedVx = SPEED, defSavedVy = SPEED, defSavedFacing = 1;
const DEFECATION_TICKS = 96, DEFECATION_OAH_INTERVAL = 30;
let poopStains = []; // each: {x,y,size,imgData (ImageData), remaining, totalPx}

// Sponge
let spongeMode = false;
let spongePrevX = null, spongePrevY = null;
let spongeStampTick = 0;
const SPONGE_ALPHA_STEP = 32, SPONGE_STAMP_TICKS = 6, SPONGE_ALPHA_THR = 30;

// Particles: [x,y,vx,vy,size,r,g,b,a,age,maxAge,rot,rotV]
let foodParticles = [];
let bloodDrops = [];   // [x,y,vx,vy,size,a,rot,rotV]
let bloodSplatters = [];// [x,y,size,a,age,maxAge,seed]
const BLOOD_SPLATTER_TICKS = 600;

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  x = Math.random() * (deskW() - BASE_W);
  y = Math.random() * (deskH() - BASE_H);
  vx = SPEED * (Math.random() < 0.5 ? 1 : -1);
  vy = SPEED * (Math.random() < 0.5 ? 1 : -1);
  pickNewBehaviour();
  playVoice("Mah-Boi.mp3");
  requestAnimationFrame(mainLoop);
}

// ─── Behaviour ───────────────────────────────────────────────────────────────
function pickNewBehaviour() {
  const [name, dur] = BEHAVIOURS[Math.floor(Math.random() * BEHAVIOURS.length)];
  anim = name; animTimer = dur;
  angle = 0; bouncePhase = 0;
  creepFrozen = 0; glitchNext = tick;
  if (Math.random() < 0.3) vx *= -1;
  if (Math.random() < 0.3) vy *= -1;
}

// ─── Update animation ────────────────────────────────────────────────────────
function updateAnimation() {
  const t = tick, a = anim;
  if (a === "walk") {
    squishX = 1 + 0.04 * Math.sin(t * 0.25);
    squishY = 1 - 0.04 * Math.sin(t * 0.25);
    angle = 0;
  } else if (a === "bounce") {
    const bp = (t % 30) / 30;
    if (bp < 0.5) { const p = bp * 2; squishX = 1 - 0.25 * Math.sin(p * Math.PI); squishY = 1 + 0.25 * Math.sin(p * Math.PI); }
    else          { const p = (bp - 0.5) * 2; squishX = 1 + 0.35 * Math.sin(p * Math.PI); squishY = 1 - 0.35 * Math.sin(p * Math.PI); }
    angle = 0;
  } else if (a === "spin") {
    angle = (t * 12) % 360; squishX = squishY = 1;
  } else if (a === "squish") {
    squishX = 1 + 0.4 * Math.sin(t * 0.18);
    squishY = 1 - 0.3 * Math.sin(t * 0.18);
    angle = 0;
  } else if (a === "shake") {
    squishX = squishY = 1; angle = 20 * Math.sin(t * 0.6);
  } else if (a === "zoom") {
    const sc = 1 + 0.5 * Math.sin(t * 0.12);
    squishX = squishY = sc; angle = 0;
  } else if (a === "tilt") {
    angle = 35 * Math.sin(t * 0.08); squishX = squishY = 1;
  } else if (a === "stomp") {
    const ph = (t % 10) / 10;
    const imp = Math.pow(Math.sin(ph * Math.PI), 3);
    squishX = 1 + 0.45 * imp; squishY = 1 - 0.45 * imp; angle = 0;
  } else if (a === "panic") {
    squishX = 1 + 0.06 * Math.sin(t * 0.9);
    squishY = 1 - 0.06 * Math.sin(t * 0.9);
    angle = -12 * Math.sin(t * 0.7);
  } else if (a === "nod") {
    const ph = (t % 20) / 20;
    const nd = Math.sin(ph * 2 * Math.PI);
    squishX = 1 - 0.2 * nd; squishY = 1 + 0.3 * nd; angle = 0;
  } else if (a === "moonwalk") {
    squishX = 1 + 0.03 * Math.sin(t * 0.3);
    squishY = 1 - 0.03 * Math.sin(t * 0.3);
    angle = 0;
  } else if (a === "vibrate") {
    squishX = 1 + 0.08 * Math.sin(t * 2.8);
    squishY = 1 - 0.08 * Math.sin(t * 2.8);
    angle = 8 * Math.sin(t * 3.1);
  } else if (a === "warp") {
    const wp = (t % 8) / 8;
    if (wp < 0.5) { const w = Math.sin(wp * 2 * Math.PI); squishX = 1 + 0.6 * w; squishY = 1 - 0.4 * w; }
    else          { const w = Math.sin((wp - 0.5) * 2 * Math.PI); squishX = 1 - 0.3 * w; squishY = 1 + 0.55 * w; }
    angle = 0;
  } else if (a === "chalice") {
    const ph = (t % 60) / 60;
    const loom = Math.sin(ph * 2 * Math.PI);
    const sc = 1 + 0.55 * Math.max(0, loom);
    squishX = squishY = sc; angle = 8 * Math.sin(t * 0.07);
  } else if (a === "flatline") {
    const sc = (t % 80) / 80;
    if      (sc < 0.15) { const p = sc / 0.15; squishY = 1 - 0.82 * p; squishX = 1 + 0.7 * p; }
    else if (sc < 0.85) { squishY = 0.18; squishX = 1.7; }
    else                { const p = (sc - 0.85) / 0.15; squishY = 0.18 + 0.82 * p; squishX = 1.7 - 0.7 * p; }
    angle = 0;
  } else if (a === "dizzy") {
    angle = 25 * Math.sin(t * 0.11);
    squishX = 1 + 0.15 * Math.sin(t * 0.22);
    squishY = 1 + 0.15 * Math.cos(t * 0.22);
  } else if (a === "creep") {
    squishX = squishY = 1; angle = 0;
    if (creepFrozen <= 0) creepFrozen = 50 + Math.floor(Math.random() * 40);
    creepFrozen--;
  } else if (a === "glitch") {
    if (tick >= glitchNext) {
      glitchSX = 0.4 + Math.random() * 1.4;
      glitchSY = 0.4 + Math.random() * 1.4;
      const angs = [0,0,0,15,-15,30,-30,45,90,180];
      glitchAng = angs[Math.floor(Math.random() * angs.length)];
      glitchNext = tick + 3 + Math.floor(Math.random() * 9);
    }
    squishX = glitchSX; squishY = glitchSY; angle = glitchAng;
  } else if (a === "royalwave") {
    const ph = (t % 100) / 100;
    if      (ph < 0.25) { const p = ph / 0.25; squishY = 1 + 0.55 * p; squishX = 1 - 0.2 * p; }
    else if (ph < 0.75) { const lp = (ph - 0.25) / 0.5; squishY = 1.55; squishX = 0.80; angle = 22 * Math.sin(lp * 2 * Math.PI * 2.5); }
    else                { const p = (ph - 0.75) / 0.25; squishY = 1.55 - 0.55 * p; squishX = 0.80 + 0.2 * p; angle = 22 * Math.sin(p * Math.PI) * (1 - p); }
  } else if (a === "teleport") {
    const ph = (t % 30) / 30;
    if      (ph < 0.30) { const p = ph / 0.3; squishX = 1 + 0.8 * p; squishY = Math.max(0.02, 1 - p); angle = 0; }
    else if (ph < 0.35) { squishX = squishY = 0.02; angle = 0; }
    else if (ph < 0.65) { const p = (ph - 0.35) / 0.3; const pop = Math.sin(p * Math.PI); squishX = 0.02 + 1.6 * p - 0.4 * pop; squishY = 0.02 + 1.4 * p + 0.3 * pop; angle = 15 * Math.sin(p * Math.PI * 3) * (1 - p); }
    else                { const p = (ph - 0.65) / 0.35; squishX = 1.2 - 0.2 * p; squishY = 1.3 - 0.3 * p; angle = 0; }
  } else if (a === "stretch") {
    const ph = (t % 80) / 80;
    if      (ph < 0.20) { const p = ph / 0.2; squishY = 1 + 1.6 * p; squishX = 1 - 0.55 * p; angle = 0; }
    else if (ph < 0.65) { const lp = (ph - 0.2) / 0.45; squishY = 2.6; squishX = 0.45; angle = 12 * Math.sin(lp * Math.PI * 5); }
    else                { const p = (ph - 0.65) / 0.35; const b = Math.exp(-p * 6) * Math.cos(p * Math.PI * 4); squishY = 1 + 0.4 * b; squishX = 1 - 0.15 * b; angle = 8 * b; }
  } else if (a === "helicopter") {
    angle = (t * 15) % 360;
    squishX = 1 + 0.08 * Math.sin(t * 0.4);
    squishY = 1 - 0.08 * Math.sin(t * 0.4);
  } else if (a === "hiccup") {
    angle = 3 * Math.sin(t * 0.08); squishX = squishY = 1;
    if (t % 22 === 0 && Math.random() < 0.7) hiccupActive += 1;
    if (hiccupActive > 0) {
      const jt = hiccupActive;
      hiccupActive = Math.max(0, hiccupActive - 1);
      squishY = 1 + 0.55 * Math.exp(-jt * 0.4);
      squishX = 1 - 0.30 * Math.exp(-jt * 0.4);
      angle   = 12 * Math.sin(jt * 1.8) * Math.exp(-jt * 0.3);
    }
  } else if (a === "microwave") {
    angle = (t * 2.5) % 360;
    const pulse = 1 + 0.2 * Math.sin(t * 0.22);
    squishX = squishY = pulse;
  }
}

// ─── Move ─────────────────────────────────────────────────────────────────────
function move() {
  const a = anim;
  if      (a === "spin")       { x += vx * 0.3; y += vy * 0.3; }
  else if (a === "shake")      { x += 6 * Math.sin(tick * 0.8); }
  else if (a === "stomp")      { x += vx * 0.1; y += vy * 0.1; }
  else if (a === "panic")      { x += vx * 2.2; y += vy * 2.2 + 4 * Math.sin(tick * 0.5); }
  else if (a === "tilt")       { x += vx * 0.4; y += vy * 0.4; }
  else if (a === "vibrate")    { x += vx * 0.15 + 3 * Math.sin(tick * 3.3); y += vy * 0.15 + 3 * Math.cos(tick * 2.9); }
  else if (a === "moonwalk")   { x -= vx; y += vy * 0.3; }
  else if (a === "warp")       { x += vx * 0.5; y += vy * 0.5; }
  else if (a === "chalice")    { x += vx * 0.2; y += vy * 0.2; }
  else if (a === "flatline")   { const cy = (tick % 80) / 80; if (cy >= 0.15 && cy < 0.85) { x += vx * 0.8; y += vy * 0.3; } }
  else if (a === "dizzy")      { x += vx * 0.35; y += vy * 0.35; }
  else if (a === "creep")      { if (creepFrozen <= 0) { x += (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 80); y += (Math.random() < 0.5 ? -1 : 1) * (20 + Math.random() * 60); } }
  else if (a === "glitch")     { if (tick >= glitchNext - 1) { x += (Math.random() < 0.5 ? -1 : 1) * Math.random() * 30; y += (Math.random() < 0.5 ? -1 : 1) * Math.random() * 20; } }
  else if (a === "royalwave")  { x += vx * 0.25; y += vy * 0.25; }
  else if (a === "teleport")   { const ph = (tick % 30) / 30; if (ph >= 0.3 && ph < 0.35) { x = Math.random() * Math.max(0, deskW() - BASE_W); y = Math.random() * Math.max(0, deskH() - BASE_H); } }
  else if (a === "stretch")    { x += vx * 0.15; y += vy * 0.15; }
  else if (a === "helicopter") { x += vx * 1.6; y += vy * 0.4; }
  else if (a === "hiccup")     { x += vx * 0.3 + (hiccupActive > 0 ? 3 * (Math.random() < 0.5 ? -1 : 1) : 0); y += vy * 0.3 - (hiccupActive > 0 ? 8 : 0); }
  else if (a === "microwave")  { x += vx * 0.18; y += vy * 0.18; }
  else                         { x += vx; y += vy; }

  if (!["shake","vibrate","stomp","moonwalk","flatline","creep","glitch","helicopter","microwave","teleport"].includes(a) && vx !== 0)
    facing = vx > 0 ? 1 : -1;

  const effW = BASE_W * Math.abs(squishX);
  const effH = BASE_H * Math.abs(squishY);
  if (x < 0)              { x = 0;             vx =  Math.abs(vx); }
  if (x + effW > deskW()) { x = deskW() - effW; vx = -Math.abs(vx); }
  if (y < 0)              { y = 0;             vy =  Math.abs(vy); }
  if (y + effH > deskH()) { y = deskH() - effH; vy = -Math.abs(vy); }
}

// ─── Draw King ────────────────────────────────────────────────────────────────
function drawKing() {
  if (!visible) return;
  const imgW = Math.max(10, Math.round(BASE_W  * Math.abs(squishX)));
  const imgH = Math.max(10, Math.round(BASE_H * Math.abs(squishY)));

  let canvasW, canvasH, offsetX, offsetY;
  if (angle !== 0) {
    const diag = Math.ceil(Math.hypot(imgW, imgH));
    canvasW = canvasH = diag;
    offsetX = (diag - imgW) / 2;
    offsetY = (diag - imgH) / 2;
  } else {
    canvasW = imgW; canvasH = imgH; offsetX = offsetY = 0;
  }

  ctx.clearRect(0, 0, mainC.width, mainC.height);
  ctx.save();
  ctx.globalAlpha = dieAlpha;
  ctx.translate(x + offsetX + imgW / 2, y + offsetY + imgH / 2);
  if (angle !== 0) ctx.rotate(angle * Math.PI / 180);
  if (facing === -1) ctx.scale(-1, 1);
  ctx.drawImage(kingImg, -imgW / 2, -imgH / 2, imgW, imgH);
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ─── Particles ────────────────────────────────────────────────────────────────
function spawnFoodParticles(count) {
  if (!foodImg || !foodImg.complete || !foodImg.naturalWidth) return;
  const off = document.createElement("canvas");
  off.width = off.height = FOOD_DISPLAY_SIZE;
  const oc = off.getContext("2d");
  oc.drawImage(foodImg, 0, 0, FOOD_DISPLAY_SIZE, FOOD_DISPLAY_SIZE);
  let data;
  try { data = oc.getImageData(0, 0, FOOD_DISPLAY_SIZE, FOOD_DISPLAY_SIZE).data; } catch(e) { return; }

  const opaque = [];
  const step = Math.max(1, Math.floor((FOOD_DISPLAY_SIZE * FOOD_DISPLAY_SIZE) / 800));
  for (let i = 0; i < FOOD_DISPLAY_SIZE * FOOD_DISPLAY_SIZE; i += step) {
    const px = i % FOOD_DISPLAY_SIZE, py = Math.floor(i / FOOD_DISPLAY_SIZE);
    const a4 = data[(py * FOOD_DISPLAY_SIZE + px) * 4 + 3];
    if (a4 < 30) continue;
    opaque.push([px, py, data[(py * FOOD_DISPLAY_SIZE + px) * 4] / 255,
                        data[(py * FOOD_DISPLAY_SIZE + px) * 4 + 1] / 255,
                        data[(py * FOOD_DISPLAY_SIZE + px) * 4 + 2] / 255]);
  }
  if (!opaque.length) return;

  for (let i = 0; i < count; i++) {
    const [sx, sy, r, g, b] = opaque[Math.floor(Math.random() * opaque.length)];
    const wx = foodX + sx, wy = foodY + sy;
    const ang = Math.random() * Math.PI * 2;
    const spd = 3 + Math.random() * 11;
    foodParticles.push([wx, wy, Math.cos(ang) * spd, Math.sin(ang) * spd - 2 - Math.random() * 6,
      5 + Math.random() * 11, r, g, b, 1.0, 0, 35 + Math.floor(Math.random() * 40),
      Math.random() * 360, (Math.random() - 0.5) * 24]);
  }
}

function spawnKingExplosionParticles() {
  // Chunky coloured blocks in king colours
  const colours = [[0.85,0.75,0.4],[0.7,0.2,0.1],[0.9,0.85,0.6],[0.3,0.5,0.2]];
  const cx = x + BASE_W / 2, cy = y + BASE_H / 2;
  for (let i = 0; i < 80; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 4 + Math.random() * 18;
    const [r,g,b] = colours[Math.floor(Math.random() * colours.length)];
    foodParticles.push([cx, cy, Math.cos(ang) * spd, Math.sin(ang) * spd - Math.random() * 12,
      8 + Math.random() * 18, r, g, b, 1.0, 0, 60 + Math.floor(Math.random() * 60),
      Math.random() * 360, (Math.random() - 0.5) * 18]);
  }
}

function spawnBloodExplosion() {
  const cx = x + BASE_W / 2, cy = y + BASE_H / 2;
  for (let i = 0; i < 40; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 5 + Math.random() * 20;
    bloodDrops.push([cx, cy, Math.cos(ang) * spd, Math.sin(ang) * spd - Math.random() * 15,
      6 + Math.random() * 12, 1.0, Math.random() * 360, (Math.random() - 0.5) * 20]);
  }
}

function tickParticles() {
  const GRAVITY = 0.55;
  foodParticles = foodParticles.filter(p => {
    p[3] += GRAVITY; p[0] += p[2]; p[1] += p[3]; p[2] *= 0.96; p[9]++;
    p[11] += p[12];
    const fs = p[10] * 0.6;
    if (p[9] > fs) p[8] = Math.max(0, 1 - (p[9] - fs) / (p[10] - fs));
    return p[9] < p[10] && p[1] < deskH() + 50;
  });

  bloodDrops = bloodDrops.filter(d => {
    d[3] += 0.7; d[0] += d[2]; d[1] += d[3]; d[2] *= 0.97; d[6] += d[7];
    if (d[1] >= deskH() - d[4] * 0.5) {
      const seed = Math.floor(Math.random() * 65536);
      bloodSplatters.push([d[0], deskH() - 2, d[4] * (2.8 + Math.random() * 1.7), 1.0, 0, BLOOD_SPLATTER_TICKS, seed]);
      return false;
    }
    return d[0] > -60 && d[0] < deskW() + 60;
  });

  bloodSplatters = bloodSplatters.filter(s => {
    s[4]++;
    const fs = s[5] * 0.75;
    if (s[4] > fs) s[3] = Math.max(0, 1 - (s[4] - fs) / (s[5] - fs));
    return s[4] < s[5];
  });
}

function drawParticles() {
  pctx.clearRect(0, 0, particleC.width, particleC.height);

  for (const p of foodParticles) {
    if (p[8] <= 0) continue;
    pctx.save();
    pctx.translate(p[0], p[1]);
    pctx.rotate(p[11] * Math.PI / 180);
    const half = p[4] / 2;
    pctx.globalAlpha = p[8];
    pctx.fillStyle = `rgb(${Math.round(p[5]*255)},${Math.round(p[6]*255)},${Math.round(p[7]*255)})`;
    pctx.fillRect(-half, -half, p[4], p[4]);
    pctx.strokeStyle = `rgba(${Math.round(p[5]*128)},${Math.round(p[6]*128)},${Math.round(p[7]*128)},0.6)`;
    pctx.lineWidth = 1;
    pctx.strokeRect(-half, -half, p[4], p[4]);
    pctx.restore();
  }
  pctx.globalAlpha = 1;

  // Blood drops
  for (const d of bloodDrops) {
    if (d[5] <= 0) continue;
    pctx.save();
    pctx.globalAlpha = d[5];
    pctx.fillStyle = "rgb(184,10,10)";
    pctx.beginPath();
    pctx.ellipse(d[0], d[1], d[4] * 0.45, d[4] * 0.45, 0, 0, Math.PI * 2);
    pctx.fill();
    pctx.restore();
  }

  // Blood splatters
  const rng = (seed, n) => { let x = Math.sin(seed + n) * 10000; return x - Math.floor(x); };
  for (const s of bloodSplatters) {
    if (s[3] <= 0) continue;
    pctx.save();
    pctx.globalAlpha = s[3];
    pctx.save();
    pctx.translate(s[0], s[1]);
    pctx.scale(1, 0.38);
    pctx.fillStyle = "rgba(140,5,5,1)";
    pctx.beginPath(); pctx.arc(0, 0, s[2] * 0.5, 0, Math.PI * 2); pctx.fill();
    pctx.fillStyle = "rgba(77,0,0,1)";
    pctx.beginPath(); pctx.arc(0, 0, s[2] * 0.28, 0, Math.PI * 2); pctx.fill();
    pctx.restore();
    const nArms = 5 + Math.floor(rng(s[6], 1) * 4);
    for (let i = 0; i < nArms; i++) {
      const ang = rng(s[6], i + 2) * Math.PI * 2;
      const dist = s[2] * (0.45 + rng(s[6], i + 10) * 0.6);
      const br = s[2] * (0.07 + rng(s[6], i + 20) * 0.15);
      const bx = s[0] + Math.cos(ang) * dist, by = s[1] + Math.sin(ang) * dist * 0.38;
      pctx.save();
      pctx.translate(bx, by);
      pctx.scale(1, 0.38);
      pctx.fillStyle = `rgba(153,8,8,${0.7 + rng(s[6], i + 30) * 0.3})`;
      pctx.beginPath(); pctx.arc(0, 0, br, 0, Math.PI * 2); pctx.fill();
      pctx.restore();
    }
    pctx.restore();
  }
}

// ─── Poop stains ─────────────────────────────────────────────────────────────
function spawnPoopStain() {
  const size = Math.round(POOP_SIZE * Math.min(fatScale, 1.8));
  const sx = Math.max(0, Math.min(deskW() - size, Math.round(x + (BASE_W * fatScale - size) / 2)));
  const sy = Math.max(0, Math.min(deskH() - size, Math.round(y + BASE_H * fatScale - size / 2)));
  if (!shitImg.complete || !shitImg.naturalWidth) return;

  const off = document.createElement("canvas");
  off.width = off.height = size;
  const oc = off.getContext("2d");
  oc.drawImage(shitImg, 0, 0, size, size);
  let imgData;
  try { imgData = oc.getImageData(0, 0, size, size); } catch(e) { return; }

  let remaining = 0;
  for (let i = 3; i < imgData.data.length; i += 4) if (imgData.data[i] > SPONGE_ALPHA_THR) remaining++;
  poopStains.push({ x: sx, y: sy, size, imgData, remaining });
  redrawPoopLayer();
}

function redrawPoopLayer() {
  dctx.clearRect(0, 0, poopC.width, poopC.height);
  for (const st of poopStains) {
    dctx.putImageData(st.imgData, st.x, st.y);
  }
}

// ─── Sponge scrubbing ─────────────────────────────────────────────────────────
let scrubbingAudio = null;
function startSpongeAudio() {
  if (scrubbingAudio) return;
  scrubbingAudio = playSFX("sponge-scrub.mp3");
  if (scrubbingAudio) scrubbingAudio.loop = true;
}
function stopSpongeAudio() {
  if (scrubbingAudio) { scrubbingAudio.pause(); scrubbingAudio = null; }
}

function scrubPoopAtCursor(cx, cy) {
  if (!spongeImg.complete || !spongeImg.naturalWidth) return false;

  // Build sponge alpha map once
  if (!scrubPoopAtCursor._spongeMap) {
    const off = document.createElement("canvas");
    off.width = off.height = SPONGE_SIZE;
    const oc = off.getContext("2d");
    oc.drawImage(spongeImg, 0, 0, SPONGE_SIZE, SPONGE_SIZE);
    try {
      const d = oc.getImageData(0, 0, SPONGE_SIZE, SPONGE_SIZE).data;
      scrubPoopAtCursor._spongeMap = new Uint8Array(SPONGE_SIZE * SPONGE_SIZE);
      for (let i = 0; i < SPONGE_SIZE * SPONGE_SIZE; i++) scrubPoopAtCursor._spongeMap[i] = d[i * 4 + 3];
    } catch(e) { return false; }
  }
  const spongeAlpha = scrubPoopAtCursor._spongeMap;

  const cursorLeft = Math.round(cx - SPONGE_SIZE / 2);
  const cursorTop  = Math.round(cy - SPONGE_SIZE / 2);
  let changed = false;
  const stamp = spongeStampTick % SPONGE_STAMP_TICKS === 0;

  poopStains = poopStains.filter(stain => {
    const left = stain.x, top = stain.y, sz = stain.size;
    const minX = Math.max(0, left - cursorLeft);
    const maxX = Math.min(SPONGE_SIZE, left + sz - cursorLeft);
    const minY = Math.max(0, top - cursorTop);
    const maxY = Math.min(SPONGE_SIZE, top + sz - cursorTop);
    let stainChanged = false;
    for (let sy2 = minY; sy2 < maxY; sy2++) {
      const py = cursorTop + sy2 - top;
      for (let sx2 = minX; sx2 < maxX; sx2++) {
        const si = sy2 * SPONGE_SIZE + sx2;
        if (spongeAlpha[si] <= SPONGE_ALPHA_THR) continue;
        const px = cursorLeft + sx2 - left;
        const pi = (py * sz + px) * 4 + 3;
        if (pi < 0 || pi >= stain.imgData.data.length) continue;
        const a = stain.imgData.data[pi];
        if (a <= SPONGE_ALPHA_THR) continue;
        changed = true; stainChanged = true;
        if (stamp) {
          const na = Math.max(0, a - SPONGE_ALPHA_STEP * 4);
          stain.imgData.data[pi] = na;
          if (na <= SPONGE_ALPHA_THR) stain.remaining--;
        }
      }
    }
    if (stainChanged && stamp) redrawPoopLayer();
    return stain.remaining > 0;
  });

  if (changed) spongeStampTick++;
  return changed;
}

// ─── Eat sequence ─────────────────────────────────────────────────────────────
function startEatSequence() {
  eating = true; eatPhase = "run"; eatTick = 0; eatFoodDevour = 0;
  foodAlpha = 1.0; foodScale = 1.0;
  foodParticles = [];
  savedAnim2 = anim; savedVx2 = vx; savedVy2 = vy;
  stopVoice();
  playSFX("king-hoa.mp3");
  const kingW = BASE_W * fatScale;
  const kingH = BASE_H * fatScale;
  const foodCX = foodX + FOOD_DISPLAY_SIZE / 2;
  const kingCX = x + kingW / 2;
  if (kingCX < foodCX) { eatTargetX = foodX - kingW + 20; facing = 1; }
  else                  { eatTargetX = foodX + FOOD_DISPLAY_SIZE - 20; facing = -1; }
  eatTargetY = foodY + FOOD_DISPLAY_SIZE / 2 - kingH / 2;
  eatTargetX = Math.max(0, Math.min(deskW() - kingW, eatTargetX));
  eatTargetY = Math.max(0, Math.min(deskH() - kingH, eatTargetY));
}

function tickEatSequence() {
  const t = eatTick; eatTick++;

  if (eatPhase === "run") {
    if (t < 15) {
      angle = (t / 15) * 360 * (facing === 1 ? 1 : -1);
      squishX = squishY = fatScale; return;
    }
    angle = 0;
    const dx = eatTargetX - x, dy = eatTargetY - y;
    const dist = Math.hypot(dx, dy);
    if (dist > 9) {
      const ratio = 9 / dist;
      x += dx * ratio; y += dy * ratio;
      const rt = t - 15;
      squishX = (1 + 0.3 * Math.sin(rt * 0.7)) * fatScale;
      squishY = (1 - 0.3 * Math.sin(rt * 0.7)) * fatScale;
      angle = 10 * Math.sin(rt * 0.9);
    } else {
      x = eatTargetX; y = eatTargetY;
      squishX = squishY = fatScale; angle = 0;
      eatPhase = "eat"; eatTick = 0; eatFoodDevour = 0;
      playSFXThen("eating.mp3", onEatingDone);
    }
  } else if (eatPhase === "eat") {
    eatFoodDevour++;
    squishX = (1 + 0.25 * Math.sin(t * 1.1)) * fatScale;
    squishY = (1 - 0.25 * Math.sin(t * 1.1)) * fatScale;
    angle = 5 * Math.sin(t * 0.8);
    foodScale = Math.max(0, foodScale - 0.012);
    if (t % 6 === 0 && foodScale > 0.05) spawnFoodParticles(Math.max(2, Math.round(8 * foodScale)));
  } else if (eatPhase === "burp") {
    if (t < 30) {
      squishX = (1 + 0.4 * Math.sin(t * 0.5)) * fatScale;
      squishY = (1 - 0.2 * Math.sin(t * 0.5)) * fatScale;
      angle = 15 * Math.sin(t * 0.4);
    } else {
      squishX = squishY = fatScale; angle = 0;
      eating = false; foodPlaced = false; foodImg = null;
      anim = savedAnim2; vx = savedVx2; vy = savedVy2;
      pickNewBehaviour();
    }
  }
}

function onEatingDone() {
  foodScale = 0;
  const remaining = Math.max(5, Math.floor(25 * Math.max(0, foodScale)));
  spawnFoodParticles(remaining + 15);
  const pts = FOOD_FAT_POINTS[foodPath] || 5;
  fatPoints += pts;
  const ratio = Math.min(1, fatPoints / FAT_EXPLODE_THRESHOLD);
  fatScale = 1 + 0.8 * ratio;
  foodImg = null;
  eatPhase = "burp"; eatTick = 0;
  playSFXThen("burp.mp3", onBurpDone);
}

function onBurpDone() {
  if (shittingEnabled) defecationDueAt = Date.now() + 10000 + Math.random() * 20000, defecationPending = true;
  if (fatPoints >= FAT_EXPLODE_THRESHOLD && !explodeArmed) {
    explodeArmed = true;
    startExplodeSequence();
  }
}

// ─── Defecation ───────────────────────────────────────────────────────────────
function startDefecation() {
  defecating = true; defecationPending = false; defecationDueAt = null;
  defecationTick = 0;
  defSavedAnim = anim; defSavedVx = vx; defSavedVy = vy; defSavedFacing = facing;
  stopVoice();
  return true;
}

function tickDefecation() {
  const t = defecationTick; defecationTick++;
  if (t === 0 || t === DEFECATION_OAH_INTERVAL || t === DEFECATION_OAH_INTERVAL * 2) playSFX("king-oah.mp3");
  const squat = 0.5 + 0.5 * Math.sin(t * 0.35);
  squishX = (1 + 0.16 * squat) * fatScale;
  squishY = (1 - 0.28 * squat) * fatScale;
  angle = facing * (7 + 5 * Math.sin(t * 0.22));
  if (t >= DEFECATION_TICKS) {
    squishX = squishY = fatScale; angle = 0;
    spawnPoopStain();
    playSFX("shit.mp3");
    defecating = false;
    anim = defSavedAnim; vx = defSavedVx; vy = defSavedVy; facing = defSavedFacing;
  }
}

// ─── Explode sequence ─────────────────────────────────────────────────────────
function startExplodeSequence() {
  if (!explodeArmed || exploding) return;
  exploding = true; explodeTick = 0;
  explodeHidden = false; explodeWalkIn = false; explodeRecovery = false;
  eating = false; hitActive = false; hitRecovering = false;
  tickleActive = false; tickleRecovery = false;
}

function tickExplode() {
  const t = explodeTick; explodeTick++;
  if (t === 0) playSFX("king-oah.mp3");

  if (t < EXPL_SWELL_END) {
    squishX = squishY = fatScale; angle = 0;
  } else if (t < EXPL_BOOM_TICK) {
    const st = t - EXPL_SWELL_END;
    const dur = EXPL_BOOM_TICK - EXPL_SWELL_END;
    const swell = fatScale + 0.6 * (st / dur);
    squishX = swell + 0.35 * Math.sin(st * 1.1);
    squishY = swell - 0.35 * Math.sin(st * 1.1);
    angle   = 25 * Math.sin(st * 0.9);
    x += 8 * Math.sin(st * 2.7); y += 6 * Math.sin(st * 2.1);
    x = Math.max(0, Math.min(deskW() - BASE_W * squishX, x));
    y = Math.max(0, Math.min(deskH() - BASE_H * squishY, y));
  } else if (t === EXPL_BOOM_TICK) {
    playSFX("explode.mp3");
    spawnKingExplosionParticles();
    spawnBloodExplosion();
    dieAlpha = 0; squishX = squishY = 0.01; angle = 0;
    explodeHidden = true; explodeHideT = 0;
    fatPoints = 0; fatScale = 1.0; explodeArmed = false;
  } else if (explodeHidden) {
    explodeHideT++;
    if (explodeHideT >= EXPLODE_HIDE_TICKS) {
      explodeHidden = false; explodeWalkIn = true; explodeWalkTick = 0;
      explodeWalkSide = Math.random() < 0.5 ? 1 : -1;
      x = explodeWalkSide === 1 ? -BASE_W - 20 : deskW() + 20;
      facing = explodeWalkSide;
      y = deskH() - BASE_H - 10;
      dieAlpha = 1; squishX = squishY = 1; angle = 0;
    }
  } else if (explodeWalkIn) {
    explodeWalkTick++;
    const WSPD = 4;
    if (explodeWalkSide === 1) { x += WSPD; if (x >= 40) { x = 40; finishExplodeWalkin(); } }
    else                       { x -= WSPD; if (x <= deskW() - BASE_W - 40) { x = deskW() - BASE_W - 40; finishExplodeWalkin(); } }
    squishX = (1 + 0.1 * Math.sin(explodeWalkTick * 0.55)) * fatScale;
    squishY = (1 - 0.1 * Math.sin(explodeWalkTick * 0.55)) * fatScale;
  } else if (explodeRecovery) {
    explodeRecoverT++;
    const p = explodeRecoverT / 60;
    if (p < 0.35) { const lp = p / 0.35; angle = 25 * Math.sin(lp * Math.PI * 4) * (1 - lp * 0.5); squishX = (1 + 0.28 * Math.sin(lp * Math.PI * 5)) * fatScale; squishY = (1 - 0.2 * Math.sin(lp * Math.PI * 5)) * fatScale; }
    else if (p < 0.7) { const lp = (p - 0.35) / 0.35; const sc = 1 + 0.2 * Math.sin(lp * Math.PI); squishX = sc * fatScale; squishY = (2 - sc) * fatScale; angle = 12 * Math.sin(lp * Math.PI * 3); }
    else { const lp = (p - 0.7) / 0.3; const d2 = (1 - lp) ** 2; angle = 10 * Math.sin(lp * Math.PI * 2) * d2; squishX = (1 + 0.08 * Math.cos(lp * Math.PI * 3) * d2) * fatScale; squishY = (1 - 0.08 * Math.cos(lp * Math.PI * 3) * d2) * fatScale; }
    if (explodeRecoverT >= 60) { angle = 0; squishX = squishY = fatScale; explodeRecovery = false; exploding = false; pickNewBehaviour(); }
  }
}

function finishExplodeWalkin() {
  explodeWalkIn = false; explodeRecovery = true; explodeRecoverT = 0;
  playSFX("piece-of-shit.mp3");
}

// ─── Hit mode ─────────────────────────────────────────────────────────────────
function triggerHit(dvx2, dvy2, speed) {
  if (dying) return;
  stopVoice();
  const magnitude = Math.min(speed, 80) / 80;
  const fatRes = 1.0 / (0.4 + 0.6 * fatScale);
  const launchSpeed = (8 + magnitude * 22) * fatRes;
  const norm = speed || 1;
  const nvx = (dvx2 / norm) * launchSpeed;
  const nvy = (dvy2 / norm) * launchSpeed;
  const nav = (magnitude * 18 * fatRes) * (Math.random() < 0.5 ? 1 : -1);

  if (hitActive) {
    hitVx = hitVx * 0.5 + nvx; hitVy = hitVy * 0.5 + nvy; hitAngularV = nav;
    if (hitSoundCooldown <= 0) { comboScore++; comboVisible = true; showCombo(); }
  } else if (hitRecovering) {
    hitRecovering = false; hitActive = true; hitTick = 0;
    hitVx = nvx; hitVy = nvy; hitAngularV = nav;
    comboScore = 0; comboVisible = false; comboAirborne = true; hideCombo();
  } else {
    hitActive = true; hitTick = 0;
    hitVx = nvx; hitVy = nvy; hitAngularV = nav;
    savedAnim = anim; savedVxS = vx; savedVyS = vy;
    comboScore = 0; comboVisible = false; comboAirborne = true; hideCombo();
  }
  if (hitSoundCooldown <= 0) { playSFX("hit.mp3"); hitSoundCooldown = HIT_SOUND_COOLDOWN; }
  if (ohSoundCooldown <= 0)  { setTimeout(() => playOverlappingSFX("king-oah.mp3"), 200); ohSoundCooldown = OH_SOUND_COOLDOWN; }
}

function tickHitFlight() {
  const t = hitTick;
  hitTick++;
  if (hitSoundCooldown > 0) hitSoundCooldown--;
  if (ohSoundCooldown > 0)  ohSoundCooldown--;
  const fatT = (fatScale - 1) / 0.8;
  const GRAVITY = 0.7 + 0.35 * fatT;
  const BOUNCE  = 0.45 - 0.15 * fatT;
  const FRICTION = 0.85;
  const MAX_TICKS = 240;
  hitVy += GRAVITY;
  x += hitVx; y += hitVy;
  angle = (angle + hitAngularV) % 360;
  const effH = BASE_H * Math.abs(squishY);
  const effW = BASE_W * Math.abs(squishX);
  if (y + effH >= deskH()) {
    y = deskH() - effH;
    hitVy = -Math.abs(hitVy) * BOUNCE; hitVx *= FRICTION; hitAngularV *= FRICTION;
    squishX = 1.6 * fatScale; squishY = 0.4 * fatScale;
  } else {
    squishX += (fatScale - squishX) * 0.15;
    squishY += (fatScale - squishY) * 0.15;
  }
  if (x < 0)            { x = 0; hitVx =  Math.abs(hitVx) * BOUNCE; }
  if (x + effW > deskW()) { x = deskW() - effW; hitVx = -Math.abs(hitVx) * BOUNCE; }
  if (y < 0)            { y = 0; hitVy =  Math.abs(hitVy) * BOUNCE; }
  const total = Math.hypot(hitVx, hitVy);
  const grounded = (y + effH >= deskH() - 2);
  if (grounded && (total < 1.5 && Math.abs(hitAngularV) < 1 || t >= MAX_TICKS)) endHitFlight();
}

function endHitFlight() {
  hitActive = false; hitRecovering = true; hitRecoverTick = 0;
  squishX = squishY = fatScale; angle = 0; hitVx = hitVy = hitAngularV = 0;
  fistCursorVx = fistCursorVy = 0;
  playSFX("piece-of-shit.mp3");
  if (comboScore > 0) { comboLocked = comboScore; comboVisible = false; showCombo(true); }
  else { comboVisible = comboAirborne = false; hideCombo(); }
  comboScore = 0; comboAirborne = false;
}

function tickHitRecovery() {
  const t = hitRecoverTick; hitRecoverTick++;
  const p = t / HIT_RECOVER_TICKS;
  if (p < 0.25) { const lp = p / 0.25; angle = 18 * Math.sin(lp * Math.PI * 5) * (1 - lp); squishX = (1 + 0.3 * Math.sin(lp * Math.PI * 6)) * fatScale; squishY = (1 - 0.2 * Math.sin(lp * Math.PI * 6)) * fatScale; }
  else if (p < 0.65) { const lp = (p - 0.25) / 0.4; const sc = 1 + 0.35 * Math.sin(lp * Math.PI); squishX = (sc + 0.12 * Math.sin(lp * Math.PI * 7)) * fatScale; squishY = (sc - 0.08 * Math.sin(lp * Math.PI * 7)) * fatScale; angle = 20 * Math.sin(lp * Math.PI * 4); }
  else { const lp = (p - 0.65) / 0.35; const d = (1 - lp) ** 2; angle = 15 * Math.sin(lp * Math.PI * 3) * d; squishX = (1 + 0.1 * Math.cos(lp * Math.PI * 4) * d) * fatScale; squishY = (1 - 0.1 * Math.cos(lp * Math.PI * 4) * d) * fatScale; }
  if (t >= HIT_RECOVER_TICKS) {
    angle = 0; squishX = squishY = fatScale; hitRecovering = false;
    anim = savedAnim; vx = savedVxS; vy = savedVyS; pickNewBehaviour();
  }
}

// ─── Tickle ───────────────────────────────────────────────────────────────────
function startTickle() {
  tickleActive = true; tickleRecovery = false; tickleTick = 0;
  savedAnimTickle = anim; savedVxTickle = vx; savedVyTickle = vy;
  stopVoice(); playOverlappingSFX("king-oah.mp3");
}
function stopTickle() {
  tickleActive = false; tickleRecovery = true; tickleRecoveryT = 0;
  cursorReversals = 0; cursorVxPrev = 0;
}
function tickTickle() {
  const t = tickleTick; tickleTick++;
  reversalDecay--;
  if (reversalDecay <= 0) cursorReversals = Math.max(0, cursorReversals - 1);
  if (cursorReversals < 2 && t > 10) { stopTickle(); return; }
  if (t % 18 === 0) playOverlappingSFX("king-oah.mp3");
  const ph = t * 0.55;
  const leanAmp = 22 + 10 * Math.sin(t * 0.08);
  const sqF = 0.28 + 0.1 * Math.abs(Math.sin(t * 0.06));
  angle   = leanAmp * Math.sin(ph);
  squishX = (1 + sqF * Math.cos(ph * 1.3)) * fatScale;
  squishY = (1 - sqF * Math.cos(ph * 1.3)) * fatScale;
  x += 5 * Math.sin(t * 1.7); y += 3 * Math.sin(t * 2.1 + 1);
  x = Math.max(0, Math.min(deskW() - BASE_W, x));
  y = Math.max(0, Math.min(deskH() - BASE_H, y));
}
function tickTickleRecovery() {
  const t = tickleRecoveryT; tickleRecoveryT++;
  const RECOV = 40;
  if (t >= RECOV) { angle = 0; squishX = squishY = fatScale; tickleRecovery = false; anim = savedAnimTickle; vx = savedVxTickle; vy = savedVyTickle; return; }
  const p = t / RECOV; const damp = (1 - p) ** 2;
  angle   = 18 * Math.sin(t * 0.45) * damp;
  squishX = (1 + 0.18 * Math.cos(t * 0.55) * damp) * fatScale;
  squishY = (1 - 0.18 * Math.cos(t * 0.55) * damp) * fatScale;
}

// ─── Death ────────────────────────────────────────────────────────────────────
function tickDeath() {
  const d = dieTick; dieTick++;
  if (d === 0) playSFX("king-oah.mp3");
  if (d < 20) {
    squishX = 1 + 0.55 * Math.sin(d * 1.9); squishY = 1 - 0.55 * Math.sin(d * 1.9);
    angle = 30 * Math.sin(d * 1.4); dieAlpha = 1;
    x += 9 * Math.sin(d * 2.3); y += 6 * Math.sin(d * 1.8);
  } else if (d < 50) {
    const p = (d - 20) / 30;
    squishX = squishY = 1 - 0.85 * p; angle = (d * 18) % 360; dieAlpha = 1 - 0.5 * p;
  } else if (d < 80) {
    const p = (d - 50) / 30;
    squishX = squishY = Math.max(0.01, 0.15 - 0.13 * p);
    angle = (d * 22) % 360; dieAlpha = Math.max(0, 0.5 - 0.5 * p);
  } else {
    squishX = squishY = 0.01; dieAlpha = 0;
    dying = false; visible = false;
    if (quitAfterDeath && !deathNavigationRequested) {
      deathNavigationRequested = true;
      window.location.href = "../index.html";
    }
  }
}

// ─── Fist cursor / hit detection ─────────────────────────────────────────────
function updateFist(cx, cy, hitDetect) {
  const fistEl  = document.getElementById("fistCursor");
  if (isCursorOverButtons(cx, cy)) {
    fistEl.style.display = "none";
    fistPrevX = fistPrevY = -9999; fistCursorVx = fistCursorVy = 0;
    return;
  }
  fistEl.style.display = "block";
  fistEl.style.left = cx + "px"; fistEl.style.top = cy + "px";
  const kingCX = x + BASE_W / 2, kingCY = y + BASE_H / 2;
  const dx = kingCX - cx, dy2 = kingCY - cy;
  if (Math.abs(dx) > 0.1 || Math.abs(dy2) > 0.1) {
    fistAngle = Math.atan2(dy2, dx) * 180 / Math.PI + 90;
    fistEl.style.transform = `translate(-50%,-50%) rotate(${fistAngle}deg)`;
  }
  if (hitDetect && fistPrevX !== -9999) {
    const dvx2 = cx - fistPrevX, dvy2 = cy - fistPrevY;
    const alpha = 0.5;
    fistCursorVx = alpha * dvx2 + (1 - alpha) * fistCursorVx;
    fistCursorVy = alpha * dvy2 + (1 - alpha) * fistCursorVy;
    const speed = Math.hypot(fistCursorVx, fistCursorVy);
    if (speed >= HIT_SWIPE_SPEED && cursorOnSprite(cx, cy, x, y, squishX, squishY, facing)) {
      triggerHit(fistCursorVx, fistCursorVy, speed);
    }
  }
  fistPrevX = cx; fistPrevY = cy;
}

function isCursorOverButtons(cx, cy) {
  const hitBtnEl = document.getElementById("hitBtn");
  const r = hitBtnEl.getBoundingClientRect();
  const desktopR = desktop.getBoundingClientRect();
  const bx = r.left - desktopR.left, by = r.top - desktopR.top;
  if (cx >= bx && cx <= bx + r.width && cy >= by && cy <= by + r.height) return true;
  const sp = document.getElementById("spongeBtn");
  const sr = sp.getBoundingClientRect();
  const sx2 = sr.left - desktopR.left, sy2 = sr.top - desktopR.top;
  if (cx >= sx2 && cx <= sx2 + sr.width && cy >= sy2 && cy <= sy2 + sr.height) return true;
  return false;
}

// ─── Combo score display ──────────────────────────────────────────────────────
function showCombo(locked) {
  const el = document.getElementById("comboScore");
  const numEl = document.getElementById("comboScoreNum");
  const labelEl = document.getElementById("comboLabel");
  el.style.display = "block";
  el.classList.toggle("live", !locked);
  el.classList.toggle("locked", Boolean(locked));
  labelEl.textContent = locked ? "FINAL COMBO" : "COMBO HIT!";
  numEl.textContent = locked ? comboLocked : comboScore;
}
function hideCombo() {
  const el = document.getElementById("comboScore");
  el.style.display = "none";
  el.classList.remove("live", "locked");
}

// ─── Food drawing ─────────────────────────────────────────────────────────────
function drawFood() {
  fctx.clearRect(0, 0, foodC.width, foodC.height);
  if (!foodImg || !foodImg.complete || !foodImg.naturalWidth
      || (!foodDragging && !foodPlaced && !eating)) return;
  const t = eatFoodDevour;
  fctx.save();
  fctx.globalAlpha = foodAlpha;
  if (eating && eatPhase === "eat") {
    const wobbleSX = 1 + 0.18 * Math.sin(t * 0.8);
    const wobbleSY = 1 - 0.18 * Math.sin(t * 0.8);
    const ang = 15 * Math.sin(t * 0.6);
    const sc = foodScale;
    const cx2 = foodX + FOOD_DISPLAY_SIZE / 2;
    const cy2 = foodY + FOOD_DISPLAY_SIZE / 2;
    fctx.translate(cx2, cy2);
    fctx.rotate(ang * Math.PI / 180);
    fctx.scale(wobbleSX * sc, wobbleSY * sc);
    fctx.drawImage(foodImg, -FOOD_DISPLAY_SIZE / 2, -FOOD_DISPLAY_SIZE / 2, FOOD_DISPLAY_SIZE, FOOD_DISPLAY_SIZE);
  } else if (foodDragging) {
    fctx.drawImage(foodImg, foodDragX, foodDragY, FOOD_DISPLAY_SIZE, FOOD_DISPLAY_SIZE);
  } else {
    fctx.drawImage(foodImg, foodX, foodY, FOOD_DISPLAY_SIZE, FOOD_DISPLAY_SIZE);
  }
  fctx.restore();
}

// ─── Main loop ────────────────────────────────────────────────────────────────
let lastTick = 0;
function mainLoop(ts) {
  if (ts - lastTick < TICK_MS * 0.8) { requestAnimationFrame(mainLoop); return; }
  lastTick = ts;

  if (dying) { tickDeath(); drawKing(); requestAnimationFrame(mainLoop); return; }
  tick++;

  // Particles every frame
  if (foodParticles.length || bloodDrops.length || bloodSplatters.length) tickParticles();
  drawParticles();

  // Explode
  if (exploding) { tickExplode(); drawKing(); drawFood(); requestAnimationFrame(mainLoop); return; }

  // Hit flight
  if (hitActive) { tickHitFlight(); drawKing(); drawFood(); requestAnimationFrame(mainLoop); return; }
  if (hitRecovering) { tickHitRecovery(); drawKing(); drawFood(); requestAnimationFrame(mainLoop); return; }

  // Eating
  if (eating) { tickEatSequence(); drawKing(); drawFood(); requestAnimationFrame(mainLoop); return; }

  // Defecation
  if (!defecating && defecationPending && defecationDueAt && Date.now() >= defecationDueAt
      && !hitMode && !hitActive && !hitRecovering && !exploding && !tickleActive && !tickleRecovery) {
    startDefecation();
  }
  if (defecating) { tickDefecation(); drawKing(); drawFood(); requestAnimationFrame(mainLoop); return; }

  // Tickle
  if (!hitMode && !spongeMode) {
    if (tickleActive)   { tickTickle();         drawKing(); drawFood(); requestAnimationFrame(mainLoop); return; }
    if (tickleRecovery) { tickTickleRecovery();  drawKing(); drawFood(); requestAnimationFrame(mainLoop); return; }
  }

  // Normal behaviour
  animTimer--;
  if (animTimer <= 0) pickNewBehaviour();

  voiceCounter--;
  if (voiceCounter <= 0) {
    voiceCounter = VOICE_CHECK_EVERY + Math.round((Math.random() - 0.5) * 120);
    maybeSpeak();
  }

  updateAnimation();
  if (fatScale !== 1) { squishX *= fatScale; squishY *= fatScale; }
  move();
  drawKing();
  drawFood();

  requestAnimationFrame(mainLoop);
}

// ─── Input handling ───────────────────────────────────────────────────────────
let globalMouseX = 0, globalMouseY = 0;

window.addEventListener("mousemove", e => {
  const r = desktop.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;
  globalMouseX = mx; globalMouseY = my;

  // Food drag
  if (foodDragging) {
    foodDragX = mx - FOOD_DISPLAY_SIZE / 2;
    foodDragY = my - FOOD_DISPLAY_SIZE / 2;
  }

  // Hit mode fist
  if (hitMode) {
    updateFist(mx, my, true);
    const fi = document.getElementById("fistCursor");
    fi.style.left = e.clientX + "px";
    fi.style.top = e.clientY + "px";
    desktop.style.cursor = "none";
  }

  // Sponge
  if (spongeMode) {
    const spEl = document.getElementById("spongeCursor");
    spEl.style.left = e.clientX + "px"; spEl.style.top = e.clientY + "px";
    if (spongePrevX !== null) {
      const moved = Math.hypot(mx - spongePrevX, my - spongePrevY) >= 2;
      if (moved && scrubPoopAtCursor(mx, my)) startSpongeAudio();
      else stopSpongeAudio();
    }
    spongePrevX = mx; spongePrevY = my;
    desktop.style.cursor = "none";
  }

  // Tickle detection
  if (!hitMode && !spongeMode && !eating && !dying) {
    if (cursorOnSprite(mx, my, x, y, squishX, squishY, facing)) {
      if (lastCursorX !== -9999) {
        const dvx2 = mx - lastCursorX, dvy = my - lastCursorY;
        const speed = Math.hypot(dvx2, dvy);
        if (speed >= TICKLE_MIN_SPEED) {
          if (cursorVxPrev !== 0 && Math.sign(dvx2) !== Math.sign(cursorVxPrev)) {
            cursorReversals = Math.min(cursorReversals + 1, TICKLE_REV_NEEDED + 3);
            reversalDecay = TICKLE_STOP_TICKS;
          }
          cursorVxPrev = dvx2;
        }
      }
      if (cursorReversals >= TICKLE_REV_NEEDED && !tickleActive && !tickleRecovery) startTickle();
    }
    lastCursorX = mx; lastCursorY = my;
  }
});

window.addEventListener("click", e => {
  const r = desktop.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;

  // Place food
  if (foodDragging && !defecating) {
    const fx = mx - FOOD_DISPLAY_SIZE / 2, fy = my - FOOD_DISPLAY_SIZE / 2;
    const kingR = [x, y, BASE_W * Math.abs(squishX), BASE_H * Math.abs(squishY)];
    const foodR = [fx, fy, FOOD_DISPLAY_SIZE, FOOD_DISPLAY_SIZE];
    if (!rectsOverlap(kingR, foodR)) {
      foodDragging = false; foodPlaced = true;
      foodX = fx; foodY = fy; foodAlpha = 1; foodScale = 1;
      desktop.style.cursor = "";
      startEatSequence();
    }
    return;
  }

  // Click King (speak)
  if (!hitMode && !spongeMode && !foodDragging) {
    if (cursorOnSprite(mx, my, x, y, squishX, squishY, facing) && VOICE_LINES.length) {
      playVoice(VOICE_LINES[Math.floor(Math.random() * VOICE_LINES.length)]);
    }
  }
});

desktop.addEventListener("contextmenu", e => {
  e.preventDefault();
  const menu = document.getElementById("ctxMenu");
  menu.style.left = e.clientX + "px"; menu.style.top = e.clientY + "px";
  menu.style.display = "block";
  document.getElementById("ctxShitting").textContent = "💩 Desktop Shitting: " + (shittingEnabled ? "ON" : "OFF");
});

document.addEventListener("click", e => {
  if (!e.target.closest("#ctxMenu")) document.getElementById("ctxMenu").style.display = "none";
});

// Dinner machine click
document.getElementById("dinnerMachine").addEventListener("click", e => {
  if (foodDragging) return;
  e.stopPropagation();
  if (foodPlaced || eating) return;
  if (!FOOD_IMAGES.length) return;
  const fname = FOOD_IMAGES[Math.floor(Math.random() * FOOD_IMAGES.length)];
  foodPath = fname;
  foodImg = loadImg(fname);
  foodDragging = true;
  const r = desktop.getBoundingClientRect();
  globalMouseX = e.clientX - r.left;
  globalMouseY = e.clientY - r.top;
  foodDragX = globalMouseX - FOOD_DISPLAY_SIZE / 2;
  foodDragY = globalMouseY - FOOD_DISPLAY_SIZE / 2;
  desktop.style.cursor = "none";
});

// Hit mode button
document.getElementById("hitBtn").addEventListener("click", toggleHitMode);

function toggleHitMode() {
  hitMode = !hitMode;
  const btn = document.getElementById("hitBtn");
  btn.textContent = hitMode ? "STOP HIT" : "HIT MODE";
  btn.classList.toggle("active", hitMode);
  const fi = document.getElementById("fistCursor");
  if (hitMode) {
    if (spongeMode) toggleSponge();
    document.getElementById("dinnerMachine").style.display = "none";
    if (foodDragging) { foodDragging = false; foodImg = null; }
    fi.style.display = "block";
    desktop.style.cursor = "none";
    fistPrevX = fistPrevY = -9999; fistCursorVx = fistCursorVy = 0;
    hitActive = false;
  } else {
    fi.style.display = "none";
    document.getElementById("dinnerMachine").style.display = "";
    desktop.style.cursor = "";
    comboVisible = false; comboAirborne = false;
    comboScore = 0; comboLocked = null; hideCombo();
    if (hitActive || hitRecovering) {
      hitActive = hitRecovering = false;
      squishX = squishY = fatScale; angle = 0;
      anim = savedAnim; vx = savedVxS; vy = savedVyS;
      pickNewBehaviour();
    }
  }
}

// Sponge mode button
document.getElementById("spongeBtn").addEventListener("click", toggleSponge);
function toggleSponge() {
  if (!spongeMode && hitMode) {
    toggleHitMode();
  }
  spongeMode = !spongeMode;
  const btn = document.getElementById("spongeBtn");
  btn.textContent = spongeMode ? "STOP SPONGE" : "SPONGE MODE";
  btn.classList.toggle("active", spongeMode);
  const sp = document.getElementById("spongeCursor");
  if (spongeMode) {
    sp.style.display = "block";
    desktop.style.cursor = "none";
    spongePrevX = null; spongePrevY = null; spongeStampTick = 0;
  } else {
    sp.style.display = "none";
    stopSpongeAudio();
    desktop.style.cursor = "";
  }
}

// Context menu actions
document.getElementById("ctxSpeak").addEventListener("click", () => {
  if (VOICE_LINES.length) playVoice(VOICE_LINES[Math.floor(Math.random() * VOICE_LINES.length)]);
  document.getElementById("ctxMenu").style.display = "none";
});
document.getElementById("ctxToggle").addEventListener("click", () => {
  visible = !visible;
  document.getElementById("ctxMenu").style.display = "none";
  if (!visible) ctx.clearRect(0, 0, mainC.width, mainC.height);
});
document.getElementById("ctxShitting").addEventListener("click", () => {
  shittingEnabled = !shittingEnabled;
  document.getElementById("ctxShitting").textContent = "💩 Desktop Shitting: " + (shittingEnabled ? "ON" : "OFF");
  if (!shittingEnabled) { defecationPending = false; defecationDueAt = null; }
  // Show/hide sponge button
  document.getElementById("spongeBtn").style.display = shittingEnabled ? "flex" : "none";
  document.getElementById("ctxMenu").style.display = "none";
});
document.getElementById("ctxQuit").addEventListener("click", () => {
  document.getElementById("ctxMenu").style.display = "none";
  if (!dying) {
    quitAfterDeath = true;
    dying = true;
    dieTick = 0;
    stopSpongeAudio();
  }
});
document.getElementById("trayIcon").addEventListener("contextmenu", e => {
  e.preventDefault();
  const menu = document.getElementById("ctxMenu");
  menu.style.left = e.clientX + "px"; menu.style.top = e.clientY + "px";
  menu.style.display = "block";
  document.getElementById("ctxShitting").textContent = "💩 Desktop Shitting: " + (shittingEnabled ? "ON" : "OFF");
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rectsOverlap(r1, r2) {
  return !(r1[0]+r1[2] <= r2[0] || r2[0]+r2[2] <= r1[0] || r1[1]+r1[3] <= r2[1] || r2[1]+r2[3] <= r1[1]);
}

// ─── Taskbar clock ────────────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const weekday = now.toLocaleDateString("en-US", {weekday: "long"});
  const month = now.toLocaleDateString("en-US", {month: "long"});
  const day = now.toLocaleDateString("en-US", {day: "numeric"});
  const time = now.toLocaleTimeString("en-US", {hour: "2-digit", minute: "2-digit", hourCycle: "h23"});
  document.getElementById("taskbarClock").textContent =
    `${weekday} ${month} ${day}, ${time}`;
}
updateClock(); setInterval(updateClock, 10000);

// ─── Sponge button visibility (depends on shitting) ───────────────────────────
document.getElementById("spongeBtn").style.display = shittingEnabled ? "flex" : "none";

// ─── Boot ─────────────────────────────────────────────────────────────────────
window.addEventListener("load", init);
if (document.readyState === "complete") init();
