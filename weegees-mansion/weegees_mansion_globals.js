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
    'Item-Sprites/mario-plush.png',
    'Item-Sprites/shroom.png',
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
let gamepadState = { moveX: 0, moveY: 0, lookX: 0, lookY: 0, sprintToggle: false, sneakToggle: false, connected: false };
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
let stairPositions = [];
let walls3D = [];
let overlayEl;
let armsCanvas, armsCtx;
let flashTimer = 0;
let weegeeActive = false;
let weegeeSpawnTimer = 0;

// Audio Session Playback Volatile Tracking Stacks
let wasMusicPlaying = false;
let wasFootstepsPlaying = false;

// Flashlight Mechanics Variables
let flashlight;
let playerLight = null;
let ambientLight = null;
let flashlightActive = true;
let batteryCurrent = 100;
const BATTERY_DRAIN_RATE = 100 / 30; // battery lasts exactly 30 seconds

const PLAYER_LIGHT_BASE_INTENSITY = 0.03;
const PLAYER_LIGHT_MAX_INTENSITY = 0.18;
const AMBIENT_LIGHT_BASE_INTENSITY = 0.08;
const AMBIENT_LIGHT_MAX_INTENSITY = 0.35;

// Stamina Management Settings
let staminaCurrent = 100;
let isSprinting = false;
const STAMINA_DRAIN_RATE = 5.0; 
const STAMINA_REGEN_RATE = 12.0;

// ── Sneak System ──────────────────────────────────────────────────────────────
// Hold Left Ctrl (keyboard) or DPAD_DOWN (gamepad) to sneak.
// Sneak lowers the camera, forces 75% walk speed, disables sprinting,
// and silences normal footsteps (but NOT puddle footsteps — wet floors
// give you away regardless). Toggled by held key/button each frame.
let isSneaking = false;
const SNEAK_SPEED_MULT   = 0.75;  // 75% of base walk speed while sneaking
const SNEAK_CAMERA_DROP  = 0.35;  // world units the camera drops while crouching

// ── Sound-reactive Weegee hearing ─────────────────────────────────────────────
// Weegee "hears" the player's footsteps and navigates toward the last-heard
// cell when wandering. Normal walking: heard within WEEGEE_HEAR_WALK units.
// Sprinting (any surface): heard within WEEGEE_HEAR_SPRINT units.
// Sneaking on a dry floor: completely silent — radius 0.
// Puddle footsteps: always audible at walk radius regardless of sneak.
const WEEGEE_HEAR_WALK   = 22;   // world units — normal walking radius
const WEEGEE_HEAR_SPRINT = 30;   // world units — any sprint footstep radius

// Cooldown (seconds) between hearing-update checks. Prevents running the
// cell-lookup every single frame — only re-evaluates a few times per second.
const WEEGEE_HEAR_INTERVAL = 1.5;
let   weegeeHearTimer      = 0;   // counts down; fires a hearing check when ≤ 0

// The cell (col/row) that Weegee last heard the player in.
// null = no sound memory this floor.
let weegeeLastHeardCell = null;    // { col, row } | null

// How long (seconds) Weegee will investigate a heard cell before giving up.
const WEEGEE_INVESTIGATE_TIMEOUT = 5.0;
let   weegeeInvestigateTimer = 0;  // counts up while state === 'investigating'

// Mountain Dew speed boost: drinking a Dew grants a temporary movement
// speed multiplier for a set duration after the chug animation finishes.
let speedBoostTimeLeft = 0;
const DEW_SPEED_BOOST_DURATION = 7.5;
const DEW_SPEED_BOOST_MULT = 1.4;

let shroomEffectTimeLeft = 0;
let shroomFadeWarningPlayed = false;
const SHROOM_EFFECT_DURATION = 15.0;
const SHROOM_EFFECT_FADE = 2.0;

let puddleDecalTexture = null;
let puddleDecalMaskCanvas = null;
let puddleDecalMaskCtx = null;
let puddleDecalMaskImageData = null;
let puddleDecals = [];
const MAX_PUDDLES_PER_FLOOR = 15;
const PUDDLE_DECAL_SIZE = 1.2;
const PUDDLE_DECAL_RADIUS = PUDDLE_DECAL_SIZE / 2;
// Random size bounds for puddle decals (min .. max). Max is half a maze cell.
const MIN_PUDDLE_DECAL_SIZE = 0.6;
const MAX_PUDDLE_DECAL_SIZE = CELL / 2;

// ── Wall decals (blood splatters) ─────────────────────────────────────────
let wallDecalTextures = [];
let wallDecals = [];
const MAX_WALL_DECALS_PER_FLOOR = 20;
// Size bounds for wall decals (width, in world units)
const MIN_WALL_DECAL_SIZE = 0.6;
const MAX_WALL_DECAL_SIZE = 2.0;
// Height bounds for wall decals (height in world units)
const MIN_WALL_DECAL_HEIGHT = 0.6;
const MAX_WALL_DECAL_HEIGHT = 2.0;

// Inventory Arrays and State Global Data Maps
let inventory = [null, null, null, null, null]; 
let selectedSlot = 0;
let stakeFloor = Math.floor(Math.random() * FLOOR_COUNT);
let isWeegeeBanished = false;
let handMesh;
let spawnedItems = [];
let placedPlush = null;
let plushDistraction = { active: false, engaged: false, t: 0, duration: 0, x: 0, z: 0 };
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
  plunger: 0.62,
  plush: 0.75,
  shroom: 1.6
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
  plunger: { id: 'plunger', name: 'Plunger', icon: 'Item-Sprites/plunger-item.png', texture: null },
  plush: { id: 'plush', name: 'Mario Plush', icon: 'Item-Sprites/mario-plush.png', texture: null },
  shroom: { id: 'shroom', name: 'Shroom', icon: 'Item-Sprites/shroom.png', texture: null }
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