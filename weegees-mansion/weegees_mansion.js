// ═══════════════════════════════════════════════════════════════════════════
// ── Asset Preloader ───────────────────────────────────────────────────────────
// Warms the browser's HTTP cache for every image and sound the game uses, the
// moment this script runs (i.e. while the start screen is still up). It is
// completely self-contained and side-effect free:
//   • It never plays any audio and never touches the DOM/game state.
//   • It doesn't replace or wire into any existing loading code (THREE's
//     TextureLoader, the `new Image()` calls in initThree(), or any of the
//     `new Audio(...)` calls scattered through the file) — it just asks the
//     browser to start fetching each URL early. When that same URL is
//     requested again later by the real game code, it comes back instantly
//     from cache instead of over the network.
//   • If any single asset 404s or fails (e.g. a filename typo), that failure
//     is caught and logged here only — it can't throw, can't block, and has
//     zero effect on the normal loading path elsewhere in the game.
//   • References are kept in `window._preloadedAssets` purely so the
//     Image/Audio objects aren't garbage-collected mid-download.
// ═══════════════════════════════════════════════════════════════════════════
(function preloadAllAssets() {
  const PRELOAD_IMAGES = [
    'Misc/Background.png',
    'Misc/victory.png',
    'DualShock4-button-icons/ButtonIcon-PS4-Left_Stick.png',
    'DualShock4-button-icons/ButtonIcon-PS4-Right_Stick.png',
    'DualShock4-button-icons/ButtonIcon-PS4-Circle.png',
    'DualShock4-button-icons/ButtonIcon-PS4-Triangle.png',
    'DualShock4-button-icons/ButtonIcon-PS4-Cross.png',
    'DualShock4-button-icons/ButtonIcon-PS4-L1.png',
    'DualShock4-button-icons/ButtonIcon-PS4-R1.png',
    'DualShock4-button-icons/ButtonIcon-PS4-Square.png',
    'DualShock4-button-icons/ButtonIcon-PS4-Options.png',
    'DualShock4-button-icons/ButtonIcon-PS4-Dpad.png',
    'Item-Sprites/mtndewbottle.png',
    'Item-Sprites/flashlightbattery.png',
    'Item-Sprites/weegeestake.png',
    'Item-Sprites/banana-peel.png',
    'Item-Sprites/plunger-item.png',
    'Weegee-Sprites/Weegee_Front.png',
    'Weegee-Sprites/Weegee_Back.png',
    'Weegee-Sprites/Weegee_Left.png',
    'Weegee-Sprites/Weegee_Right.png',
    'Textures/wall.png',
    'Textures/floor.png',
    'Textures/ceiling.png',
    'Textures/skybox.png',
    'Textures/window-wall.png',
    'Item-Sprites/plunger-projectile.png',
    'Hud/Mario-Hand-Left.png',
    'Hud/Mario-Hand-Right.png',
    'Textures/raindrop.png'
  ];

  const PRELOAD_SOUNDS = [
    'Audio/Item/banana-peel-slip.mp3',
    'Audio/Item/banana-peel-fall.mp3',
    'Audio/Weegee/weegee-scream.mp3',
    'Audio/Player/player-mamafcker.mp3',
    'Audio/Item/plunger-projectile-hit.mp3',
    'Audio/Item/dew-chug.mp3',
    'Audio/Player/haha.mp3',
    'Audio/Weegee/weegee-eh.mp3',
    'Audio/Music/weegees-mansion-theme.wav',
    'Audio/Player/footsteps.mp3',
    'Audio/Death-Victory/weegee-evil-laugh.wav',
    'Audio/Death-Victory/yay.mp3',
    'Audio/Weegee/go-weegee.mp3',
    'Audio/Weegee/obey-weegee-destroy-mario.mp3',
    'Audio/Weegee/weegee-isolated.mp3',
    'Audio/Weegee/im-weegee-number-1.mp3',
    'Audio/Weegee/weegee-hurry-up-already-eh.mp3',
    'Audio/Weegee/weegee-call-out-mario.mp3',
    'Audio/Weegee/weegee-weegee-oh-yeah-oh-yeah.mp3',
    'Audio/Ambient/rain-thunder.mp3',
    'Audio/Ambient/lightning-flash.mp3'
  ];

  window._preloadedAssets = [];

  PRELOAD_IMAGES.forEach((src) => {
    const img = new Image();
    img.onerror = () => console.warn('[Preload] Image failed (non-fatal, ignored):', src);
    img.src = src;
    window._preloadedAssets.push(img);
  });

  PRELOAD_SOUNDS.forEach((src) => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.onerror = () => console.warn('[Preload] Sound failed (non-fatal, ignored):', src);
    audio.src = src;
    try { audio.load(); } catch (e) {}
    window._preloadedAssets.push(audio);
  });
})();
// ═══════════════════════════════════════════════════════════════════════════

const FLOOR_COUNT = 5;
const CELL = 4;
const MAZE_W = 11;
const MAZE_H = 11;

let scene, camera, renderer, clock;
let player = { x: 2, z: 2, yaw: 0, pitch: 0, floor: 0 };
let weegee = { x: 6, z: 6, floor: 0, mesh: null, visible: false, peeking: false, peekTimer: 0, teleportTimer: 0, teleportCooldown: 20, state: 'wander', targetCellX: null, targetCellZ: null, dirX: 0, dirZ: -1 };
let keys = {};
// ── Gamepad (DualShock 4 / Standard Gamepad) live input state ───────────────
// Populated every frame by the gamepad polling loop near the bottom of this
// file. Kept separate from `keys` so keyboard & gamepad never clobber
// each other — movement/look code below simply ADDS whichever of these
// are non-zero on top of the existing keyboard/mouse contribution.
let gamepadState = { moveX: 0, moveY: 0, lookX: 0, lookY: 0, sprintToggle: false, connected: false };
let isDead = false, gameStarted = false, isPaused = false;
// True once wall/floor/ceiling/skybox/window-wall textures have all finished
// loading and the first buildFloorScene(0) has run. Used to make sure the
// mansion is never revealed (start screen hidden) before its geometry
// actually exists — see startGame()/onSceneTexLoaded().
let sceneTexturesReady = false;
let pendingGameStart = false;
let currentFloor = 0;
let floorMeshes = [];
let weegeePlane, weegeeTextures = {};
let wallTex, floorTex, ceilingTex, windowWallTex;
let skyboxTex;
let deathTimer = 0, deathScreen;
let lookAwayActive = false, lookAwayTimer = 0;
let stairPositions = [];
let walls3D = [];
let warningEl, overlayEl, timerBarWrap, timerFill;
let armsCanvas, armsCtx;
let flashTimer = 0;
let weegeeActive = false;
let weegeeSpawnTimer = 0;

// Audio Session Playback Volatile Tracking Stacks
let wasMusicPlaying = false;
let wasFootstepsPlaying = false;

// Flashlight Mechanics Variables
let flashlight;
let flashlightActive = true;
let batteryCurrent = 100;
const BATTERY_DRAIN_RATE = 3.6; 

// Stamina Management Settings
let staminaCurrent = 100;
let isSprinting = false;
const STAMINA_DRAIN_RATE = 5.0; 
const STAMINA_REGEN_RATE = 12.0;

// Mountain Dew speed boost: drinking a Dew grants a temporary movement
// speed multiplier for a set duration after the chug animation finishes.
let speedBoostTimeLeft = 0;
const DEW_SPEED_BOOST_DURATION = 7.5;
const DEW_SPEED_BOOST_MULT = 1.4;

// Inventory Arrays and State Global Data Maps
let inventory = [null, null, null, null, null]; 
let selectedSlot = 0;
let stakeFloor = Math.floor(Math.random() * FLOOR_COUNT);
let isWeegeeBanished = false;
let handMesh;
let spawnedItems = [];
let raycaster = new THREE.Raycaster();
let mouseVector = new THREE.Vector2(0, 0);

// ─── Item Use Animation State ───────────────────────────────────────────────
// itemUseAnim describes a currently-playing hand/item animation in the
// arms-overlay canvas. `type` matches an ITEM_DATA id, `t` runs 0..duration.
// `chugging` / `chugStartStamina` are used by the Mountain Dew animation to
// track stamina refill only while the "drinking" phase is playing.
let itemUseAnim = { active: false, type: null, t: 0, duration: 1.0, chugging: false, chugStartStamina: 0 };

const ITEM_ANIM_DURATIONS = {
  dew: 3.6,
  battery: 1.6,
  stake: 2.2,
  banana: 0.55,
  plunger: 0.62
};

// Phase breakpoints (as fractions 0..1 of the animation's total duration)
// for each item's multi-stage use animation.
const DEW_PHASES    = { riseEnd: 0.15, chugEnd: 0.80 };     // rise -> chug -> throw
const BATTERY_PHASES = { riseEnd: 0.50, insertEnd: 0.65 };  // rise -> insert -> retreat off-screen
const STAKE_PHASES  = { raiseEnd: 0.18, holdEnd: 0.64 };    // raise -> hold -> throw away
const PLUNGER_THROW_PHASES = { riseEnd: 0.42, releaseEnd: 0.62 }; // big overhead windup -> hurl

// ─── Weegee Banishing Animation State ───────────────────────────────────────
// While weegeeBanishAnim.active is true, Weegee plays a "pulled into the
// ground" animation with a glowing Satanic circle, and CANNOT kill the player.
// Phase 1 (0 → 0.35): red circle fades/scales in around Weegee's feet.
// Phase 2 (0.35 → 1.0): Weegee slowly sinks below the floor until invisible.
// weegee-scream.mp3 fires exactly 1 s after the animation starts.
let weegeeBanishAnim = { active: false, t: 0, duration: 3.2, screamPlayed: false };
const WEEGEE_BANISH_DURATION = 3.2;

// The glowing ring mesh spawned on the floor during the banishing animation.
// Created once in initThree, toggled visible when needed.
let banishCircleMesh = null;
// Pool of aurora-ray ribbon meshes — continuously spawned from the ring edge,
// each rising upward as a broad, slow-undulating curtain of light (red
// aurora borealis look) rather than a sharp spike, over its lifetime.
let banishTendrils = [];        // array of {mesh, age, life, angle, wavePhase, riseSpeed}
const BANISH_TENDRIL_POOL = 28; // max simultaneous aurora-ray strands
let banishSpawnAccum = 0;       // accumulator for spawn timing
let banishLight = null;         // red PointLight that casts actual glow
let banishScreamAudio = null;

// Plain <img> elements used for 2D canvas drawing of hands & held items
// (separate from the THREE.Texture objects used in the 3D scene).
let marioHandLeftImg, marioHandRightImg;
let itemIconImages = {};

const ITEM_DATA = {
  dew: { id: 'dew', name: 'Mountain Dew', icon: 'Item-Sprites/mtndewbottle.png', texture: null },
  battery: { id: 'battery', name: 'Battery', icon: 'Item-Sprites/flashlightbattery.png', texture: null },
  stake: { id: 'stake', name: 'Weegee Banishing Stake', icon: 'Item-Sprites/weegeestake.png', texture: null },
  banana: { id: 'banana', name: 'Banana Peel', icon: 'Item-Sprites/banana-peel.png', texture: null },
  plunger: { id: 'plunger', name: 'Plunger', icon: 'Item-Sprites/plunger-item.png', texture: null }
};

// ── Banana Peel System ────────────────────────────────────────────────────────
// Thrown banana peel entities that lay on the floor and cause slipping.
// Structure: { mesh, x, z, velX, velZ, landed, age }
let bananaPeelEntities = [];

// Player slip state
let playerSlipState = {
  active: false,
  t: 0,
  duration: 3.0,  // stay down 3 seconds
  pitchStart: 0,
  yawLock: 0,
  rollDir: 1,      // which side the player falls toward (+1 / -1)
  roll: 0,         // current camera roll (rotation.z) while slipping
  heightDrop: 0,   // current camera height offset while slipping
  fallSoundPlayed: false,
  mamafckerPlayed: false
};

// Weegee slip state
let weegeeSlipState = {
  active: false,
  t: 0,
  duration: 3.0,  // stay down 3 seconds
  fallSoundPlayed: false,
  // Weegee pivots from 0° (flat on back) back to 90° (standing)
};

// Banana throw animation state
let bananThrowAnim = { active: false, t: 0, duration: 0.55 };
const BANANA_THROW_PHASES = { riseEnd: 0.25, releaseEnd: 0.55 };

// Audio for banana peel
let bananaPeelSlipAudio = null;
let bananaPeelFallAudio = null;
let weegeeScreamBananaAudio = null;
let playerMamafckerAudio = null;

function initBananaAudio() {
  if (!bananaPeelSlipAudio) {
    bananaPeelSlipAudio = new Audio('Audio/Item/banana-peel-slip.mp3');
    bananaPeelSlipAudio.volume = 1;
  }
  if (!bananaPeelFallAudio) {
    bananaPeelFallAudio = new Audio('Audio/Item/banana-peel-fall.mp3');
    bananaPeelFallAudio.volume = 1;
  }
  if (!weegeeScreamBananaAudio) {
    weegeeScreamBananaAudio = new Audio('Audio/Weegee/weegee-scream.mp3');
    weegeeScreamBananaAudio.volume = 1;
  }
  if (!playerMamafckerAudio) {
    playerMamafckerAudio = new Audio('Audio/Player/player-mamafcker.mp3'); // a sentence mix of Mario saying "Mamafucker" with a funny intentional censor beep on the letter "u" in the middle of the word "fucker" to amplify how angry it must sound
    playerMamafckerAudio.volume = 1;
  }
}

function playBananaSlipSound() {
  initBananaAudio();
  try { bananaPeelSlipAudio.currentTime = 0; bananaPeelSlipAudio.play().catch(()=>{}); } catch(e) {}
}
function playBananaFallSound() {
  initBananaAudio();
  try { bananaPeelFallAudio.currentTime = 0; bananaPeelFallAudio.play().catch(()=>{}); } catch(e) {}
}
function playWeegeeBananaScream() {
  initBananaAudio();
  try { weegeeScreamBananaAudio.currentTime = 0; weegeeScreamBananaAudio.play().catch(()=>{}); } catch(e) {}
}
function playPlayerMamafckerSound() {
  initBananaAudio();
  try { playerMamafckerAudio.currentTime = 0; playerMamafckerAudio.play().catch(()=>{}); } catch(e) {}
}

// ── Plunger System ────────────────────────────────────────────────────────────
// Thrown plunger entities arc through the air under real gravity (a much
// bigger, higher arc than the banana peel's flat slide) and stick to
// whatever they hit first — wall, floor, ceiling, or Weegee.
// Structure: { mesh, x, y, z, velX, velY, velZ, state, age, stuckAge }
// state: 'flying' | 'stuckWall' | 'stuckFloor' | 'stuckCeiling' | 'stuckWeegee'
let plungerEntities = [];
let plungerProjectileTexture = null;

const PLUNGER_GRAVITY = 9.8;
const PLUNGER_SPEED_H = 6.0;     // horizontal throw speed
const PLUNGER_SPEED_V = 5.0;     // initial upward speed — gives the big arc
const PLUNGER_FLOOR_Y = 0.06;
const PLUNGER_CEILING_Y = 2.94;
const PLUNGER_WEEGEE_RADIUS_SQ = 0.85 * 0.85;
const PLUNGER_SURFACE_LIFETIME = 10.0; // wall/floor/ceiling stuck plungers despawn after 10s
const PLUNGER_WEEGEE_STUCK_MIN = 3.0;
const PLUNGER_WEEGEE_STUCK_MAX = 6.0;

// Weegee plunger-stuck state — while active, Weegee is completely frozen
// (no movement, no billboarding, no kills) exactly as he was the instant
// he got hit, with the plunger stuck to him.
let weegeePlungerStuck = { active: false, t: 0, duration: 0 };

// Audio for the plunger
let plungerHitAudio = null;
let weegeeEhAudio = null;

function initPlungerAudio() {
  if (!plungerHitAudio) {
    plungerHitAudio = new Audio('Audio/Item/plunger-projectile-hit.mp3');
    plungerHitAudio.volume = 1;
  }
  if (!weegeeEhAudio) {
    weegeeEhAudio = new Audio('Audio/Weegee/weegee-eh.mp3');
    weegeeEhAudio.volume = 1;
  }
}
function playPlungerHitSound() {
  initPlungerAudio();
  try { plungerHitAudio.currentTime = 0; plungerHitAudio.play().catch(()=>{}); } catch(e) {}
}
function playWeegeeEhSound() {
  initPlungerAudio();
  try { weegeeEhAudio.currentTime = 0; weegeeEhAudio.play().catch(()=>{}); } catch(e) {}
}

// ── Mountain Dew chugging sound ─────────────────────────────────────────────
// Plays for exactly the "chugging" phase of the drink-use animation (see
// DEW_PHASES.riseEnd -> DEW_PHASES.chugEnd in the itemUseAnim update loop)
// and is cut off the instant that phase ends, whether it ends naturally or
// the animation/game state gets reset early (death, restart, quit, floor
// change, etc).
let dewChugAudio = null;

function initDewChugAudio() {
  if (!dewChugAudio) {
    dewChugAudio = new Audio('Audio/Item/dew-chug.mp3');
    dewChugAudio.volume = 1;
  }
}
function playDewChugSound() {
  initDewChugAudio();
  try { dewChugAudio.currentTime = 0; dewChugAudio.play().catch(()=>{}); } catch(e) {}
}
function stopDewChugSound() {
  if (!dewChugAudio) return;
  try { dewChugAudio.pause(); dewChugAudio.currentTime = 0; } catch(e) {}
}

// ── Post speed-boost "haha" sound ───────────────────────────────────────────
// Fires exactly 1 second after the stamina bar hits full and the Mountain
// Dew speed boost gets enabled. hahaPendingTimer counts down that 1 second
// in the main game loop (see updateHahaPending()) so it naturally pauses
// along with everything else if the game is paused, and gets cancelled by
// resetHahaPending() wherever the run state gets reset early.
let hahaAudio = null;
let hahaPendingTimer = -1;

function initHahaAudio() {
  if (!hahaAudio) {
    hahaAudio = new Audio('Audio/Player/haha.mp3');
    hahaAudio.volume = 1;
  }
}
function playHahaSound() {
  initHahaAudio();
  try { hahaAudio.currentTime = 0; hahaAudio.play().catch(()=>{}); } catch(e) {}
}
function updateHahaPending(dt) {
  if (hahaPendingTimer < 0) return;
  hahaPendingTimer -= dt;
  if (hahaPendingTimer <= 0) {
    hahaPendingTimer = -1;
    playHahaSound();
  }
}
function resetHahaPending() {
  hahaPendingTimer = -1;
}

let bgMusic = new Audio('Audio/Music/weegees-mansion-theme.wav');
bgMusic.loop = true;

let footstepsAudio = new Audio('Audio/Player/footsteps.mp3');
footstepsAudio.loop = true;
let isWalking = false;

let laughAudio = new Audio('Audio/Death-Victory/weegee-evil-laugh.wav');

let yayAudio = new Audio('Audio/Death-Victory/yay.mp3');

// ─── Weegee Spatial Audio System ────────────────────────────────────────────
// To add more voice lines in the future, simply push more filenames into this array.
const WEEGEE_VOICE_LINES = [
  'Audio/Weegee/go-weegee.mp3',
  'Audio/Weegee/obey-weegee-destroy-mario.mp3',
  'Audio/Weegee/weegee-isolated.mp3',
  'Audio/Weegee/weegee-scream.mp3',
  'Audio/Weegee/im-weegee-number-1.mp3',
  'Audio/Weegee/weegee-hurry-up-already-eh.mp3',
  'Audio/Weegee/weegee-call-out-mario.mp3',
  'Audio/Weegee/weegee-weegee-oh-yeah-oh-yeah.mp3'
];

// Distance at which volume reaches 0 (world units).
const WEEGEE_AUDIO_MAX_DIST = 22;
// Distance at which echo effect reaches full strength (world units).
// Echo starts blending in at WEEGEE_ECHO_START_DIST and is fully wet at WEEGEE_AUDIO_MAX_DIST.
const WEEGEE_ECHO_START_DIST = 6;
// Minimum gap (seconds) between voice line triggers.
const WEEGEE_AUDIO_COOLDOWN_MIN = 8;
const WEEGEE_AUDIO_COOLDOWN_MAX = 20;

// ── Web Audio API echo/reverb graph (built once, shared across all clips) ────
//
//  MediaElementSourceNode  ──► dryGain  ──────────────────────────────► masterGain ──► destination
//                          └─► echoSend ──► delayNode ──► echoFeedback ─┘
//                                              │
//                                              └─► (feedback tap) ──► delayNode  (loop)
//
// dryGain.gain   : 1  →  0  as distance increases   (direct signal)
// echoSend.gain  : 0  →  1  as distance increases   (echo/reverb send)
// echoFeedback   : fixed ~0.38, controls how many echoes decay away
// delayNode.delayTime : fixed 0.30 s  (time between each echo repeat)

let weegeeAudioCtx = null;        // AudioContext — created on first play to satisfy autoplay policy
let weegeeEchoDelay = null;       // DelayNode
let weegeeEchoFeedback = null;    // GainNode (feedback loop inside the delay)
let weegeeEchoWetGain = null;     // GainNode (overall wet level out of the delay chain)
let weegeeMasterGain = null;      // GainNode (master volume = distance-based vol)

// Per-clip nodes (recreated each voice line)
let weegeeSourceNode = null;      // MediaElementSourceNode for the current Audio element
let weegeeDryGain = null;         // GainNode — dry (direct) signal level
let weegeeEchoSend = null;        // GainNode — how much of the signal enters the echo chain

let weegeeVoiceAudio = null;      // currently loaded Audio element
let weegeeVoiceCooldown = WEEGEE_AUDIO_COOLDOWN_MIN + Math.random() * (WEEGEE_AUDIO_COOLDOWN_MAX - WEEGEE_AUDIO_COOLDOWN_MIN);
let weegeeVoicePlaying = false;

// Builds the shared (persistent) echo graph inside the AudioContext.
// Call this once after the AudioContext is created.
function _buildWeegeeEchoGraph() {
  const ctx = weegeeAudioCtx;

  // Master output gain (controls overall clip volume based on distance)
  weegeeMasterGain = ctx.createGain();
  weegeeMasterGain.gain.value = 1;
  weegeeMasterGain.connect(ctx.destination);

  // Delay node — 300 ms between echoes, classic haunted-hallway feel
  weegeeEchoDelay = ctx.createDelay(2.0);
  weegeeEchoDelay.delayTime.value = 0.30;

  // Feedback gain — keeps echoes bouncing; ~0.38 gives 3-4 audible repeats
  weegeeEchoFeedback = ctx.createGain();
  weegeeEchoFeedback.gain.value = 0.38;

  // Wet output gain from the echo chain into master
  weegeeEchoWetGain = ctx.createGain();
  weegeeEchoWetGain.gain.value = 0; // starts silent; driven by distance

  // Wire the delay feedback loop
  weegeeEchoDelay.connect(weegeeEchoFeedback);
  weegeeEchoFeedback.connect(weegeeEchoDelay);  // loop

  // Delay chain output → wet gain → master
  weegeeEchoDelay.connect(weegeeEchoWetGain);
  weegeeEchoWetGain.connect(weegeeMasterGain);
}

// Creates per-clip source + dry/send nodes wired into the shared echo graph.
// Must be called after weegeeAudioCtx and the echo graph exist.
function _connectVoiceLineToGraph(audioEl) {
  // Disconnect previous clip's nodes if they're still dangling
  if (weegeeSourceNode) {
    try { weegeeSourceNode.disconnect(); } catch(e) {}
  }
  if (weegeeDryGain) {
    try { weegeeDryGain.disconnect(); } catch(e) {}
  }
  if (weegeeEchoSend) {
    try { weegeeEchoSend.disconnect(); } catch(e) {}
  }

  const ctx = weegeeAudioCtx;
  weegeeSourceNode = ctx.createMediaElementSource(audioEl);

  // Dry path: source → dryGain → master
  weegeeDryGain = ctx.createGain();
  weegeeDryGain.gain.value = 1;
  weegeeSourceNode.connect(weegeeDryGain);
  weegeeDryGain.connect(weegeeMasterGain);

  // Echo send path: source → echoSend → delayNode (→ feedback loop → wetGain → master)
  weegeeEchoSend = ctx.createGain();
  weegeeEchoSend.gain.value = 0;
  weegeeSourceNode.connect(weegeeEchoSend);
  weegeeEchoSend.connect(weegeeEchoDelay);
}

// Calculates echo wet/dry mix (0..1) from distance.
// Returns 0 when Weegee is close, 1 at max distance.
function _echoAmountFromDist(dist) {
  if (dist <= WEEGEE_ECHO_START_DIST) return 0;
  return Math.min(1, (dist - WEEGEE_ECHO_START_DIST) / (WEEGEE_AUDIO_MAX_DIST - WEEGEE_ECHO_START_DIST));
}

// Applies distance-based volume AND echo mix every frame while a clip is playing.
function _applyWeegeeDistanceAudio(dist) {
  const vol = Math.max(0, 1 - dist / WEEGEE_AUDIO_MAX_DIST);
  const echo = _echoAmountFromDist(dist);

  if (weegeeMasterGain)   weegeeMasterGain.gain.value   = vol;
  if (weegeeDryGain)      weegeeDryGain.gain.value      = 1 - echo * 0.75; // dry fades but never fully mutes
  if (weegeeEchoSend)     weegeeEchoSend.gain.value     = echo;
  if (weegeeEchoWetGain)  weegeeEchoWetGain.gain.value  = echo * 0.85;
}

function pickWeegeeVoiceLine() {
  const file = WEEGEE_VOICE_LINES[Math.floor(Math.random() * WEEGEE_VOICE_LINES.length)];
  weegeeVoiceAudio = new Audio(file);
  // Volume is now controlled by the Web Audio graph, not the element itself.
  weegeeVoiceAudio.volume = 1;
  weegeeVoiceAudio.onended = () => {
    weegeeVoicePlaying = false;
    // Schedule next trigger after a fresh random cooldown.
    weegeeVoiceCooldown = WEEGEE_AUDIO_COOLDOWN_MIN + Math.random() * (WEEGEE_AUDIO_COOLDOWN_MAX - WEEGEE_AUDIO_COOLDOWN_MIN);
  };
}

function updateWeegeeVoice(dt) {
  // Only play while Weegee is active, not banished, and the game is running.
  if (!weegeeActive || isWeegeeBanished || isDead || !gameStarted || isPaused) {
    if (weegeeVoiceAudio && weegeeVoicePlaying) {
      weegeeVoiceAudio.pause();
      weegeeVoicePlaying = false;
    }
    return;
  }

  const dx = weegee.x - player.x;
  const dz = weegee.z - player.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  // Update volume + echo mix of any currently playing clip based on distance.
  if (weegeeVoicePlaying && weegeeVoiceAudio) {
    _applyWeegeeDistanceAudio(dist);
    return;
  }

  // Count down to next trigger.
  weegeeVoiceCooldown -= dt;
  if (weegeeVoiceCooldown > 0) return;

  // ── Fire a new voice line ──────────────────────────────────────────────────
  const vol = Math.max(0, 1 - dist / WEEGEE_AUDIO_MAX_DIST);
  if (vol <= 0) {
    // Too far away — skip this trigger and try again after cooldown.
    weegeeVoiceCooldown = WEEGEE_AUDIO_COOLDOWN_MIN + Math.random() * (WEEGEE_AUDIO_COOLDOWN_MAX - WEEGEE_AUDIO_COOLDOWN_MIN);
    return;
  }

  pickWeegeeVoiceLine();

  // Lazily create the AudioContext + echo graph on the very first play.
  // This satisfies browser autoplay policy (requires a user gesture first,
  // which the Start button provides before Weegee ever spawns).
  if (!weegeeAudioCtx) {
    weegeeAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    _buildWeegeeEchoGraph();
  }
  // Resume context if it was suspended (some browsers suspend after inactivity).
  if (weegeeAudioCtx.state === 'suspended') {
    weegeeAudioCtx.resume();
  }

  _connectVoiceLineToGraph(weegeeVoiceAudio);
  _applyWeegeeDistanceAudio(dist);

  weegeeVoiceAudio.play().catch(err => console.warn('Weegee voice play blocked:', err));
  weegeeVoicePlaying = true;
}
// ─────────────────────────────────────────────────────────────────────────────

const WEEGEE_IMGS = {
  front: 'Weegee-Sprites/Weegee_Front.png',
  back: 'Weegee-Sprites/Weegee_Back.png',
  left: 'Weegee-Sprites/Weegee_Left.png',
  right: 'Weegee-Sprites/Weegee_Right.png'
};

function generateMaze(w, h) {
  const grid = Array.from({length: h}, () => Array(w).fill(0xF));
  const visited = Array.from({length: h}, () => Array(w).fill(false));
  function carve(cx, cy) {
    visited[cy][cx] = true;
    const dirs = [
      [-1, 0, 0, 1], 
      [1, 0, 1, 0],  
      [0, -1, 2, 3], 
      [0, 1, 3, 2]   
    ];
    dirs.sort(() => Math.random()-0.5);
    for (const [dy,dx,bit,opp] of dirs) {
      const nx=cx+dx, ny=cy+dy;
      if(nx>=0&&nx<w&&ny>=0&&ny<h&&!visited[ny][nx]){
        grid[cy][cx] &= ~(1<<bit);
        grid[ny][nx] &= ~(1<<opp);
        carve(nx,ny);
      }
    }
  }
  carve(0,0);
  return grid;
}

// Scale the UV coordinates of a BoxGeometry so a tiling texture repeats
// proportionally instead of stretching. Each face's UVs are multiplied by
// the real-world size of that face divided by the tile size (2 world units).
const UV_TILE = 2;
function scaleBoxUVs(geo, w, h, d) {
  // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
  // Each face is 2 triangles = 4 vertices in the non-indexed BufferGeometry.
  // Three.js r128 BoxGeometry IS indexed; we work on the uv attribute directly.
  const uv = geo.attributes.uv;
  const faceSizes = [
    [d, h], // +X face: width=d, height=h
    [d, h], // -X face
    [w, d], // +Y face
    [w, d], // -Y face
    [w, h], // +Z face
    [w, h], // -Z face
  ];
  // Each face has 4 unique UV entries (BoxGeometry groups them 4 per face)
  for (let face = 0; face < 6; face++) {
    const [fw, fh] = faceSizes[face];
    const su = fw / UV_TILE;
    const sv = fh / UV_TILE;
    const base = face * 4;
    for (let i = 0; i < 4; i++) {
      uv.setXY(base + i, uv.getX(base + i) * su, uv.getY(base + i) * sv);
    }
  }
  uv.needsUpdate = true;
}

function buildFloorGeometry(maze) {
  const group = new THREE.Group();
  
  // Two wall materials, identical except for their polygon-offset amount.
  // Interior/outer wall segments are deliberately extended by `wt` at each
  // end so adjoining walls overlap slightly and never leave a gap at
  // corners — but that overlap means two perpendicular wall boxes share
  // near-coincident surfaces right at the seam, which z-fights (flickers)
  // if both use the same depth bias. Giving the two orientations distinct
  // depth bias makes one of them consistently win the depth test at every
  // seam, so the flicker goes away without touching any geometry.
  //
  // Only polygonOffsetUnits (a flat depth bias) is used here, NOT
  // polygonOffsetFactor — factor scales with how edge-on a surface is to
  // the camera, so a wall seen nearly end-on (e.g. looking straight down a
  // hallway) gets a hugely exaggerated offset and visibly "detaches" from
  // the corner. Units alone give a small, constant, angle-independent bias
  // that's still enough to resolve the tie at the seam.
  const wallMatNS = new THREE.MeshStandardMaterial({map: wallTex, roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: 1});
  const wallMatEW = new THREE.MeshStandardMaterial({map: wallTex, roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -1});
  const floorMat = new THREE.MeshStandardMaterial({map: floorTex, roughness: 1, metalness: 0});
  const ceilMat = new THREE.MeshStandardMaterial({map: ceilingTex, roughness: 1, metalness: 0});
  
  const totalW = MAZE_W * CELL;
  const totalH = MAZE_H * CELL;

  const floorGeo = new THREE.PlaneGeometry(totalW, totalH);
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI/2;
  floorMesh.position.set(totalW/2, 0, totalH/2);
  group.add(floorMesh);
  
  const ceilMesh = new THREE.Mesh(floorGeo, ceilMat);
  ceilMesh.rotation.x = Math.PI/2;
  ceilMesh.position.set(totalW/2, 3, totalH/2);
  group.add(ceilMesh);

  const wallSegs = [];
  const wh = 3, wt = 0.18;
  for (let row=0; row<MAZE_H; row++) {
    for (let col=0; col<MAZE_W; col++) {
      const cell = maze[row][col];
      const cx = col*CELL, cz = row*CELL;
      if ((cell & 1) && row > 0) { 
        const g = new THREE.BoxGeometry(CELL+wt, wh, wt);
        scaleBoxUVs(g, CELL+wt, wh, wt);
        const m = new THREE.Mesh(g, wallMatNS);
        m.position.set(cx + CELL/2, wh/2, cz);
        group.add(m); wallSegs.push({x:cx - wt/2, z:cz - wt/2, w:CELL + wt, d:wt});
      }
      if ((cell & 4) && col > 0) { 
        const g = new THREE.BoxGeometry(wt, wh, CELL+wt);
        scaleBoxUVs(g, wt, wh, CELL+wt);
        const m = new THREE.Mesh(g, wallMatEW);
        m.position.set(cx, wh/2, cz + CELL/2);
        group.add(m); wallSegs.push({x:cx - wt/2, z:cz - wt/2, w:wt, d:CELL + wt});
      }
    }
  }
  // ── Outer walls: segmented per maze-cell so window-wall.png can be placed ──
  // We build 4 sides as individual CELL-wide segments. Each segment is one maze
  // cell wide. A random subset (max 10 total per floor) get the window texture.
  // Corners (col/row 0 and MAZE_W/H-1) are never windowed — they look weird.

  // Window wall front-face material — lit, transparent, alphaTest punches out
  // the glass panes so the skybox is visible through them.
  const windowWallFaceMat = new THREE.MeshStandardMaterial({
    map: windowWallTex,
    transparent: true,
    alphaTest: 0.15,
    roughness: 1,
    metalness: 0,
    side: THREE.FrontSide,
  });

  // Collect all candidate outer-wall segment positions.
  // Each entry: { side, index } where index is the maze col or row along that side.
  // We skip index 0 and the last on every side to avoid corner weirdness.
  const windowCandidates = [];
  for (let col = 1; col < MAZE_W - 1; col++) {
    windowCandidates.push({ side: 'north', index: col });
    windowCandidates.push({ side: 'south', index: col });
  }
  for (let row = 1; row < MAZE_H - 1; row++) {
    windowCandidates.push({ side: 'west', index: row });
    windowCandidates.push({ side: 'east', index: row });
  }
  windowCandidates.sort(() => Math.random() - 0.5);
  const windowSlots = new Set();
  const maxWindows = 10;
  for (let i = 0; i < Math.min(maxWindows, windowCandidates.length); i++) {
    windowSlots.add(`${windowCandidates[i].side}_${windowCandidates[i].index}`);
  }

  // Helper: builds one outer wall segment.
  // Non-window slots: solid segMat box (collision covered by wallSegs strips).
  // Window slots: NO solid box (would block skybox via depth buffer) — just a
  //   DoubleSide transparent plane placed at the wall face. Collision still works
  //   because wallSegs full-strip AABBs are pushed after the loop regardless.
  function addOuterSeg(side, index, cx, cz) {
    const isNS = (side === 'north' || side === 'south');
    const boxW = isNS ? CELL + wt : wt;
    const boxD = isNS ? wt : CELL + wt;
    const isWindow = windowSlots.has(`${side}_${index}`);
    // Match the same NS/EW material split used for interior walls, so an
    // outer segment overlapping an interior wall's end (or another outer
    // segment) at a corner resolves the same deterministic way.
    const segMat = isNS ? wallMatNS : wallMatEW;

    if (!isWindow) {
      // Solid opaque box — normal wall segment
      const g = new THREE.BoxGeometry(boxW, wh, boxD);
      scaleBoxUVs(g, boxW, wh, boxD);
      const m = new THREE.Mesh(g, segMat);
      m.position.set(cx, wh / 2, cz);
      group.add(m);
      return;
    }

    // Window segment: full-thickness box matching regular walls.
    // Per-face material array: only the inward-facing face gets the window
    // texture (alpha-tested for glass cutouts); all other faces use segMat
    // so the wall is solid, properly thick, and fully lit.
    //
    // BoxGeometry face order: +X(0), -X(1), +Y(2), -Y(3), +Z(4), -Z(5)
    // N/S walls are thin in Z: interior = +Z(4) for north, -Z(5) for south.
    // E/W walls are thin in X: interior = +X(0) for west,  -X(1) for east.
    const pg = new THREE.BoxGeometry(boxW, wh, boxD);
    scaleBoxUVs(pg, boxW, wh, boxD);

    // Reset the window face's UVs to exactly 0→1 so the texture fits once,
    // flush across the whole segment — undoing the tiling scale applied above.
    // BoxGeometry UV layout: 4 vertices per face, stored at base = faceIndex * 4.
    // Default BoxGeometry UV corners (before any scaling): (0,1),(1,1),(0,0),(1,0)
    const faceMats = [segMat, segMat, segMat, segMat, segMat, segMat];
    let windowFaceIdx;
    if (side === 'north')      { faceMats[4] = windowWallFaceMat; windowFaceIdx = 4; }
    else if (side === 'south') { faceMats[5] = windowWallFaceMat; windowFaceIdx = 5; }
    else if (side === 'west')  { faceMats[0] = windowWallFaceMat; windowFaceIdx = 0; }
    else                       { faceMats[1] = windowWallFaceMat; windowFaceIdx = 1; } // east

    // Restore default (fit-once) UVs on just the window face
    const uv = pg.attributes.uv;
    const base = windowFaceIdx * 4;
    uv.setXY(base + 0, 0, 1);
    uv.setXY(base + 1, 1, 1);
    uv.setXY(base + 2, 0, 0);
    uv.setXY(base + 3, 1, 0);
    uv.needsUpdate = true;

    const pm = new THREE.Mesh(pg, faceMats);
    pm.position.set(cx, wh / 2, cz);
    group.add(pm);
  }

  // North outer wall — z = 0, one segment per column
  for (let col = 0; col < MAZE_W; col++) {
    addOuterSeg('north', col, col * CELL + CELL / 2, 0);
  }
  wallSegs.push({ x: -wt / 2, z: -wt / 2, w: totalW + wt, d: wt });

  // South outer wall — z = totalH
  for (let col = 0; col < MAZE_W; col++) {
    addOuterSeg('south', col, col * CELL + CELL / 2, totalH);
  }
  wallSegs.push({ x: -wt / 2, z: totalH - wt / 2, w: totalW + wt, d: wt });

  // West outer wall — x = 0, one segment per row
  for (let row = 0; row < MAZE_H; row++) {
    addOuterSeg('west', row, 0, row * CELL + CELL / 2);
  }
  wallSegs.push({ x: -wt / 2, z: -wt / 2, w: wt, d: totalH + wt });

  // East outer wall — x = totalW
  for (let row = 0; row < MAZE_H; row++) {
    addOuterSeg('east', row, totalW, row * CELL + CELL / 2);
  }
  wallSegs.push({ x: totalW - wt / 2, z: -wt / 2, w: wt, d: totalH + wt });

  const stairX = (MAZE_W-2)*CELL + CELL/2;
  const stairZ = (MAZE_H-2)*CELL + CELL/2;
  const spiralMat = new THREE.MeshLambertMaterial({color:0x888888});
  const postGeo = new THREE.CylinderGeometry(0.15, 0.15, 2.6, 8);
  const postMesh = new THREE.Mesh(postGeo, spiralMat);
  postMesh.position.set(stairX, 1.3, stairZ);
  group.add(postMesh);
  const stepCount = 14;
  const stepRadius = 1.2;
  const stepGeo = new THREE.BoxGeometry(1.3, 0.12, 0.5);
  for (let i = 0; i < stepCount; i++) {
    const stepMesh = new THREE.Mesh(stepGeo, spiralMat);
    const angle = i * (Math.PI * 2 / 8);
    const y = 0.1 + i * 0.18;
    stepMesh.position.set(
      stairX + Math.cos(angle) * stepRadius * 0.5,
      y,
      stairZ + Math.sin(angle) * stepRadius * 0.5
    );
    stepMesh.rotation.y = -angle;
    group.add(stepMesh);
  }

  return {group, wallSegs, stairX, stairZ};
}

function initThree() {
  const canvas = document.getElementById('gameCanvas');
  renderer = new THREE.WebGLRenderer({canvas, antialias: false});
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000);
  renderer.fog = new THREE.Fog(0x000000, 1, 22);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050301, 0.16);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 90);
  clock = new THREE.Clock();

  scene.add(camera);

  const ambient = new THREE.AmbientLight(0x0d0702, 0.08);
  scene.add(ambient);
  const pt = new THREE.PointLight(0xff6600, 0.2, 6);
  pt.position.set(2,2,2);
  scene.add(pt);

  flashlight = new THREE.SpotLight(0xfffcaa, 4.5, 18, Math.PI/5.5, 0.55, 1.0);
  scene.add(flashlight);
  scene.add(flashlight.target);

  const wGeo = new THREE.PlaneGeometry(1.6, 2.8);
  const wMat = new THREE.MeshLambertMaterial({transparent: true, alphaTest: 0.5, side: THREE.DoubleSide});
  weegeePlane = new THREE.Mesh(wGeo, wMat);
  // YXZ order so facing-yaw and the flat-on-back pivot compose correctly
  // (default XYZ order skews the plane whenever both are nonzero at once).
  weegeePlane.rotation.order = 'YXZ';
  weegeePlane.position.y = 1.4;
  scene.add(weegeePlane);
  weegeePlane.visible = false;

  // ── Satanic banish circle + rising rays ─────────────────────────────────
  // A glowing red ring on the floor, plus BANISH_RAY_COUNT vertical ray
  // planes arranged around the ring radius, each rising upward.
  {
    const ringGeo = new THREE.RingGeometry(0.72, 1.05, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 2.8,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    banishCircleMesh = new THREE.Mesh(ringGeo, ringMat);
    banishCircleMesh.position.y = 0.01;
    banishCircleMesh.visible = false;
    scene.add(banishCircleMesh);

    // ── Aurora-ray ribbon pool ───────────────────────────────────────────────
    // Pre-build BANISH_TENDRIL_POOL ribbon meshes (all hidden at start).
    // Each strand is a broad vertical curtain: local X = width of ribbon,
    // local Y = rises upward per-vertex, local Z = lateral sway.
    // The mesh is placed AT the ring edge and pointed straight up (+Y world),
    // so we don't rely on mesh rotation — we write world-space XZ into vertices
    // directly each frame. A per-vertex color gradient (warm gold at the base
    // fading through saturated red to deep wine-red at the tip) plus additive
    // blending gives the soft, glowing aurora-borealis look, just in red.
    const T_SEGS   = 32;   // segments along the height — smooth curtain curve
    const T_HALF_W = 0.16; // base half-width of each ribbon (broad curtain, not a spike)
    for (let i = 0; i < BANISH_TENDRIL_POOL; i++) {
      const vCount    = (T_SEGS + 1) * 2;
      const positions = new Float32Array(vCount * 3);
      const uvArr     = new Float32Array(vCount * 2);
      const colorArr  = new Float32Array(vCount * 3);
      const indices   = [];
      for (let s = 0; s <= T_SEGS; s++) {
        const topIdx = s * 2, botIdx = s * 2 + 1;
        positions[topIdx * 3]     = -T_HALF_W; positions[topIdx * 3 + 1] = 0; positions[topIdx * 3 + 2] = 0;
        positions[botIdx * 3]     =  T_HALF_W; positions[botIdx * 3 + 1] = 0; positions[botIdx * 3 + 2] = 0;
        uvArr[topIdx * 2] = 0; uvArr[topIdx * 2 + 1] = s / T_SEGS;
        uvArr[botIdx * 2] = 1; uvArr[botIdx * 2 + 1] = s / T_SEGS;
        if (s < T_SEGS) { const a=topIdx,b=botIdx,c=topIdx+2,d=botIdx+2; indices.push(a,b,c,b,d,c); }
      }
      const tGeo = new THREE.BufferGeometry();
      tGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      tGeo.setAttribute('uv',       new THREE.BufferAttribute(uvArr, 2));
      tGeo.setAttribute('color',    new THREE.BufferAttribute(colorArr, 3));
      tGeo.setIndex(indices);
      // MeshBasicMaterial + additive blending + vertex colors: overlapping
      // strands brighten where they cross, giving the soft glowing-veil
      // quality of a real aurora instead of a flat lit ribbon.
      const tMat = new THREE.MeshBasicMaterial({
        color: 0xffffff, vertexColors: true,
        transparent: true, opacity: 0, side: THREE.DoubleSide,
        depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(tGeo, tMat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      scene.add(mesh);
      // userData holds per-instance state; age/life managed at runtime
      mesh.userData = {
        active: false, age: 0, life: 1, angle: 0, wavePhase: 0, driftPhase: 0,
        waveFreq: 1.5, waveSpeed: 0.7, riseSpeed: 1, halfWidth: T_HALF_W, T_SEGS, T_HALF_W
      };
      banishTendrils.push(mesh);
    }

    // ── Red PointLight for actual scene illumination ─────────────────────
    banishLight = new THREE.PointLight(0xff1100, 0, 6);
    banishLight.position.set(0, 0.5, 0);
    banishLight.visible = false;
    scene.add(banishLight);
  }

  const loader = new THREE.TextureLoader();

  // Track how many scene textures still need to load before the floor can be built.
  // Weegee's directional PNGs use their own callback path and are excluded here.
  const SCENE_TEX_COUNT = 5;
  let sceneTexLoaded = 0;
  function onSceneTexLoaded() {
    sceneTexLoaded++;
    if (sceneTexLoaded === SCENE_TEX_COUNT) {
      sceneTexturesReady = true;
      buildFloorScene(0);
      // If the player already clicked "ENTER THE MANSION" while textures
      // (esp. the skybox, which is added to the scene the moment IT loads,
      // independently of the walls/floor/ceiling loaders) were still in
      // flight, finish revealing the mansion now that everything is
      // actually ready instead of back when there was no floor geometry.
      if (pendingGameStart) {
        pendingGameStart = false;
        startGame();
      }
    }
  }

  loader.load('Textures/wall.png', (tex) => {
    wallTex = tex;
    wallTex.wrapS = THREE.RepeatWrapping;
    wallTex.wrapT = THREE.RepeatWrapping;
    onSceneTexLoaded();
  });

  loader.load('Textures/floor.png', (tex) => {
    floorTex = tex;
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(MAZE_W, MAZE_H);
    onSceneTexLoaded();
  });

  loader.load('Textures/ceiling.png', (tex) => {
    ceilingTex = tex;
    ceilingTex.wrapS = THREE.RepeatWrapping;
    ceilingTex.wrapT = THREE.RepeatWrapping;
    // The ceiling is one full-grid plane (same size as the floor), so repeat
    // by MAZE_W x MAZE_H to get one tile per maze cell, matching the floor.
    ceilingTex.repeat.set(MAZE_W, MAZE_H);
    onSceneTexLoaded();
  });

  loader.load('Textures/skybox.png', (tex) => {
    skyboxTex = tex;
    skyboxTex.wrapS = THREE.RepeatWrapping;
    skyboxTex.wrapT = THREE.RepeatWrapping;

    // ── Skybox ──────────────────────────────────────────────────────────────
    // A large sphere surrounding the entire play area, rendered on the inside.
    // Radius (45) comfortably encloses the whole maze (half-diagonal ≈ 31)
    // while staying within the camera's far plane (90) from any position.
    const skyGeo = new THREE.SphereGeometry(45, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyboxTex,
      side: THREE.BackSide,
      fog: false,        // skybox ignores scene fog
      depthWrite: false, // always rendered behind everything
    });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    // Keep it centred on the maze at all times by parenting to the camera later
    // (we just set it to the approximate centre of the maze for now).
    skyMesh.position.set(MAZE_W * CELL / 2, 0, MAZE_H * CELL / 2);
    skyMesh.name = 'skybox';
    skyMesh.renderOrder = -1;  // draw before all other geometry
    scene.add(skyMesh);

    onSceneTexLoaded();
  });

  loader.load('Textures/window-wall.png', (tex) => {
    windowWallTex = tex;
    // ClampToEdge: the plane uses UV 0-1 exactly matching the texture, no repeat needed.
    windowWallTex.wrapS = THREE.ClampToEdgeWrapping;
    windowWallTex.wrapT = THREE.ClampToEdgeWrapping;
    onSceneTexLoaded();
  }, undefined, () => {
    // Fallback: if texture missing, just use regular wall so game doesn't stall
    windowWallTex = wallTex;
    onSceneTexLoaded();
  });

  ITEM_DATA.dew.texture = loader.load(ITEM_DATA.dew.icon);
  ITEM_DATA.battery.texture = loader.load(ITEM_DATA.battery.icon);
  ITEM_DATA.stake.texture = loader.load(ITEM_DATA.stake.icon);
  ITEM_DATA.banana.texture = loader.load(ITEM_DATA.banana.icon);
  ITEM_DATA.plunger.texture = loader.load(ITEM_DATA.plunger.icon);
  loader.load('Item-Sprites/plunger-projectile.png', (tex) => { plungerProjectileTexture = tex; });

  const handGeo = new THREE.PlaneGeometry(0.32, 0.32);
  const handMat = new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, visible: false });
  handMesh = new THREE.Mesh(handGeo, handMat);
  handMesh.position.set(0.28, -0.22, -0.4); 
  // Force the held item to always render on top of other transparent surfaces
  // (e.g. window-wall glass). Without this, the two transparent materials get
  // sorted by camera distance each frame and, when standing near a window
  // wall, that distance comparison flips between frames — causing the held
  // item to flicker/disappear behind the window glass.
  handMesh.renderOrder = 999;
  handMesh.frustumCulled = false;
  camera.add(handMesh);

  // 2D <img> assets for the arms-overlay canvas (Mario hands + held-item icons)
  marioHandLeftImg = new Image();
  marioHandLeftImg.src = 'Hud/Mario-Hand-Left.png';
  marioHandRightImg = new Image();
  marioHandRightImg.src = 'Hud/Mario-Hand-Right.png';
  for (const id of Object.keys(ITEM_DATA)) {
    const img = new Image();
    img.src = ITEM_DATA[id].icon;
    itemIconImages[id] = img;
  }
  for (const [key, src] of Object.entries(WEEGEE_IMGS)) {
    loader.load(src, (tex) => {
      tex.minFilter = THREE.LinearFilter;
      weegeeTextures[key] = tex;
      if (key === 'front' && weegeePlane) {
        weegeePlane.material.map = tex;
        weegeePlane.material.needsUpdate = true;
      }
    }, undefined, () => {
      console.warn('Weegee PNG not found: ' + src);
    });
  }
  // buildFloorScene(0) is now called by onSceneTexLoaded() once all 4 scene textures are ready.
}

let currentMaze;
function buildFloorScene(floorNum) {
  clearSpawnedItems();

  for (const m of floorMeshes) scene.remove(m);
  floorMeshes = [];
  walls3D = [];

  currentMaze = generateMaze(MAZE_W, MAZE_H);
  const {group, wallSegs, stairX, stairZ} = buildFloorGeometry(currentMaze);
  scene.add(group);
  floorMeshes.push(group);
  walls3D = wallSegs;
  stairPositions = [{x: stairX, z: stairZ}];

  player.x = CELL * 0.5;
  player.z = CELL * 0.5;
  player.yaw = 0;
  player.pitch = 0;

  weegee.x = (MAZE_W-2)*CELL + CELL * 0.5;
  weegee.z = (MAZE_H-2)*CELL + CELL * 0.5;
  weegee.dirX = 0;
  weegee.dirZ = -1;
  weegee.floor = floorNum;
  weegee.peeking = false;
  weegee.state = 'wander';
  weegee.targetCellX = null;
  weegee.targetCellZ = null;
  weegee._visitedCells = [];
  weegee._subOffX = 0;
  weegee._subOffZ = 0;
  weegeeInterceptTarget = null;
  weegeeInterceptTimer = 0;
  weegeeSidestepTimer    = 0;
  weegeeSidestepActive   = false;
  weegeeSidestepDuration = 0;
  weegeeSidestepDirX     = 0;
  weegeeSidestepDirZ     = 0;
  weegeePlane.visible = false;
  weegeeSpawnTimer = 6 + Math.random() * 4; 

  isWeegeeBanished = false;
  weegeeBanishAnim.active = false;
  weegeeBanishAnim.t = 0;
  weegeeBanishAnim.screamPlayed = false;
  if (banishCircleMesh) { banishCircleMesh.visible = false; banishCircleMesh.material.opacity = 0; }
  banishTendrils.forEach(m => { m.visible = false; m.material.opacity = 0; m.userData.active = false; }); banishSpawnAccum = 0;
  if (banishLight) { banishLight.visible = false; banishLight.intensity = 0; }
  itemUseAnim.active = false;
  itemUseAnim.t = 0;
  itemUseAnim.chugging = false;
  stopDewChugSound();
  resetHahaPending();
  // Reset slip states on floor transition
  playerSlipState.active = false; playerSlipState.t = 0; player.pitch = 0; playerSlipState.roll = 0; playerSlipState.heightDrop = 0;
  weegeeSlipState.active = false; weegeeSlipState.t = 0;
  weegeePlungerStuck.active = false; weegeePlungerStuck.t = 0; weegeePlungerStuck.duration = 0;
  if (weegeePlane) { weegeePlane.rotation.x = 0; weegeePlane.position.y = 1.4; }
  if (handMesh) updateHandItem();

  if (weegeeVoiceAudio && weegeeVoicePlaying) {
    weegeeVoiceAudio.pause();
    weegeeVoicePlaying = false;
  }
  weegeeVoiceCooldown = WEEGEE_AUDIO_COOLDOWN_MIN + Math.random() * (WEEGEE_AUDIO_COOLDOWN_MAX - WEEGEE_AUDIO_COOLDOWN_MIN);

  generateFloorLootPickups();

  document.getElementById('floor-num').textContent = floorNum + 1;
  document.getElementById('floor-num2').textContent = floorNum + 1;

  const stairBtn = document.getElementById('stair-btn');
  if (stairBtn) stairBtn.style.display = 'none';

  lookAwayActive = false;
  weegeeActive = false;
  document.getElementById('timer-bar-wrap').style.display = 'none';
  
  updateInventoryUI();
}

function clearSpawnedItems() {
  for(let i=0; i<spawnedItems.length; i++) {
    scene.remove(spawnedItems[i].mesh);
  }
  spawnedItems = [];
  // Clear banana peel entities from scene
  for (let i = 0; i < bananaPeelEntities.length; i++) {
    scene.remove(bananaPeelEntities[i].mesh);
  }
  bananaPeelEntities = [];
  // Clear plunger entities from scene
  for (let i = 0; i < plungerEntities.length; i++) {
    scene.remove(plungerEntities[i].mesh);
  }
  plungerEntities = [];
}

function generateFloorLootPickups() {
  const pCellX = Math.floor(player.x / CELL);
  const pCellZ = Math.floor(player.z / CELL);
  
  let validCells = [];
  for(let r=0; r<MAZE_H; r++) {
    for(let c=0; c<MAZE_W; c++) {
      if(r === pCellZ && c === pCellX) continue;
      validCells.push({r, c});
    }
  }
  
  validCells.sort(() => Math.random() - 0.5);

  // 3 Mountain Dew pickups per floor
  for(let i=0; i<3; i++) {
    if(validCells.length > 0) {
      let loc = validCells.pop();
      spawnItemEntity(loc.c * CELL + CELL/2, loc.r * CELL + CELL/2, ITEM_DATA.dew);
    }
  }
  // 4 battery pickups per floor
  for(let i=0; i<4; i++) {
    if(validCells.length > 0) {
      let loc = validCells.pop();
      spawnItemEntity(loc.c * CELL + CELL/2, loc.r * CELL + CELL/2, ITEM_DATA.battery);
    }
  }
  if (currentFloor === stakeFloor && validCells.length > 0) {
    let loc = validCells.pop();
    spawnItemEntity(loc.c * CELL + CELL/2, loc.r * CELL + CELL/2, ITEM_DATA.stake);
  }
  // 3 banana peel pickups per floor
  for (let i = 0; i < 3; i++) {
    if (validCells.length > 0) {
      let loc = validCells.pop();
      spawnItemEntity(loc.c * CELL + CELL/2, loc.r * CELL + CELL/2, ITEM_DATA.banana);
    }
  }
  // 2 plunger pickups per floor
  for (let i = 0; i < 2; i++) {
    if (validCells.length > 0) {
      let loc = validCells.pop();
      spawnItemEntity(loc.c * CELL + CELL/2, loc.r * CELL + CELL/2, ITEM_DATA.plunger);
    }
  }
}

function spawnItemEntity(x, z, itemType) {
  const geo = new THREE.PlaneGeometry(0.6, 0.6);
  const mat = new THREE.MeshBasicMaterial({
    map: itemType.texture, 
    transparent: true, 
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, 0.4, z);
  scene.add(mesh);
  
  spawnedItems.push({
    typeId: itemType.id,
    mesh: mesh,
    x: x,
    z: z
  });
}

function getWeegeeTexture() {
  const weegeeAngle = Math.atan2(weegee.dirX, weegee.dirZ);
  const toPlayerX = player.x - weegee.x;
  const toPlayerZ = player.z - weegee.z;
  const angleToPlayer = Math.atan2(toPlayerX, toPlayerZ);
  
  let diff = angleToPlayer - weegeeAngle;
  diff = ((diff + Math.PI * 3) % (Math.PI * 2)) - Math.PI;

  if (Math.abs(diff) < Math.PI/4) return weegeeTextures.front || null;
  if (Math.abs(diff) > Math.PI*3/4) return weegeeTextures.back || null;
  if (diff > 0) return weegeeTextures.right || null;
  return weegeeTextures.left || null;
}

function isWallBetween(x1, z1, x2, z2) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const dist = Math.sqrt(dx*dx + dz*dz);
  if (dist < 0.1) return false;
  
  const stepSize = 0.02; 
  const steps = Math.floor(dist / stepSize);
  
  for (let i = 1; i < steps; i++) {
    const currX = x1 + (dx / dist) * (i * stepSize);
    const currZ = z1 + (dz / dist) * (i * stepSize);
    
    for (const w of walls3D) {
      if (currX >= w.x && currX <= w.x + w.w && currZ >= w.z && currZ <= w.z + w.d) {
        return true;
      }
    }
  }
  return false;
}

function isLookingAtWeegee() {
  if (isWeegeeBanished || weegeeBanishAnim.active || !weegeeActive || !weegeePlane.visible || weegeeSlipState.active || weegeePlungerStuck.active) return false;
  if (weegeeTextures.front && weegeePlane.material.map !== weegeeTextures.front) return false;
  
  const dx = weegee.x - player.x;
  const dz = weegee.z - player.z;
  const dist2D = Math.sqrt(dx*dx + dz*dz);
  if (dist2D > 14 || dist2D < 0.6) return false;
  
  const dy = 2.2 - 1.55; 
  const dist3D = Math.sqrt(dx*dx + dy*dy + dz*dz);
  
  const lookX = -Math.sin(player.yaw) * Math.cos(player.pitch);
  const lookY = Math.sin(player.pitch);
  const lookZ = -Math.cos(player.yaw) * Math.cos(player.pitch);
  
  const targetX = dx / dist3D;
  const targetY = dy / dist3D;
  const targetZ = dz / dist3D;
  
  const dot3D = lookX * targetX + lookY * targetY + lookZ * targetZ;
  
  if (dot3D > 0.996) {
    return !isWallBetween(player.x, player.z, weegee.x, weegee.z);
  }
  return false;
}

function isCollidingWithWeegee() {
  if (isWeegeeBanished || weegeeBanishAnim.active || weegeeSlipState.active || weegeePlungerStuck.active) return false;
  const dx = weegee.x - player.x, dz = weegee.z - player.z;
  return (dx*dx + dz*dz) < 1.2;
}

function toggleFlashlight() {
  if (isDead || !gameStarted || isPaused) return;
  if (batteryCurrent <= 0) return;
  
  flashlightActive = !flashlightActive;
}

// Global Pause Menu Toggle & Suspension Mechanics Hook
function togglePause() {
  if (!gameStarted || isDead) return;
  
  isPaused = !isPaused;
  const pauseMenuEl = document.getElementById('pause-screen');
  
  if (isPaused) {
    pauseMenuEl.style.display = 'flex';
    
    // Memory Cache and audio system freeze integration
    wasMusicPlaying = !bgMusic.paused;
    wasFootstepsPlaying = !footstepsAudio.paused;
    
    bgMusic.pause();
    footstepsAudio.pause();
    
    if (pointerLocked) {
      document.exitPointerLock();
    }
  } else {
    pauseMenuEl.style.display = 'none';
    
    // Restore exact audio channels mapping state
    if (wasMusicPlaying) {
      bgMusic.play().catch(err => console.warn(err));
    }
    if (wasFootstepsPlaying && isWalking) {
      footstepsAudio.play().catch(err => console.warn(err));
    }
    
    document.getElementById('gameCanvas').requestPointerLock();
  }
}

// Drop game back down to cleanly reload start variables state parameters
function quitToMainMenu() {
  isPaused = false;
  gameStarted = false;
  isDead = false;
  currentFloor = 0;

  staminaCurrent = 100;
  batteryCurrent = 100;
  flashlightActive = true;
  inventory = [null, null, null, null, null];
  selectedSlot = 0;
  
  document.getElementById('pause-screen').style.display = 'none';
  document.getElementById('start-screen').style.display = 'flex';
  document.getElementById('stamina-wrap').style.display = 'none';
  document.getElementById('hotbar-wrap').style.display = 'none';
  document.getElementById('timer-bar-wrap').style.display = 'none';
  if (document.getElementById('stair-btn')) document.getElementById('stair-btn').style.display = 'none';
  
  bgMusic.pause();
  bgMusic.pause();
  bgMusic.currentTime = 0;
  bgMusic.volume = 1;
  footstepsAudio.volume = 1;
  if (isWalking) {
    isWalking = false;
    footstepsAudio.pause();
  }
  laughAudio.pause();
  laughAudio.currentTime = 0;
  yayAudio.pause();
  yayAudio.currentTime = 0;
  yayAudio.volume = 1;
  if (weegeeVoiceAudio && weegeeVoicePlaying) {
    weegeeVoiceAudio.pause();
    weegeeVoicePlaying = false;
  }
  weegeeVoiceCooldown = WEEGEE_AUDIO_COOLDOWN_MIN + Math.random() * (WEEGEE_AUDIO_COOLDOWN_MAX - WEEGEE_AUDIO_COOLDOWN_MIN);
  
  clearSpawnedItems();
  for (const m of floorMeshes) scene.remove(m);
  floorMeshes = [];
  walls3D = [];
  if (weegeePlane) weegeePlane.visible = false;
  weegeeActive = false;
  overlayEl.style.background = 'rgba(0,0,0,0)';
  warningEl.style.display = 'none';
  const vs2 = document.getElementById('victory-screen');
  if (vs2) { vs2.style.display = 'none'; vs2.style.pointerEvents = 'none'; vs2.classList.remove('victory-reveal'); }
  const _vsFadeQuit = document.getElementById('victory-fade-overlay');
  if (_vsFadeQuit) { _vsFadeQuit.style.transition = 'none'; _vsFadeQuit.classList.remove('active'); requestAnimationFrame(() => { if (_vsFadeQuit) _vsFadeQuit.style.transition = ''; }); }
  const ds2 = document.getElementById('death-screen');
  if (ds2) { ds2.style.display = 'none'; ds2.style.pointerEvents = 'none'; }
}

function addItemToInventory(typeId) {
  for(let i=0; i<5; i++) {
    if(inventory[i] === null) {
      inventory[i] = typeId;
      updateInventoryUI();
      return true;
    }
  }
  return false; 
}

function useItemSlot(slotIndex) {
  if (isDead || !gameStarted || isPaused || playerSlipState.active) return;
  
  if (selectedSlot === slotIndex) {
    useCurrentItem();
  } else {
    selectedSlot = slotIndex;
    updateInventoryUI();
  }
}

function useCurrentItem() {
  if (isDead || !gameStarted || isPaused || playerSlipState.active) return;
  const item = inventory[selectedSlot];
  if(!item) return;

  if (itemUseAnim.active) return; // don't interrupt an in-progress animation

  if(item === 'dew') {
    // Stamina is no longer refilled instantly — it refills gradually
    // during the "chugging" phase of the drink animation (see the
    // itemUseAnim update loop).
    inventory[selectedSlot] = null;
  } else if(item === 'battery') {
    // Battery charge is applied once the full swap animation finishes
    // (see the itemUseAnim completion handler below).
    inventory[selectedSlot] = null;
  } else if(item === 'stake') {
    inventory[selectedSlot] = null;
    // If a plunger is currently stuck to Weegee, clear that state so he
    // doesn't get stranded mid-stick when he sinks into the floor — the
    // stuck projectile mesh cleans itself up next frame in updatePlungerEntities.
    weegeePlungerStuck.active = false;
    if (weegeeActive && weegeePlane.visible && !isWeegeeBanished && !weegeeBanishAnim.active) {
      weegeeBanishAnim.active = true;
      weegeeBanishAnim.t = 0;
      weegeeBanishAnim.duration = WEEGEE_BANISH_DURATION;
      weegeeBanishAnim.screamPlayed = false;
    } else {
      isWeegeeBanished = true;
      weegeeActive = false;
      if (weegeePlane) weegeePlane.visible = false;
    }
  } else if(item === 'banana') {
    inventory[selectedSlot] = null;
    throwBananaPeel();
  } else if(item === 'plunger') {
    inventory[selectedSlot] = null;
    throwPlunger();
  }

  // Kick off the held-item use animation (hides the static 3D hand item
  // while the 2D canvas animation plays).
  itemUseAnim.active = true;
  itemUseAnim.type = item;
  itemUseAnim.t = 0;
  itemUseAnim.duration = ITEM_ANIM_DURATIONS[item] || 1.0;
  itemUseAnim.chugging = false;
  itemUseAnim.chugStartStamina = staminaCurrent;
  if (handMesh) handMesh.material.visible = false;

  updateInventoryUI();
}

function updateHandItem() {
  if (!handMesh) return;
  const itemId = inventory[selectedSlot];
  if (itemId && ITEM_DATA[itemId] && ITEM_DATA[itemId].texture) {
    handMesh.material.map = ITEM_DATA[itemId].texture;
    handMesh.material.visible = true;
    handMesh.material.needsUpdate = true;
  } else {
    handMesh.material.visible = false;
  }
}

function updateInventoryUI() {
  for(let i=0; i<5; i++) {
    const slotEl = document.getElementById(`slot-${i}`);
    if (!slotEl) continue;
    slotEl.classList.remove('selected');
    if (i === selectedSlot) {
      slotEl.classList.add('selected');
    }
    
    const oldImg = slotEl.querySelector('img');
    if(oldImg) oldImg.remove();
    
    const itemId = inventory[i];
    if(itemId) {
      const img = document.createElement('img');
      img.src = ITEM_DATA[itemId].icon;
      slotEl.appendChild(img);
    }
  }
  updateHandItem();
}

function tryPickupItem() {
  if(isDead || !gameStarted || isPaused) return;
  
  raycaster.setFromCamera(mouseVector, camera);
  const meshesToIntersect = spawnedItems.map(si => si.mesh);
  const intersects = raycaster.intersectObjects(meshesToIntersect);
  
  if(intersects.length > 0) {
    const targetMesh = intersects[0].object;
    const itemIndex = spawnedItems.findIndex(si => si.mesh === targetMesh);
    if(itemIndex !== -1) {
      const itemData = spawnedItems[itemIndex];
      const distance = camera.position.distanceTo(targetMesh.position);
      
      if(distance < 3.5) { 
        if(addItemToInventory(itemData.typeId)) {
          scene.remove(targetMesh);
          spawnedItems.splice(itemIndex, 1);
        }
      }
    }
  }
}

function killPlayer(msg) {
  if (isDead) return;
  isDead = true;
  
  bgMusic.pause();
  bgMusic.currentTime = 0;
  
  if (isWalking) {
    isWalking = false;
    footstepsAudio.pause();
  }

  stopDewChugSound();
  resetHahaPending();

  laughAudio.currentTime = 0;
  laughAudio.play().catch(err => console.warn(err));
  
  if (weegeeVoiceAudio && weegeeVoicePlaying) {
    weegeeVoiceAudio.pause();
    weegeeVoicePlaying = false;
  }
  
  const ds = document.getElementById('death-screen');
  document.getElementById('death-msg').textContent = msg || "Weegee got you.";
  ds.style.display = 'flex';
  ds.style.pointerEvents = 'all';
  overlayEl.style.background = 'rgba(150,0,0,0.85)';
  setTimeout(() => { overlayEl.style.background = 'rgba(0,0,0,0.7)'; }, 400);
}

function restartGame() {
  isDead = false;
  isPaused = false;
  currentFloor = 0;
  lookAwayActive = false;
  weegeeActive = false;
  
  stakeFloor = Math.floor(Math.random() * FLOOR_COUNT);
  selectedSlot = 0;
  isWeegeeBanished = false;
  weegeeBanishAnim.active = false;
  weegeeBanishAnim.t = 0;
  weegeeBanishAnim.screamPlayed = false;
  if (banishCircleMesh) { banishCircleMesh.visible = false; banishCircleMesh.material.opacity = 0; }
  banishTendrils.forEach(m => { m.visible = false; m.material.opacity = 0; m.userData.active = false; }); banishSpawnAccum = 0;
  if (banishLight) { banishLight.visible = false; banishLight.intensity = 0; }
  itemUseAnim.active = false;
  itemUseAnim.t = 0;
  itemUseAnim.chugging = false;
  stopDewChugSound();
  resetHahaPending();
  // Reset banana slip states
  playerSlipState.active = false; playerSlipState.t = 0; player.pitch = 0; playerSlipState.roll = 0; playerSlipState.heightDrop = 0;
  weegeeSlipState.active = false; weegeeSlipState.t = 0;
  weegeePlungerStuck.active = false; weegeePlungerStuck.t = 0; weegeePlungerStuck.duration = 0;
  if (weegeePlane) { weegeePlane.rotation.x = 0; weegeePlane.position.y = 1.4; }
  staminaCurrent = 100;
  batteryCurrent = 100; // Reset battery
  flashlightActive = true; // Turn flashlight back on
  isSprinting = false;
  speedBoostTimeLeft = 0;
  inventory = [null, null, null, null, null];
  updateInventoryUI();

  if (isWalking) {
    isWalking = false;
    footstepsAudio.pause();
  }
  
  laughAudio.pause();
  laughAudio.currentTime = 0;
  yayAudio.pause();
  yayAudio.currentTime = 0;
  yayAudio.volume = 1; // reset in case audio fade was still running
  if (weegeeVoiceAudio && weegeeVoicePlaying) {
    weegeeVoiceAudio.pause();
    weegeeVoicePlaying = false;
  }
  weegeeVoiceCooldown = WEEGEE_AUDIO_COOLDOWN_MIN + Math.random() * (WEEGEE_AUDIO_COOLDOWN_MAX - WEEGEE_AUDIO_COOLDOWN_MIN);
  
  bgMusic.volume = 1;
  bgMusic.play().catch(err => console.warn(err));
  
  // ── Victory sequence teardown ─────────────────────────────────────────────
  // Kill the black overlay immediately (no transition) so it doesn't persist
  // over the restarted game. Also strip victory-reveal so the next run's
  // victory sequence starts from opacity:0 again.
  const _vsFadeOverlay = document.getElementById('victory-fade-overlay');
  if (_vsFadeOverlay) {
    _vsFadeOverlay.style.transition = 'none';
    _vsFadeOverlay.classList.remove('active');
    requestAnimationFrame(() => { if (_vsFadeOverlay) _vsFadeOverlay.style.transition = ''; });
  }

  const ds = document.getElementById('death-screen');
  ds.style.display = 'none';
  const vs = document.getElementById('victory-screen');
  vs.style.display = 'none';
  vs.style.pointerEvents = 'none';
  vs.classList.remove('victory-reveal');
  overlayEl.style.background = 'rgba(0,0,0,0)';
  warningEl.style.display = 'none';
  document.getElementById('timer-bar-wrap').style.display = 'none';
  buildFloorScene(0);
}

function climbStairs() {
  if (currentFloor >= FLOOR_COUNT - 1) {
    isDead = true; 
    
    bgMusic.pause();
    bgMusic.currentTime = 0;
    
    if (isWalking) {
      isWalking = false;
      footstepsAudio.pause();
    }

    // ── New victory sequence ─────────────────────────────────────────────────
    // Phase 1 (0–3 s): black overlay fades IN, all game audio fades OUT.
    // Phase 2 (3 s):   overlay is now fully black; victory screen becomes
    //                   visible behind it (still invisible to the player).
    // Phase 3 (3 s):   black overlay fades OUT, victory.png bg + content fade
    //                   IN simultaneously, yay.mp3 begins playing.

    // Snapshot all live audio volumes so we can interpolate them to 0.
    const audioFadeTargets = [
      bgMusic,
      footstepsAudio
    ];
    if (weegeeVoiceAudio && weegeeVoicePlaying) audioFadeTargets.push(weegeeVoiceAudio);

    const startVolumes = audioFadeTargets.map(a => a.volume);
    const FADE_DURATION = 3000; // ms
    const fadeStart = performance.now();

    // Kick off the black overlay fade-in immediately.
    const fadeOverlay = document.getElementById('victory-fade-overlay');
    fadeOverlay.style.transition = 'opacity 3s linear';
    // Force a reflow so the transition fires from opacity:0.
    void fadeOverlay.offsetWidth;
    fadeOverlay.classList.add('active'); // CSS: opacity → 1 over 3 s

    // Gradually lower all audio volumes over 3 s using rAF.
    function fadeAudioStep(now) {
      const elapsed = now - fadeStart;
      const t = Math.min(elapsed / FADE_DURATION, 1);
      audioFadeTargets.forEach((a, i) => {
        try { a.volume = startVolumes[i] * (1 - t); } catch(e) {}
      });
      if (t < 1) {
        requestAnimationFrame(fadeAudioStep);
      } else {
        // All audio fully silent — now hard-stop everything.
        bgMusic.pause(); bgMusic.currentTime = 0; bgMusic.volume = 1;
        footstepsAudio.pause(); footstepsAudio.volume = 1;
        if (isWalking) { isWalking = false; }
        if (weegeeVoiceAudio && weegeeVoicePlaying) {
          weegeeVoiceAudio.pause(); weegeeVoicePlaying = false;
          weegeeVoiceAudio.volume = 1;
        }
      }
    }
    requestAnimationFrame(fadeAudioStep);

    // After 3 s (overlay is fully black): show victory screen then reverse overlay.
    const CONTENT_FADE_DURATION = 3000; // must match #victory-bg/#victory-content CSS transition
    setTimeout(() => {
      const vs = document.getElementById('victory-screen');
      vs.style.display = 'flex';
      vs.style.pointerEvents = 'all';
      overlayEl.style.background = 'rgba(0,0,0,0)';

      // Small delay so the browser paints the victory screen before we
      // trigger the reveal transitions (bg image + content fade-in).
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // IMPORTANT: fade the victory bg/content IN first while the black
          // overlay is still fully opaque (fadeOverlay keeps its 'active'
          // class here). This happens fully hidden behind the black screen,
          // so the live game view is never exposed. Only once the victory
          // screen is completely opaque do we start fading the black
          // overlay away — at that point there's nothing but the (already
          // fully-formed) victory screen underneath it, so no crossfade
          // gap ever reveals the game behind it.
          vs.classList.add('victory-reveal'); // bg + content opacity → 1 (still hidden behind black)

          setTimeout(() => {
            // Victory screen is now fully opaque. Safe to fade the black
            // overlay out — it only ever reveals the victory screen, never
            // the game.
            fadeOverlay.style.transition = 'opacity 3s linear';
            fadeOverlay.classList.remove('active'); // opacity → 0

            // Play yay.mp3 as the reveal begins.
            yayAudio.currentTime = 0;
            yayAudio.volume = 1;
            yayAudio.play().catch(err => console.warn(err));
          }, CONTENT_FADE_DURATION);
        });
      });
    }, FADE_DURATION);

    return;
  }
  currentFloor++;
  buildFloorScene(currentFloor);
}

function checkNearStairs() {
  if (isPaused) return;
  let near = false;
  for (const s of stairPositions) {
    const dx = s.x - player.x, dz = s.z - player.z;
    if (dx*dx + dz*dz < 1.44) {
      near = true;
      break;
    }
  }
  
  const stairBtn = document.getElementById('stair-btn');
  if (near) {
    stairBtn.style.display = 'block';
    stairBtn.textContent = '⬆ NEXT FLOOR (Press Up Arrow / W)';
  } else {
    stairBtn.style.display = 'none';
  }
}

function movePlayer(dt) {
  if (playerSlipState.active) return; // frozen while slipping
  let baseSpeed = 3.5;
  let movingInput = false;

  if (keys['w'] || keys['s'] || keys['a'] || keys['d'] || keys['arrowup'] || keys['arrowdown']) {
    movingInput = true;
  }
  if (gamepadState.moveX !== 0 || gamepadState.moveY !== 0) {
    movingInput = true;
  }
  // Circle button TOGGLES sprint rather than needing to be held, but it
  // still ORs cleanly with Shift so keyboard sprinting is unaffected.
  isSprinting = (keys['shift'] || gamepadState.sprintToggle) && movingInput && staminaCurrent > 0;

  if (isSprinting) {
    staminaCurrent -= STAMINA_DRAIN_RATE * dt;
    if(staminaCurrent <= 0) {
      staminaCurrent = 0;
      isSprinting = false;
      gamepadState.sprintToggle = false;
    }
  } else if (!movingInput) {
    staminaCurrent = Math.min(100, staminaCurrent + STAMINA_REGEN_RATE * dt);
  }

  document.getElementById('stamina-fill').style.width = staminaCurrent + '%';

  if (speedBoostTimeLeft > 0) {
    speedBoostTimeLeft = Math.max(0, speedBoostTimeLeft - dt);
  }
  const speedBoostMult = speedBoostTimeLeft > 0 ? DEW_SPEED_BOOST_MULT : 1;

  const currentSpeed = (isSprinting ? baseSpeed * 1.5 : baseSpeed) * speedBoostMult;
  let dx = 0, dz = 0;
  
  const fx = -Math.sin(player.yaw);
  const fz = -Math.cos(player.yaw);
  const rx = Math.cos(player.yaw);
  const rz = -Math.sin(player.yaw);

  if (keys['w']||keys['arrowup']) { dx += fx * currentSpeed * dt; dz += fz * currentSpeed * dt; }
  if (keys['s']||keys['arrowdown']) { dx -= fx * currentSpeed * dt; dz -= fz * currentSpeed * dt; }
  if (keys['a']) { dx -= rx * currentSpeed * dt; dz -= rz * currentSpeed * dt; }
  if (keys['d']) { dx += rx * currentSpeed * dt; dz += rz * currentSpeed * dt; }
  if (keys['arrowleft']) { player.yaw += 1.5 * dt; }
  if (keys['arrowright']) { player.yaw -= 1.5 * dt; }

  // Left stick — forward/back on Y (pushed up = negative), strafe on X.
  // Additive with WASD so keyboard + gamepad can never conflict.
  if (gamepadState.moveY !== 0) {
    const fwd = -gamepadState.moveY;
    dx += fx * fwd * currentSpeed * dt;
    dz += fz * fwd * currentSpeed * dt;
  }
  if (gamepadState.moveX !== 0) {
    dx += rx * gamepadState.moveX * currentSpeed * dt;
    dz += rz * gamepadState.moveX * currentSpeed * dt;
  }
  const r = 0.35;
  const nx = player.x + dx, nz = player.z + dz;
  if (!collidesWithWalls(nx, player.z, r)) player.x = nx;
  if (!collidesWithWalls(player.x, nz, r)) player.z = nz;
  
  player.x = Math.max(r, Math.min(MAZE_W*CELL - r, player.x));
  player.z = Math.max(r, Math.min(MAZE_H*CELL - r, player.z));
}

function collidesWithWalls(x, z, r) {
  for (const w of walls3D) {
    if (x+r > w.x-0.1 && x-r < w.x+w.w+0.1 && z+r > w.z-0.1 && z-r < w.z+w.d+0.1) return true;
  }
  return false;
}

function bfsNextTarget(fromWorldX, fromWorldZ, toWorldX, toWorldZ) {
  const col = (x) => Math.floor(x / CELL);
  const row = (z) => Math.floor(z / CELL);
  const startC = Math.max(0, Math.min(MAZE_W-1, col(fromWorldX)));
  const startR = Math.max(0, Math.min(MAZE_H-1, row(fromWorldZ)));
  const goalC  = Math.max(0, Math.min(MAZE_W-1, col(toWorldX)));
  const goalR  = Math.max(0, Math.min(MAZE_H-1, row(toWorldZ)));

  if (startC === goalC && startR === goalR) return {x: toWorldX, z: toWorldZ};

  const visited = Array.from({length: MAZE_H}, () => Array(MAZE_W).fill(false));
  const parent  = Array.from({length: MAZE_H}, () => Array(MAZE_W).fill(null));
  const queue = [[startC, startR]];
  visited[startR][startC] = true;
  let found = false;

  outer: while (queue.length > 0) {
    const [c, r] = queue.shift();
    const neighbours = [
      [0, -1, 0],
      [0,  1, 1],
      [-1, 0, 2],
      [ 1, 0, 3],
    ];
    for (const [dc, dr, wb] of neighbours) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nc >= MAZE_W || nr < 0 || nr >= MAZE_H) continue;
      if (currentMaze[r][c] & (1 << wb)) continue;
      if (visited[nr][nc]) continue;
      visited[nr][nc] = true;
      parent[nr][nc] = [c, r];
      if (nc === goalC && nr === goalR) { found = true; break outer; }
      queue.push([nc, nr]);
    }
  }

  if (!found) return {x: toWorldX, z: toWorldZ};

  // Walk path back to find the SECOND cell from start (first step)
  let cc = goalC, cr = goalR;
  while (parent[cr][cc] && !(parent[cr][cc][0] === startC && parent[cr][cc][1] === startR)) {
    [cc, cr] = parent[cr][cc];
  }
  // Return a sub-cell point: centre offset by a small random nudge within safe interior
  const subOffX = weegee._subOffX !== undefined ? weegee._subOffX : 0;
  const subOffZ = weegee._subOffZ !== undefined ? weegee._subOffZ : 0;
  return {x: cc * CELL + CELL/2 + subOffX, z: cr * CELL + CELL/2 + subOffZ};
}

// How many recent cells we remember to avoid revisiting in wander mode
const WEEGEE_MEMORY = 6;
// Sub-cell margin to stay away from walls (world units)
const WEEGEE_WALL_MARGIN = 0.55;

// Pick a random sub-cell offset that keeps Weegee away from cell walls
function pickSubCellOffset() {
  const halfCell = CELL / 2;
  const safe = halfCell - WEEGEE_WALL_MARGIN;
  const ox = (Math.random() * 2 - 1) * safe;
  const oz = (Math.random() * 2 - 1) * safe;
  return {ox, oz};
}

function pickWanderTarget() {
  if (!weegee._visitedCells) weegee._visitedCells = [];

  const playerCol = Math.floor(player.x / CELL);
  const playerRow = Math.floor(player.z / CELL);

  // Build candidate list: all cells not recently visited and not the player's cell
  let candidates = [];
  for (let r = 0; r < MAZE_H; r++) {
    for (let c = 0; c < MAZE_W; c++) {
      if (c === playerCol && r === playerRow) continue;
      const key = r * MAZE_W + c;
      if (weegee._visitedCells.includes(key)) continue;
      candidates.push({c, r, key});
    }
  }
  // If memory filled all cells, clear and start fresh
  if (candidates.length === 0) {
    weegee._visitedCells = [];
    candidates = [];
    for (let r = 0; r < MAZE_H; r++) {
      for (let c = 0; c < MAZE_W; c++) {
        candidates.push({c, r, key: r * MAZE_W + c});
      }
    }
  }

  // Prefer cells that are reasonably far from Weegee's current cell
  const wCol = Math.floor(weegee.x / CELL);
  const wRow = Math.floor(weegee.z / CELL);
  const farCandidates = candidates.filter(({c, r}) => Math.abs(c - wCol) + Math.abs(r - wRow) >= 3);
  const pool = farCandidates.length > 0 ? farCandidates : candidates;

  const chosen = pool[Math.floor(Math.random() * pool.length)];
  // Track visit
  weegee._visitedCells.push(chosen.key);
  if (weegee._visitedCells.length > WEEGEE_MEMORY) weegee._visitedCells.shift();

  // Pick a random sub-cell offset so Weegee doesn't always go dead-center
  const {ox, oz} = pickSubCellOffset();
  weegee._subOffX = ox;
  weegee._subOffZ = oz;
  weegee.targetCellX = chosen.c * CELL + CELL/2 + ox;
  weegee.targetCellZ = chosen.r * CELL + CELL/2 + oz;
}

// Aggro intercept: look ahead by this many seconds of player movement
const WEEGEE_INTERCEPT_LOOKAHEAD = 1.4;
// Cooldown (seconds) between intercept re-calculations
let weegeeInterceptTimer = 0;
// Current intercept world target (null = direct chase)
let weegeeInterceptTarget = null;

// ── Sidestep counter-maneuver state ──────────────────────────────────────────
// When the player is close and charging directly at Weegee, he can shuffle
// left or right to block the player's path.  A random wrong-direction chance
// keeps the behaviour fair.
const WEEGEE_SIDESTEP_DIST      = 4.0;   // max world-units distance to trigger
const WEEGEE_SIDESTEP_DOT       = 0.72;  // player must be aimed this squarely at Weegee
const WEEGEE_SIDESTEP_WRONG_P   = 0.32;  // probability of picking the wrong side
const WEEGEE_SIDESTEP_COOLDOWN  = 1.8;   // seconds before he can sidestep again
const WEEGEE_SIDESTEP_DURATION  = 0.55;  // how long (s) the sidestep lasts
const WEEGEE_SIDESTEP_DIST_STEP = 1.4;   // how far to slide sideways (world units)
let weegeeSidestepTimer    = 0;          // cooldown countdown
let weegeeSidestepActive   = false;      // currently mid-sidestep?
let weegeeSidestepDuration = 0;          // remaining sidestep time
let weegeeSidestepDirX     = 0;          // sidestep movement direction
let weegeeSidestepDirZ     = 0;

function computeInterceptTarget() {
  // Estimate where the player will be by projecting their current velocity
  const fx = -Math.sin(player.yaw);
  const fz = -Math.cos(player.yaw);
  const moving = keys['w'] || keys['arrowup'] ? 1 : (keys['s'] || keys['arrowdown'] ? -1 : 0);
  const strafeR = keys['d'] ? 1 : (keys['a'] ? -1 : 0);
  const spd = isSprinting ? 3.5 * 1.5 : 3.5;

  let predX = player.x + (fx * moving + Math.cos(player.yaw) * strafeR) * spd * WEEGEE_INTERCEPT_LOOKAHEAD;
  let predZ = player.z + (fz * moving + (-Math.sin(player.yaw)) * strafeR) * spd * WEEGEE_INTERCEPT_LOOKAHEAD;

  // Clamp to maze bounds
  predX = Math.max(0.5, Math.min(MAZE_W * CELL - 0.5, predX));
  predZ = Math.max(0.5, Math.min(MAZE_H * CELL - 0.5, predZ));

  // Only use intercept if it's a different cell from direct chase
  const pCell = {c: Math.floor(player.x/CELL), r: Math.floor(player.z/CELL)};
  const iCell = {c: Math.floor(predX/CELL), r: Math.floor(predZ/CELL)};
  if (iCell.c === pCell.c && iCell.r === pCell.r) return null; // no benefit

  return {x: predX, z: predZ};
}

function moveWeegee(dt) {
  if (isWeegeeBanished) return;

  // Player walk = 3.5, sprint = 5.25 (3.5 * 1.5).
  // Per-floor speed table (index = currentFloor, 0-based):
  //   Floor 1 (0): much slower than walk
  //   Floor 2 (1): slightly slower than walk
  //   Floor 3 (2): exactly walk speed
  //   Floor 4 (3): midpoint of walk and sprint
  //   Floor 5 (4): slightly faster than sprint (unchanged)
  const WEEGEE_FLOOR_SPEEDS = [2.2, 3.1, 3.5, 4.375, 5.35];
  const floorIdx = Math.max(0, Math.min(WEEGEE_FLOOR_SPEEDS.length - 1, currentFloor));
  const speed = WEEGEE_FLOOR_SPEEDS[floorIdx];

  const pDx = player.x - weegee.x;
  const pDz = player.z - weegee.z;
  const pDist = Math.sqrt(pDx*pDx + pDz*pDz);

  const AGGRO_RADIUS = 14;
  let targetX, targetZ;

  if (pDist <= AGGRO_RADIUS) {
    weegee.state = 'aggro';

    // Recompute intercept target every ~1.5 s or when we just switched to aggro
    weegeeInterceptTimer -= dt;
    if (weegeeInterceptTimer <= 0) {
      weegeeInterceptTarget = computeInterceptTarget();
      weegeeInterceptTimer = 1.2 + Math.random() * 0.6;
    }

    // If we have a valid intercept target and the wall-aware path to it is shorter
    // than to the player directly, use the intercept; otherwise fall back to direct chase
    if (weegeeInterceptTarget) {
      const iDx = weegeeInterceptTarget.x - weegee.x;
      const iDz = weegeeInterceptTarget.z - weegee.z;
      const iDist = Math.sqrt(iDx*iDx + iDz*iDz);
      // Only bother intercepting if the intercept point is meaningfully closer to us
      if (iDist < pDist * 1.35) {
        targetX = weegeeInterceptTarget.x;
        targetZ = weegeeInterceptTarget.z;
      } else {
        weegeeInterceptTarget = null;
        targetX = player.x;
        targetZ = player.z;
      }
    } else {
      targetX = player.x;
      targetZ = player.z;
    }
  } else {
    weegee.state = 'wander';
    weegeeInterceptTarget = null;
    weegeeInterceptTimer = 0;

    if (weegee.targetCellX === null || weegee.targetCellZ === null) {
      pickWanderTarget();
    }

    const tDx = weegee.targetCellX - weegee.x;
    const tDz = weegee.targetCellZ - weegee.z;
    if (Math.sqrt(tDx*tDx + tDz*tDz) < 0.45) {
      pickWanderTarget();
    }

    targetX = weegee.targetCellX;
    targetZ = weegee.targetCellZ;
  }

  const target = bfsNextTarget(weegee.x, weegee.z, targetX, targetZ);
  const dx = target.x - weegee.x, dz = target.z - weegee.z;
  const dist = Math.sqrt(dx*dx + dz*dz);

  // ── Sidestep counter-maneuver ───────────────────────────────────────────────
  // Tick down cooldown
  if (weegeeSidestepTimer > 0) weegeeSidestepTimer -= dt;

  if (weegeeSidestepActive) {
    // Continue the sidestep for its remaining duration
    weegeeSidestepDuration -= dt;
    if (weegeeSidestepDuration <= 0) {
      weegeeSidestepActive = false;
    } else {
      const stepX = weegeeSidestepDirX * speed * dt;
      const stepZ = weegeeSidestepDirZ * speed * dt;
      const nx = weegee.x + stepX;
      const nz = weegee.z + stepZ;
      const WRAD = 0.3;
      if (!collidesWithWalls(nx, weegee.z, WRAD)) weegee.x = nx;
      if (!collidesWithWalls(weegee.x, nz, WRAD)) weegee.z = nz;
      weegee.x = Math.max(WRAD, Math.min(MAZE_W * CELL - WRAD, weegee.x));
      weegee.z = Math.max(WRAD, Math.min(MAZE_H * CELL - WRAD, weegee.z));
      // Skip normal movement this frame while sidestepping
      return;
    }
  }

  // Check whether to trigger a new sidestep
  if (!weegeeSidestepActive && weegeeSidestepTimer <= 0 && weegee.state === 'aggro') {
    const toPx = player.x - weegee.x;
    const toPz = player.z - weegee.z;
    const toPdist = Math.sqrt(toPx * toPx + toPz * toPz);

    if (toPdist <= WEEGEE_SIDESTEP_DIST && toPdist > 0.5) {
      // Normalise direction from Weegee to player
      const nPx = toPx / toPdist;
      const nPz = toPz / toPdist;

      // Player's current forward vector
      const playerFwdX = -Math.sin(player.yaw);
      const playerFwdZ = -Math.cos(player.yaw);

      // How directly is the player walking toward Weegee?
      // dot( player_forward, direction_from_player_to_weegee )
      const toWeegeeX = -nPx; // direction from player to Weegee
      const toWeegeeZ = -nPz;
      const aimDot = playerFwdX * toWeegeeX + playerFwdZ * toWeegeeZ;

      if (aimDot >= WEEGEE_SIDESTEP_DOT) {
        // Player is charging straight at Weegee — decide which side to dodge to.
        // The two perpendicular directions to the player's approach vector are:
        //   left  = (-playerFwdZ,  playerFwdX)
        //   right = ( playerFwdZ, -playerFwdX)
        // Pick the side that puts Weegee more in the player's way (cross the path).
        // We determine which side the player is slightly offset from by the cross product.
        const crossY = playerFwdX * toPz - playerFwdZ * toPx; // positive = Weegee is to the right of player's path
        // Dodge toward the side the player seems to be trying to slip past
        // cross > 0 means player approaches from Weegee's left → dodge left to block
        let dodgeDirX, dodgeDirZ;
        if (crossY > 0) {
          dodgeDirX = -playerFwdZ;
          dodgeDirZ =  playerFwdX;
        } else {
          dodgeDirX =  playerFwdZ;
          dodgeDirZ = -playerFwdX;
        }

        // Random chance to pick the wrong side (fairness)
        if (Math.random() < WEEGEE_SIDESTEP_WRONG_P) {
          dodgeDirX = -dodgeDirX;
          dodgeDirZ = -dodgeDirZ;
        }

        // Only commit if there's actually room in that direction (wall check)
        const testDist = WEEGEE_SIDESTEP_DIST_STEP * 0.6;
        const testX = weegee.x + dodgeDirX * testDist;
        const testZ = weegee.z + dodgeDirZ * testDist;
        if (!collidesWithWalls(testX, weegee.z, 0.3) || !collidesWithWalls(weegee.x, testZ, 0.3)) {
          weegeeSidestepActive   = true;
          weegeeSidestepDuration = WEEGEE_SIDESTEP_DURATION;
          weegeeSidestepDirX     = dodgeDirX;
          weegeeSidestepDirZ     = dodgeDirZ;
          weegeeSidestepTimer    = WEEGEE_SIDESTEP_COOLDOWN;
          // Update facing direction toward player during sidestep
          weegee.dirX = nPx;
          weegee.dirZ = nPz;
          // Begin sidestep movement immediately this frame then return
          const stepX = weegeeSidestepDirX * speed * dt;
          const stepZ = weegeeSidestepDirZ * speed * dt;
          const WRAD = 0.3;
          const nx = weegee.x + stepX;
          const nz = weegee.z + stepZ;
          if (!collidesWithWalls(nx, weegee.z, WRAD)) weegee.x = nx;
          if (!collidesWithWalls(weegee.x, nz, WRAD)) weegee.z = nz;
          weegee.x = Math.max(WRAD, Math.min(MAZE_W * CELL - WRAD, weegee.x));
          weegee.z = Math.max(WRAD, Math.min(MAZE_H * CELL - WRAD, weegee.z));
          return;
        }
        // No room — just start cooldown so we don't re-check every frame
        weegeeSidestepTimer = 0.5;
      }
    }
  }
  // ── End sidestep ────────────────────────────────────────────────────────────
  if (dist > 0.05) {
    weegee.dirX = dx / dist;
    weegee.dirZ = dz / dist;

    const WRAD = 0.3;
    const stepX = weegee.dirX * speed * dt;
    const stepZ = weegee.dirZ * speed * dt;

    let nx = weegee.x + stepX;
    let nz = weegee.z + stepZ;

    const blockedX = collidesWithWalls(nx, weegee.z, WRAD);
    const blockedZ = collidesWithWalls(weegee.x, nz, WRAD);

    if (!blockedX && !blockedZ) {
      // Clear path — move normally
      weegee.x = nx;
      weegee.z = nz;
    } else if (!blockedX && blockedZ) {
      // Only Z is blocked — slide along X
      weegee.x = nx;
    } else if (blockedX && !blockedZ) {
      // Only X is blocked — slide along Z
      weegee.z = nz;
    } else {
      // Both axes blocked (corner). Try sliding along the dominant axis using full speed,
      // then fall back to the other axis. This keeps Weegee moving around corners
      // without any visible snapping or freezing.
      const slideX = weegee.x + Math.sign(stepX) * speed * dt;
      const slideZ = weegee.z + Math.sign(stepZ) * speed * dt;
      if (Math.abs(stepX) >= Math.abs(stepZ)) {
        if (!collidesWithWalls(slideX, weegee.z, WRAD)) {
          weegee.x = slideX;
        } else if (!collidesWithWalls(weegee.x, slideZ, WRAD)) {
          weegee.z = slideZ;
        }
        // else fully cornered this frame — BFS will route him out next tick
      } else {
        if (!collidesWithWalls(weegee.x, slideZ, WRAD)) {
          weegee.z = slideZ;
        } else if (!collidesWithWalls(slideX, weegee.z, WRAD)) {
          weegee.x = slideX;
        }
      }
    }

    weegee.x = Math.max(WRAD, Math.min(MAZE_W * CELL - WRAD, weegee.x));
    weegee.z = Math.max(WRAD, Math.min(MAZE_H * CELL - WRAD, weegee.z));
  }
}

function updateWeegeeSprite() {
  const tex = getWeegeeTexture();
  if (tex && weegeePlane.material.map !== tex) {
    weegeePlane.material.map = tex;
    weegeePlane.material.needsUpdate = true;
  }
  if (!weegeePlane.material.map) {
    weegeePlane.visible = false;
    return;
  }
  weegeePlane.position.x = weegee.x;
  weegeePlane.position.z = weegee.z;
  if (!weegeeSlipState.active) {
    const dx = player.x - weegee.x, dz = player.z - weegee.z;
    weegeePlane.rotation.y = Math.atan2(dx, dz);
  }
  // While slipped, rotation.y is locked (set once in triggerWeegeeSlip) so
  // he stays flat on his back from every angle instead of billboarding.
}

function updateWeegeeVisibility() {
  if (isWeegeeBanished) {
    weegeePlane.visible = false;
    return;
  }
  const dx = weegee.x - player.x, dz = weegee.z - player.z;
  const dist = Math.sqrt(dx*dx + dz*dz);
  
  const fx = -Math.sin(player.yaw);
  const fz = -Math.cos(player.yaw);
  const nx = dx / (dist || 1);
  const nz = dz / (dist || 1);
  const dot = fx * nx + fz * nz;
  
  const inFOV = dot > 0.5 && dist < 20;
  const clearLOS = !isWallBetween(player.x, player.z, weegee.x, weegee.z);
  
  weegeePlane.visible = weegeeActive && clearLOS && (inFOV || dist < 1.5);
}

function spawnWeegeefarAway() {
  if (isWeegeeBanished) return;
  const playerCol = Math.floor(player.x / CELL);
  const playerRow = Math.floor(player.z / CELL);
  const candidates = [];
  for (let r = 0; r < MAZE_H; r++) {
    for (let c = 0; c < MAZE_W; c++) {
      if (Math.abs(c - playerCol) + Math.abs(r - playerRow) >= 4) {
        candidates.push([c, r]);
      }
    }
  }
  if (candidates.length === 0) {
    weegee.x = (MAZE_W-2)*CELL + CELL/2;
    weegee.z = (MAZE_H-2)*CELL + CELL/2;
  } else {
    const [c, r] = candidates[Math.floor(Math.random() * candidates.length)];
    weegee.x = c * CELL + CELL/2;
    weegee.z = r * CELL + CELL/2;
  }
  weegeeActive = true;
  weegeePlane.visible = false;
  weegee.state = 'wander';
  weegee.targetCellX = null;
  weegee.targetCellZ = null;
  weegee._visitedCells = weegee._visitedCells || [];
  weegee._subOffX = 0;
  weegee._subOffZ = 0;
  weegeeInterceptTarget = null;
  weegeeInterceptTimer = 0;
  weegeeSidestepActive   = false;
  weegeeSidestepDuration = 0;
  weegeeSidestepTimer    = 0;
}

function updateWeegeeBanishAnim(dt) {
  weegeeBanishAnim.t += dt;
  const p = Math.min(1, weegeeBanishAnim.t / weegeeBanishAnim.duration);

  // ── Phase breakpoints ─────────────────────────────────────────────────────
  // 0.00 → 0.30 : Satanic circle fades + scales in around Weegee's feet
  // 0.30 → 1.00 : Weegee sinks below the floor; circle glows then fades out
  const CIRCLE_IN_END  = 0.30;
  const SINK_START     = 0.30;

  // ── Play weegee-scream.mp3 exactly 1 s in ────────────────────────────────
  if (!weegeeBanishAnim.screamPlayed && weegeeBanishAnim.t >= 1.0) {
    weegeeBanishAnim.screamPlayed = true;
    try {
      if (!banishScreamAudio) banishScreamAudio = new Audio('Audio/Weegee/weegee-scream.mp3');
      banishScreamAudio.currentTime = 0;
      banishScreamAudio.volume = 1;
      banishScreamAudio.play().catch(() => {});
    } catch(e) {}
  }

  // ── Circle + ray animation ───────────────────────────────────────────────
  // Shared helpers
  const globalSpin = weegeeBanishAnim.t * (p <= CIRCLE_IN_END ? 0.6 : (0.6 + ((p - SINK_START) / (1 - SINK_START)) * 2.4));

  if (banishCircleMesh) {
    banishCircleMesh.position.x = weegee.x;
    banishCircleMesh.position.z = weegee.z;

    if (p <= CIRCLE_IN_END) {
      const cp = p / CIRCLE_IN_END;
      const ease = cp * cp * (3 - 2 * cp);
      banishCircleMesh.visible = true;
      banishCircleMesh.material.opacity = ease * 0.92;
      const scl = 0.4 + ease * 0.6;
      banishCircleMesh.scale.set(scl, 1, scl);
      banishCircleMesh.rotation.y += dt * 0.6;
    } else {
      const sp = (p - SINK_START) / (1 - SINK_START);
      const fadeStart = 0.80;
      const opacity = sp > fadeStart
        ? 0.92 * (1 - (sp - fadeStart) / (1 - fadeStart))
        : 0.92;
      banishCircleMesh.material.opacity = opacity;
      banishCircleMesh.scale.set(1, 1, 1);
      banishCircleMesh.rotation.y += dt * (0.6 + sp * 2.4);
    }
    banishCircleMesh.material.emissiveIntensity = 2.2 + Math.sin(weegeeBanishAnim.t * 8) * 0.8;
  }

  // ── Aurora-ray particle system + red point light ──────────────────────────
  // Active while the circle is visible (p > 0.05). Strands spawn from random
  // angles on the ring and rise as broad, slow-undulating curtains — like a
  // red aurora borealis — rather than darting tendrils. Continuous until the
  // animation ends.
  {
    const RING_R       = 0.885;  // ring midpoint radius (world units)
    const T_MAX_HEIGHT = 3.2;    // tallest a ray can sweep up to
    const SPAWN_RATE   = 3.2;    // new rays per second — sparse, lingering strands
    const t = weegeeBanishAnim.t;

    // Master fade envelope — ramp in quickly, stay full, ramp out at end
    let masterOp;
    if (p < 0.06) {
      masterOp = p / 0.06;
    } else if (p > 0.82) {
      masterOp = 1 - (p - 0.82) / 0.18;
    } else {
      masterOp = 1;
    }

    // ── Spawn new aurora-ray strands ─────────────────────────────────────
    if (masterOp > 0.05) {
      banishSpawnAccum += dt * SPAWN_RATE;
      while (banishSpawnAccum >= 1) {
        banishSpawnAccum -= 1;
        // Find a free slot in the pool
        const slot = banishTendrils.find(m => !m.userData.active);
        if (slot) {
          const ud = slot.userData;
          ud.active     = true;
          ud.age        = 0;
          ud.life       = 2.4 + Math.random() * 2.2;     // 2.4-4.6 s - slow, lingering curtain
          ud.angle      = Math.random() * Math.PI * 2;   // random ring position
          ud.wavePhase  = Math.random() * Math.PI * 2;
          ud.driftPhase = Math.random() * Math.PI * 2;
          ud.waveFreq   = 1.0 + Math.random() * 0.9;     // low frequency = broad smooth folds
          ud.waveSpeed  = 0.45 + Math.random() * 0.55;   // slow, gentle drift
          ud.heightMul  = 0.8 + Math.random() * 0.4;     // slight per-strand height variance
          ud.halfWidth  = slot.userData.T_HALF_W * (0.7 + Math.random() * 0.9); // varied curtain widths
          ud.riseSpeed  = T_MAX_HEIGHT / ud.life;
          slot.visible = true;
        }
      }
    }

    // ── Update & render each active aurora-ray strand ────────────────────
    for (let i = 0; i < banishTendrils.length; i++) {
      const mesh = banishTendrils[i];
      const ud   = mesh.userData;
      if (!ud.active) continue;

      ud.age += dt;
      if (ud.age >= ud.life) {
        ud.active    = false;
        mesh.visible = false;
        continue;
      }

      const lp = ud.age / ud.life;            // 0->1 over strand lifetime

      // Smooth fade envelope: gentle smoothstep in, hold, smoothstep out -
      // a soft glowing veil rather than a fast flicker-in/flicker-out spike.
      const growP  = Math.min(1, lp / 0.22);
      const growIn = growP * growP * (3 - 2 * growP);
      const fadeP  = Math.min(1, Math.max(0, (1 - lp) / 0.32));
      const fadeOut = fadeP * fadeP * (3 - 2 * fadeP);
      const shimmer = 0.88 + 0.12 * Math.sin(t * 1.6 + i * 1.3);
      const opacity = growIn * fadeOut * masterOp * shimmer * 0.85;
      mesh.material.opacity = Math.max(0, opacity);

      // World position of spawn point on ring edge
      const wx = weegee.x + Math.cos(ud.angle) * RING_R;
      const wz = weegee.z + Math.sin(ud.angle) * RING_R;

      // Outward direction (unit vector pointing away from ring centre)
      const odx = Math.cos(ud.angle);
      const odz = Math.sin(ud.angle);
      // Tangent direction (perpendicular on XZ plane, for ribbon width/sway)
      const tdx = -odz;
      const tdz =  odx;

      // Height reached so far - eases up quickly then holds, like a curtain
      // unfurling rather than a spark shooting up.
      const growthP    = Math.min(1, lp / 0.35);
      const growthEase = growthP * growthP * (3 - 2 * growthP);
      const currentHeight = growthEase * T_MAX_HEIGHT * ud.heightMul;

      // ── Write vertex positions + colors in world space ──────────────────
      const posAttr   = mesh.geometry.attributes.position;
      const colorAttr = mesh.geometry.attributes.color;
      const SEGS = ud.T_SEGS;
      for (let s = 0; s <= SEGS; s++) {
        const sf = s / SEGS;              // 0 (bottom) -> 1 (top)
        const y  = sf * currentHeight;    // vertical climb

        // Broad, slow outward sway - large low-frequency fold rather than
        // a tight jittery wobble, like a real curtain rippling in the wind.
        const waveAmp = 0.45 * sf;
        const outOff  = waveAmp * Math.sin(sf * ud.waveFreq * Math.PI + t * ud.waveSpeed + ud.wavePhase)
                       + waveAmp * 0.3 * Math.sin(sf * ud.waveFreq * 2.1 * Math.PI + t * ud.waveSpeed * 1.4 + ud.wavePhase);

        // Slow sideways drift along the tangent - the curtain leans and
        // billows rather than just bowing in/out radially.
        const tangAmp = 0.4 * sf;
        const tangOff = tangAmp * Math.sin(sf * 1.6 * Math.PI + t * 0.65 + ud.driftPhase);

        // Width tapers toward the tip and gently folds along its length -
        // wide warm base narrowing into a soft wisp at the top.
        const widthMod = ud.halfWidth * (1 - 0.55 * sf) * (0.85 + 0.25 * Math.sin(sf * 4.0 + t * 0.9 + ud.wavePhase));

        const ex0 = wx + odx * outOff + tdx * (tangOff - widthMod);
        const ez0 = wz + odz * outOff + tdz * (tangOff - widthMod);
        const ex1 = wx + odx * outOff + tdx * (tangOff + widthMod);
        const ez1 = wz + odz * outOff + tdz * (tangOff + widthMod);

        const topIdx = s * 2, botIdx = s * 2 + 1;
        posAttr.setXYZ(topIdx, ex0, y, ez0);
        posAttr.setXYZ(botIdx, ex1, y, ez1);

        // Color gradient: warm gold/orange glow at the base (like light
        // near the horizon in a real aurora) easing into saturated red,
        // then fading to a deep wine-red wisp at the tip.
        let r, g, b;
        if (sf < 0.3) {
          const k = sf / 0.3;
          r = 1.0;              g = 0.62 - k * 0.47; b = 0.22 - k * 0.16;
        } else {
          const k = (sf - 0.3) / 0.7;
          r = 1.0 - k * 0.42;   g = 0.15 - k * 0.13; b = 0.06 - k * 0.04;
        }
        const tipFade = 1 - 0.25 * sf; // slightly dims toward the very top
        const px = sf * 5.5 + t * 1.1 + ud.wavePhase; // gentle traveling shimmer up the strand
        const localShimmer = 0.9 + 0.1 * Math.sin(px);
        r *= tipFade * localShimmer; g *= tipFade * localShimmer; b *= tipFade * localShimmer;
        colorAttr.setXYZ(topIdx, Math.max(0, r), Math.max(0, g), Math.max(0, b));
        colorAttr.setXYZ(botIdx, Math.max(0, r), Math.max(0, g), Math.max(0, b));
      }
      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    }

    // ── Drive the red point light ────────────────────────────────────────
    if (banishLight) {
      banishLight.position.set(weegee.x, 1.0, weegee.z);
      banishLight.visible = masterOp > 0.01;
      const pulse = 0.85 + 0.15 * Math.sin(t * 1.7);
      banishLight.intensity = masterOp * 4.5 * pulse;
      banishLight.distance  = 5.5 + masterOp * 2.5 * (0.9 + 0.1 * Math.sin(t * 1.3));
      // Slow warm/cool shift between deep red and gold, echoing the
      // gradient of the aurora-ray strands themselves.
      const warm = 0.5 + 0.5 * Math.sin(t * 0.6);
      banishLight.color.setRGB(1, 0.22 + 0.18 * warm, 0.06 + 0.1 * warm);
    }
  }

  // ── Weegee sink animation ─────────────────────────────────────────────────
  weegeePlane.visible = true;
  weegeePlane.position.x = weegee.x;
  weegeePlane.position.z = weegee.z;
  // Face the player while sinking
  const dx = player.x - weegee.x;
  const dz = player.z - weegee.z;
  weegeePlane.rotation.y = Math.atan2(dx, dz);
  weegeePlane.material.transparent = true;
  weegeePlane.material.alphaTest = 0;    // disable alphaTest so opacity controls fade

  if (p <= CIRCLE_IN_END) {
    // Stand still while circle draws in — just visible, no movement
    weegeePlane.position.y = 1.4;
    weegeePlane.scale.set(1, 1, 1);
    weegeePlane.material.opacity = 1;
  } else {
    // Sink into the floor
    const sp = (p - SINK_START) / (1 - SINK_START);     // 0 → 1
    const sinkEase = sp * sp;                            // accelerate downward
    // y goes 1.4 → -1.4 (fully submerged; sprite height ≈2.8)
    weegeePlane.position.y = 1.4 - sinkEase * 2.8;
    weegeePlane.scale.set(1, 1, 1);
    // Slight fade as he disappears — mostly the floor clips him
    weegeePlane.material.opacity = Math.max(0, 1 - sinkEase * 0.6);
  }

  // ── Completion ────────────────────────────────────────────────────────────
  if (p >= 1) {
    weegeeBanishAnim.active = false;
    isWeegeeBanished = true;
    weegeeActive = false;
    weegeePlane.visible = false;
    weegeePlane.scale.set(1, 1, 1);
    weegeePlane.rotation.y = 0;
    weegeePlane.material.opacity = 1;
    weegeePlane.material.alphaTest = 0.5;
    weegeePlane.position.y = 1.4;
    if (banishCircleMesh) {
      banishCircleMesh.visible = false;
      banishCircleMesh.material.opacity = 0;
    }
    banishTendrils.forEach(m => { m.visible = false; m.material.opacity = 0; m.userData.active = false; }); banishSpawnAccum = 0;
    if (banishLight) { banishLight.visible = false; banishLight.intensity = 0; }
  }
}

function updateWeegee(dt) {
  if (weegeeBanishAnim.active) {
    updateWeegeeBanishAnim(dt);
    return;
  }
  if (isWeegeeBanished) {
    weegeeActive = false;
    weegeePlane.visible = false;
    return;
  }
  if (weegeeSlipState.active) {
    // Update slip animation but don't move Weegee or allow kills
    updateWeegeeSprite();
    updateWeegeeVisibility();
    return;
  }
  if (weegeePlungerStuck.active) {
    // Frozen exactly as he was the instant the plunger hit — we deliberately
    // skip updateWeegeeSprite() here so his billboard rotation and the
    // direction-sprite he was showing stay locked, not just his position.
    updateWeegeeVisibility();
    return;
  }
  if (!weegeeActive) {
    weegeeSpawnTimer -= dt;
    if (weegeeSpawnTimer <= 0) {
      spawnWeegeefarAway();
    }
    return;
  }
  moveWeegee(dt);
  updateWeegeeVisibility();
  if (weegeePlane.visible) updateWeegeeSprite();
}

function updateLookAway(dt) {}

function imgDims(img, baseW) {
  if (img && img.complete && img.naturalWidth) {
    return {w: baseW, h: baseW * img.naturalHeight / img.naturalWidth};
  }
  return {w: baseW, h: baseW};
}

function safeDraw(ctx, img, x, y, w, h) {
  if (!img || !img.complete || img.naturalWidth === 0) return;
  ctx.drawImage(img, x, y, w, h);
}

// Linear interpolation and a smoothstep-style ease for natural-feeling
// accelerate/decelerate motion in the item-use animations below.
function lerp(a, b, t) { return a + (b - a) * t; }
function easeInOut(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

// ── Banana Peel: throw entity into scene ─────────────────────────────────────
function throwBananaPeel() {
  if (!ITEM_DATA.banana.texture) return;

  // Create a small upright billboard mesh for the thrown peel
  const geo = new THREE.PlaneGeometry(0.38, 0.38);
  const mat = new THREE.MeshBasicMaterial({
    map: ITEM_DATA.banana.texture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, mat);

  // Start at player position slightly above floor
  mesh.position.set(player.x, 0.15, player.z);
  // Stays upright (no flat rotation) — just a small standing sprite
  scene.add(mesh);

  // Launch in the direction the player is facing
  const speed = 6.5;
  const velX = -Math.sin(player.yaw) * speed;
  const velZ = -Math.cos(player.yaw) * speed;

  bananaPeelEntities.push({
    mesh,
    x: player.x,
    z: player.z,
    velX,
    velZ,
    landed: false,
    age: 0,
    bounces: 0,
    throwerSafeT: 2.0   // seconds of immunity for the player who threw it
  });
}

// ── Banana Peel: update all peel entities each frame ─────────────────────────
function updateBananaPeelEntities(dt) {
  const BOUNCE_DAMP = 0.65;
  const MAX_BOUNCES = 6;
  const MIN_SPEED   = 0.4;

  for (let i = bananaPeelEntities.length - 1; i >= 0; i--) {
    const bp = bananaPeelEntities[i];

    if (bp.throwerSafeT > 0) bp.throwerSafeT -= dt;

    if (!bp.landed) {
      bp.age += dt;

      // Move the peel
      const nx = bp.x + bp.velX * dt;
      const nz = bp.z + bp.velZ * dt;

      // Wall bounce logic
      let bx = false, bz = false;
      if (collidesWithWalls(nx, bp.z, 0.1)) { bp.velX *= -BOUNCE_DAMP; bp.bounces++; bx = true; }
      if (collidesWithWalls(bp.x, nz, 0.1)) { bp.velZ *= -BOUNCE_DAMP; bp.bounces++; bz = true; }

      if (!bx) bp.x = Math.max(0.2, Math.min(MAZE_W*CELL - 0.2, nx));
      if (!bz) bp.z = Math.max(0.2, Math.min(MAZE_H*CELL - 0.2, nz));

      // Slow down over time (friction)
      const speed = Math.sqrt(bp.velX*bp.velX + bp.velZ*bp.velZ);
      if (speed > 0) {
        const friction = Math.max(0, 1 - dt * 4);
        bp.velX *= friction;
        bp.velZ *= friction;
      }

      // Land condition: too slow or too many bounces
      if (speed < MIN_SPEED || bp.bounces >= MAX_BOUNCES) {
        bp.landed = true;
        bp.x = Math.max(0.2, Math.min(MAZE_W*CELL - 0.2, bp.x));
        bp.z = Math.max(0.2, Math.min(MAZE_H*CELL - 0.2, bp.z));
      }

      bp.mesh.position.set(bp.x, 0.19, bp.z);

      // Spinning while airborne/rolling
      if (!bp.landed) {
        bp.mesh.rotation.z += dt * speed * 2;
      }
    }

    // Billboard the landed peel so it always faces the camera (yaw only,
    // stays upright) instead of freezing at whatever angle it stopped spinning at
    if (bp.landed) {
      bp.mesh.rotation.z = 0;
      bp.mesh.rotation.y = Math.atan2(
        camera.position.x - bp.mesh.position.x,
        camera.position.z - bp.mesh.position.z
      );
    }

    // --- Slip detection (runs every frame the peel is on the floor,
    // not just the single instant it lands) ---
    // Check Weegee
    if (bp.landed && weegeeActive && !weegeeSlipState.active && !isWeegeeBanished && !weegeeBanishAnim.active && !weegeePlungerStuck.active) {
      const dwx = weegee.x - bp.x, dwz = weegee.z - bp.z;
      if (dwx*dwx + dwz*dwz < 0.72) {
        triggerWeegeeSlip();
        removeBananaPeel(i);
        continue;
      }
    }

    // Check player (immune for a couple seconds right after throwing it
    // themselves, so it doesn't bounce back and trip them instantly)
    if (bp.landed && !playerSlipState.active && bp.throwerSafeT <= 0) {
      const dpx = player.x - bp.x, dpz = player.z - bp.z;
      if (dpx*dpx + dpz*dpz < 0.56) {
        triggerPlayerSlip();
        removeBananaPeel(i);
        continue;
      }
    }
  }
}

function removeBananaPeel(idx) {
  scene.remove(bananaPeelEntities[idx].mesh);
  bananaPeelEntities.splice(idx, 1);
}

// ── Plunger: throw entity into scene ──────────────────────────────────────────
function throwPlunger() {
  if (!plungerProjectileTexture) return;

  const geo = new THREE.PlaneGeometry(0.42, 0.42);
  const mat = new THREE.MeshBasicMaterial({
    map: plungerProjectileTexture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, mat);

  const startY = 1.45;
  mesh.position.set(player.x, startY, player.z);
  scene.add(mesh);

  // Launched in the direction the player is facing, with a real-gravity
  // arc — much bigger/higher than the banana peel's flat slide.
  const velX = -Math.sin(player.yaw) * PLUNGER_SPEED_H;
  const velZ = -Math.cos(player.yaw) * PLUNGER_SPEED_H;

  plungerEntities.push({
    mesh,
    x: player.x, y: startY, z: player.z,
    velX, velY: PLUNGER_SPEED_V, velZ,
    state: 'flying',
    age: 0,
    stuckAge: 0
  });
}

// ── Plunger: update all thrown plunger entities each frame ───────────────────
function updatePlungerEntities(dt) {
  for (let i = plungerEntities.length - 1; i >= 0; i--) {
    const pl = plungerEntities[i];

    if (pl.state === 'flying') {
      pl.age += dt;
      pl.velY -= PLUNGER_GRAVITY * dt;

      const nx = pl.x + pl.velX * dt;
      const ny = pl.y + pl.velY * dt;
      const nz = pl.z + pl.velZ * dt;

      // Floor
      if (ny <= PLUNGER_FLOOR_Y) {
        stickPlunger(pl, nx, PLUNGER_FLOOR_Y, nz, 'stuckFloor');
        continue;
      }
      // Ceiling
      if (ny >= PLUNGER_CEILING_Y) {
        stickPlunger(pl, nx, PLUNGER_CEILING_Y, nz, 'stuckCeiling');
        continue;
      }
      // Weegee — only one plunger can be stuck to him at a time
      if (weegeeActive && !isWeegeeBanished && !weegeeBanishAnim.active &&
          !weegeeSlipState.active && !weegeePlungerStuck.active) {
        const dwx = nx - weegee.x, dwz = nz - weegee.z;
        if ((dwx*dwx + dwz*dwz) < PLUNGER_WEEGEE_RADIUS_SQ && ny > 0.1 && ny < 2.75) {
          stickPlunger(pl, nx, ny, nz, 'stuckWeegee');
          triggerWeegeePlungerStuck();
          continue;
        }
      }
      // Walls — stick right where it was rather than tunnel into the wall
      if (collidesWithWalls(nx, nz, 0.08)) {
        stickPlunger(pl, pl.x, Math.max(PLUNGER_FLOOR_Y, Math.min(PLUNGER_CEILING_Y, ny)), pl.z, 'stuckWall');
        continue;
      }

      pl.x = nx; pl.y = ny; pl.z = nz;
      pl.mesh.position.set(pl.x, pl.y, pl.z);
      // Tumble while airborne for a satisfying hurl
      pl.mesh.rotation.x += dt * 9;
    } else {
      // Stuck — billboard toward the camera like the landed banana peel.
      pl.mesh.rotation.x = 0;
      pl.mesh.rotation.y = Math.atan2(
        camera.position.x - pl.mesh.position.x,
        camera.position.z - pl.mesh.position.z
      );

      if (pl.state === 'stuckWeegee') {
        // Lifetime tied directly to Weegee's stuck timer, not a fixed clock.
        if (!weegeePlungerStuck.active) {
          scene.remove(pl.mesh);
          plungerEntities.splice(i, 1);
        }
      } else {
        pl.stuckAge += dt;
        if (pl.stuckAge >= PLUNGER_SURFACE_LIFETIME) {
          scene.remove(pl.mesh);
          plungerEntities.splice(i, 1);
        }
      }
    }
  }
}

function stickPlunger(pl, x, y, z, state) {
  pl.x = x; pl.y = y; pl.z = z;
  pl.state = state;
  pl.stuckAge = 0;
  pl.mesh.position.set(x, y, z);
  playPlungerHitSound();
}

function removePlungerEntity(idx) {
  scene.remove(plungerEntities[idx].mesh);
  plungerEntities.splice(idx, 1);
}

// ── Weegee: a plunger sticks to him ───────────────────────────────────────────
function triggerWeegeePlungerStuck() {
  weegeePlungerStuck.active = true;
  weegeePlungerStuck.t = 0;
  weegeePlungerStuck.duration = PLUNGER_WEEGEE_STUCK_MIN + Math.random() * (PLUNGER_WEEGEE_STUCK_MAX - PLUNGER_WEEGEE_STUCK_MIN);
  playWeegeeEhSound();
}

// ── Update Weegee's plunger-stuck timer ───────────────────────────────────────
function updateWeegeePlungerStuckTimer(dt) {
  if (!weegeePlungerStuck.active) return;
  weegeePlungerStuck.t += dt;
  if (weegeePlungerStuck.t >= weegeePlungerStuck.duration) {
    weegeePlungerStuck.active = false;
  }
}

// ── Slip triggers ─────────────────────────────────────────────────────────────
function triggerPlayerSlip() {
  playerSlipState.active = true;
  playerSlipState.t = 0;
  playerSlipState.duration = 3.0;
  playerSlipState.yawLock = player.yaw;
  playerSlipState.rollDir = Math.random() < 0.5 ? -1 : 1;
  playerSlipState.fallSoundPlayed = false;
  playerSlipState.mamafckerPlayed = false;
  playBananaSlipSound();
  // Fall sound is fired from updatePlayerSlip exactly when the fall
  // animation finishes (the moment they actually hit the floor).
}

function triggerWeegeeSlip() {
  weegeeSlipState.active = true;
  weegeeSlipState.t = 0;
  weegeeSlipState.duration = 3.0;
  weegeeSlipState.fallSoundPlayed = false;
  // Lock his facing direction so he falls flat on his back without
  // continuing to billboard toward the player while down.
  if (weegeePlane) {
    const dx = player.x - weegee.x, dz = player.z - weegee.z;
    weegeePlane.rotation.y = Math.atan2(dx, dz);
  }
  playBananaSlipSound();
  playWeegeeBananaScream();
  // Fall sound is fired from updateWeegeeSlip exactly when the fall
  // animation finishes (the moment Weegee actually hits the floor).
}

// ── Update player slip animation ──────────────────────────────────────────────
function updatePlayerSlip(dt) {
  if (!playerSlipState.active) return;
  playerSlipState.t += dt;

  const p = playerSlipState.t / playerSlipState.duration;

  // Fall phase (0 → 0.15): camera rolls/pitches down fast, as if toppling sideways
  // Down phase (0.15 → 0.85): camera stays flat on the ground, looking sideways along the floor
  // Rise phase (0.85 → 1.0): camera rolls/pitches back upright
  let fallP;
  if (p < 0.15) {
    fallP = p / 0.15;
  } else if (p < 0.85) {
    fallP = 1;
  } else {
    fallP = 1 - (p - 0.85) / 0.15;
  }

  if (!playerSlipState.fallSoundPlayed && p >= 0.15) {
    playerSlipState.fallSoundPlayed = true;
    playBananaFallSound();
  }

  // Fires exactly 500ms after the floor-hit moment (when the fall
  // phase completed, i.e. t = 0.15 * duration).
  if (!playerSlipState.mamafckerPlayed && playerSlipState.t >= 0.15 * playerSlipState.duration + 0.5) {
    playerSlipState.mamafckerPlayed = true;
    playPlayerMamafckerSound();
  }

  // Roll the camera ~90° onto the side the player slipped toward, so the
  // world tips over and the floor fills the side of the screen — like an
  // ear-to-the-ground view instead of just glancing down.
  playerSlipState.roll = playerSlipState.rollDir * (Math.PI / 2 - 0.08) * fallP;
  // A little forward pitch sells the "face toward the floor" feeling.
  player.pitch = -0.35 * fallP;
  // Drop the camera close to the ground, like the player's head is now lying on it.
  playerSlipState.heightDrop = 1.25 * fallP;

  // Prevent looking around while slipped (lock yaw)
  // (input is blocked by checking playerSlipState.active in movePlayer)

  if (playerSlipState.t >= playerSlipState.duration) {
    playerSlipState.active = false;
    player.pitch = 0;
    playerSlipState.roll = 0;
    playerSlipState.heightDrop = 0;
  }
}

// ── Update Weegee slip animation ──────────────────────────────────────────────
function updateWeegeeSlip(dt) {
  if (!weegeeSlipState.active) return;
  weegeeSlipState.t += dt;

  const p = weegeeSlipState.t / weegeeSlipState.duration;

  if (!weegeeSlipState.fallSoundPlayed && p >= 0.15) {
    weegeeSlipState.fallSoundPlayed = true;
    playBananaFallSound();
  }

  // Weegee falls flat on his back (pivot from feet upward)
  // Fall: 0 → 0.15 (pivots from vertical to horizontal)
  // Lay: 0.15 → 0.85 (stays flat)
  // Rise: 0.85 → 1.0 (pivots back upright)
  let pivotAngle; // 0 = standing, PI/2 = flat on back
  if (p < 0.15) {
    pivotAngle = (Math.PI / 2) * (p / 0.15);
  } else if (p < 0.85) {
    pivotAngle = Math.PI / 2;
  } else {
    pivotAngle = (Math.PI / 2) * (1 - (p - 0.85) / 0.15);
  }

  // Apply the pivot to Weegee's plane: rotate around the X axis
  // and translate so the feet stay at floor level.
  if (weegeePlane) {
    weegeePlane.rotation.x = pivotAngle;
    // When flat, the plane has zero thickness, so its pivot itself must
    // sit right at floor level (not at half his standing height, which
    // was leaving him hovering in the air).
    const normalCentreY = 1.4;
    const flatCentreY   = 0.02; // just above the floor to avoid z-fighting
    weegeePlane.position.y = normalCentreY * (1 - pivotAngle / (Math.PI / 2))
                           + flatCentreY   * (pivotAngle / (Math.PI / 2));
  }

  if (weegeeSlipState.t >= weegeeSlipState.duration) {
    weegeeSlipState.active = false;
    if (weegeePlane) {
      weegeePlane.rotation.x = 0;
      weegeePlane.position.y = 1.4;
    }
  }
}

// Draws the banana throw animation on the arms canvas (right hand only)
function drawBananaThrowAnimation(ctx, w, h, swayR, bobR) {
  const p = Math.min(1, itemUseAnim.t / itemUseAnim.duration);
  const rSize = imgDims(marioHandRightImg, 280);
  const icon = itemIconImages['banana'];
  const iconSize = imgDims(icon, 280);

  const tx0 = w - rSize.w/2 + 40 + swayR;
  const ty0 = h - rSize.h/2 + 40 + bobR;

  // Phase 1 (0 → 0.25): raise hand with banana to throw position
  // Phase 2 (0.25 → 0.55): throw forward & release — banana icon flies off-screen
  const txT = w * 0.55, tyT = h * 0.32; // throw apex

  let tx, ty, rot = 0, iconAlpha = 1, iconOffX = 0, iconOffY = 0;

  if (p < BANANA_THROW_PHASES.riseEnd) {
    const rp = easeInOut(p / BANANA_THROW_PHASES.riseEnd);
    tx = lerp(tx0, txT, rp);
    ty = lerp(ty0, tyT, rp);
    rot = lerp(0, -0.4, rp);
    iconOffX = 0;
    iconOffY = -rSize.h * 0.55;
  } else {
    const tp = easeInOut((p - BANANA_THROW_PHASES.riseEnd) / (BANANA_THROW_PHASES.releaseEnd - BANANA_THROW_PHASES.riseEnd));
    // Hand snaps back to resting after throw
    tx = lerp(txT, tx0, tp);
    ty = lerp(tyT, ty0, tp);
    rot = lerp(-0.4, 0, tp);
    // Icon flies forward off-screen
    iconOffX = lerp(0, -w * 0.8, tp);
    iconOffY = lerp(-rSize.h * 0.55, -h * 0.7, tp);
    iconAlpha = Math.max(0, 1 - tp * 2.2);
  }

  ctx.save();
  ctx.translate(tx, ty);
  ctx.rotate(rot);
  if (iconAlpha > 0) {
    ctx.globalAlpha = iconAlpha;
    safeDraw(ctx, icon, iconOffX - iconSize.w / 2, iconOffY, iconSize.w, iconSize.h);
    ctx.globalAlpha = 1;
  }
  safeDraw(ctx, marioHandRightImg, -rSize.w/2, -rSize.h/2, rSize.w, rSize.h);
  ctx.restore();
}

// Draws the plunger throw animation on the arms canvas (right hand only).
// A bigger overhead windup than the banana's quick flick — selling the
// much larger arc the actual projectile travels in.
function drawPlungerThrowAnimation(ctx, w, h, swayR, bobR) {
  const p = Math.min(1, itemUseAnim.t / itemUseAnim.duration);
  const rSize = imgDims(marioHandRightImg, 280);
  const icon = itemIconImages['plunger'];
  const iconSize = imgDims(icon, 220);

  const tx0 = w - rSize.w/2 + 40 + swayR;
  const ty0 = h - rSize.h/2 + 40 + bobR;

  // Phase 1 (0 → riseEnd): wind up high overhead
  // Phase 2 (riseEnd → releaseEnd): hurl forward & release — plunger flies off-screen
  const txT = w * 0.52, tyT = h * 0.16; // overhead windup apex

  let tx, ty, rot = 0, iconAlpha = 1, iconOffX = 0, iconOffY = 0;

  if (p < PLUNGER_THROW_PHASES.riseEnd) {
    const rp = easeInOut(p / PLUNGER_THROW_PHASES.riseEnd);
    tx = lerp(tx0, txT, rp);
    ty = lerp(ty0, tyT, rp);
    rot = lerp(0, -0.95, rp);
    iconOffX = 0;
    iconOffY = -rSize.h * 0.6;
  } else {
    const tp = easeInOut((p - PLUNGER_THROW_PHASES.riseEnd) / (PLUNGER_THROW_PHASES.releaseEnd - PLUNGER_THROW_PHASES.riseEnd));
    tx = lerp(txT, tx0, tp);
    ty = lerp(tyT, ty0, tp);
    rot = lerp(-0.95, 0.3, tp);
    iconOffX = lerp(0, -w * 0.75, tp);
    iconOffY = lerp(-rSize.h * 0.6, -h * 0.5, tp);
    iconAlpha = Math.max(0, 1 - tp * 2.2);
  }

  ctx.save();
  ctx.translate(tx, ty);
  ctx.rotate(rot);
  if (iconAlpha > 0) {
    ctx.globalAlpha = iconAlpha;
    safeDraw(ctx, icon, iconOffX - iconSize.w / 2, iconOffY, iconSize.w, iconSize.h);
    ctx.globalAlpha = 1;
  }
  safeDraw(ctx, marioHandRightImg, -rSize.w/2, -rSize.h/2, rSize.w, rSize.h);
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// Draws the right-hand item-use animation (Mountain Dew, Battery, or
// Banishing Stake), each with its own unique multi-phase motion.
function drawItemUseAnimation(ctx, w, h, swayR, bobR) {
  const p = Math.min(1, itemUseAnim.t / itemUseAnim.duration);
  const rSize = imgDims(marioHandRightImg, 280);
  const icon = itemIconImages[itemUseAnim.type];
  const iconSize = imgDims(icon, 280);

  // "Translate point" — dynamically calculated from the hand's actual resting position!
  // This makes the transition completely seamless regardless of screen size.
  const tx0 = w - rSize.w/2 + 40 + swayR;
  const ty0 = h - rSize.h/2 + 40 + bobR;

  if (itemUseAnim.type === 'dew') {
    // 1) Raise the bottle to the middle of the screen, flipping it
    //    upside down. 2) Hold it upside down and "chug" with a little
    //    shake/tilt for a few seconds (stamina refills during this part).
    // 3) Toss the empty bottle away off-screen.
    const txC = w * 0.5, tyC = h * 0.42;
    let tx, ty, rot, alpha = 1;

    if (p < DEW_PHASES.riseEnd) {
      const rp = easeInOut(p / DEW_PHASES.riseEnd);
      tx = lerp(tx0, txC, rp);
      ty = lerp(ty0, tyC, rp);
      rot = lerp(0, Math.PI, rp);
    } else if (p < DEW_PHASES.chugEnd) {
      tx = txC + Math.sin(itemUseAnim.t * 14) * 4;
      ty = tyC + Math.sin(itemUseAnim.t * 11) * 3;
      rot = Math.PI + Math.sin(itemUseAnim.t * 22) * 0.07;
    } else {
      const thP = easeInOut((p - DEW_PHASES.chugEnd) / (1 - DEW_PHASES.chugEnd));
      tx = lerp(txC, w + rSize.w + iconSize.w, thP);
      ty = lerp(tyC, h + rSize.h + iconSize.h, thP);
      rot = Math.PI + thP * Math.PI * 1.4;
      alpha = 1 - thP;
    }

    ctx.save();
ctx.globalAlpha = alpha;
ctx.translate(tx, ty);
ctx.rotate(rot);
// Bottle drawn first (behind) so the fingers render on top, giving a gripped look.
// The hand sprite has fingers in its lower half; in draw-space (pre-flip) the
// finger zone sits at roughly +rSize.h*0.25 from centre, so we centre the
// bottle there. After the 180° rotation those fingers point upward visually,
// wrapping around the bottle body correctly.
safeDraw(ctx, icon, -iconSize.w/2, -rSize.h * 0.25 - iconSize.h / 2, iconSize.w, iconSize.h);
safeDraw(ctx, marioHandRightImg, -rSize.w/2, -rSize.h/2, rSize.w, rSize.h);
ctx.restore();
  } else if (itemUseAnim.type === 'battery') {
    // 1) Carry the battery up toward the flashlight, twisting it into
    //    place. 2) Slot it in (the battery icon fades out — flashlight
    //    charge is applied once this whole animation finishes). 3) Bring
    //    the empty hand back down and off-screen at normal size.
    const tx1 = w * 0.62, ty1 = h * 0.50;
    let tx, ty, twist = 0, iconAlpha = 0;

    if (p < BATTERY_PHASES.riseEnd) {
      const rp = easeInOut(p / BATTERY_PHASES.riseEnd);
      tx = lerp(tx0, tx1, rp);
      ty = lerp(ty0, ty1, rp);
      twist = Math.sin(rp * Math.PI * 2) * 0.22;
      iconAlpha = 1;
    } else if (p < BATTERY_PHASES.insertEnd) {
      tx = tx1; ty = ty1;
      const ip = (p - BATTERY_PHASES.riseEnd) / (BATTERY_PHASES.insertEnd - BATTERY_PHASES.riseEnd);
      iconAlpha = 1 - ip;
    } else {
      const rp2 = easeInOut((p - BATTERY_PHASES.insertEnd) / (1 - BATTERY_PHASES.insertEnd));
      // Carry the empty hand straight down, well past the bottom edge of the full canvas.
      const offScreenY = h + rSize.h + iconSize.h + 100;
      tx = lerp(tx1, tx0, rp2);
      ty = lerp(ty1, offScreenY, rp2);
      iconAlpha = 0;
    }

    ctx.save();
ctx.translate(tx, ty);
ctx.rotate(twist);
if (iconAlpha > 0) {
  ctx.globalAlpha = iconAlpha;
  safeDraw(ctx, icon, -iconSize.w/2, -rSize.h * 0.55, iconSize.w, iconSize.h);
  ctx.globalAlpha = 1;
}
safeDraw(ctx, marioHandRightImg, -rSize.w/2, -rSize.h/2, rSize.w, rSize.h);
ctx.restore();
  } else if (itemUseAnim.type === 'stake') {
    // 1) Raise the stake up high overhead. 2) Hold it aloft for a beat.
    // 3) Hurl it away off-screen, fading out once it's out of sight.
    const tx1 = w * 0.5, ty1 = h * 0.25;
    let tx, ty, rot, scale, alpha = 1;

    if (p < STAKE_PHASES.raiseEnd) {
      const rp = easeInOut(p / STAKE_PHASES.raiseEnd);
      tx = lerp(tx0, tx1, rp);
      ty = lerp(ty0, ty1, rp);
      rot = lerp(0, -0.2, rp);
      scale = lerp(1, 1.3, rp);
    } else if (p < STAKE_PHASES.holdEnd) {
      tx = tx1;
      ty = ty1 + Math.sin(itemUseAnim.t * 6) * 3;
      rot = -0.2 + Math.sin(itemUseAnim.t * 5) * 0.03;
      scale = 1.3;
    } else {
      const tp = easeInOut((p - STAKE_PHASES.holdEnd) / (1 - STAKE_PHASES.holdEnd));
      tx = lerp(tx1, -(rSize.w + iconSize.w), tp);
      ty = lerp(ty1, -(rSize.h + iconSize.h), tp);
      rot = -0.2 - tp * 1.2;
      scale = 1.3;
      alpha = tp < 0.6 ? 1 : Math.max(0, 1 - (tp - 0.6) / 0.4);
    }

    ctx.save();
ctx.globalAlpha = alpha;
ctx.translate(tx, ty);
ctx.rotate(rot);
ctx.scale(scale, scale);
safeDraw(ctx, icon, -iconSize.w * 0.2, -rSize.h * 0.75, iconSize.w, iconSize.h);
safeDraw(ctx, marioHandRightImg, -rSize.w/2, -rSize.h/2, rSize.w, rSize.h);
ctx.restore();
  } else if (itemUseAnim.type === 'banana') {
    drawBananaThrowAnimation(ctx, w, h, swayR, bobR);
  } else if (itemUseAnim.type === 'plunger') {
    drawPlungerThrowAnimation(ctx, w, h, swayR, bobR);
  }
}

// Light vertical view-bob while walking, heavier while sprinting.
function computeViewBob(elapsed, walking) {
  if (!walking) return 0;
  const amp = isSprinting ? 0.09 : 0.045;
  const speed = isSprinting ? 14 : 8;
  return Math.abs(Math.sin(elapsed * speed)) * amp;
}

function drawArms(canvas, ctx) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const w = canvas.width, h = canvas.height;
  const t = Date.now() / 1000;
  const moving = keys['w']||keys['s']||keys['a']||keys['d']||keys['arrowup']||keys['arrowdown']||keys['arrowleft']||keys['arrowright']
    || (Math.abs(gamepadState.moveX) > 0.05 || Math.abs(gamepadState.moveY) > 0.05);

  // Light bob while walking, heavier bob (with extra sway) while sprinting.
  const bobAmp  = isSprinting ? 20 : (moving ? 9 : 2);
  const bobSpeed = isSprinting ? 14 : (moving ? 8 : 1.5);
  const swayAmp = isSprinting ? 16 : (moving ? 7 : 0);
  const phase = t * bobSpeed;

  const bobL = Math.sin(phase) * bobAmp;
  const bobR = Math.sin(phase + Math.PI) * bobAmp;
  const swayL = Math.cos(phase) * swayAmp;
  const swayR = -Math.cos(phase) * swayAmp;

  // ── Mario's left hand (always visible) ─────────────────────────────────────
  const lSize = imgDims(marioHandLeftImg, 280);
  safeDraw(ctx, marioHandLeftImg, -40 + swayL, h - lSize.h + 40 + bobL, lSize.w, lSize.h);

  // ── Mario's right hand ───────────────────────────────────────────────────────
  // Hidden whenever a held item is showing on the right side of the screen,
  // or while a per-item use animation is playing (which draws its own hand).
  const heldItemVisible = handMesh && handMesh.material.visible;
  if (itemUseAnim.active) {
    drawItemUseAnimation(ctx, w, h, swayR, bobR);
  } else if (!heldItemVisible) {
    const rSize = imgDims(marioHandRightImg, 280);
    safeDraw(ctx, marioHandRightImg, w - rSize.w + 40 + swayR, h - rSize.h + 40 + bobR, rSize.w, rSize.h);
  }
}

function gameLoop() {
  requestAnimationFrame(gameLoop);
  if (!gameStarted || isDead) return;
  
  // Early return freeze optimization to preserve state tracking when menu is suspended
  if (isPaused) {
    renderer.render(scene, camera);
    return;
  }
  
  const dt = Math.min(clock.getDelta(), 0.05);

  movePlayer(dt);

  // Right stick — camera look. Independent of mouse movement, so mouse
  // and gamepad look can both be used interchangeably without conflict.
  if (gamepadState.lookX !== 0 || gamepadState.lookY !== 0) {
    if (!playerSlipState.active) {
      player.yaw   -= gamepadState.lookX * (window._GAMEPAD_LOOK_SENSITIVITY || 2.6) * dt;
      player.pitch -= gamepadState.lookY * (window._GAMEPAD_LOOK_SENSITIVITY || 2.6) * dt;
      player.pitch  = Math.max(-0.8, Math.min(0.8, player.pitch));
    }
  }

  updateWeegee(dt);
  updateWeegeeVoice(dt);
  updateLookAway(dt);
  updateBananaPeelEntities(dt);
  updatePlungerEntities(dt);
  updatePlayerSlip(dt);
  updateWeegeeSlip(dt);
  updateWeegeePlungerStuckTimer(dt);
  updateHahaPending(dt);
  checkNearStairs();

  const elapsed = clock.getElapsedTime();
  for(let i=0; i<spawnedItems.length; i++) {
    let item = spawnedItems[i];
    item.mesh.rotation.y = camera.rotation.y;
    item.mesh.position.y = 0.4 + Math.sin(elapsed * 3 + i) * 0.08;
  }

  if (itemUseAnim.active) {
    itemUseAnim.t += dt;

    // Mountain Dew: stamina only refills during the "chugging" phase of
    // the drink animation, ramping from whatever it was when chugging
    // started up to a full bar by the time chugging ends.
    if (itemUseAnim.type === 'dew') {
      const p = Math.min(1, itemUseAnim.t / itemUseAnim.duration);
      if (p >= DEW_PHASES.riseEnd && p < DEW_PHASES.chugEnd) {
        if (!itemUseAnim.chugging) {
          itemUseAnim.chugging = true;
          itemUseAnim.chugStartStamina = staminaCurrent;
          playDewChugSound();
        }
        const chugP = (p - DEW_PHASES.riseEnd) / (DEW_PHASES.chugEnd - DEW_PHASES.riseEnd);
        staminaCurrent = Math.min(100, itemUseAnim.chugStartStamina + (100 - itemUseAnim.chugStartStamina) * chugP);
        document.getElementById('stamina-fill').style.width = staminaCurrent + '%';
      } else if (p >= DEW_PHASES.chugEnd) {
        if (itemUseAnim.chugging) {
          itemUseAnim.chugging = false;
          stopDewChugSound();
        }
        staminaCurrent = 100;
        document.getElementById('stamina-fill').style.width = staminaCurrent + '%';
        if (speedBoostTimeLeft <= 0) {
          speedBoostTimeLeft = DEW_SPEED_BOOST_DURATION;
          hahaPendingTimer = 1.0; // fire the "haha" sound exactly 1s from now
        }
      }
    }

    if (itemUseAnim.t >= itemUseAnim.duration) {
      // Battery: charge is applied only once the full swap animation
      // (carry up, insert, retreat off-screen) has finished playing.
      if (itemUseAnim.type === 'battery') {
        batteryCurrent = 100;
        document.getElementById('battery-fill').style.width = batteryCurrent + '%';
      }
      itemUseAnim.active = false;
      itemUseAnim.t = 0;
      itemUseAnim.chugging = false;
      stopDewChugSound();
      updateHandItem();
    }
  }

  if (handMesh && handMesh.material.visible) {
    const moving = keys['w']||keys['s']||keys['a']||keys['d']||keys['arrowup']||keys['arrowdown']||keys['arrowleft']||keys['arrowright'] || (Math.abs(gamepadState.moveX) > 0.05 || Math.abs(gamepadState.moveY) > 0.05);
    const bSpeed = isSprinting ? 12 : (moving ? 7 : 2);
    const bAmt = isSprinting ? 0.03 : (moving ? 0.015 : 0.003);
    handMesh.position.y = -0.22 + Math.sin(elapsed * bSpeed) * bAmt;
    handMesh.position.x = 0.28 + Math.cos(elapsed * bSpeed * 0.5) * (bAmt * 0.6);
  }

  if (flashlightActive && batteryCurrent > 0) {
    batteryCurrent -= BATTERY_DRAIN_RATE * dt;
    if (batteryCurrent <= 0) {
      batteryCurrent = 0;
      flashlightActive = false;
    }
  }
  document.getElementById('battery-fill').style.width = batteryCurrent + '%';

  if (flashlightActive && batteryCurrent > 0) {
    flashlight.visible = true;
    flashlight.position.set(player.x, 1.55, player.z);
    
    const lookX = -Math.sin(player.yaw) * Math.cos(player.pitch);
    const lookY = Math.sin(player.pitch);
    const lookZ = -Math.cos(player.yaw) * Math.cos(player.pitch);
    flashlight.target.position.set(player.x + lookX, 1.55 + lookY, player.z + lookZ);

    if (batteryCurrent < 15) {
      flashlight.intensity = 4.5 * (batteryCurrent / 15);
    } else {
      flashlight.intensity = 4.5;
    }
  } else {
    flashlight.visible = false;
  }

  const currentlyWalking = gameStarted && !isDead && (
    keys['w'] || keys['s'] || keys['a'] || keys['d'] || keys['arrowup'] || keys['arrowdown'] ||
    Math.abs(gamepadState.moveX) > 0.1 || Math.abs(gamepadState.moveY) > 0.1
  );

  if (currentlyWalking) {
    if (!isWalking) {
      isWalking = true;
      footstepsAudio.currentTime = 0;
      footstepsAudio.play().catch(err => console.warn(err));
    }
    footstepsAudio.playbackRate = isSprinting ? 1.5 : 1.0;
  } else {
    if (isWalking) {
      isWalking = false;
      footstepsAudio.pause();
    }
  }

  if (!isDead && isCollidingWithWeegee()) {
    killPlayer("You walked into Weegee!");
    return;
  }
  if (!isDead && isLookingAtWeegee()) {
    killPlayer("You looked into Weegee's eyes!");
    return;
  }

  camera.position.set(player.x, 1.55 + computeViewBob(elapsed, currentlyWalking && !playerSlipState.active) - playerSlipState.heightDrop, player.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  // During slip: pitch is set by updatePlayerSlip, not clamped here
  camera.rotation.x = player.pitch;
  camera.rotation.z = playerSlipState.active
    ? playerSlipState.roll
    : (currentlyWalking ? Math.sin(elapsed * (isSprinting ? 14 : 8)) * (isSprinting ? 0.022 : 0.01) : 0);

  // Keep the skybox centred on the player so it always fills the horizon.
  // Also spin it slowly — one full revolution every ~120 s for drifting clouds.
  const skybox = scene.getObjectByName('skybox');
  if (skybox) {
    skybox.position.set(player.x, 0, player.z);
    skybox.rotation.y += dt * (Math.PI * 2 / 180);
  }

  scene.children.filter(c => c.isPointLight && c !== scene.children[0] && c !== flashlight).forEach(l => {
    l.position.set(player.x, 1.5, player.z);
  });

  if (armsCanvas && armsCtx) drawArms(armsCanvas, armsCtx);

  renderer.render(scene, camera);
}

document.addEventListener('keydown', e => { 
  keys[e.key.toLowerCase()] = true; 
  if (e.key === ' ' && isDead) {
    restartGame();
  }
  
  if (e.key.toLowerCase() === 'f') {
    toggleFlashlight();
  }

  if(['1','2','3','4','5'].includes(e.key)) {
    selectedSlot = parseInt(e.key) - 1;
    updateInventoryUI();
  }

  if(e.key.toLowerCase() === 'q') {
    tryPickupItem();
  }

  // Keyboard Pause Toggle hook logic
  if(e.key.toLowerCase() === 'p') {
    togglePause();
  }

  if ((e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') && !isDead && gameStarted && !isPaused) {
    for (const s of stairPositions) {
      const dx = s.x - player.x, dz = s.z - player.z;
      if (dx*dx + dz*dz < 1.44) {
        climbStairs();
        break;
      }
    }
  }
});
document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

window.addEventListener('wheel', e => {
  if (!gameStarted || isDead || isPaused) return;
  if (e.deltaY > 0) {
    selectedSlot = (selectedSlot + 1) % 5;
  } else if (e.deltaY < 0) {
    selectedSlot = (selectedSlot - 1 + 5) % 5;
  }
  updateInventoryUI();
});

let pointerLocked = false;
document.addEventListener('click', (e) => {
  // Gameplay pointer-lock/use-item clicks should only come from the canvas
  // itself — otherwise a click on any UI button/link that bubbles up to
  // document (e.g. a hotbar slot) could also be treated as a gameplay click
  // and fire a redundant requestPointerLock()/useCurrentItem() call.
  if (e.target.id !== 'gameCanvas') return;
  if (gameStarted && !isPaused) {
    if (!pointerLocked) {
      const lockPromise = document.getElementById('gameCanvas').requestPointerLock();
      if (lockPromise && typeof lockPromise.catch === 'function') {
        lockPromise.catch((err) => {
          if (err.name === 'SecurityError') {
            console.warn("Pointer lock blocked: standard browser cooldown active.");
          }
        });
      }
    } else {
      if (e.button === 0) {
        useCurrentItem();
      }
    }
  }
});

document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === document.getElementById('gameCanvas');
  // Auto-pause if pointer lock dropped externally by desktop browsers focus shifts
  if (!pointerLocked && gameStarted && !isDead && !isPaused) {
    togglePause();
  }
});

document.addEventListener('mousemove', e => {
  if (!pointerLocked || !gameStarted || isPaused) return;
  if (playerSlipState.active) return; // can't look while slipped
  player.yaw -= e.movementX * 0.002;
  player.pitch -= e.movementY * 0.002;
  player.pitch = Math.max(-0.8, Math.min(0.8, player.pitch));
});


window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  const ac = document.getElementById('arms-overlay');
  if (ac) { ac.width = window.innerWidth; ac.height = window.innerHeight; }
});

// Track whether the warm PointLight has been added so we never add it twice
let _startLightAdded = false;

// Builds/rebuilds floor 0 and reveals the mansion. Only ever called once the
// wall/floor/ceiling/skybox/window-wall textures have actually finished
// loading (sceneTexturesReady), so the player never gets a frame of the bare
// skybox with no maze around it. See the start-btn click handler below and
// onSceneTexLoaded() in initThree() for the two ways this gets invoked.
function startGame() {
  // ── Full state reset so re-entering from Main Menu works identically
  //    to the very first play-through ──────────────────────────────────
  isDead = false;
  isPaused = false;
  currentFloor = 0;
  lookAwayActive = false;
  weegeeActive = false;

  stakeFloor = Math.floor(Math.random() * FLOOR_COUNT);
  selectedSlot = 0;
  isWeegeeBanished = false;
  weegeeBanishAnim.active = false;
  weegeeBanishAnim.t = 0;
  weegeeBanishAnim.screamPlayed = false;
  if (banishCircleMesh) { banishCircleMesh.visible = false; banishCircleMesh.material.opacity = 0; }
  banishTendrils.forEach(m => { m.visible = false; m.material.opacity = 0; m.userData.active = false; });
  banishSpawnAccum = 0;
  if (banishLight) { banishLight.visible = false; banishLight.intensity = 0; }
  itemUseAnim.active = false;
  itemUseAnim.t = 0;
  itemUseAnim.chugging = false;
  stopDewChugSound();
  resetHahaPending();
  playerSlipState.active = false; playerSlipState.t = 0; player.pitch = 0; playerSlipState.roll = 0; playerSlipState.heightDrop = 0;
  weegeeSlipState.active = false; weegeeSlipState.t = 0;
  weegeePlungerStuck.active = false; weegeePlungerStuck.t = 0; weegeePlungerStuck.duration = 0;
  if (weegeePlane) { weegeePlane.rotation.x = 0; weegeePlane.position.y = 1.4; }
  staminaCurrent = 100;
  batteryCurrent = 100;
  flashlightActive = true;
  isSprinting = false;
  speedBoostTimeLeft = 0;
  inventory = [null, null, null, null, null];

  overlayEl.style.background = 'rgba(0,0,0,0)';
  warningEl.style.display = 'none';
  document.getElementById('timer-bar-wrap').style.display = 'none';

  if (weegeeVoiceAudio && weegeeVoicePlaying) {
    weegeeVoiceAudio.pause();
    weegeeVoicePlaying = false;
  }
  weegeeVoiceCooldown = WEEGEE_AUDIO_COOLDOWN_MIN + Math.random() * (WEEGEE_AUDIO_COOLDOWN_MAX - WEEGEE_AUDIO_COOLDOWN_MIN);

  // Rebuild floor 0 — this spawns the maze geometry, walls, items, and
  // positions the player/Weegee correctly whether this is the first run
  // or a re-entry after quitToMainMenu().
  buildFloorScene(0);

  // Only reveal the canvas now that the maze actually has geometry on it —
  // otherwise, on a slow first load, the player would see a frame or two of
  // the bare skybox with no walls/floor before they pop in.
  document.getElementById('start-screen').style.display = 'none';

  gameStarted = true;
  clock.start();

  bgMusic.currentTime = 0;
  bgMusic.play().catch(err => console.warn("Audio play blocked until interaction:", err));

  document.getElementById('stamina-wrap').style.display = 'flex';
  document.getElementById('hotbar-wrap').style.display = 'flex';

  // Add the warm ambient PointLight only once — it stays in the scene
  // permanently and doesn't need to be re-added on subsequent plays.
  if (!_startLightAdded) {
    const fl = new THREE.PointLight(0xffddaa, 1.0, 10);
    fl.position.set(player.x, 1.5, player.z);
    scene.add(fl);
    _startLightAdded = true;
  }

  updateInventoryUI();

  const lockPromise = document.getElementById('gameCanvas').requestPointerLock();
  if (lockPromise && typeof lockPromise.catch === 'function') {
    lockPromise.catch(() => {});
  }
}

document.getElementById('start-btn').addEventListener('click', (e) => {
  // Clicking this button flips gameStarted to true. If that click event were
  // allowed to keep bubbling, it would reach the document-level 'click'
  // listener (used for in-game pointer-lock/use-item clicks) in the same
  // dispatch, which would then see gameStarted already true and fire a
  // second, redundant requestPointerLock() call before the first one has
  // resolved — which is what was causing pointer lock to immediately drop
  // and the pause menu to pop open the instant the mansion loaded.
  e.stopPropagation();

  if (!sceneTexturesReady) {
    // First-ever load on a slow connection: textures may still be loading.
    // Don't build/reveal the maze yet — onSceneTexLoaded() will call
    // startGame() itself the moment everything is actually ready.
    pendingGameStart = true;
    return;
  }
  startGame();
});

window.climbStairs = climbStairs;
window.restartGame = restartGame;
window.toggleFlashlight = toggleFlashlight;
window.useItemSlot = useItemSlot;
window.togglePause = togglePause;
window.quitToMainMenu = quitToMainMenu;

warningEl = document.getElementById('warning');
overlayEl = document.getElementById('overlay');
timerBarWrap = document.getElementById('timer-bar-wrap');
timerFill = document.getElementById('timer-fill');
armsCanvas = document.getElementById('arms-overlay');
armsCtx = armsCanvas.getContext('2d');
armsCanvas.width = window.innerWidth;
armsCanvas.height = window.innerHeight;

initThree();
gameLoop();
// ═══════════════════════════════════════════════════════════════════════════════
// WEATHER SYSTEM — Ambient rain, thunder & lightning outside Weegee's mansion
// ───────────────────────────────────────────────────────────────────────────────
// Rain particles live entirely OUTSIDE the maze bounding box in world space
// (below the skybox sphere, above the roofline).  They are only visible when
// the player looks through a window-wall.  The particle positions are reset
// each frame so they appear to fall continuously past every window.
//
// Lightning flashes are gated by the player's proximity to any outer edge:
//   distToEdge = min(px, pz, totalW-px, totalH-pz)
//   If distToEdge > WEATHER_OUTER_DIST  → completely invisible & muted
//   If distToEdge ≤ WEATHER_OUTER_DIST  → lerps to full brightness / volume
//
// All three audio sources (rain loop, flash sting) share a single GainNode
// that is driven each frame by the proximity calculation.
// ═══════════════════════════════════════════════════════════════════════════════

(function () {

  // ── Constants ───────────────────────────────────────────────────────────────
  // World-space totals (must match MAZE_W/H * CELL from the main file).
  const W_TOTAL = 11 * 4;   // MAZE_W * CELL
  const H_TOTAL = 11 * 4;   // MAZE_H * CELL

  // Player must be within this many world units of an outer wall before rain
  // audio or lightning are perceptible.  2.5 × CELL ≈ 2.5 corridor widths.
  const WEATHER_OUTER_DIST = 10;

  // Rain particle cloud dimensions (world units).
  // X/Z span is wider than the maze so rain fills every window angle.
  const RAIN_SPAN_X   = W_TOTAL + 30;
  const RAIN_SPAN_Z   = H_TOTAL + 30;
  const RAIN_Y_TOP    = 28;      // top of fall (above roof)
  const RAIN_Y_BOTTOM = -2;      // bottom of fall (below floor)
  const RAIN_COUNT    = 1800;
  const RAIN_SPEED    = 18;      // world units per second (downward)
  const RAIN_SIZE     = 0.12;    // point size (world units, before perspective)

  // Lightning timing
  const LIGHTNING_INTERVAL_MIN = 6;   // seconds between flash attempts
  const LIGHTNING_INTERVAL_MAX = 18;
  const LIGHTNING_FLASH_DUR    = 0.18; // seconds a single flash lasts

  // Raindrop texture size hint (asset is 700×700, we sample it at runtime)
  // Three.js PointsMaterial handles the actual display size via `size`.

  // ── State ───────────────────────────────────────────────────────────────────
  let weatherReady     = false;    // becomes true after textures/audio load
  let rainParticles    = null;     // THREE.Points
  let rainPositions    = null;     // Float32Array backing the geometry
  let lightningLight   = null;     // THREE.AmbientLight used for flashes
  let lightningTimer   = LIGHTNING_INTERVAL_MIN + Math.random() * (LIGHTNING_INTERVAL_MAX - LIGHTNING_INTERVAL_MIN);
  let lightningActive  = false;
  let lightningT       = 0;

  // Flash overlay (full-screen white div, opacity-driven)
  let flashOverlay     = null;

  // Web Audio
  let wxAudioCtx       = null;
  let wxMasterGain     = null;     // controls overall weather volume
  let rainAudio        = null;     // Audio element — rain+thunder loop
  let rainSourceNode   = null;     // MediaElementSourceNode for rain
  let lightningAudio   = null;     // Audio element — flash sting (one-shot)
  let lightningSourceNode = null;

  // ── Proximity helper ────────────────────────────────────────────────────────
  // Returns a 0..1 value: 0 = deep inside maze, 1 = right at outer wall.
  function weatherProximityFactor() {
    if (!gameStarted || isDead) return 0;
    const px = player.x;
    const pz = player.z;
    const minDist = Math.min(px, pz, W_TOTAL - px, H_TOTAL - pz);
    // Remap: WEATHER_OUTER_DIST → 1.0,  beyond → 0.0
    const factor = 1 - Math.min(1, Math.max(0, minDist / WEATHER_OUTER_DIST));
    return factor;
  }

  // ── Build flash overlay div ─────────────────────────────────────────────────
  function buildFlashOverlay() {
    flashOverlay = document.createElement('div');
    flashOverlay.id = 'weather-flash-overlay';
    Object.assign(flashOverlay.style, {
      position:       'fixed',
      inset:          '0',
      pointerEvents:  'none',
      background:     '#c8d8ff',   // slightly blue-white lightning colour
      opacity:        '0',
      zIndex:         '800',       // above game canvas, below UI menus (pause ~900)
      transition:     'none',
    });
    document.body.appendChild(flashOverlay);
  }

  // ── Build rain particle system ──────────────────────────────────────────────
  function buildRainParticles() {
    const loader = new THREE.TextureLoader();
    loader.load('Textures/raindrop.png', (tex) => {
      const geo = new THREE.BufferGeometry();
      rainPositions = new Float32Array(RAIN_COUNT * 3);

      // Scatter initial positions randomly across the cloud volume
      for (let i = 0; i < RAIN_COUNT; i++) {
        const i3 = i * 3;
        rainPositions[i3]     = (Math.random() - 0.5) * RAIN_SPAN_X + W_TOTAL / 2;
        rainPositions[i3 + 1] = RAIN_Y_BOTTOM + Math.random() * (RAIN_Y_TOP - RAIN_Y_BOTTOM);
        rainPositions[i3 + 2] = (Math.random() - 0.5) * RAIN_SPAN_Z + H_TOTAL / 2;
      }

      geo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

      const mat = new THREE.PointsMaterial({
        map:          tex,
        size:         RAIN_SIZE,
        sizeAttenuation: true,
        transparent:  true,
        alphaTest:    0.05,
        depthWrite:   false,
        color:        0xaaccff,   // cool blue-white rain tint
        fog:          true,       // fades with scene fog for realism
        blending:     THREE.NormalBlending,
      });

      rainParticles = new THREE.Points(geo, mat);
      rainParticles.name = 'weatherRain';
      rainParticles.renderOrder = 0;
      scene.add(rainParticles);

      weatherReady = true;
    }, undefined, () => {
      // Texture missing — create a simple fallback circle texture
      const canvas2 = document.createElement('canvas');
      canvas2.width = canvas2.height = 16;
      const c2 = canvas2.getContext('2d');
      c2.fillStyle = 'rgba(160,200,255,0.8)';
      c2.beginPath(); c2.arc(8, 8, 6, 0, Math.PI * 2); c2.fill();
      const fallbackTex = new THREE.CanvasTexture(canvas2);

      const geo = new THREE.BufferGeometry();
      rainPositions = new Float32Array(RAIN_COUNT * 3);
      for (let i = 0; i < RAIN_COUNT; i++) {
        const i3 = i * 3;
        rainPositions[i3]     = (Math.random() - 0.5) * RAIN_SPAN_X + W_TOTAL / 2;
        rainPositions[i3 + 1] = RAIN_Y_BOTTOM + Math.random() * (RAIN_Y_TOP - RAIN_Y_BOTTOM);
        rainPositions[i3 + 2] = (Math.random() - 0.5) * RAIN_SPAN_Z + H_TOTAL / 2;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

      const mat = new THREE.PointsMaterial({
        map: fallbackTex, size: RAIN_SIZE * 2, sizeAttenuation: true,
        transparent: true, alphaTest: 0.05, depthWrite: false,
        color: 0xaaccff, fog: true, blending: THREE.NormalBlending,
      });

      rainParticles = new THREE.Points(geo, mat);
      rainParticles.name = 'weatherRain';
      scene.add(rainParticles);
      weatherReady = true;
    });
  }

  // ── Build lightning ambient light ───────────────────────────────────────────
  function buildLightningLight() {
    lightningLight = new THREE.AmbientLight(0xaabbff, 0);
    lightningLight.name = 'weatherLightning';
    scene.add(lightningLight);
  }

  // ── Build Web Audio graph ───────────────────────────────────────────────────
  // Structure:  rainSource ──► wxRainFilter (lowpass) ──► wxMasterGain ──► destination
  //             lightningSource ──────────────────────────────────────► wxMasterGain
  //
  // wxRainFilter.frequency is driven each frame:
  //   deep inside maze  → ~250 Hz  (heavily muffled, heard through thick walls)
  //   right at window   → ~8000 Hz (full crisp rain sound)
  // Lightning bypasses the filter so it always sounds sharp.

  let wxRainFilter = null;

  function buildWeatherAudio() {
    if (!wxAudioCtx) {
      wxAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (wxAudioCtx.state === 'suspended') wxAudioCtx.resume();

    wxMasterGain = wxAudioCtx.createGain();
    wxMasterGain.gain.value = 0;
    wxMasterGain.connect(wxAudioCtx.destination);

    // Lowpass filter for rain muffling — frequency updated each frame
    wxRainFilter = wxAudioCtx.createBiquadFilter();
    wxRainFilter.type = 'lowpass';
    wxRainFilter.frequency.value = 250; // start fully muffled
    wxRainFilter.Q.value = 0.8;         // gentle rolloff, not resonant
    wxRainFilter.connect(wxMasterGain);

    // Rain + thunder loop -> through the lowpass filter
    rainAudio = new Audio('Audio/Ambient/rain-thunder.mp3');
    rainAudio.loop = true;
    rainAudio.volume = 1;
    rainSourceNode = wxAudioCtx.createMediaElementSource(rainAudio);
    rainSourceNode.connect(wxRainFilter);
    rainAudio.play().catch(() => {});

    // Lightning sting -> direct to master (bypass filter, stays sharp)
    lightningAudio = new Audio('Audio/Ambient/lightning-flash.mp3');
    lightningAudio.loop = false;
    lightningAudio.volume = 1;
    lightningSourceNode = wxAudioCtx.createMediaElementSource(lightningAudio);
    lightningSourceNode.connect(wxMasterGain);
  }

  // Helper: play lightning sting from the beginning
  function playLightningStrike() {
    if (!lightningAudio) return;
    try {
      lightningAudio.currentTime = 0;
      lightningAudio.play().catch(() => {});
    } catch(e) {}
  }

  // ── Helper: pause all weather audio elements immediately ───────────────────
  function pauseWeatherAudio() {
    if (rainAudio && !rainAudio.paused) rainAudio.pause();
    if (lightningAudio && !lightningAudio.paused) lightningAudio.pause();
    if (wxMasterGain) wxMasterGain.gain.value = 0;
    // Kill any active flash visuals too
    lightningActive = false;
    lightningT      = 0;
    if (lightningLight) lightningLight.intensity = 0;
    if (flashOverlay)   flashOverlay.style.opacity = '0';
  }

  // ── Per-frame update ────────────────────────────────────────────────────────
  function updateWeather(dt) {
    if (!gameStarted || isDead || isPaused) {
      // Fully pause audio element (gain=0 alone still keeps it buffering)
      pauseWeatherAudio();
      return;
    }

    const proximity = weatherProximityFactor();

    // ── 1. Rain particle movement ──────────────────────────────────────────
    if (weatherReady && rainPositions) {
      for (let i = 0; i < RAIN_COUNT; i++) {
        const i3 = i * 3;
        rainPositions[i3 + 1] -= RAIN_SPEED * dt;
        if (rainPositions[i3 + 1] < RAIN_Y_BOTTOM) {
          // Wrap to top, randomise X/Z so it feels continuous
          rainPositions[i3]     = (Math.random() - 0.5) * RAIN_SPAN_X + W_TOTAL / 2;
          rainPositions[i3 + 1] = RAIN_Y_TOP;
          rainPositions[i3 + 2] = (Math.random() - 0.5) * RAIN_SPAN_Z + H_TOTAL / 2;
        }
      }
      rainParticles.geometry.attributes.position.needsUpdate = true;
    }

    // ── 2. Audio gain + rain muffling filter ─────────────────────────────
    // Volume: always audible — baseline 0.18 deep inside, up to 0.85 at window.
    // Filter: 300 Hz muffled far away, opens to 8000 Hz near a window wall.
    if (wxMasterGain) {
      const RAIN_VOL_MIN = 0.18;
      const RAIN_VOL_MAX = 0.85;
      const target  = RAIN_VOL_MIN + (RAIN_VOL_MAX - RAIN_VOL_MIN) * proximity;
      const current = wxMasterGain.gain.value;
      wxMasterGain.gain.value = current + (target - current) * Math.min(1, dt * 3);
    }
    if (wxRainFilter) {
      // Quadratic ease so muffling lifts noticeably as you approach a window.
      const filterTarget = 300 + (8000 - 300) * (proximity * proximity);
      const currentFreq  = wxRainFilter.frequency.value;
      wxRainFilter.frequency.value = currentFreq + (filterTarget - currentFreq) * Math.min(1, dt * 2.5);
    }

    // ── 3. Lightning ──────────────────────────────────────────────────────
    // Quadratic proximity curve: flash strength falls off very steeply as
    // the player moves away from the outer wall, so it's only visible when
    // genuinely right next to a window. Threshold raised to 0.6 (was 0.15).
    const lightningProximity = proximity * proximity; // quadratic — steep falloff

    if (!lightningActive) {
      lightningTimer -= dt;
      if (lightningTimer <= 0 && proximity > 0.6) {
        // Trigger a flash — player is close enough to an outer wall
        lightningActive = true;
        lightningT      = 0;
        playLightningStrike();
        // Schedule next flash
        lightningTimer = LIGHTNING_INTERVAL_MIN + Math.random() * (LIGHTNING_INTERVAL_MAX - LIGHTNING_INTERVAL_MIN);
      } else if (lightningTimer <= 0) {
        // Player is too deep inside — reset timer and wait
        lightningTimer = 2 + Math.random() * 3;
      }
    }

    if (lightningActive) {
      lightningT += dt;
      const p = lightningT / LIGHTNING_FLASH_DUR;

      // Sharp rise then exponential decay
      const intensity = p < 0.1
        ? p / 0.1                              // 0 → 1 in first 10% of flash
        : Math.max(0, 1 - (p - 0.1) / 0.9);  // 1 → 0 over remaining 90%

      // Use quadratic proximity so flash strength drops off very sharply
      // the further the player is from the outer wall.
      const scaledIntensity = intensity * lightningProximity;

      if (lightningLight) lightningLight.intensity = scaledIntensity * 6.0;
      if (flashOverlay)   flashOverlay.style.opacity = (scaledIntensity * 0.55).toFixed(3);

      if (lightningT >= LIGHTNING_FLASH_DUR) {
        lightningActive = false;
        if (lightningLight) lightningLight.intensity = 0;
        if (flashOverlay)   flashOverlay.style.opacity = '0';
      }
    }
  }

  // ── Pause audio when game is paused ─────────────────────────────────────────
  const _origTogglePause = window.togglePause;
  window.togglePause = function () {
    _origTogglePause();
    if (isPaused) {
      // isPaused is now true — kill weather audio immediately
      pauseWeatherAudio();
    } else if (gameStarted && !isDead) {
      // Unpausing — resume the rain loop
      if (rainAudio) rainAudio.play().catch(() => {});
    }
  };

  // ── Stop audio on quit/death/victory ────────────────────────────────────────
  const _origQuitToMainMenu = window.quitToMainMenu;
  window.quitToMainMenu = function () {
    pauseWeatherAudio();
    if (rainAudio) rainAudio.currentTime = 0;
    if (lightningAudio) lightningAudio.currentTime = 0;
    _origQuitToMainMenu();
  };

  const _origRestartGame = window.restartGame;
  if (_origRestartGame) {
    window.restartGame = function () {
      pauseWeatherAudio();
      if (rainAudio) rainAudio.currentTime = 0;
      _origRestartGame();
      // Resume rain loop once the game has restarted and gameStarted is true
      if (rainAudio) rainAudio.play().catch(() => {});
    };
  }

  // ── Hook into the game loop ──────────────────────────────────────────────────
  // We patch renderer.render — it's called exactly once per frame at the very
  // end of gameLoop(), so running our update right before the render is safe
  // and guaranteed to stay in sync regardless of any future refactoring.
  const _origRender = renderer.render.bind(renderer);
  renderer.render = function (sceneArg, cameraArg) {
    // dt approximation: use the clock delta.  We call getDelta() but it's
    // been consumed by the main loop already, so we derive from clock elapsed.
    // Instead we store the last elapsed time and diff it.
    const now = performance.now() / 1000;
    const dt  = Math.min(now - (renderer._wxLastTime || now), 0.05);
    renderer._wxLastTime = now;
    updateWeather(dt);
    _origRender(sceneArg, cameraArg);
  };

  // ── Initialise on page load ──────────────────────────────────────────────────
  // We wait for the DOM start-button click (same user gesture the main code
  // uses) so the AudioContext is created legally after an interaction.
  document.getElementById('start-btn').addEventListener('click', () => {
    // Small delay to let initThree / buildFloorScene run first so `scene` exists
    setTimeout(() => {
      buildFlashOverlay();
      buildRainParticles();
      buildLightningLight();
      buildWeatherAudio();
    }, 200);
  });

})();
// ── End Weather System ────────────────────────────────────────────────────────
// ── Tab Menu Navigation ────────────────────────────────────────────────────────
function switchTab(tab) {
  // Update tab button states
  document.querySelectorAll('.menu-tab').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.menu-tab').forEach(btn => {
    if (btn.getAttribute('onclick') === `switchTab('${tab}')`) btn.classList.add('active');
  });
  // Show/hide panels
  ['info', 'controls', 'items', 'about'].forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (el) el.style.display = (t === tab) ? '' : 'none';
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ── DualShock 4 / Standard Gamepad Support ───────────────────────────────────
// Runs entirely on its own requestAnimationFrame loop so it works whether the
// game is on the start screen, paused, dead, or actively playing. It never
// writes into `keys`, and it only ever ADDS onto `gamepadState`, which the
// movement / look / item code above reads from alongside (never instead of)
// keyboard and mouse input. Unplugging a controller, or never plugging one
// in, changes nothing about keyboard/mouse play.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  const DEADZONE = 0.18;
  window._GAMEPAD_LOOK_SENSITIVITY = 2.6;

  function applyDeadzone(v) {
    return Math.abs(v) < DEADZONE ? 0 : v;
  }

  // Standard Gamepad button indices (this is exactly how a DS4 reports over
  // both USB and Bluetooth in Chrome/Edge/Firefox once it's recognized as a
  // "Standard Gamepad", which is the case for all modern browsers):
  const BTN = {
    CROSS: 0, CIRCLE: 1, SQUARE: 2, TRIANGLE: 3,
    L1: 4, R1: 5, L2: 6, R2: 7, SHARE: 8, OPTIONS: 9,
    L3: 10, R3: 11,
    DPAD_UP: 12, DPAD_DOWN: 13, DPAD_LEFT: 14, DPAD_RIGHT: 15, PS: 16
  };

  let prevButtons = [];
  let padIndex = null;

  // ── On-screen DualShock control tooltip ────────────────────────────────────
  // Shown only while a controller is *actively* being used (a stick moved or
  // a button pressed) during real gameplay — never on menus, never while
  // paused/dead. The instant the player
  // touches a key or moves the mouse, it's hidden again, even mid-game.
  // Purely additive: only ever toggles display on #gp-tooltip-panel, so it
  // can't affect any existing gameplay, movement, or menu-navigation code.
  let usingGamepad = false;
  const gpTooltipPanel = document.getElementById('gp-tooltip-panel');

  function updateGpTooltipVisibility() {
    if (!gpTooltipPanel) return;
    const menuScreen = getActiveMenuScreen();
    const show = usingGamepad && gameStarted && !isDead && !isPaused && !menuScreen;
    gpTooltipPanel.style.display = show ? 'flex' : 'none';
  }

  function setUsingGamepad(v) {
    if (usingGamepad === v) return;
    usingGamepad = v;
    updateGpTooltipVisibility();
  }

  // Any real keyboard or mouse input immediately switches the tooltip off,
  // even mid-game. These are additional listeners alongside the existing
  // keydown/mousemove/wheel handlers elsewhere in this file — they only
  // read events, never call preventDefault or stopPropagation, so none of
  // the existing input handling is affected.
  document.addEventListener('keydown', () => setUsingGamepad(false));
  document.addEventListener('mousedown', () => setUsingGamepad(false));
  document.addEventListener('wheel', () => setUsingGamepad(false));
  document.addEventListener('mousemove', (e) => {
    if (e.movementX || e.movementY) setUsingGamepad(false);
  });

  window.addEventListener('gamepadconnected', (e) => {
    padIndex = e.gamepad.index;
    gamepadState.connected = true;
    console.log('[Gamepad] Connected:', e.gamepad.id);
  });
  window.addEventListener('gamepaddisconnected', (e) => {
    if (padIndex === e.gamepad.index) {
      padIndex = null;
      gamepadState.connected = false;
      gamepadState.moveX = 0; gamepadState.moveY = 0;
      gamepadState.lookX = 0; gamepadState.lookY = 0;
      gamepadState.sprintToggle = false;
      setUsingGamepad(false);
    }
  });

  // ── Menu / button D-pad navigation ─────────────────────────────────────────
  // Focus is tracked as a (row, col) index into a small "grid" describing
  // whichever menu screen currently has pointer-events enabled. Up/Down move
  // between rows; Left/Right move within a row (and, on the start screen's
  // tab row, actually switches tabs — same as clicking a tab).
  let focusRow = 0, focusCol = 0, lastMenuScreen = null;

  // Inject a focus-highlight style once, so focused buttons/links are
  // visibly distinguishable without touching the existing CSS file.
  const gpStyle = document.createElement('style');
  gpStyle.textContent = `
    .gp-focused {
      outline: 3px solid #00ffcc !important;
      outline-offset: 3px !important;
      box-shadow: 0 0 14px #00ffcc, 0 0 4px #00ffcc inset !important;
    }
  `;
  document.head.appendChild(gpStyle);

  function getActiveMenuScreen() {
    const start = document.getElementById('start-screen');
    const pause = document.getElementById('pause-screen');
    const death = document.getElementById('death-screen');
    const victory = document.getElementById('victory-screen');
    // IMPORTANT: check the real rendered display (getComputedStyle), not the
    // inline style.display property. Pause/death/victory screens are hidden
    // by default via CSS and never get an inline style set until the game
    // code shows/hides them for the first time — until then, .style.display
    // is just "" (not "none"), which would false-positive them as visible.
    const isVisible = (el) => !!el && getComputedStyle(el).display !== 'none';
    if (isVisible(start)) return 'start';
    if (isVisible(pause)) return 'pause';
    if (isVisible(death)) return 'death';
    if (isVisible(victory)) return 'victory';
    return null;
  }

  // Returns an array-of-rows grid of focusable elements for the given menu.
  function getMenuGrid(screen) {
    if (screen === 'start') {
      const tabs = Array.from(document.querySelectorAll('#menu-tabs .menu-tab'));
      const stack = [document.getElementById('start-btn'), document.getElementById('hub-btn')].filter(Boolean);
      return [tabs, stack].filter(row => row.length);
    }
    if (screen === 'pause') {
      const box = document.querySelector('#pause-screen .pause-btn-box');
      if (!box) return [];
      return Array.from(box.children).map(el => [el]);
    }
    if (screen === 'death') {
      const rows = [];
      const main = document.querySelector('#death-screen > button');
      if (main) rows.push([main]);
      const endRow = document.querySelector('#death-screen .end-btn-row');
      if (endRow) rows.push(Array.from(endRow.children));
      return rows;
    }
    if (screen === 'victory') {
      const rows = [];
      const main = document.querySelector('#victory-screen > button.victory-btn');
      if (main) rows.push([main]);
      const endRow = document.querySelector('#victory-screen .end-btn-row');
      if (endRow) rows.push(Array.from(endRow.children));
      return rows;
    }
    return [];
  }

  function clearFocusVisual() {
    document.querySelectorAll('.gp-focused').forEach(el => el.classList.remove('gp-focused'));
  }

  function updateFocusVisual(grid) {
    clearFocusVisual();
    const row = grid[focusRow];
    const el = row && row[focusCol];
    if (el) el.classList.add('gp-focused');
  }

  function activateFocused(grid) {
    const row = grid[focusRow];
    const el = row && row[focusCol];
    if (el) el.click();
  }

  let prevForwardPushed = false;
  let lastGpTime = performance.now();
  const PANEL_SCROLL_SPEED = 480; // px / second at full stick tilt

  function gamepadLoop() {
    requestAnimationFrame(gamepadLoop);

    const now = performance.now();
    const dt = Math.min((now - lastGpTime) / 1000, 0.05);
    lastGpTime = now;

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    if (padIndex !== null) gp = pads[padIndex];
    if (!gp) { for (const p of pads) { if (p) { gp = p; break; } } }

    if (!gp) {
      gamepadState.moveX = 0; gamepadState.moveY = 0;
      gamepadState.lookX = 0; gamepadState.lookY = 0;
      prevButtons = [];
      setUsingGamepad(false);
      return;
    }
    gamepadState.connected = true;

    // ── Sticks ────────────────────────────────────────────────────────────
    gamepadState.moveX = applyDeadzone(gp.axes[0] || 0);
    gamepadState.moveY = applyDeadzone(gp.axes[1] || 0);
    gamepadState.lookX = applyDeadzone(gp.axes[2] || 0);
    gamepadState.lookY = applyDeadzone(gp.axes[3] || 0);

    const menuScreen = getActiveMenuScreen();
    const inGame = gameStarted && !isDead && !isPaused && !menuScreen;

    const pressed = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const justPressed = (i) => pressed(i) && !prevButtons[i];

    // ── Detect active gamepad usage (for the on-screen control tooltip) ─────
    // A stick past its deadzone or any button held counts as "using it";
    // keyboard/mouse listeners set up above flip it back off instantly.
    let gpActivity = gamepadState.moveX !== 0 || gamepadState.moveY !== 0 ||
                      gamepadState.lookX !== 0 || gamepadState.lookY !== 0;
    if (!gpActivity) {
      for (let i = 0; i < gp.buttons.length; i++) {
        if (pressed(i)) { gpActivity = true; break; }
      }
    }
    if (gpActivity) setUsingGamepad(true);

    // ── Face buttons: mirror keyboard/mouse actions exactly ─────────────────
    if (justPressed(BTN.CROSS)) {
      if (menuScreen) activateFocused(getMenuGrid(menuScreen));   // confirm / TRY AGAIN / etc
      else if (inGame) tryPickupItem();                            // same as 'Q'
    }
    if (justPressed(BTN.CIRCLE)) {
      if (inGame) gamepadState.sprintToggle = !gamepadState.sprintToggle; // toggle sprint
    }
    if (justPressed(BTN.SQUARE)) {
      if (inGame) useCurrentItem();                                 // same as left click
    }
    if (justPressed(BTN.TRIANGLE)) {
      if (inGame) toggleFlashlight();                               // same as 'F'
    }
    if (justPressed(BTN.OPTIONS)) {
      if (gameStarted && !isDead) togglePause();                    // same as 'P'
    }
    if (justPressed(BTN.L1)) {
      if (inGame) { selectedSlot = (selectedSlot - 1 + 5) % 5; updateInventoryUI(); } // same as scroll up
    }
    if (justPressed(BTN.R1)) {
      if (inGame) { selectedSlot = (selectedSlot + 1) % 5; updateInventoryUI(); }     // same as scroll down
    }

    // ── Forward-stick stair climbing (mirrors W/ArrowUp near stairs) ────────
    if (inGame) {
      const forwardPushed = gamepadState.moveY < -0.5;
      if (forwardPushed && !prevForwardPushed) {
        for (const s of stairPositions) {
          const dx = s.x - player.x, dz = s.z - player.z;
          if (dx * dx + dz * dz < 1.44) { climbStairs(); break; }
        }
      }
      prevForwardPushed = forwardPushed;
    } else {
      prevForwardPushed = false;
    }

    // ── Right stick — scroll the active start-screen tab panel ──────────────
    // Only meaningful on the main menu (gameplay camera-look owns the right
    // stick during actual play, and gameLoop never even reads gamepadState
    // while the start screen is up since it early-returns until gameStarted
    // is true). Panels are CSS overflow-y:auto, so this just drives scrollTop
    // proportionally to stick tilt — smooth and framerate-independent.
    if (menuScreen === 'start' && gamepadState.lookY !== 0) {
      const panels = document.querySelectorAll('#start-screen .menu-panel');
      let activePanel = null;
      for (const p of panels) {
        if (p.style.display !== 'none') { activePanel = p; break; }
      }
      if (activePanel) {
        const maxScroll = activePanel.scrollHeight - activePanel.clientHeight;
        if (maxScroll > 0) {
          activePanel.scrollTop = Math.max(0, Math.min(maxScroll,
            activePanel.scrollTop + gamepadState.lookY * PANEL_SCROLL_SPEED * dt));
        }
      }
    }

    // ── D-pad menu navigation ────────────────────────────────────────────────
    if (menuScreen) {
      if (menuScreen !== lastMenuScreen) {
        focusRow = 0; focusCol = 0; lastMenuScreen = menuScreen;
      }
      const grid = getMenuGrid(menuScreen);
      if (grid.length) {
        if (justPressed(BTN.DPAD_DOWN)) {
          focusRow = Math.min(grid.length - 1, focusRow + 1);
          focusCol = Math.min(grid[focusRow].length - 1, focusCol);
        }
        if (justPressed(BTN.DPAD_UP)) {
          focusRow = Math.max(0, focusRow - 1);
          focusCol = Math.min(grid[focusRow].length - 1, focusCol);
        }
        if (justPressed(BTN.DPAD_RIGHT) || justPressed(BTN.DPAD_LEFT)) {
          const dir = justPressed(BTN.DPAD_RIGHT) ? 1 : -1;
          const row = grid[focusRow];
          if (menuScreen === 'start' && focusRow === 0) {
            // Tab row: stepping left/right actually switches the active tab.
            focusCol = (focusCol + dir + row.length) % row.length;
            row[focusCol].click();
          } else {
            focusCol = Math.max(0, Math.min(row.length - 1, focusCol + dir));
          }
        }
        updateFocusVisual(grid);
      }
    } else {
      if (lastMenuScreen !== null) { clearFocusVisual(); lastMenuScreen = null; }
    }

    updateGpTooltipVisibility();
    prevButtons = gp.buttons.map(b => b.pressed);
  }

  requestAnimationFrame(gamepadLoop);
})();
// ── End Gamepad Support ──────────────────────────────────────────────────────