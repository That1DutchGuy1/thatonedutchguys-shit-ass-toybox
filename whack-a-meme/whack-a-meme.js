const canvas = document.getElementById('game-canvas');
const startScreen = document.getElementById('start-screen');
const pauseScreen = document.getElementById('pause-screen');
const gameOverScreen = document.getElementById('game-over');
const errorMessage = document.getElementById('error-message');
const scoreElement = document.getElementById('score');
const timeElement = document.getElementById('time');
const finalScoreElement = document.getElementById('final-score');
const scoreMessage = document.getElementById('score-message');
const durationSelect = document.getElementById('duration');
const mainMenuTheme = document.getElementById('main-menu-theme');
const gameTheme = document.getElementById('game-theme');

// Paths are relative to this page, so shared assets can live in other game folders.
const memePaths = [
  'assets/memes/Trollface.png', 'assets/memes/Pingas.png', '../weegees-mansion/Weegee-Sprites/Weegee_Front.png',
  'assets/memes/Zelda-CD-i.png', 'assets/memes/Ganon-CD-i.png', '../grand-meme-prix/assets/characters/I-M-Meen.png',
  '../hub-assets/windows11-warning-chipmunk.png', "../hub-assets/Mama-Luigi.png", '../grand-meme-prix/assets/characters/Mayor-Cravendish.png',
  'assets/memes/Morshu-CD-i.png', "../meme-claw-machine/memes/Doge.png", '../grand-meme-prix/assets/characters/Duke-Onkled.png',
  'assets/memes/PepeTheFrog.png', '../king-harkinians-personal-chef-simulator/assets/sprites/Link-CD-i.png',
  'assets/memes/Shoop-Da-Whoop.png', 'assets/memes/HotelMario.png', 'assets/memes/overly-attached-girlfriend.png',
  'assets/memes/HotelLuigi.png', 'assets/memes/King-Harkinian-CD-i.png', 'assets/memes/lord-kiro.png',
  'assets/memes/Rickroll.png',  'assets/memes/Gwonam-CD-i.png', 'assets/memes/Impa.png',
  '../grand-meme-prix/assets/characters/Michael-Rosen.png', 'assets/memes/billy-mays.png',
];

// Add audio paths here; each filename should contain its meme sprite's filename.
const memeLinePaths = [
  '../grand-meme-prix/assets/voicelines/doge-hit.mp3', '../grand-meme-prix/assets/voicelines/ganon-hit.mp3',
  '../grand-meme-prix/assets/voicelines/duke-onkled-hit.mp3', '../grand-meme-prix/assets/voicelines/king-harkinian-hit.mp3',
  '../grand-meme-prix/assets/voicelines/michael-rosen-hit.mp3', '../grand-meme-prix/assets/voicelines/morshu-hit.mp3',
  '../grand-meme-prix/assets/voicelines/link-hit.mp3', '../grand-meme-prix/assets/voicelines/mayor-cravendish-hit.mp3',
  '../grand-meme-prix/assets/voicelines/gwonam-hit.mp3', '../grand-meme-prix/assets/voicelines/weegee-hit.mp3',
  '../grand-meme-prix/assets/voicelines/im-meen-hit.mp3', '../grand-meme-prix/assets/voicelines/mama-luigi-hit.mp3',
  '../grand-meme-prix/assets/voicelines/hotel-mario-hit.mp3', '../grand-meme-prix/assets/voicelines/zelda-hit.mp3',
  '../hub-assets/pingas.mp3', '../grand-meme-prix/assets/voicelines/impa-hit.mp3', '../grand-meme-prix/assets/voicelines/lord-kiro-hit.mp3',
  './assets/meme-lines/Billy-Mays.mp3', '../hub-assets/hotel-luigi-spaghetti.mp3', './assets/meme-lines/Trollface.mp3',
  './assets/meme-lines/Chipmunk.mp3', './assets/meme-lines/Pepe.mp3', './assets/meme-lines/Shoop-Da-Whoop.mp3',
];

const audio = {
  hit: document.getElementById('hit-sound'),
  rick: document.getElementById('rick-lol-sound'),
  noScore: document.getElementById('no-score-sound'),
  badScore: document.getElementById('bad-score-sound'),
  mediocreScore: document.getElementById('mediocre-score-sound'),
  goodScore: document.getElementById('good-score-sound'),
  niceScore: document.getElementById('nice-score-sound'),
  excellentScore: document.getElementById('excellent-score-sound')
};

let renderer;
let camera;
let scene;
let cabinet;
let playDeck;
let mallet;
let malletShadow;
let holes = [];
let scoreCanvas;
let scoreContext;
let scoreTexture;
const pressedKeys = new Set();
const textures = new Map();
const shownMemePaths = new Set();
let gamepadMoveX = 0;
let gamepadMoveY = 0;
let gamepadLeftTriggerDown = false;
let gamepadRightTriggerDown = false;
let score = 0;
let time = 60;
let gameRunning = false;
let gamePaused = false;
let endlessMode = false;
let spawnTimeout;
let spawnTimeoutCallback = null;
let spawnTimeoutAt = 0;
let spawnTimeoutRemaining = 0;
let timerInterval;
let pausedAt = 0;
let strikeStartedAt = 0;
let strikeTarget = null;
let strikeResolved = false;
let strikeDirection = 'left';
let lastFrameAt = 0;
const malletPivotOffset = 1.15;
const malletStrikeAngle = 1.25;
const malletHeadCenterHeight = 1.15;
const malletHeadHalfLength = 0.61;
const malletHeadHalfHeight = 0.285;
const malletHeadHalfDepth = 0.25;
const memeHalfWidth = 0.54;
const memePlaneDepthOffset = 0.04;
const hitPadding = 0.05;
const gamepadDeadzone = 0.18;
const aimPosition = { x: 0, y: -0.78 };

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

function playSound(sound) {
  if (!sound) return;
  sound.currentTime = 0;
  sound.play().catch(error => console.warn('Audio playback was blocked:', error));
}

function getAssetName(path) {
  const filename = path.split('/').pop() || '';
  return filename
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/cd[-_ ]?i/g, '')
    .replace(/(?:[-_ ](?:hit|voice(?:[-_ ]?line)?|line))+$/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function findMemeLinePath(memePath) {
  const memeName = getAssetName(memePath);
  const candidates = memeLinePaths
    .filter(Boolean)
    .map(path => ({ path, name: getAssetName(path) }));
  return candidates.find(candidate => candidate.name === memeName)?.path
    || candidates.find(candidate => candidate.name.includes(memeName) || memeName.includes(candidate.name))?.path;
}

function playMemeLine(memePath) {
  const path = findMemeLinePath(memePath);
  if (!path) return;

  const voiceLine = new Audio(path);
  voiceLine.play().catch(error => console.warn(`Meme voice playback was blocked for "${path}":`, error));
}

function makeMarqueeTexture() {
  const signCanvas = document.createElement('canvas');
  signCanvas.width = 1200;
  signCanvas.height = 250;
  const context = signCanvas.getContext('2d');
  context.fillStyle = '#ff7a00';
  context.fillRect(0, 0, signCanvas.width, signCanvas.height);
  context.fillStyle = '#ffe82d';
  context.beginPath();
  for (let i = 0; i < 32; i++) {
    const angle = (Math.PI * 2 * i) / 32;
    const radius = i % 2 ? 110 : 245;
    const x = 600 + Math.cos(angle) * radius;
    const y = 125 + Math.sin(angle) * radius;
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fill();
  context.font = 'bold 112px "Comic Sans MS", "Comic Sans", cursive';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.lineWidth = 22;
  context.strokeStyle = '#25104e';
  context.strokeText('WHACK A MEME!', 600, 128);
  context.fillStyle = '#36f5df';
  context.fillText('WHACK A MEME!', 600, 128);
  context.font = 'bold 37px "Comic Sans MS", "Comic Sans", cursive';
  context.lineWidth = 8;
  context.strokeText('BONK THE INTERNET', 600, 216);
  context.fillStyle = '#fff';
  context.fillText('BONK THE INTERNET', 600, 216);
  const texture = new THREE.CanvasTexture(signCanvas);
  texture.encoding = THREE.sRGBEncoding;
  return texture;
}

function makeDeckTexture() {
  const paintCanvas = document.createElement('canvas');
  paintCanvas.width = 1024;
  paintCanvas.height = 512;
  const context = paintCanvas.getContext('2d');
  const background = context.createLinearGradient(0, 0, 1024, 512);
  background.addColorStop(0, '#9cff25');
  background.addColorStop(0.5, '#35f5bb');
  background.addColorStop(1, '#06c8d8');
  context.fillStyle = background;
  context.fillRect(0, 0, 1024, 512);
  context.fillStyle = '#ff30cf';
  context.fillRect(0, 0, 1024, 30);
  context.fillRect(0, 482, 1024, 30);
  context.fillStyle = '#ff424f';
  context.fillRect(0, 30, 48, 452);
  context.fillRect(976, 30, 48, 452);
  context.fillStyle = '#ffe72c';
  for (let i = 0; i < 16; i++) {
    const x = 70 + i * 58;
    context.beginPath();
    context.arc(x, 15, 7, 0, Math.PI * 2);
    context.arc(x, 497, 7, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = '#a929ff';
  for (let i = 0; i < 7; i++) {
    const y = 62 + i * 62;
    context.fillRect(9, y, 30, 18);
    context.fillRect(985, y, 30, 18);
  }

  const texture = new THREE.CanvasTexture(paintCanvas);
  texture.encoding = THREE.sRGBEncoding;
  return texture;
}

function makeBaseTexture() {
  const paintCanvas = document.createElement('canvas');
  paintCanvas.width = 1000;
  paintCanvas.height = 300;
  const context = paintCanvas.getContext('2d');
  context.fillStyle = '#ff28cc';
  context.fillRect(0, 0, 1000, 300);
  context.fillStyle = '#ffcc27';
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(510, 0);
  context.lineTo(285, 300);
  context.lineTo(0, 300);
  context.fill();
  context.font = 'bold 150px "Comic Sans MS", "Comic Sans", cursive';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineWidth = 22;
  context.strokeStyle = '#32104c';
  context.strokeText('BONK!', 500, 156);
  context.fillStyle = '#b7ff32';
  context.fillText('BONK!', 500, 156);
  const texture = new THREE.CanvasTexture(paintCanvas);
  texture.encoding = THREE.sRGBEncoding;
  return texture;
}

function makeScoreTexture() {
  scoreCanvas = document.createElement('canvas');
  scoreCanvas.width = 1600;
  scoreCanvas.height = 96;
  scoreContext = scoreCanvas.getContext('2d');
  scoreTexture = new THREE.CanvasTexture(scoreCanvas);
  scoreTexture.encoding = THREE.sRGBEncoding;
  drawScoreTexture();
  return scoreTexture;
}

function drawScoreTexture() {
  if (!scoreContext || !scoreTexture) return;
  scoreContext.fillStyle = '#130006';
  scoreContext.fillRect(0, 0, scoreCanvas.width, scoreCanvas.height);
  scoreContext.textAlign = 'center';
  scoreContext.textBaseline = 'middle';
  scoreContext.font = 'bold 66px "Comic Sans MS", "Comic Sans", cursive';
  scoreContext.lineWidth = 5;
  scoreContext.strokeStyle = '#3b0010';
  const timeLabel = gamePaused ? 'PAUSED' : (endlessMode ? '∞' : `${time}s`);
  scoreContext.strokeText(`SCORE ${score}     TIME ${timeLabel}`, 800, 48);
  scoreContext.shadowColor = '#ff173b';
  scoreContext.shadowBlur = 18;
  scoreContext.fillStyle = '#ff2948';
  scoreContext.fillText(`SCORE ${score}     TIME ${timeLabel}`, 800, 48);
  scoreContext.shadowBlur = 0;
  scoreTexture.needsUpdate = true;
}

function updateScoreDisplay() {
  scoreElement.textContent = String(score);
  timeElement.textContent = gamePaused ? 'PAUSED' : (endlessMode ? '∞' : String(time));
  drawScoreTexture();
}

function makeWoodTexture() {
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 256;
  woodCanvas.height = 256;
  const context = woodCanvas.getContext('2d');
  context.fillStyle = '#3a1c12';
  context.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 42; i++) {
    context.strokeStyle = i % 3 ? 'rgba(144, 78, 40, .36)' : 'rgba(20, 8, 5, .45)';
    context.lineWidth = i % 4 === 0 ? 3 : 1;
    context.beginPath();
    const y = i * 6;
    context.moveTo(0, y);
    context.bezierCurveTo(70, y - 9, 180, y + 10, 256, y - 2);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(woodCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.encoding = THREE.sRGBEncoding;
  return texture;
}

function getMemeTexture(path) {
  if (!textures.has(path)) {
    const texture = new THREE.TextureLoader().load(
      path.split('/').map(encodeURIComponent).join('/'),
      undefined,
      undefined,
      () => showError(`Couldn't load ${path}. Check that the meme image is available.`)
    );
    texture.encoding = THREE.sRGBEncoding;
    textures.set(path, texture);
  }
  return textures.get(path);
}

function addBolt(parent, x, y, z) {
  const bolt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.085, 0.035, 16),
    new THREE.MeshStandardMaterial({ color: 0xffd23c, metalness: 0.72, roughness: 0.25 })
  );
  bolt.rotation.x = Math.PI / 2;
  bolt.position.set(x, y, z);
  parent.add(bolt);
}

function createCabinet() {
  const wood = new THREE.MeshStandardMaterial({ color: 0x140720, roughness: 0.62 });
  const edgeWood = new THREE.MeshStandardMaterial({ color: 0x080511, roughness: 0.56 });
  const orange = new THREE.MeshStandardMaterial({
    color: 0xff00a8,
    roughness: 0.34,
    emissive: 0x58002e,
    emissiveIntensity: 0.45
  });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xeaff00,
    metalness: 0.2,
    roughness: 0.28,
    emissive: 0x364500,
    emissiveIntensity: 0.35
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x090512, roughness: 0.88 });
  const cyan = new THREE.MeshStandardMaterial({
    color: 0x00f5ff,
    roughness: 0.3,
    emissive: 0x00444f,
    emissiveIntensity: 0.35
  });

  cabinet = new THREE.Group();
  scene.add(cabinet);

  const upright = new THREE.Mesh(new THREE.BoxGeometry(8.85, 4.25, 1.35), wood);
  upright.position.set(0, 1.73, -1.4);
  cabinet.add(upright);

  const uprightFront = new THREE.Mesh(new THREE.BoxGeometry(8.48, 4.02, 0.16), orange);
  uprightFront.position.set(0, 1.73, -0.67);
  cabinet.add(uprightFront);

  const marqueeFrame = new THREE.Mesh(new THREE.BoxGeometry(8.45, 1.55, 0.22), cyan);
  marqueeFrame.position.set(0, 3.02, -0.55);
  cabinet.add(marqueeFrame);
  const marquee = new THREE.Mesh(
    new THREE.PlaneGeometry(8.05, 1.18),
    new THREE.MeshBasicMaterial({ map: makeMarqueeTexture() })
  );
  marquee.position.set(0, 3.02, -0.425);
  cabinet.add(marquee);

  const scorePanel = new THREE.Mesh(new THREE.BoxGeometry(7.95, 0.77, 0.1), edgeWood);
  scorePanel.position.set(0, 1.92, -0.56);
  cabinet.add(scorePanel);
  const scoreStrip = new THREE.Mesh(new THREE.PlaneGeometry(7.72, 0.57), new THREE.MeshBasicMaterial({ color: 0x18000a }));
  scoreStrip.position.set(0, 1.92, -0.5);
  cabinet.add(scoreStrip);
  const scoreWords = new THREE.Mesh(
    new THREE.PlaneGeometry(7.5, 0.45),
    new THREE.MeshBasicMaterial({ map: makeScoreTexture() })
  );
  scoreWords.position.set(0, 1.92, -0.49);
  cabinet.add(scoreWords);

  for (const x of [-4.12, 4.12]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.2, 1.4), gold);
    rail.position.set(x, 1.72, -1.37);
    cabinet.add(rail);
    for (const y of [0.2, 3.25]) addBolt(cabinet, x, y, -0.6);
  }

  const base = new THREE.Mesh(new THREE.BoxGeometry(8.65, 3, 2.25), cyan);
  base.position.set(0, -2.25, 2.85);
  cabinet.add(base);
  const baseFront = new THREE.Mesh(
    new THREE.BoxGeometry(8.42, 2.7, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0x8cff00,
      roughness: 0.38,
      emissive: 0x244500,
      emissiveIntensity: 0.4
    })
  );
  baseFront.position.set(0, -2.25, 4.035);
  cabinet.add(baseFront);
  const baseArt = new THREE.Mesh(
    new THREE.PlaneGeometry(8.16, 1.24),
    new THREE.MeshBasicMaterial({ map: makeBaseTexture() })
  );
  baseArt.position.set(0, -2.25, 4.102);
  cabinet.add(baseArt);

  const kickPlate = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.34, 0.13), edgeWood);
  kickPlate.position.set(0, -3.66, 4.05);
  cabinet.add(kickPlate);
  const slot = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.34, 0.08), dark);
  slot.position.set(0, -3.38, 4.13);
  cabinet.add(slot);
  const coinSlot = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.09, 0.04), gold);
  coinSlot.position.set(0, -3.35, 4.18);
  cabinet.add(coinSlot);

  const foot = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.22, 1.6), edgeWood);
  foot.position.set(0, -3.92, 2.75);
  cabinet.add(foot);

  const deckWood = new THREE.MeshStandardMaterial({
    color: 0xff00b8,
    roughness: 0.42,
    emissive: 0x50002e,
    emissiveIntensity: 0.35
  });
  playDeck = new THREE.Group();
  playDeck.position.set(0, -0.75, 2);
  playDeck.rotation.x = -Math.PI / 2;
  cabinet.add(playDeck);

  const deckWidth = 8.4;
  const deckDepth = 4.2;
  const columns = [-2.65, 0, 2.65];
  const rows = [1.13, -0.15, -1.43];
  const holeRadius = 0.56;
  const deckShape = new THREE.Shape();
  deckShape.moveTo(-deckWidth / 2, -deckDepth / 2);
  deckShape.lineTo(deckWidth / 2, -deckDepth / 2);
  deckShape.lineTo(deckWidth / 2, deckDepth / 2);
  deckShape.lineTo(-deckWidth / 2, deckDepth / 2);
  deckShape.closePath();

  rows.forEach(y => columns.forEach(x => {
    const cutout = new THREE.Path();
    cutout.absarc(x, y, holeRadius, 0, Math.PI * 2, true);
    deckShape.holes.push(cutout);
  }));

  const deckGeometry = new THREE.ExtrudeGeometry(deckShape, {
    depth: 0.25,
    bevelEnabled: false,
    curveSegments: 32
  });
  const positions = deckGeometry.attributes.position;
  const uvs = deckGeometry.attributes.uv;
  for (let i = 0; i < positions.count; i++) {
    uvs.setXY(i, (positions.getX(i) + deckWidth / 2) / deckWidth, (positions.getY(i) + deckDepth / 2) / deckDepth);
  }
  const deckTexture = makeDeckTexture();
  const deckSurface = new THREE.Mesh(
    deckGeometry,
    new THREE.MeshStandardMaterial({ map: deckTexture, roughness: 0.58, side: THREE.DoubleSide })
  );
  playDeck.add(deckSurface);

  const rails = [
    [0, -deckDepth / 2, deckWidth, 0.16],
    [0, deckDepth / 2, deckWidth, 0.16],
    [-deckWidth / 2, 0, 0.16, deckDepth],
    [deckWidth / 2, 0, 0.16, deckDepth]
  ];
  rails.forEach(([x, y, width, depth]) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(width, depth, 0.38), deckWood);
    rail.position.set(x, y, 0.06);
    playDeck.add(rail);
  });

  const deckBackFiller = new THREE.Mesh(
    new THREE.BoxGeometry(8.35, 0.42, 0.65),
    new THREE.MeshStandardMaterial({
      color: 0xff00b8,
      roughness: 0.4,
      emissive: 0x50002e,
      emissiveIntensity: 0.35
    })
  );
  deckBackFiller.position.set(0, -0.48, -0.345);
  cabinet.add(deckBackFiller);

  const wellMaterial = new THREE.MeshStandardMaterial({ color: 0x100b13, roughness: 0.92, side: THREE.DoubleSide });
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x251535, roughness: 0.84, side: THREE.DoubleSide });
  const rimColors = [
    0xff38dc, 0xeaff32, 0x18f2e0,
    0xff452e, 0xa82cff, 0xffa51e,
    0x20f26a, 0xff3d9b, 0xffeb29
  ];
  holes = [];

  rows.forEach(y => columns.forEach(x => {
    const well = new THREE.Group();
    well.position.set(x, y, 0.25);
    playDeck.add(well);

    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.4, 0.55, 40, 1, true),
      wallMaterial
    );
    wall.rotation.x = Math.PI / 2;
    wall.position.z = -0.29;
    well.add(wall);

    const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.4, 40), wellMaterial);
    bottom.position.z = -0.54;
    well.add(bottom);

    const innerShadow = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.075, 12, 40), dark);
    innerShadow.position.z = 0.015;
    well.add(innerShadow);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: rimColors[holes.length],
      metalness: 0.24,
      roughness: 0.26,
      emissive: rimColors[holes.length],
      emissiveIntensity: 0.28
    });
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.075, 12, 40), rimMaterial);
    lip.position.z = 0.055;
    well.add(lip);

    const mole = new THREE.Mesh(
      new THREE.PlaneGeometry(1.08, 1.08),
      new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide })
    );
    mole.visible = false;
    scene.add(mole);

    const holeState = {
      group: well,
      mole,
      worldPosition: new THREE.Vector3(),
      active: false,
      hit: false,
      rick: false,
      memePath: '',
      rise: 0,
      retreatStartedAt: 0,
      retreatFromY: 0,
      retreatHit: false
    };
    holes.push(holeState);
  }));

  for (const x of [-3.9, 3.9]) {
    addBolt(playDeck, x, -1.96, 0.23);
    addBolt(playDeck, x, 1.96, 0.23);
  }

  const buttonMaterial = new THREE.MeshStandardMaterial({
    color: 0xff1744,
    roughness: 0.24,
    emissive: 0x650016,
    emissiveIntensity: 0.45
  });
  [-0.85, 0, 0.85].forEach(x => {
    const button = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.13, 20), buttonMaterial);
    button.rotation.x = Math.PI / 2;
    button.position.set(x, -1.18, 4.16);
    cabinet.add(button);
  });

  cabinet.visible = false;
  cabinet.updateMatrixWorld(true);
}

function createMallet() {
  mallet = new THREE.Group();
  const grain = makeWoodTexture();
  const woodMaterial = new THREE.MeshStandardMaterial({ map: grain, color: 0x5b321e, roughness: 0.5 });
  const darkWood = new THREE.MeshStandardMaterial({ map: grain, color: 0x392016, roughness: 0.58 });

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.16, 1.15, 18),
    darkWood
  );
  handle.rotation.x = Math.PI / 2;
  handle.position.set(0, 0, 0.6);
  mallet.add(handle);

  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.17, 0.24, 16),
    darkWood
  );
  grip.rotation.x = Math.PI / 2;
  grip.position.set(0, 0, 0.12);
  mallet.add(grip);

  const head = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.46, 0.54), woodMaterial);
  head.position.z = malletHeadCenterHeight;
  mallet.add(head);

  const capMaterial = new THREE.MeshStandardMaterial({ map: grain, color: 0x452216, roughness: 0.55 });
  [-0.55, 0.55].forEach(x => {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.57), capMaterial);
    cap.position.set(x, 0, malletHeadCenterHeight);
    mallet.add(cap);
  });

  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.17, 0.14, 16),
    new THREE.MeshStandardMaterial({ color: 0x7d37aa, roughness: 0.45, metalness: 0.25 })
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0, 0.88);
  mallet.add(collar);

  mallet.rotation.set(0, 0, 0);
  mallet.position.set(aimPosition.x + malletPivotOffset, aimPosition.y, 0.25);
  playDeck.add(mallet);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const context = shadowCanvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 5, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(16, 10, 18, .4)');
  gradient.addColorStop(1, 'rgba(16, 10, 18, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false
  });
  malletShadow = new THREE.Mesh(new THREE.CircleGeometry(0.78, 32), shadowMaterial);
  malletShadow.scale.set(1.2, 0.62, 1);
  malletShadow.position.set(aimPosition.x, aimPosition.y, 0.27);
  playDeck.add(malletShadow);
}

function initialize() {
  if (!window.THREE || !THREE.WebGLRenderer) {
    showError('The bundled 3D engine did not load. Please reload the game.');
    return;
  }

  try {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(66, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 1.4, 9.5);
    camera.lookAt(0, -0.5, 1.85);

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;

    scene.add(new THREE.HemisphereLight(0xfff4ce, 0x542a22, 1.4));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(-5, 8, 10);
    scene.add(keyLight);

    createCabinet();
    createMallet();
    window.addEventListener('resize', resize);
    window.addEventListener('blur', () => pressedKeys.clear());
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('contextmenu', handleContextMenu);
    render();
  } catch (error) {
    console.error('Unable to initialize the 3D game:', error);
    showError('The 3D arcade cabinet could not start. Try a browser with WebGL enabled.');
  }
}

function resize() {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function handleKeyDown(event) {
  if (event.code === 'Escape' && gameRunning) {
    event.preventDefault();
    if (event.repeat) return;
    if (gamePaused) resumeGame();
    else pauseGame();
    return;
  }
  if (event.code === 'Enter' && !gameRunning) {
    if (!startScreen.classList.contains('hidden') || !gameOverScreen.classList.contains('hidden')) startGame();
    return;
  }
  if (!gameRunning || gamePaused) return;
  const key = event.key.toLowerCase();
  if (['w', 'a', 's', 'd'].includes(key)) {
    event.preventDefault();
    pressedKeys.add(key);
  }
}

function handleKeyUp(event) {
  pressedKeys.delete(event.key.toLowerCase());
}

function applyGamepadDeadzone(value) {
  const magnitude = Math.abs(value);
  if (magnitude <= gamepadDeadzone) return 0;
  return Math.sign(value) * (magnitude - gamepadDeadzone) / (1 - gamepadDeadzone);
}

function isDualShock4(gamepad) {
  return /054c|sony|dualshock|wireless controller/i.test(gamepad.id);
}

function isTriggerDown(gamepad, buttonIndex, rawAxisIndex, useRawAxes) {
  const button = gamepad.buttons[buttonIndex];
  if (button && (button.pressed || button.value >= 0.5)) return true;

  // Linux can expose DS4 analog triggers as axes when the browser has no standard mapping.
  return useRawAxes && (gamepad.axes[rawAxisIndex] ?? -1) > 0.1;
}

function pollGamepad() {
  const gamepads = navigator.getGamepads?.();
  const connectedGamepads = gamepads ? Array.from(gamepads).filter(Boolean) : [];
  const gamepad = connectedGamepads.find(isDualShock4) || connectedGamepads[0];
  if (!gamepad) {
    gamepadMoveX = 0;
    gamepadMoveY = 0;
    gamepadLeftTriggerDown = false;
    gamepadRightTriggerDown = false;
    return;
  }

  gamepadMoveX = applyGamepadDeadzone(gamepad.axes[0] ?? 0);
  gamepadMoveY = -applyGamepadDeadzone(gamepad.axes[1] ?? 0);
  const useRawAxes = gamepad.mapping !== 'standard' && isDualShock4(gamepad);
  const leftTriggerDown = isTriggerDown(gamepad, 6, 4, useRawAxes);
  const rightTriggerDown = isTriggerDown(gamepad, 7, 5, useRawAxes);

  if (gameRunning && !gamePaused && leftTriggerDown && !gamepadLeftTriggerDown) whack('left');
  if (gameRunning && !gamePaused && rightTriggerDown && !gamepadRightTriggerDown) whack('right');
  gamepadLeftTriggerDown = leftTriggerDown;
  gamepadRightTriggerDown = rightTriggerDown;
}

function handleMouseDown(event) {
  if (!gameRunning || gamePaused || (event.button !== 0 && event.button !== 2)) return;
  event.preventDefault();
  whack(event.button === 0 ? 'left' : 'right');
}

function handleContextMenu(event) {
  if (gameRunning) event.preventDefault();
}

function findStrikeTarget(direction) {
  const angle = direction === 'left' ? -malletStrikeAngle : malletStrikeAngle;
  const impactCenterX =
    aimPosition.x + malletPivotOffset + Math.sin(angle) * malletHeadCenterHeight;
  const impactHalfWidth =
    Math.abs(Math.cos(angle)) * malletHeadHalfLength +
    Math.abs(Math.sin(angle)) * malletHeadHalfHeight +
    memeHalfWidth +
    hitPadding;
  const impactHalfDepth = malletHeadHalfDepth + memePlaneDepthOffset + hitPadding;

  return holes.find(hole =>
    hole.active &&
    !hole.hit &&
    Math.abs(hole.group.position.x - impactCenterX) <= impactHalfWidth &&
    Math.abs(hole.group.position.y - aimPosition.y) <= impactHalfDepth
  );
}

function whack(direction) {
  if (!gameRunning || gamePaused || strikeStartedAt) return;
  strikeDirection = direction;
  strikeStartedAt = performance.now();
  strikeResolved = false;
  strikeTarget = findStrikeTarget(direction);
}

function hitMeme(hole) {
  hole.hit = true;
  hole.active = false;
  hole.rise = 0;
  hole.retreatStartedAt = performance.now();
  hole.retreatFromY = hole.mole.position.y;
  hole.retreatHit = true;
  playMemeLine(hole.memePath);
  if (hole.rick) {
    if (!endlessMode) {
      time = Math.max(0, time - 3);
      updateScoreDisplay();
    }
    playSound(audio.rick);
    if (!endlessMode && time === 0) endGame();
  } else {
    score++;
    updateScoreDisplay();
    playSound(audio.hit);
  }
}

function scheduleSpawn(callback, delay) {
  window.clearTimeout(spawnTimeout);
  spawnTimeoutCallback = callback;
  spawnTimeoutAt = performance.now() + delay;
  spawnTimeoutRemaining = delay;
  spawnTimeout = window.setTimeout(() => {
    spawnTimeout = undefined;
    spawnTimeoutCallback = null;
    spawnTimeoutAt = 0;
    spawnTimeoutRemaining = 0;
    callback();
  }, delay);
}

function cancelSpawnTimeout() {
  window.clearTimeout(spawnTimeout);
  spawnTimeout = undefined;
  spawnTimeoutCallback = null;
  spawnTimeoutAt = 0;
  spawnTimeoutRemaining = 0;
}

function chooseMemePath() {
  const firstTimeWeight = 1.5;
  const repeatWeight = 1;
  const totalWeight = memePaths.reduce(
    (total, path) => total + (shownMemePaths.has(path) ? repeatWeight : firstTimeWeight),
    0
  );
  let choice = Math.random() * totalWeight;

  for (const path of memePaths) {
    choice -= shownMemePaths.has(path) ? repeatWeight : firstTimeWeight;
    if (choice < 0) return path;
  }

  return memePaths[memePaths.length - 1];
}

function spawnMeme() {
  if (!gameRunning || gamePaused) return;
  const available = holes.filter(hole => !hole.active && !hole.retreatStartedAt);
  if (!available.length) {
    scheduleSpawn(spawnMeme, 220);
    return;
  }
  const hole = available[Math.floor(Math.random() * available.length)];
  const memePath = chooseMemePath();
  hole.memePath = memePath;
  shownMemePaths.add(memePath);
  const memeName = memePath.split('/').pop();
  hole.rick = memeName === 'Rickroll.png';
  hole.hit = false;
  hole.active = true;
  hole.rise = 0;
  hole.retreatStartedAt = 0;
  hole.retreatHit = false;
  hole.mole.visible = true;
  hole.mole.scale.setScalar(1);
  hole.mole.material.map = getMemeTexture(memePath);
  hole.mole.material.needsUpdate = true;

  const visibleFor = Math.max(520, 1450 - score * 12);
  scheduleSpawn(() => {
    if (hole.active) {
      hole.active = false;
      hole.rise = 0;
      hole.retreatStartedAt = performance.now();
      hole.retreatFromY = hole.mole.position.y;
      hole.retreatHit = false;
    }
    if (gameRunning) {
      scheduleSpawn(spawnMeme, Math.max(250, 720 - score * 5));
    }
  }, visibleFor);
}

function startGame(isEndless = false) {
  if (!renderer) return;
  cancelSpawnTimeout();
  window.clearInterval(timerInterval);
  endlessMode = isEndless;
  gamePaused = false;
  score = 0;
  time = endlessMode ? 0 : Number(durationSelect.value);
  shownMemePaths.clear();
  gameRunning = true;
  strikeStartedAt = 0;
  strikeTarget = null;
  strikeResolved = false;
  strikeDirection = 'left';
  pressedKeys.clear();
  aimPosition.x = 0;
  aimPosition.y = -0.78;
  updateScoreDisplay();
  cabinet.visible = true;
  mallet.position.set(aimPosition.x + malletPivotOffset, aimPosition.y, 0.25);
  mallet.rotation.set(0, 0, 0);
  malletShadow.position.set(aimPosition.x, aimPosition.y, 0.27);
  document.body.classList.add('game-active');
  startScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  mainMenuTheme.pause();
  mainMenuTheme.currentTime = 0;
  gameTheme.currentTime = 0;
  gameTheme.play().catch(error => console.warn('Game music playback was blocked:', error));
  holes.forEach(hole => {
    hole.active = false;
    hole.hit = false;
    hole.rise = 0;
    hole.retreatStartedAt = 0;
    hole.retreatHit = false;
    hole.mole.visible = false;
    hole.mole.scale.set(1, 1, 1);
  });

  spawnMeme();
  if (!endlessMode) startCountdown();
}

function startCountdown() {
  timerInterval = window.setInterval(() => {
    if (!gameRunning || gamePaused) return;
    time--;
    updateScoreDisplay();
    if (time <= 0) endGame();
  }, 1000);
}

function pauseGame() {
  if (!gameRunning || gamePaused) return;
  gamePaused = true;
  pausedAt = performance.now();
  pressedKeys.clear();
  window.clearInterval(timerInterval);
  timerInterval = undefined;
  if (spawnTimeoutCallback) {
    spawnTimeoutRemaining = Math.max(0, spawnTimeoutAt - pausedAt);
    window.clearTimeout(spawnTimeout);
    spawnTimeout = undefined;
  }
  gameTheme.pause();
  pauseScreen.classList.remove('hidden');
  updateScoreDisplay();
}

function resumeGame() {
  if (!gameRunning || !gamePaused) return;
  const pauseDuration = performance.now() - pausedAt;
  if (strikeStartedAt) strikeStartedAt += pauseDuration;
  holes.forEach(hole => {
    if (hole.retreatStartedAt) hole.retreatStartedAt += pauseDuration;
  });
  gamePaused = false;
  pausedAt = 0;
  pauseScreen.classList.add('hidden');
  if (spawnTimeoutCallback) {
    scheduleSpawn(spawnTimeoutCallback, spawnTimeoutRemaining);
  }
  if (!endlessMode) startCountdown();
  gameTheme.play().catch(error => console.warn('Game music playback was blocked:', error));
  updateScoreDisplay();
}

function stopGame() {
  gameRunning = false;
  gamePaused = false;
  pausedAt = 0;
  cancelSpawnTimeout();
  window.clearInterval(timerInterval);
  timerInterval = undefined;
  pressedKeys.clear();
  strikeStartedAt = 0;
  strikeTarget = null;
  strikeResolved = false;
  gameTheme.pause();
  gameTheme.currentTime = 0;
  document.body.classList.remove('game-active');
  pauseScreen.classList.add('hidden');
  cabinet.visible = false;
  holes.forEach(hole => {
    hole.active = false;
    hole.rise = 0;
    hole.retreatStartedAt = 0;
    hole.retreatHit = false;
    hole.mole.visible = false;
    hole.mole.scale.set(1, 1, 1);
  });
  updateScoreDisplay();
}

function getScoreTier() {
  if (score === 0) return 'no-score';
  const scorePerMinute = score * 60 / Number(durationSelect.value);
  if (scorePerMinute < 8) return 'bad';
  if (scorePerMinute < 15) return 'mediocre';
  if (scorePerMinute < 22) return 'good';
  if (scorePerMinute < 29) return 'nice';
  return 'excellent';
}

function getScoreSound() {
  const soundsByTier = {
    'no-score': audio.noScore,
    bad: audio.badScore,
    mediocre: audio.mediocreScore,
    good: audio.goodScore,
    nice: audio.niceScore,
    excellent: audio.excellentScore
  };
  return soundsByTier[getScoreTier()];
}

function endGame() {
  if (!gameRunning) return;
  stopGame();
  finalScoreElement.textContent = String(score);
  const scoreMessages = {
    'no-score': 'Not one meme? The cabinet is judging you.',
    bad: 'A few bonks... the cabinet wants more.',
    mediocre: 'A respectable amount of bonking!',
    good: 'The memes never stood a chance!',
    nice: 'Now that is some serious meme control!',
    excellent: 'Certified bonk champion. Incredible stuff!'
  };
  scoreMessage.textContent = scoreMessages[getScoreTier()];
  gameOverScreen.classList.remove('hidden');
  playSound(getScoreSound());
}

function backToMenu() {
  stopGame();
  gameOverScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
  if (!mainMenuTheme.paused) return;
  mainMenuTheme.play().catch(error => console.warn('Menu music playback was blocked:', error));
}

function backToHub() {
  stopGame();
  window.location.href = '../index.html';
}

function render() {
  window.requestAnimationFrame(render);
  const frameTime = performance.now();
  const delta = lastFrameAt ? Math.min((frameTime - lastFrameAt) / 1000, 0.05) : 0;
  lastFrameAt = frameTime;
  pollGamepad();

  if (gameRunning && !gamePaused) {
    let moveX = Number(pressedKeys.has('d')) - Number(pressedKeys.has('a')) + gamepadMoveX;
    let moveY = Number(pressedKeys.has('w')) - Number(pressedKeys.has('s')) + gamepadMoveY;
    const magnitude = Math.hypot(moveX, moveY);
    if (magnitude > 0 && !strikeStartedAt) {
      const speed = 6.5 * Math.min(magnitude, 1);
      moveX /= magnitude;
      moveY /= magnitude;
      aimPosition.x = Math.max(-3.4, Math.min(2.65, aimPosition.x + moveX * speed * delta));
      aimPosition.y = Math.max(-1.55, Math.min(1.55, aimPosition.y + moveY * speed * delta));
    }
    mallet.position.set(aimPosition.x + malletPivotOffset, aimPosition.y, 0.25);

    if (strikeStartedAt) {
      const progress = Math.min(1, (frameTime - strikeStartedAt) / 220);
      const direction = strikeDirection === 'left' ? -1 : 1;
      if (progress < 0.7) {
        const swing = 1 - Math.pow(1 - progress / 0.7, 3);
        mallet.rotation.y = direction * swing * malletStrikeAngle;
      } else if (progress < 0.8) {
        mallet.rotation.y = direction * malletStrikeAngle;
      } else {
        const recover = (progress - 0.8) / 0.2;
        mallet.rotation.y = direction * (1 - recover) * malletStrikeAngle;
      }
      if (progress >= 0.7 && !strikeResolved) {
        strikeResolved = true;
        if (strikeTarget?.active && !strikeTarget.hit) hitMeme(strikeTarget);
        strikeTarget = null;
      }
      if (progress >= 1) {
        strikeStartedAt = 0;
      }
    }
    if (!strikeStartedAt) {
      mallet.rotation.set(0, 0, 0);
    }
    malletShadow.position.set(aimPosition.x, aimPosition.y, 0.27);
  }

  if (!gamePaused) {
    holes.forEach(hole => {
      hole.group.getWorldPosition(hole.worldPosition);
      if (hole.retreatStartedAt) {
        const duration = hole.retreatHit ? 420 : 560;
        const progress = Math.min(1, (frameTime - hole.retreatStartedAt) / duration);
        if (hole.retreatHit) {
          const squash = Math.min(1, progress / 0.18);
          const retreat = Math.max(0, (progress - 0.18) / 0.82);
          const squashEase = 1 - Math.pow(1 - squash, 3);
          const retreatEase = 1 - Math.pow(1 - retreat, 2);
          hole.mole.position.set(
            hole.worldPosition.x,
            hole.retreatFromY - retreatEase * 1.15,
            hole.worldPosition.z - 0.04
          );
          hole.mole.scale.set(1, 1 - squashEase * 0.88, 1);
        } else {
          const slide = progress * progress * (3 - 2 * progress);
          hole.mole.position.set(
            hole.worldPosition.x,
            hole.retreatFromY - slide * 1.15,
            hole.worldPosition.z - 0.04
          );
          hole.mole.scale.set(1, 1, 1);
        }
        if (progress >= 1) {
          hole.retreatStartedAt = 0;
          hole.retreatHit = false;
          hole.mole.visible = false;
          hole.mole.scale.set(1, 1, 1);
        }
        return;
      }

      const targetRise = hole.active ? 1 : 0;
      hole.rise += (targetRise - hole.rise) * Math.min(1, delta * 6);
      hole.mole.position.set(
        hole.worldPosition.x,
        hole.worldPosition.y - 0.72 + hole.rise * 1.17,
        hole.worldPosition.z - 0.04
      );
      if (!hole.active && hole.rise < 0.02) hole.mole.visible = false;
    });
  }
  renderer.render(scene, camera);
}

document.getElementById('start-btn').addEventListener('click', () => startGame(false));
document.getElementById('endless-btn').addEventListener('click', () => startGame(true));
document.getElementById('restart-btn').addEventListener('click', () => startGame(false));
document.getElementById('back-to-menu-btn').addEventListener('click', backToMenu);
document.getElementById('resume-btn').addEventListener('click', resumeGame);
document.getElementById('pause-menu-btn').addEventListener('click', backToMenu);
document.getElementById('pause-hub-btn').addEventListener('click', backToHub);

document.addEventListener('click', () => {
  if (mainMenuTheme.paused && !gameRunning && !startScreen.classList.contains('hidden')) {
    mainMenuTheme.play().catch(error => console.warn('Menu music playback was blocked:', error));
  }
}, { once: true });

initialize();
