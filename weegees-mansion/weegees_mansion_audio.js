let bananaPeelSlipAudio = null;
let bananaPeelFallAudio = null;
let weegeeScreamBananaAudio = null;
let playerMamafckerAudio = null;
let playerWoahAudio = null;
let playerShiverAudio = null;

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
  if (!playerWoahAudio) {
    playerWoahAudio = new Audio('Audio/Player/player-woah.mp3');
    playerWoahAudio.volume = 1;
  }
  if (!playerShiverAudio) {
    playerShiverAudio = new Audio('Audio/Player/player-shiver.mp3');
    playerShiverAudio.volume = 1;
  }
}

function playPlayerWoahSound() {
  initBananaAudio();
  try { playerWoahAudio.currentTime = 0; playerWoahAudio.play().catch(()=>{}); } catch(e) {}
  if (typeof alertWeegeeToSound === 'function') alertWeegeeToSound();
}

function playPlayerShiverSound() {
  initBananaAudio();
  try { playerShiverAudio.currentTime = 0; playerShiverAudio.play().catch(()=>{}); } catch(e) {}
}

function stopCurrentWeegeeVoiceLine() {
  if (weegeeVoiceAudio) {
    try { weegeeVoiceAudio.pause(); weegeeVoiceAudio.currentTime = 0; } catch (e) {}
  }
  weegeeVoicePlaying = false;
  weegeeVoiceCooldown = 0.75;
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
  stopCurrentWeegeeVoiceLine();
  try { weegeeScreamBananaAudio.currentTime = 0; weegeeScreamBananaAudio.play().catch(()=>{}); } catch(e) {}
}
function playBanishScreamGlobal() {
  stopCurrentWeegeeVoiceLine();
  try {
    if (!banishScreamAudio) banishScreamAudio = new Audio('Audio/Weegee/weegee-scream.mp3');
    banishScreamAudio.pause();
    banishScreamAudio.currentTime = 0;
    banishScreamAudio.volume = 1;
    banishScreamAudio.muted = false;
    banishScreamAudio.play().catch(() => {});
  } catch (e) {}
}
function playPlayerMamafckerSound() {
  initBananaAudio();
  try { playerMamafckerAudio.currentTime = 0; playerMamafckerAudio.play().catch(()=>{}); } catch(e) {}
  if (typeof alertWeegeeToSound === 'function') alertWeegeeToSound();
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
  stopCurrentWeegeeVoiceLine();
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
  if (typeof alertWeegeeToSound === 'function') alertWeegeeToSound();
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
footstepsAudio.preload = 'auto';
footstepsAudio.volume = 1;
let puddleFootstepsAudio = new Audio('Audio/Player/puddle-footsteps.mp3');
puddleFootstepsAudio.loop = true;
puddleFootstepsAudio.preload = 'auto';
puddleFootstepsAudio.volume = 1;
let isWalking = false;

let laughAudio = new Audio('Audio/Death-Victory/weegee-evil-laugh.wav');

let yayAudio = new Audio('Audio/Death-Victory/yay.mp3');

// ─── Weegee Spatial Audio System ────────────────────────────────────────────
// To add more voice lines in the future, simply push more filenames into this array.
const WEEGEE_VOICE_LINES = [
  'Audio/Weegee/go-weegee.mp3',
  'Audio/Weegee/obey-weegee-destroy-mario.mp3',
  'Audio/Weegee/weegee-isolated.mp3',
  'Audio/Weegee/im-weegee-number-1.mp3',
  'Audio/Weegee/weegee-hurry-up-already-eh.mp3',
  'Audio/Weegee/weegee-call-out-mario.mp3',
  'Audio/Weegee/weegee-weegee-oh-yeah-oh-yeah.mp3',
  'Audio/Weegee/weegee-laughing-01.mp3',
  'Audio/Weegee/weegee-laughing-02.mp3',
  'Audio/Weegee/weegee-laughing-03.mp3',
  'Audio/Weegee/weegee-call-out-mario-2.mp3',
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