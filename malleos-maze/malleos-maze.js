(() => {
  "use strict";

  const viewport = document.getElementById("viewport");
  const menu = document.getElementById("menu");
  const menuTitle = document.getElementById("menu-title");
  const menuDescription = document.getElementById("menu-description");
  const menuButton = document.getElementById("menu-button");
  const mainMenuButton = document.getElementById("main-menu-button");
  const transitionFade = document.getElementById("transition-fade");
  const gameMusic = document.getElementById("game-music");
  const footstepsAudio = createAudioElement("./assets/playersounds/footsteps.mp3");
  footstepsAudio.loop = true;
  footstepsAudio.volume = 0.55;
  footstepsAudio.preservesPitch = true;
  const energyDrinkAudio = createAudioElement("./assets/items/energy-drink-chug.mp3");
  energyDrinkAudio.volume = 0.7;
  const bananaPeelSlipAudio = createAudioElement("./assets/items/banana-peel-slip.mp3");
  const bananaPeelFallAudio = createAudioElement("./assets/items/banana-peel-fall.mp3");
  const malleoOofAudio = createAudioElement("./assets/malleo/oof.mp3");
  const malleoMammaMiaAudio = createAudioElement("./assets/malleo/mamamia.mp3");
  const victoryAudio = createAudioElement("./assets/victory/yay.mp3");
  const weegeeAnnouncementAudio = createAudioElement("../weegees-mansion/Audio/Weegee/im-weegee-number-1.mp3");
  weegeeAnnouncementAudio.volume = 0.8;
  const weegeeVoiceLinePaths = [
    "../weegees-mansion/Audio/Weegee/go-weegee.mp3",
    "../weegees-mansion/Audio/Weegee/weegee-hurry-up-already-eh.mp3",
    "../weegees-mansion/Audio/Weegee/weegee-isolated.mp3",
    "../weegees-mansion/Audio/Weegee/weegee-laughing-01.mp3",
    "../weegees-mansion/Audio/Weegee/weegee-laughing-02.mp3",
    "../weegees-mansion/Audio/Weegee/weegee-laughing-03.mp3",
    "../weegees-mansion/Audio/Weegee/weegee-weegee-oh-yeah-oh-yeah.mp3"
  ];
  const weegeeVoiceLines = weegeeVoiceLinePaths.map(createAudioElement);
  const weegeeScreamAudio = createAudioElement("../weegees-mansion/Audio/Weegee/weegee-scream.mp3");
  const gameElement = document.getElementById("game");
  gameElement.classList.add("menu-active");
  const jumpscareEffect = document.getElementById("jumpscare-effect");
  const loadingScreen = document.getElementById("loading-screen");
  const loadingProgress = document.getElementById("loading-progress");
  const loadingPercent = document.getElementById("loading-percent");
  const loadingStatus = document.getElementById("loading-status");
  const loadingError = document.getElementById("loading-error");
  const loadingRetry = document.getElementById("loading-retry");
  const minimapCanvas = document.getElementById("minimap");
  const minimapContext = minimapCanvas.getContext("2d");
  const hotbarSlots = Array.from(document.querySelectorAll(".hotbar-slot"));
  const malleoVoiceLinePaths = [
    "./assets/malleo/come-here-fishy-fishy.mp3",
    "./assets/malleo/hehe.mp3",
    "./assets/malleo/ima-dont-think-you-can-do-that.mp3",
    "./assets/malleo/oh-boy.mp3"
  ];
  const malleoVoiceLines = malleoVoiceLinePaths.map(createAudioElement);
  const jumpscareAudio = createAudioElement("./assets/malleo/jumpscare.mp3");
  const postKillAudio = createAudioElement("./assets/malleo/that-was-lotsa-fun.mp3");
  const loadingAudioAssets = [
    gameMusic,
    footstepsAudio,
    energyDrinkAudio,
    bananaPeelSlipAudio,
    bananaPeelFallAudio,
    malleoOofAudio,
    malleoMammaMiaAudio,
    victoryAudio,
    weegeeAnnouncementAudio,
    ...malleoVoiceLines,
    ...weegeeVoiceLines,
    weegeeScreamAudio,
    jumpscareAudio,
    postKillAudio
  ];
  const loadedAudioAssets = new Set();
  const textureLoadWaiters = [];
  let textureLoadProgress = 0;
  let textureLoadError = null;
  let texturesReady = false;
  let rendererPrepared = false;
  const itemCount = document.getElementById("item-count");
  const itemProgress = document.getElementById("item-progress");
  const coinCountElement = document.getElementById("coin-count");
  const pickupToast = document.getElementById("pickup-toast");
  const toadDialogue = document.getElementById("toad-dialogue");
  const toadDialogueText = toadDialogue.querySelector("p");
  const toadDialogueHint = toadDialogue.querySelector(".toad-card-hint");
  const toadShop = document.getElementById("toad-shop");
  const toadShopCoins = document.getElementById("toad-shop-coins");
  const toadShopStatus = document.getElementById("toad-shop-status");
  const toadShopButtons = Array.from(document.querySelectorAll(".toad-shop-item"));
  const hint = document.getElementById("hint");
  const ending = document.getElementById("ending");
  const caughtScreen = document.getElementById("caught");
  const malleoStatus = document.getElementById("malleo-status");
  const weegeeStatus = document.getElementById("weegee-status");
  const malleoWarning = document.getElementById("malleo-warning");
  const caughtEnemyImage = document.getElementById("caught-enemy-image");
  const caughtTitle = document.getElementById("caught-title");
  const caughtDescription = document.getElementById("caught-description");
  const endingDescription = document.getElementById("ending-description");
  const hud = document.getElementById("hud");
  const staminaPanel = document.getElementById("stamina-panel");
  const staminaProgress = document.getElementById("stamina-progress");
  const staminaState = document.getElementById("stamina-state");

  const CELL = 4;
  const WALL_HEIGHT = 4;
  const MAZE_SIZE = 31;
  const FLOWER_COUNT = 6;
  const PLAYER_RADIUS = 0.38;
  const MALLEO_HEARING_RADIUS = 9;
  const MALLEO_SIGHT_RANGE = 30;
  const MALLEO_CHASE_MEMORY = 9000;
  const WEEGEE_SPAWN_MIN_DELAY = 120000;
  const WEEGEE_SPAWN_MAX_DELAY = 240000;
  const HOTBAR_SLOT_COUNT = 6;
  const ENERGY_DRINK_PICKUP_COUNT = 6;
  const BANANA_PEEL_PICKUP_COUNT = 6;
  const FIREFLOWER_TRACKER_PICKUP_COUNT = 2;
  const COIN_BAG_COUNT = 20;
  const COINS_PER_BAG = 10;
  const TOAD_HINT_INITIAL_DELAY_MS = 120000;
  const TOAD_HINT_INTERVAL_MS = 60000;
  const TOAD_RETURN_INTERVAL_MS = 30000;
  const TOAD_GREETING = "Hey dude! Welcome to my little shop! I will sell you some shit to get you through this place, but only if you got some of those nice coins on ya!";
  const TOAD_RETURN_GREETING = "Back again, huh? Well, buy you whatever you need, my dude!";
  const TOAD_CREDIT_MESSAGE = "Sorry dude, I can't give credit! Come back when you're a little... MMMMMM... richer!";
  const TOAD_SOLD_OUT_MESSAGE = "Welp, looks like you bought everything from me! Now run, before Malleo or Weegee catches up!";
  const SHOP_CATALOG = {
    "energy-drink": { price: 10, label: "Energy Drink" },
    "banana-peel": { price: 25, label: "Banana Peel" },
    "fireflower-tracker": { price: 50, label: "Fireflower Tracker" }
  };
  const SHOP_ENERGY_DRINK_STOCK = 5;
  const SHOP_BANANA_PEEL_STOCK = 3;
  const SHOP_TRACKER_STOCK = 1;
  const ENERGY_DRINK_REFILL_RATE = 4;
  const ENERGY_DRINK_MIN_CHUG_TIME = 0.75;
  const ENERGY_DRINK_THROW_TIME = 0.68;
  const ENERGY_DRINK_BOOST_DURATION = 7;
  const ENERGY_DRINK_SPEED_MULTIPLIER = 1.35;
  const EXIT_HINT_INTERVAL = 10000;
  const EXIT_HINT_DURATION = 2400;
  const EXIT_DOOR_OPENING_WIDTH = CELL;
  const EXIT_DOOR_OPENING_HEIGHT = WALL_HEIGHT;
  const EXIT_DOOR_OPEN_DURATION = 3.5;
  const EXIT_WALK_DURATION = 5;
  const EXIT_WALK_SPEED = 5.2;
  const EXIT_TURN_DURATION = 0.8;
  const EXIT_SEQUENCE_TRIGGER_DISTANCE = -0.6;
  const EXIT_TREE_COUNT = 20;
  const EXIT_TREE_MIN_DISTANCE = 12;
  const EXIT_TREE_MAX_DISTANCE = 62;
  const EXIT_TREE_LATERAL_RADIUS = 36;
  const BANANA_PLACE_RELEASE_TIME = 0.28;
  const BANANA_PLACE_DURATION = 0.62;
  const BANANA_PEEL_IMMUNITY_MS = 3000;
  const BANANA_PLAYER_FALL_TIME = 0.42;
  const BANANA_PLAYER_DOWN_TIME = 0.42;
  const BANANA_PLAYER_RECOVER_TIME = 0.48;
  const BANANA_MALLEO_FALL_TIME = 0.68;
  const BANANA_MALLEO_DOWN_TIME = 3000;
  const BANANA_MALLEO_RECOVER_TIME = 0.78;
  const FIREFLOWER_TRACKER_ACTIVATION_MS = 750;
  const FIREFLOWER_TRACKER_INTERVAL_MS = 10000;
  const FIREFLOWER_TRACKER_DURATION_MS = 2400;
  const MAX_STAMINA = 20;
  const STAMINA_RECOVERY_RATE = 1;
  const SPRINT_MULTIPLIER = 1.7;
  const textureLoadingManager = new THREE.LoadingManager();
  textureLoadingManager.onProgress = (url, loaded, total) => {
    textureLoadProgress = total ? loaded / total : 0;
    updateLoadingProgress();
  };
  textureLoadingManager.onLoad = () => {
    texturesReady = true;
    textureLoadProgress = 1;
    settleTextureLoadWaiters();
    updateLoadingProgress();
  };
  textureLoadingManager.onError = url => {
    textureLoadError ||= new Error(`Could not load texture: ${url}`);
    settleTextureLoadWaiters();
    updateLoadingProgress();
  };
  const textureLoader = new THREE.TextureLoader(textureLoadingManager);
  const textures = {
    wall: textureLoader.load("./assets/textures/wall-texture.png"),
    floor: textureLoader.load("./assets/textures/floor-texture.png"),
    ceiling: textureLoader.load("./assets/textures/ceiling-texture.png"),
    door: textureLoader.load("./assets/textures/door-texture.png"),
    outsideSkybox: textureLoader.load("./assets/textures/outside-skybox-texture.png"),
    outsideGrass: textureLoader.load("./assets/textures/outside-grass-texture.png"),
    exitTree: textureLoader.load("./assets/other-sprites/tree-billboard-sprite.png"),
    coinBag: textureLoader.load("./assets/collectibles/coin-bag.png"),
    toad: textureLoader.load("./assets/toads-item-shop/toad-billboard-sprite.png"),
    fireflower: textureLoader.load("./assets/collectibles/fireflower.png"),
    energyDrink: textureLoader.load("./assets/items/energy-drink-can.png"),
    bananaPeel: textureLoader.load("./assets/items/banana-peel.png"),
    fireflowerTracker: textureLoader.load("./assets/items/fireflower-tracker.png"),
    malleo: textureLoader.load("./assets/malleo/Malleo.png"),
    weegee: textureLoader.load("./assets/weegee/Weegee.png")
  };

  for (const texture of Object.values(textures)) {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.encoding = THREE.sRGBEncoding;
  }
  textures.wall.wrapS = textures.wall.wrapT = THREE.RepeatWrapping;
  textures.floor.wrapS = textures.floor.wrapT = THREE.RepeatWrapping;
  textures.ceiling.wrapS = textures.ceiling.wrapT = THREE.RepeatWrapping;
  textures.outsideGrass.wrapS = textures.outsideGrass.wrapT = THREE.RepeatWrapping;

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(Math.max(320, Math.floor(window.innerWidth * 0.52)), Math.max(180, Math.floor(window.innerHeight * 0.52)), false);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute("aria-label", "First-person view of a dark maze");
  viewport.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080706);
  scene.fog = new THREE.Fog(0x080706, 5, 38);

  const camera = new THREE.PerspectiveCamera(73, window.innerWidth / window.innerHeight, 0.08, 120);
  camera.rotation.order = "YXZ";
  scene.add(camera);
  const exitDoorRaycaster = new THREE.Raycaster();
  const reticlePosition = new THREE.Vector2(0, 0);
  const litBillboards = [];
  const billboardGeometry = new THREE.PlaneGeometry(1, 1);
  const heldItemMaterial = new THREE.SpriteMaterial({
    map: textures.energyDrink,
    transparent: true,
    alphaTest: 0.03,
    depthTest: false,
    depthWrite: false
  });
  const heldItemSprite = new THREE.Sprite(heldItemMaterial);
  heldItemSprite.scale.set(0.42, 0.42, 1);
  heldItemSprite.position.set(0.47, -0.37, -0.84);
  heldItemSprite.frustumCulled = false;
  heldItemSprite.renderOrder = 1000;
  heldItemSprite.visible = false;
  camera.add(heldItemSprite);
  scene.add(new THREE.HemisphereLight(0x897969, 0x171312, 0.035));
  scene.add(new THREE.AmbientLight(0x907b66, 0.015));
  const flashlight = new THREE.SpotLight(0xffe3ad, 8, 38, Math.PI / 8, 0.35, 1.4);
  flashlight.position.set(0, 0, 0);
  flashlight.target.position.set(0, 0, -1);
  flashlight.castShadow = true;
  flashlight.shadow.mapSize.width = 1024;
  flashlight.shadow.mapSize.height = 1024;
  flashlight.shadow.camera.near = 0.01;
  flashlight.shadow.camera.far = 38;
  flashlight.shadow.camera.updateProjectionMatrix();
  camera.add(flashlight);
  camera.add(flashlight.target);

  const maze = generateMaze(MAZE_SIZE);
  const patrolWaypoints = getPatrolWaypoints(maze);
  const start = { x: 1, z: 1 };
  const distances = getDistances(maze, start.x, start.z);
  const farthestCellFromStart = farthestCell(distances);
  const exitCell = chooseExitCell(maze, distances, farthestCellFromStart);
  const flowerCells = chooseFlowerCells(distances, exitCell, farthestCellFromStart, FLOWER_COUNT);
  const malleoCell = chooseMalleoSpawn(distances, exitCell, farthestCellFromStart, flowerCells);
  const energyDrinkCells = chooseItemPickupCells(
    maze,
    distances,
    exitCell,
    malleoCell,
    flowerCells,
    ENERGY_DRINK_PICKUP_COUNT
  );
  const bananaPeelCells = chooseItemPickupCells(
    maze,
    distances,
    exitCell,
    malleoCell,
    [...flowerCells, ...energyDrinkCells],
    BANANA_PEEL_PICKUP_COUNT
  );
  const fireflowerTrackerCells = chooseItemPickupCells(
    maze,
    distances,
    exitCell,
    malleoCell,
    [...flowerCells, ...energyDrinkCells, ...bananaPeelCells],
    FIREFLOWER_TRACKER_PICKUP_COUNT
  );
  const toadCell = chooseToadDeadEndCell(maze, [
    start,
    exitCell,
    malleoCell,
    ...flowerCells,
    ...energyDrinkCells,
    ...bananaPeelCells,
    ...fireflowerTrackerCells
  ]);
  const coinBagCells = chooseCoinBagCells(maze, [
    start,
    exitCell,
    malleoCell,
    toadCell,
    ...flowerCells,
    ...energyDrinkCells,
    ...bananaPeelCells,
    ...fireflowerTrackerCells
  ], COIN_BAG_COUNT);
  const doorDirection = getDoorDirection(maze, exitCell);
  const doorWallCell = { x: exitCell.x + doorDirection.x, z: exitCell.z + doorDirection.z };
  const worldSize = MAZE_SIZE * CELL;
  const outdoorSkyRadius = worldSize * 1.8;
  camera.far = worldSize * 3;
  camera.updateProjectionMatrix();

  const wallMaterial = new THREE.MeshStandardMaterial({ map: textures.wall, roughness: 1, metalness: 0 });
  const floorMaterial = new THREE.MeshStandardMaterial({ map: textures.floor, roughness: 1, metalness: 0 });
  const ceilingMaterial = new THREE.MeshStandardMaterial({ map: textures.ceiling, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  const outsideGrassMaterial = new THREE.MeshBasicMaterial({ map: textures.outsideGrass });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(worldSize, worldSize), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  floorMaterial.map.repeat.set(MAZE_SIZE * 0.85, MAZE_SIZE * 0.85);
  scene.add(floor);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(worldSize, worldSize), ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_HEIGHT;
  ceiling.receiveShadow = true;
  ceilingMaterial.map.repeat.set(MAZE_SIZE * 0.85, MAZE_SIZE * 0.85);
  scene.add(ceiling);

  const outsideGrass = new THREE.Mesh(
    new THREE.PlaneGeometry(worldSize * 5, worldSize * 5),
    outsideGrassMaterial
  );
  outsideGrass.rotation.x = -Math.PI / 2;
  outsideGrass.position.y = -0.03;
  outsideGrass.receiveShadow = true;
  textures.outsideGrass.repeat.set(MAZE_SIZE * 4.25, MAZE_SIZE * 4.25);
  scene.add(outsideGrass);

  const outsideSkybox = new THREE.Mesh(
    new THREE.SphereGeometry(outdoorSkyRadius, 16, 10),
    new THREE.MeshBasicMaterial({
      map: textures.outsideSkybox,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false
    })
  );
  outsideSkybox.frustumCulled = false;
  outsideSkybox.renderOrder = -1;
  scene.add(outsideSkybox);

  const wallGeometry = new THREE.BoxGeometry(CELL, WALL_HEIGHT, CELL);
  const wallCenter = new THREE.Vector3();
  for (let z = 0; z < MAZE_SIZE; z += 1) {
    for (let x = 0; x < MAZE_SIZE; x += 1) {
      if (maze[z][x] === 0) {
        if (x === doorWallCell.x && z === doorWallCell.z) {
          continue;
        }
        wallCenter.set(cellWorld(x), WALL_HEIGHT / 2, cellWorld(z));
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.copy(wallCenter);
        wall.castShadow = true;
        wall.receiveShadow = true;
        scene.add(wall);
      }
    }
  }

  const fireflowers = flowerCells.map(cell => createFireflower(cell));
  const energyDrinkPickups = energyDrinkCells.map(createEnergyDrinkPickup);
  const bananaPeelPickups = bananaPeelCells.map(createBananaPeelPickup);
  const fireflowerTrackerPickups = fireflowerTrackerCells.map(createFireflowerTrackerPickup);
  const coinBagPickups = coinBagCells.map(createCoinBagPickup);
  const toad = createToad(toadCell);
  const malleo = createMalleo(malleoCell);
  const malleoFlatMesh = createMalleoFlatMesh();
  const weegee = createMalleo(malleoCell, textures.weegee);
  const weegeeFlatMesh = createMalleoFlatMesh(textures.weegee);
  weegee.visible = false;
  weegeeFlatMesh.visible = false;
  const malleoEnemy = createEnemyState("Malleo", malleo, malleoFlatMesh);
  const weegeeEnemy = createEnemyState("Weegee", weegee, weegeeFlatMesh);
  weegeeEnemy.spawned = false;
  let weegeeSpawnDelay = null;
  const door = createExitDoor(exitCell, doorDirection);
  const exitTrees = createExitTreeBillboards();
  const playerPosition = new THREE.Vector3(cellWorld(start.x), 1.62, cellWorld(start.z));
  const player = { yaw: Math.PI, pitch: 0, speed: 5.2 };
  const pressed = new Set();
  const hotbar = Array(HOTBAR_SLOT_COUNT).fill(null);
  const fireflowerTrackerTargets = Array(HOTBAR_SLOT_COUNT).fill(null);
  const placedBananaPeels = [];
  let selectedHotbarSlot = 0;
  let itemUseState = "idle";
  let activeItemType = null;
  let drinkUseElapsed = 0;
  let drinkThrowElapsed = 0;
  let bananaPlaceElapsed = 0;
  let bananaWasPlaced = false;
  let bananaPlacementAttempted = false;
  let bananaDropPosition = null;
  let playerSlipState = null;
  let playerWasWalkingBackward = false;
  let speedBoostRemaining = 0;
  let energyDrinkAudioPending = false;
  let energyDrinkAudioFailed = false;
  let energyDrinkAudioFinished = false;
  let footstepsAudioPending = false;
  let footstepsAudioFailed = false;
  let sprintHeld = false;
  let viewBobPhase = 0;
  let stamina = MAX_STAMINA;
  let isSprinting = false;
  let isStaminaRecovering = false;
  let flowersFound = 0;
  let coins = 0;
  let nextExitHintTime = Infinity;
  let exitHintStartedAt = -Infinity;
  let exitHintAudioFailed = false;
  let toadHintElapsed = 0;
  let nextToadHintTime = TOAD_HINT_INITIAL_DELAY_MS;
  let toadHintAudioFailed = false;
  let toadFound = false;
  let activeFireflowerTrackerTarget = null;
  let fireflowerTrackerElapsed = 0;
  let lastTrackerBeepCycle = -1;
  let fireflowerTrackerAudioFailed = false;
  let isLoading = false;
  let isPlaying = false;
  let isWon = false;
  let fallbackControls = false;
  let toadDialogueOpen = false;
  let toadDialogueAction = "shop";
  let shopOpen = false;
  let toadShopHadPointerLock = false;
  let toadLastVisitEndedAt = null;
  let energyDrinkShopStock = SHOP_ENERGY_DRINK_STOCK;
  let bananaPeelShopStock = SHOP_BANANA_PEEL_STOCK;
  let trackerShopStock = SHOP_TRACKER_STOCK;
  let doorOpen = false;
  let doorProgress = 0;
  let exitSequence = null;
  let spatialAudioContext;
  let jumpscareChannel;
  let weegeeScreamChannel;
  let postKillChannel;
  let postKillLineTimer;
  const spatialChannels = [];
  const audioForward = new THREE.Vector3();
  const audioRight = new THREE.Vector3();
  const audioUp = new THREE.Vector3();
  const audioRotation = new THREE.Quaternion();
  let lastTime = performance.now();
  let toastTimer;
  let winTimer;

  camera.position.copy(playerPosition);
  camera.rotation.set(player.pitch, player.yaw, 0);
  updateObjective();
  updateCoinDisplay();
  updateStaminaDisplay();
  updateHotbar();

  function generateMaze(size) {
    const grid = Array.from({ length: size }, () => Array(size).fill(0));
    const stack = [{ x: 1, z: 1 }];
    grid[1][1] = 1;
    while (stack.length) {
      const current = stack[stack.length - 1];
      const options = [[0, -2], [2, 0], [0, 2], [-2, 0]]
        .map(([dx, dz]) => ({ x: current.x + dx, z: current.z + dz, dx, dz }))
        .filter(next => next.x > 0 && next.z > 0 && next.x < size - 1 && next.z < size - 1 && grid[next.z][next.x] === 0);
      if (!options.length) {
        stack.pop();
        continue;
      }
      const next = options[Math.floor(Math.random() * options.length)];
      grid[current.z + next.dz / 2][current.x + next.dx / 2] = 1;
      grid[next.z][next.x] = 1;
      stack.push({ x: next.x, z: next.z });
    }
    return grid;
  }

  function getPatrolWaypoints(grid) {
    const waypoints = [];
    for (let z = 1; z < MAZE_SIZE - 1; z += 1) {
      for (let x = 1; x < MAZE_SIZE - 1; x += 1) {
        if (grid[z][x] !== 1) continue;
        const degree = [[0, -1], [1, 0], [0, 1], [-1, 0]]
          .filter(([dx, dz]) => grid[z + dz]?.[x + dx] === 1).length;
        if (degree !== 2) waypoints.push({ x, z });
      }
    }
    if (waypoints.length) return waypoints;
    for (let z = 1; z < MAZE_SIZE - 1; z += 1) {
      for (let x = 1; x < MAZE_SIZE - 1; x += 1) {
        if (grid[z][x] === 1) waypoints.push({ x, z });
      }
    }
    return waypoints;
  }

  function getDistances(grid, startX, startZ) {
    const distances = Array.from({ length: MAZE_SIZE }, () => Array(MAZE_SIZE).fill(-1));
    const queue = [{ x: startX, z: startZ }];
    distances[startZ][startX] = 0;
    for (let head = 0; head < queue.length; head += 1) {
      const current = queue[head];
      for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const x = current.x + dx;
        const z = current.z + dz;
        if (grid[z]?.[x] !== 1 || distances[z][x] !== -1) continue;
        distances[z][x] = distances[current.z][current.x] + 1;
        queue.push({ x, z });
      }
    }
    return distances;
  }

  function farthestCell(distances) {
    let result = { x: 1, z: 1, distance: 0 };
    for (let z = 1; z < MAZE_SIZE - 1; z += 1) {
      for (let x = 1; x < MAZE_SIZE - 1; x += 1) {
        if (distances[z][x] > result.distance) result = { x, z, distance: distances[z][x] };
      }
    }
    return result;
  }

  function chooseExitCell(grid, distances, farthest) {
    const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const outerDeadEnds = [];
    const outerPassages = [];
    const allOuterPassages = [];
    for (let z = 1; z < MAZE_SIZE - 1; z += 1) {
      for (let x = 1; x < MAZE_SIZE - 1; x += 1) {
        if (grid[z][x] !== 1) continue;
        const edgeDistance = Math.min(x, z, MAZE_SIZE - 1 - x, MAZE_SIZE - 1 - z);
        if (edgeDistance > 1) continue;
        const hasBoundaryWall = directions.some(([dx, dz]) => {
          const wallX = x + dx;
          const wallZ = z + dz;
          const onMazeEdge = wallX === 0 || wallZ === 0 || wallX === MAZE_SIZE - 1 || wallZ === MAZE_SIZE - 1;
          return onMazeEdge && grid[wallZ]?.[wallX] !== 1;
        });
        if (!hasBoundaryWall) continue;
        const openNeighbors = directions.filter(([dx, dz]) => grid[z + dz]?.[x + dx] === 1).length;
        const cell = { x, z, distance: distances[z][x] };
        allOuterPassages.push(cell);
        if (distances[z][x] < 8) continue;
        outerPassages.push(cell);
        if (openNeighbors === 1) outerDeadEnds.push(cell);
      }
    }

    const candidates = outerDeadEnds.length
      ? outerDeadEnds
      : outerPassages.length
        ? outerPassages
        : allOuterPassages;
    if (candidates.length) return candidates[Math.floor(Math.random() * candidates.length)];
    return farthest;
  }

  function chooseFlowerCells(distances, exit, farthest, count) {
    const candidates = [];
    for (let z = 1; z < MAZE_SIZE - 1; z += 1) {
      for (let x = 1; x < MAZE_SIZE - 1; x += 1) {
        const distance = distances[z][x];
        const awayFromExit = Math.abs(exit.x - x) + Math.abs(exit.z - z) > 4;
        if (distance > 8 && distance < farthest.distance - 5 && awayFromExit) candidates.push({ x, z, distance });
      }
    }
    candidates.sort(() => Math.random() - 0.5);
    const chosen = [];
    for (let slot = 0; slot < count; slot += 1) {
      const target = farthest.distance * ((slot + 1) / (count + 1));
      let bestIndex = -1;
      let bestScore = Infinity;
      for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        if (chosen.some(cell => Math.abs(cell.x - candidate.x) + Math.abs(cell.z - candidate.z) < 7)) continue;
        const score = Math.abs(candidate.distance - target) + Math.random() * 2;
        if (score < bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      }
      if (bestIndex < 0) {
        const fallback = candidates.findIndex(cell => !chosen.some(other => other.x === cell.x && other.z === cell.z));
        if (fallback < 0) break;
        bestIndex = fallback;
      }
      chosen.push(candidates.splice(bestIndex, 1)[0]);
    }
    return chosen;
  }

  function chooseMalleoSpawn(distances, exit, farthest, flowers) {
    const candidates = [];
    for (let z = 1; z < MAZE_SIZE - 1; z += 1) {
      for (let x = 1; x < MAZE_SIZE - 1; x += 1) {
        const distance = distances[z][x];
        const awayFromFlowers = flowers.every(cell => Math.abs(cell.x - x) + Math.abs(cell.z - z) > 7);
        const awayFromExit = Math.abs(exit.x - x) + Math.abs(exit.z - z) > 7;
        if (distance > farthest.distance * 0.18 && distance < farthest.distance * 0.34 && awayFromFlowers && awayFromExit) {
          candidates.push({ x, z, distance });
        }
      }
    }
    if (!candidates.length) return { x: farthest.x, z: farthest.z };
    const targetDistance = farthest.distance * 0.26;
    candidates.sort((a, b) => Math.abs(a.distance - targetDistance) - Math.abs(b.distance - targetDistance));
    const nearBest = candidates.filter(cell => Math.abs(cell.distance - targetDistance) < 10);
    return nearBest[Math.floor(Math.random() * nearBest.length)] || candidates[0];
  }

  function chooseItemPickupCells(grid, distances, exit, malleo, excludedCells, count) {
    const maxDistance = farthestCell(distances).distance;
    const candidates = [];
    for (let z = 1; z < MAZE_SIZE - 1; z += 1) {
      for (let x = 1; x < MAZE_SIZE - 1; x += 1) {
        const distance = distances[z][x];
        const awayFromStart = distance > 5;
        const awayFromExit = Math.abs(exit.x - x) + Math.abs(exit.z - z) > 3;
        const awayFromMalleo = Math.abs(malleo.x - x) + Math.abs(malleo.z - z) > 5;
        const awayFromItems = excludedCells.every(cell => Math.abs(cell.x - x) + Math.abs(cell.z - z) > 4);
        if (grid[z][x] === 1 && awayFromStart && distance < maxDistance - 3 && awayFromExit && awayFromMalleo && awayFromItems) {
          candidates.push({ x, z, distance });
        }
      }
    }

    candidates.sort(() => Math.random() - 0.5);
    const chosen = [];
    for (let slot = 0; slot < count; slot += 1) {
      const targetDistance = maxDistance * ((slot + 1) / (count + 1));
      let bestIndex = -1;
      let bestScore = Infinity;
      for (let index = 0; index < candidates.length; index += 1) {
        const candidate = candidates[index];
        if (chosen.some(cell => Math.abs(cell.x - candidate.x) + Math.abs(cell.z - candidate.z) < 5)) continue;
        const score = Math.abs(candidate.distance - targetDistance) + Math.random() * 2;
        if (score < bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      }
      if (bestIndex < 0 && candidates.length) bestIndex = 0;
      if (bestIndex < 0) break;
      chosen.push(candidates.splice(bestIndex, 1)[0]);
    }
    return chosen;
  }

  function chooseToadDeadEndCell(grid, excludedCells) {
    const excluded = new Set(excludedCells.map(cell => `${cell.x},${cell.z}`));
    const candidates = [];
    for (let z = 1; z < MAZE_SIZE - 1; z += 1) {
      for (let x = 1; x < MAZE_SIZE - 1; x += 1) {
        if (grid[z][x] !== 1 || excluded.has(`${x},${z}`)) continue;
        const openNeighbors = [[0, -1], [1, 0], [0, 1], [-1, 0]]
          .filter(([dx, dz]) => grid[z + dz]?.[x + dx] === 1).length;
        if (openNeighbors === 1) candidates.push({ x, z });
      }
    }
    if (!candidates.length) throw new Error("No available dead end for Toad.");
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function chooseCoinBagCells(grid, excludedCells, count) {
    const excluded = new Set(excludedCells.map(cell => `${cell.x},${cell.z}`));
    const candidates = [];
    for (let z = 1; z < MAZE_SIZE - 1; z += 1) {
      for (let x = 1; x < MAZE_SIZE - 1; x += 1) {
        if (grid[z][x] === 1 && !excluded.has(`${x},${z}`)) candidates.push({ x, z });
      }
    }
    for (let index = candidates.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
    }
    if (candidates.length < count) {
      throw new Error(`Not enough open maze cells for ${count} coin bags.`);
    }
    return candidates.slice(0, count);
  }

  function getDoorDirection(grid, cell) {
    const directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const outwardWalls = directions.filter(([dx, dz]) => {
      const x = cell.x + dx;
      const z = cell.z + dz;
      const onMazeEdge = x === 0 || z === 0 || x === MAZE_SIZE - 1 || z === MAZE_SIZE - 1;
      return onMazeEdge && grid[z]?.[x] !== 1;
    });
    const wallDirections = outwardWalls.length
      ? outwardWalls
      : directions.filter(([dx, dz]) => grid[cell.z + dz]?.[cell.x + dx] !== 1);
    const [x, z] = wallDirections[Math.floor(Math.random() * wallDirections.length)] || [0, 1];
    return { x, z };
  }

  function cellWorld(index) {
    return (index - (MAZE_SIZE - 1) / 2) * CELL;
  }

  function createLitBillboard(map, alphaTest) {
    const sprite = new THREE.Mesh(billboardGeometry, new THREE.MeshLambertMaterial({
      map,
      transparent: true,
      alphaTest,
      depthWrite: false,
      side: THREE.DoubleSide
    }));
    sprite.userData.roll = 0;
    sprite.receiveShadow = true;
    scene.add(sprite);
    litBillboards.push(sprite);
    return sprite;
  }

  function createFireflower(cell) {
    const sprite = createLitBillboard(textures.fireflower, 0.04);
    sprite.position.set(cellWorld(cell.x), 1.12, cellWorld(cell.z));
    sprite.scale.set(1.3, 1.3, 1);
    return { sprite, found: false, phase: Math.random() * Math.PI * 2 };
  }

  function createEnergyDrinkPickup(cell) {
    const sprite = createLitBillboard(textures.energyDrink, 0.03);
    sprite.position.set(cellWorld(cell.x), 0.9, cellWorld(cell.z));
    sprite.scale.set(0.9, 0.9, 1);
    return { sprite, found: false, notifiedFull: false, phase: Math.random() * Math.PI * 2 };
  }

  function createBananaPeelPickup(cell) {
    const sprite = createLitBillboard(textures.bananaPeel, 0.03);
    sprite.position.set(cellWorld(cell.x), 0.56, cellWorld(cell.z));
    sprite.scale.set(0.82, 0.82, 1);
    return { sprite, found: false, notifiedFull: false, phase: Math.random() * Math.PI * 2 };
  }

  function createFireflowerTrackerPickup(cell) {
    const sprite = createLitBillboard(textures.fireflowerTracker, 0.03);
    sprite.position.set(cellWorld(cell.x), 0.9, cellWorld(cell.z));
    sprite.scale.set(0.75, 0.75, 1);
    return { sprite, found: false, notifiedFull: false, phase: Math.random() * Math.PI * 2 };
  }

  function createCoinBagPickup(cell) {
    const sprite = createLitBillboard(textures.coinBag, 0.04);
    sprite.position.set(cellWorld(cell.x), 0.68, cellWorld(cell.z));
    sprite.scale.set(0.72, 0.72, 1);
    return { sprite, found: false, phase: Math.random() * Math.PI * 2 };
  }

  function createToad(cell) {
    const sprite = createLitBillboard(textures.toad, 0.04);
    sprite.position.set(cellWorld(cell.x), 1.15, cellWorld(cell.z));
    sprite.scale.set(2.3, 2.3, 1);
    sprite.castShadow = true;
    sprite.receiveShadow = false;
    sprite.customDepthMaterial = new THREE.MeshDepthMaterial({
      map: textures.toad,
      alphaTest: 0.04,
      depthPacking: THREE.RGBADepthPacking,
      side: THREE.DoubleSide
    });
    return { sprite, cell };
  }

  function createMalleo(cell, map = textures.malleo) {
    const sprite = createLitBillboard(map, 0.025);
    const height = 3.65;
    sprite.position.set(cellWorld(cell.x), height / 2, cellWorld(cell.z));
    sprite.scale.set(height * (275 / 507), height, 1);
    return sprite;
  }

  function createMalleoFlatMesh(map = textures.malleo) {
    const height = 3.65;
    const material = new THREE.MeshLambertMaterial({
      map,
      transparent: true,
      alphaTest: 0.025,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(height * (275 / 507), height),
      material
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.035;
    mesh.visible = false;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  function updateLitBillboards() {
    for (const billboard of litBillboards) {
      billboard.quaternion.copy(camera.quaternion);
      if (billboard.userData.roll) billboard.rotateZ(billboard.userData.roll);
    }
  }

  function createEnemyState(name, sprite, flatMesh) {
    return {
      name,
      sprite,
      flatMesh,
      spawned: true,
      slipState: null,
      path: [],
      nextPathTime: 0,
      distance: Infinity,
      mode: "patrol",
      patrolTarget: null,
      recentPatrolTargets: [],
      lastKnownPlayerPosition: null,
      lastPlayerSightedAt: 0,
      lastVisualSightedAt: null,
      hasSeenPlayer: false,
      voiceChannels: [],
      nextVoiceLineTime: 0
    };
  }

  function createExitDoor(cell, direction) {
    const center = new THREE.Vector3(
      cellWorld(cell.x) + direction.x * CELL * 0.5,
      0,
      cellWorld(cell.z) + direction.z * CELL * 0.5
    );
    const acrossX = direction.z !== 0;
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(EXIT_DOOR_OPENING_WIDTH, EXIT_DOOR_OPENING_HEIGHT),
      new THREE.MeshStandardMaterial({ map: textures.door, roughness: 0.9, side: THREE.DoubleSide })
    );
    panel.position.set(center.x, EXIT_DOOR_OPENING_HEIGHT / 2, center.z);
    panel.rotation.y = acrossX ? 0 : Math.PI / 2;
    panel.castShadow = true;
    panel.receiveShadow = true;
    scene.add(panel);

    return {
      center,
      panel,
      normal: new THREE.Vector2(direction.x, direction.z),
      acrossX,
      width: EXIT_DOOR_OPENING_WIDTH
    };
  }

  function createExitTreeBillboards() {
    const material = new THREE.MeshBasicMaterial({
      map: textures.exitTree,
      transparent: true,
      alphaTest: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false
    });
    const trees = [];
    let attempts = 0;
    while (trees.length < EXIT_TREE_COUNT && attempts < EXIT_TREE_COUNT * 100) {
      attempts += 1;
      const along = EXIT_TREE_MIN_DISTANCE + Math.random() * (EXIT_TREE_MAX_DISTANCE - EXIT_TREE_MIN_DISTANCE);
      const lateral = (Math.random() * 2 - 1) * EXIT_TREE_LATERAL_RADIUS;
      const width = 6 + Math.random() * 1.5;
      const height = width * (1.4 + Math.random() * 0.12);
      const x = door.center.x - door.normal.y * lateral + door.normal.x * along;
      const z = door.center.z + door.normal.x * lateral + door.normal.y * along;
      const overlaps = trees.some(tree => {
        const minimumDistance = (width + tree.userData.footprint) / 2 + 0.8;
        return Math.hypot(x - tree.position.x, z - tree.position.z) < minimumDistance;
      });
      if (overlaps) continue;

      const tree = new THREE.Mesh(billboardGeometry, material);
      tree.position.set(x, height / 2 - 0.03, z);
      tree.scale.set(width, height, 1);
      tree.visible = false;
      tree.userData.footprint = width;
      scene.add(tree);
      trees.push(tree);
    }
    return trees;
  }

  function updateExitTreeBillboards() {
    const visible = doorOpen && doorProgress >= 1;
    for (const tree of exitTrees) {
      tree.visible = visible;
      if (!visible) continue;
      tree.rotation.y = Math.atan2(
        camera.position.x - tree.position.x,
        camera.position.z - tree.position.z
      );
    }
  }

  function updateObjective() {
    itemCount.textContent = `${flowersFound} / ${FLOWER_COUNT}`;
    itemProgress.style.width = `${(flowersFound / FLOWER_COUNT) * 100}%`;
  }

  function updateCoinDisplay() {
    coinCountElement.textContent = String(coins);
    toadShopCoins.textContent = `${coins} COINS`;
    if (shopOpen) updateToadShop();
  }

  function getShopStock(item) {
    if (item === "energy-drink") return energyDrinkShopStock;
    if (item === "banana-peel") return bananaPeelShopStock;
    if (item === "fireflower-tracker") return trackerShopStock;
    return 0;
  }

  function getAvailableTrackerTarget() {
    const assignedTargets = new Set(fireflowerTrackerTargets.filter(Boolean));
    const targets = fireflowers.filter(flower => !flower.found && !assignedTargets.has(flower));
    return targets[Math.floor(Math.random() * targets.length)] || null;
  }

  function updateToadShop() {
    const hasEmptySlot = hotbar.includes(null);
    toadShopButtons.forEach(button => {
      const item = button.dataset.shopItem;
      const offer = SHOP_CATALOG[item];
      if (!offer) {
        button.disabled = true;
        return;
      }
      const stock = getShopStock(item);
      button.querySelector("[data-shop-stock]").textContent = String(stock);
      const unaffordable = coins < offer.price;
      button.classList.toggle("unaffordable", unaffordable);
      button.setAttribute("aria-disabled", String(unaffordable));
      button.disabled = stock < 1
        || !hasEmptySlot
        || (item === "fireflower-tracker" && !getAvailableTrackerTarget());
    });
  }

  function purchaseShopItem(item) {
    if (!shopOpen) return;
    const offer = SHOP_CATALOG[item];
    if (!offer || getShopStock(item) < 1) return;
    if (coins < offer.price) {
      showToadDialogue(TOAD_CREDIT_MESSAGE, "leave");
      return;
    }
    const slot = hotbar.indexOf(null);
    if (slot < 0) return;
    const trackerTarget = item === "fireflower-tracker" ? getAvailableTrackerTarget() : null;
    if (item === "fireflower-tracker" && !trackerTarget) return;

    coins -= offer.price;
    if (item === "energy-drink") energyDrinkShopStock -= 1;
    if (item === "banana-peel") bananaPeelShopStock -= 1;
    if (item === "fireflower-tracker") trackerShopStock -= 1;
    hotbar[slot] = item;
    fireflowerTrackerTargets[slot] = trackerTarget;
    updateHotbar();
    updateCoinDisplay();
    if (hasNoToadStock()) {
      showToadDialogue(TOAD_SOLD_OUT_MESSAGE, "leave");
      return;
    }
    toadShopStatus.textContent = `${offer.label.toUpperCase()} ADDED TO SLOT ${slot + 1}.`;
  }

  function hasNoToadStock() {
    return energyDrinkShopStock === 0
      && bananaPeelShopStock === 0
      && trackerShopStock === 0;
  }

  function updateLoadingProgress() {
    const audioProgress = loadingAudioAssets.length
      ? loadedAudioAssets.size / loadingAudioAssets.length
      : 1;
    const progress = Math.round(textureLoadProgress * 65 + audioProgress * 30 + (rendererPrepared ? 5 : 0));
    loadingProgress.value = progress;
    loadingPercent.textContent = `${progress}%`;
  }

  function settleTextureLoadWaiters() {
    if (!texturesReady && !textureLoadError) return;
    for (const waiter of textureLoadWaiters.splice(0)) {
      if (textureLoadError) waiter.reject(textureLoadError);
      else waiter.resolve();
    }
  }

  function waitForTextures() {
    if (textureLoadError) return Promise.reject(textureLoadError);
    if (texturesReady) return Promise.resolve();
    return new Promise((resolve, reject) => textureLoadWaiters.push({ resolve, reject }));
  }

  function waitForAudioAsset(audio) {
    if (audio.readyState >= 2) {
      loadedAudioAssets.add(audio);
      updateLoadingProgress();
      return Promise.resolve();
    }
    if (audio.error) return Promise.reject(new Error(`Could not load audio: ${audio.currentSrc || audio.src}`));

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        audio.removeEventListener("loadeddata", onLoaded);
        audio.removeEventListener("error", onError);
      };
      const onLoaded = () => {
        cleanup();
        loadedAudioAssets.add(audio);
        updateLoadingProgress();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error(`Could not load audio: ${audio.currentSrc || audio.src}`));
      };
      audio.preload = "auto";
      audio.addEventListener("loadeddata", onLoaded, { once: true });
      audio.addEventListener("error", onError, { once: true });
      audio.load();
    });
  }

  function updateHotbar() {
    hotbarSlots.forEach((slot, index) => {
      const item = hotbar[index];
      const icon = slot.querySelector("img");
      const itemName = item === "energy-drink"
        ? "Energy Drink"
        : item === "banana-peel"
          ? "Banana Peel"
          : item === "fireflower-tracker"
            ? "Fireflower Tracker"
            : "empty";
      icon.src = item === "banana-peel"
        ? "./assets/items/banana-peel.png"
        : item === "fireflower-tracker"
          ? "./assets/items/fireflower-tracker.png"
          : "./assets/items/energy-drink-can.png";
      icon.hidden = item === null;
      slot.classList.toggle("occupied", item !== null);
      slot.classList.toggle("selected", index === selectedHotbarSlot);
      slot.setAttribute("aria-label", `Slot ${index + 1}, ${itemName}${index === selectedHotbarSlot ? ", selected" : ""}`);
    });
  }

  function updateStaminaDisplay() {
    const remaining = Math.max(0, stamina);
    const ratio = remaining / MAX_STAMINA;
    staminaProgress.style.setProperty("--stamina-fill", ratio);
    staminaProgress.parentElement.setAttribute("aria-valuenow", remaining.toFixed(1));
    staminaProgress.parentElement.setAttribute("aria-valuetext", `${Math.round(ratio * 100)} percent remaining`);
    staminaPanel.classList.toggle("stamina-running", isSprinting);
    staminaPanel.classList.toggle("stamina-low", ratio <= 0.25);
    staminaPanel.classList.toggle("speed-boost-active", speedBoostRemaining > 0);
    staminaState.textContent = isSprinting
      ? "RUNNING!"
      : speedBoostRemaining > 0
        ? "ENERGY RUSH"
        : remaining === 0
          ? "EMPTY"
          : isStaminaRecovering
            ? "REFILLING"
            : remaining < MAX_STAMINA
              ? "STOP TO REFILL"
              : "FULL";
  }

  function showToast(message) {
    pickupToast.textContent = message;
    pickupToast.classList.toggle("weegee-message", /weegee/i.test(message));
    pickupToast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => pickupToast.classList.remove("visible"), 2300);
  }

  function showMenu(type) {
    const isPauseMenu = type === "pause";
    gameElement.classList.toggle("menu-active", !isPauseMenu);
    menu.classList.toggle("pause-menu", isPauseMenu);
    if (type === "pause") {
      isPlaying = false;
      menuTitle.innerHTML = "PAUSE<br><span>YOUR PANIC!</span>";
      menuDescription.innerHTML = weegeeEnemy.spawned
        ? "Malleo and Weegee are still out there. They have not learned patience.<br>Catch your breath, then keep moving."
        : "Malleo is still out there. He has not learned patience.<br>Catch your breath, then keep moving.";
      menuButton.querySelector("span").textContent = "BACK TO THE MAZE";
    } else {
      menuTitle.innerHTML = "MALLEO'S<br><span>MAZE!</span>";
      menuDescription.innerHTML = "Six fireflowers. Two extremely suspicious plumbers.<br>Find the flowers, find the exit, do NOT get bonked.";
      menuButton.querySelector("span").textContent = "OKAY, I'M GOING IN";
    }
    menu.classList.remove("hidden");
  }

  function enterGame() {
    isPlaying = true;
    gameElement.classList.remove("menu-active");
    menu.classList.add("hidden");
    menu.classList.remove("pause-menu");
    pressed.clear();
    sprintHeld = false;
    startMusic();
    requestPlayerPointerLock();
  }

  function requestPlayerPointerLock() {
    if (fallbackControls || document.pointerLockElement === renderer.domElement) return;
    if (renderer.domElement.requestPointerLock) {
      try {
        renderer.domElement.requestPointerLock()?.catch(enableFallbackControls);
      } catch {
        enableFallbackControls();
      }
    } else {
      enableFallbackControls();
    }
  }

  async function startLoading() {
    if (isLoading) return;
    isLoading = true;
    menu.classList.add("hidden");
    gameElement.classList.add("menu-active");
    loadingScreen.classList.remove("hidden");
    loadingScreen.setAttribute("aria-busy", "true");
    loadingStatus.textContent = "LOADING GAME ASSETS";
    loadingError.textContent = "";
    loadingError.classList.add("hidden");
    loadingRetry.hidden = true;
    rendererPrepared = false;
    updateLoadingProgress();
    startSpatialAudio();
    requestPlayerPointerLock();
    const startedAt = performance.now();

    try {
      await Promise.all([
        waitForTextures(),
        ...loadingAudioAssets.map(waitForAudioAsset)
      ]);
      loadingStatus.textContent = "PREPARING THE MAZE";
      drawMinimap(performance.now());
      renderer.render(scene, camera);
      rendererPrepared = true;
      updateLoadingProgress();
      const remainingDisplayTime = Math.max(0, 600 - (performance.now() - startedAt));
      if (remainingDisplayTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingDisplayTime));
      }
      loadingScreen.classList.add("hidden");
      loadingScreen.setAttribute("aria-busy", "false");
      isLoading = false;
      enterGame();
    } catch (error) {
      isLoading = false;
      document.exitPointerLock?.();
      loadingScreen.setAttribute("aria-busy", "false");
      loadingStatus.textContent = "LOAD FAILED";
      loadingError.textContent = error instanceof Error ? error.message : String(error);
      loadingError.classList.remove("hidden");
      loadingRetry.hidden = false;
      console.error("Could not prepare Malleo's Maze.", error);
    }
  }

  function startMusic() {
    if (!gameMusic.paused) return;
    gameMusic.volume = 0.65;
    const playback = gameMusic.play();
    playback?.catch(() => showToast("Music couldn't start. Check your browser audio settings."));
  }

  function stopMusic() {
    gameMusic.pause();
  }

  function updateFootsteps(speed) {
    if (speed < 0.05) {
      if (footstepsAudioPending) footstepsAudio.pause();
      if (!footstepsAudio.paused) {
        footstepsAudio.pause();
        footstepsAudio.currentTime = 0;
      }
      return;
    }

    footstepsAudio.playbackRate = THREE.MathUtils.clamp(speed / player.speed, 1, 1.9);
    if (footstepsAudio.paused && !footstepsAudioPending && !footstepsAudioFailed) {
      footstepsAudioPending = true;
      const playback = footstepsAudio.play();
      if (playback) {
        playback.then(() => {
          footstepsAudioPending = false;
        }).catch(error => {
          footstepsAudioPending = false;
          if (error?.name === "AbortError") return;
          footstepsAudioFailed = true;
          console.error("Player footsteps could not play.", error);
          showToast("Footsteps audio could not play.");
        });
      } else {
        footstepsAudioPending = false;
      }
    }
  }

  function ensureEnergyDrinkAudioPlaying() {
    if (energyDrinkAudio.paused && !energyDrinkAudioPending && !energyDrinkAudioFailed && !energyDrinkAudioFinished) {
      energyDrinkAudioPending = true;
      const playback = energyDrinkAudio.play();
      if (playback) {
        playback.then(() => {
          energyDrinkAudioPending = false;
        }).catch(error => {
          energyDrinkAudioPending = false;
          if (error?.name === "AbortError") return;
          energyDrinkAudioFailed = true;
          console.error("Energy Drink chug audio could not play.", error);
          showToast("Energy Drink audio could not play.");
        });
      } else {
        energyDrinkAudioPending = false;
      }
    }
  }

  function syncEnergyDrinkAudio(controlsActive) {
    if (itemUseState !== "chugging") {
      if (!energyDrinkAudio.paused) {
        energyDrinkAudio.pause();
        energyDrinkAudio.currentTime = 0;
      }
      return;
    }
    if (controlsActive) ensureEnergyDrinkAudioPlaying();
    else energyDrinkAudio.pause();
  }

  function createAudioElement(source) {
    const audio = new Audio(source);
    audio.preload = "auto";
    return audio;
  }

  function playSoundEffect(audio, label, notifyOnFailure = true) {
    audio.currentTime = 0;
    const playback = audio.play();
    playback?.catch(error => {
      if (error?.name === "AbortError") return;
      console.error(`${label} could not play.`, error);
      if (notifyOnFailure) showToast(`${label} could not play.`);
    });
  }

  energyDrinkAudio.addEventListener("ended", () => {
    energyDrinkAudioFinished = true;
  });

  function createSpatialChannel(context, audio, stereoVoice = false, position = malleo.position, gainLevel = 0.9) {
    const source = context.createMediaElementSource(audio);
    const panner = context.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 2;
    panner.maxDistance = 38;
    panner.rolloffFactor = 1.25;
    const stereoPanner = stereoVoice ? context.createStereoPanner() : null;
    const gain = context.createGain();
    gain.gain.value = gainLevel;
    source.connect(panner);
    if (stereoPanner) {
      panner.connect(stereoPanner);
      stereoPanner.connect(gain);
    } else {
      panner.connect(gain);
    }
    gain.connect(context.destination);
    return { audio, panner, stereoPanner, position };
  }

  function startSpatialAudio() {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) {
      showToast("Malleo's spatial audio is not supported by this browser.");
      return;
    }

    try {
      if (!spatialAudioContext) {
        const context = new AudioContextConstructor();
        const channels = malleoVoiceLines.map(audio => createSpatialChannel(context, audio, true));
        const weegeeChannels = weegeeVoiceLines.map(audio =>
          createSpatialChannel(context, audio, true, weegee.position, 0.38)
        );
        const jumpscare = createSpatialChannel(context, jumpscareAudio);
        const weegeeScream = createSpatialChannel(context, weegeeScreamAudio, true, weegee.position, 0.38);
        const postKillLine = createSpatialChannel(context, postKillAudio, true);
        spatialAudioContext = context;
        malleoEnemy.voiceChannels = channels;
        weegeeEnemy.voiceChannels = weegeeChannels;
        jumpscareChannel = jumpscare;
        weegeeScreamChannel = weegeeScream;
        postKillChannel = postKillLine;
        spatialChannels.push(...channels, ...weegeeChannels, jumpscare, weegeeScream, postKillLine);
      }
      spatialAudioContext.resume().catch(error => {
        console.error("Could not resume Malleo's spatial audio.", error);
        showToast("Malleo's spatial audio could not start.");
      });
    } catch (error) {
      console.error("Could not initialize Malleo's spatial audio.", error);
      showToast("Malleo's spatial audio could not start.");
    }
  }

  function playFireflowerJingle() {
    if (!spatialAudioContext || spatialAudioContext.state === "closed") return;
    const play = () => {
      const notes = [659.25, 783.99, 987.77, 1318.51];
      let noteStart = spatialAudioContext.currentTime;
      notes.forEach((frequency, index) => {
        const duration = index === notes.length - 1 ? 0.18 : 0.09;
        const oscillator = spatialAudioContext.createOscillator();
        const gain = spatialAudioContext.createGain();
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(frequency, noteStart);
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.09, noteStart + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);
        oscillator.connect(gain);
        gain.connect(spatialAudioContext.destination);
        oscillator.addEventListener("ended", () => {
          oscillator.disconnect();
          gain.disconnect();
        }, { once: true });
        oscillator.start(noteStart);
        oscillator.stop(noteStart + duration);
        noteStart += duration + 0.015;
      });
    };

    if (spatialAudioContext.state === "running") {
      play();
    } else {
      spatialAudioContext.resume().then(play).catch(error => {
        console.error("Could not play the fireflower pickup jingle.", error);
        showToast("The fireflower jingle couldn't play.");
      });
    }
  }

  function playCoinBagJingle() {
    if (!spatialAudioContext || spatialAudioContext.state === "closed") return;
    const play = () => {
      const notes = [987.77, 1174.66, 1567.98];
      let noteStart = spatialAudioContext.currentTime;
      notes.forEach((frequency, index) => {
        const duration = index === notes.length - 1 ? 0.14 : 0.075;
        const oscillator = spatialAudioContext.createOscillator();
        const gain = spatialAudioContext.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(frequency, noteStart);
        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.075, noteStart + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);
        oscillator.connect(gain);
        gain.connect(spatialAudioContext.destination);
        oscillator.addEventListener("ended", () => {
          oscillator.disconnect();
          gain.disconnect();
        }, { once: true });
        oscillator.start(noteStart);
        oscillator.stop(noteStart + duration);
        noteStart += duration + 0.012;
      });
    };

    if (spatialAudioContext.state === "running") {
      play();
    } else {
      spatialAudioContext.resume().then(play).catch(error => {
        console.error("Could not play the coin bag pickup jingle.", error);
        showToast("The coin bag jingle couldn't play.");
      });
    }
  }

  function playExitHintBeep() {
    if (exitHintAudioFailed) return;
    playMapHintBeep("Exit hint beep", () => {
      exitHintAudioFailed = true;
    });
  }

  function playFireflowerTrackerBeep() {
    if (fireflowerTrackerAudioFailed) return;
    playMapHintBeep("Fireflower tracker beep", () => {
      fireflowerTrackerAudioFailed = true;
    });
  }

  function playToadHintBeep() {
    if (toadHintAudioFailed) return;
    playMapHintBeep("Toad hint beep", () => {
      toadHintAudioFailed = true;
    });
  }

  function playMapHintBeep(label, markFailed) {
    const context = spatialAudioContext;
    if (!context || context.state === "closed") return;
    const play = () => {
      const start = context.currentTime;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(880, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.addEventListener("ended", () => {
        oscillator.disconnect();
        gain.disconnect();
      }, { once: true });
      oscillator.start(start);
      oscillator.stop(start + 0.18);
    };

    if (context.state === "running") {
      play();
    } else {
      context.resume().then(play).catch(error => {
        markFailed();
        console.error(`Could not play the ${label.toLowerCase()}.`, error);
        showToast(`The ${label.toLowerCase()} couldn't play.`);
      });
    }
  }

  function setAudioCoordinates(node, prefix, vector) {
    const x = node[`${prefix}X`];
    const y = node[`${prefix}Y`];
    const z = node[`${prefix}Z`];
    if (x && y && z) {
      x.value = vector.x;
      y.value = vector.y;
      z.value = vector.z;
    } else if (prefix === "position") {
      node.setPosition(vector.x, vector.y, vector.z);
    } else {
      node.setOrientation(vector.x, vector.y, vector.z);
    }
  }

  function updateSpatialAudio() {
    if (!spatialAudioContext || spatialAudioContext.state === "closed") return;
    const listener = spatialAudioContext.listener;
    camera.getWorldDirection(audioForward);
    camera.getWorldQuaternion(audioRotation);
    audioRight.set(1, 0, 0).applyQuaternion(audioRotation);
    audioUp.set(0, 1, 0).applyQuaternion(audioRotation);
    setAudioCoordinates(listener, "position", camera.position);
    setAudioCoordinates(listener, "forward", audioForward);
    setAudioCoordinates(listener, "up", audioUp);
    for (const channel of spatialChannels) {
      setAudioCoordinates(channel.panner, "position", channel.position);
      if (channel.stereoPanner) {
        const relativeX = channel.position.x - camera.position.x;
        const relativeY = channel.position.y - camera.position.y;
        const relativeZ = channel.position.z - camera.position.z;
        const horizontalDistance = Math.hypot(relativeX, relativeZ);
        channel.stereoPanner.pan.value = horizontalDistance > 0
          ? THREE.MathUtils.clamp((relativeX * audioRight.x + relativeY * audioRight.y + relativeZ * audioRight.z) / horizontalDistance, -1, 1)
          : 0;
      }
    }
  }

  function playSpatialChannel(channel, label) {
    if (!channel || !spatialAudioContext) {
      showToast(`${label} audio is unavailable.`);
      return;
    }
    const play = () => {
      if (channel.audio.readyState > 0) channel.audio.currentTime = 0;
      const playback = channel.audio.play();
      playback?.catch(error => {
        console.error(`Could not play ${label} audio.`, error);
        showToast(`${label} audio could not play.`);
      });
    };
    if (spatialAudioContext.state === "running") {
      play();
    } else {
      spatialAudioContext.resume().then(play).catch(error => {
        console.error(`Could not resume audio for ${label}.`, error);
        showToast(`${label} audio could not play.`);
      });
    }
  }

  function updateEnemyVoice(enemy, time) {
    if (!spatialAudioContext || spatialAudioContext.state !== "running") return;
    if (!enemy.spawned || enemy.distance > 32 || time < enemy.nextVoiceLineTime) return;
    if (enemy.voiceChannels.some(channel => !channel.audio.paused)) return;
    const channel = enemy.voiceChannels[Math.floor(Math.random() * enemy.voiceChannels.length)];
    enemy.nextVoiceLineTime = time + 12000 + Math.random() * 4000;
    playSpatialChannel(channel, `${enemy.name} voice`);
  }

  function stopEnemyVoiceLines(enemy) {
    for (const channel of enemy.voiceChannels) {
      if (channel.audio.paused) continue;
      channel.audio.pause();
      channel.audio.currentTime = 0;
    }
  }

  function playRandomEnemyVoice(enemy, label) {
    if (!enemy.voiceChannels.length) return;
    const channel = enemy.voiceChannels[Math.floor(Math.random() * enemy.voiceChannels.length)];
    playSpatialChannel(channel, label);
  }

  function triggerEnemyDeathAudio(enemy) {
    cancelItemUse();
    updateFootsteps(0);
    gameElement.classList.add("jumpscare-shake");
    jumpscareEffect.classList.add("active");
    stopEnemyVoiceLines(malleoEnemy);
    stopEnemyVoiceLines(weegeeEnemy);
    updateSpatialAudio();
    const isWeegee = enemy === weegeeEnemy;
    playSpatialChannel(isWeegee ? weegeeScreamChannel : jumpscareChannel, "Jumpscare");
    clearTimeout(postKillLineTimer);
    postKillLineTimer = setTimeout(() => {
      if (isWeegee) {
        playRandomEnemyVoice(enemy, "Weegee post-kill voice");
      } else {
        playSpatialChannel(postKillChannel, "Malleo post-kill voice");
      }
    }, 2000);
  }

  function enableFallbackControls() {
    fallbackControls = true;
    showToast("Pointer lock unavailable. Click and drag to look; use WASD.");
  }

  menuButton.addEventListener("click", () => {
    if (menu.classList.contains("pause-menu")) enterGame();
    else startLoading();
  });
  mainMenuButton.addEventListener("click", () => showMenu("main"));
  loadingRetry.addEventListener("click", () => window.location.reload());
  document.getElementById("restart-button").addEventListener("click", () => window.location.reload());
  document.getElementById("caught-button").addEventListener("click", () => window.location.reload());
  toadShopButtons.forEach(button => {
    button.addEventListener("click", () => purchaseShopItem(button.dataset.shopItem));
  });

  document.addEventListener("pointerlockchange", () => {
    if (!isPlaying || isWon) return;
    if (toadDialogueOpen || shopOpen) {
      if (document.pointerLockElement !== renderer.domElement) fallbackControls = true;
      return;
    }
    if (document.pointerLockElement === renderer.domElement) {
      fallbackControls = false;
      menu.classList.add("hidden");
    }
    else showMenu("pause");
  });

  document.addEventListener("pointerlockerror", enableFallbackControls);

  document.addEventListener("mousemove", event => {
    const locked = document.pointerLockElement === renderer.domElement;
    if (!isPlaying || toadDialogueOpen || shopOpen || playerSlipState || (!locked && !(fallbackControls && event.buttons === 1))) return;
    player.yaw -= event.movementX * 0.0025;
    player.pitch = THREE.MathUtils.clamp(player.pitch - event.movementY * 0.0022, -1.35, 1.35);
  });

  document.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    if (toadDialogueOpen || shopOpen) {
      const focusedShopButton = shopOpen
        && event.target instanceof Element
        && event.target.matches(".toad-shop-item");
      if (
        ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)
        && !(key === " " && focusedShopButton)
      ) {
        event.preventDefault();
      }
      if (key === "e" && !event.repeat && isPlaying) interact();
      return;
    }
    if (key === "shift" || event.code === "ShiftLeft" || event.code === "ShiftRight") sprintHeld = true;
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
    if (key === "f" && !event.repeat && isPlaying && (document.pointerLockElement === renderer.domElement || fallbackControls)) {
      flashlight.visible = !flashlight.visible;
      showToast(`FLASHLIGHT ${flashlight.visible ? "ON" : "OFF"}.`);
      event.preventDefault();
    }
    if (/^[1-6]$/.test(key) && isPlaying && (document.pointerLockElement === renderer.domElement || fallbackControls)) {
      selectHotbarSlot(Number(key) - 1);
      event.preventDefault();
    }
    pressed.add(key);
    if (key === "e" && !event.repeat && isPlaying && (document.pointerLockElement === renderer.domElement || fallbackControls)) interact();
    if (key === "escape" && fallbackControls && isPlaying && !shopOpen && !toadDialogueOpen) {
      isPlaying = false;
      showMenu("pause");
    }
  });
  document.addEventListener("keyup", event => {
    const key = event.key.toLowerCase();
    pressed.delete(key);
    if (key === "shift" || event.code === "ShiftLeft" || event.code === "ShiftRight") sprintHeld = false;
  });
  window.addEventListener("blur", () => {
    pressed.clear();
    sprintHeld = false;
  });

  document.addEventListener("wheel", event => {
    if (!isPlaying || toadDialogueOpen || shopOpen || (document.pointerLockElement !== renderer.domElement && !fallbackControls) || event.deltaY === 0) return;
    event.preventDefault();
    selectHotbarSlot((selectedHotbarSlot + (event.deltaY > 0 ? 1 : -1) + HOTBAR_SLOT_COUNT) % HOTBAR_SLOT_COUNT);
  }, { passive: false });

  document.addEventListener("mousedown", event => {
    if (event.button !== 0 || !isPlaying || (document.pointerLockElement !== renderer.domElement && !fallbackControls)) return;
    if (toadDialogueOpen || shopOpen) return;
    useSelectedItem();
  });

  function selectHotbarSlot(index) {
    if (index < 0 || index >= HOTBAR_SLOT_COUNT) return;
    if (index !== selectedHotbarSlot) {
      activeFireflowerTrackerTarget = null;
      fireflowerTrackerElapsed = 0;
      lastTrackerBeepCycle = -1;
    }
    selectedHotbarSlot = index;
    updateHotbar();
  }

  function useSelectedItem() {
    if (itemUseState !== "idle" || playerSlipState) return;
    const item = hotbar[selectedHotbarSlot];
    if (item === "fireflower-tracker") {
      showToast("TRACKER ACTIVE WHILE SELECTED.");
      return;
    }
    if (item === "banana-peel") {
      bananaDropPosition = getBananaDropPosition();
      if (!bananaDropPosition) {
        showToast("No room to drop the banana peel here.");
        return;
      }
      hotbar[selectedHotbarSlot] = null;
      activeItemType = "banana-peel";
      itemUseState = "placing";
      bananaPlaceElapsed = 0;
      bananaWasPlaced = false;
      bananaPlacementAttempted = false;
      updateHotbar();
      showToast("BANANA PEEL! DROP IT LIKE IT'S HOT.");
      return;
    }
    if (item !== "energy-drink") {
      showToast("That hotbar slot is empty.");
      return;
    }

    hotbar[selectedHotbarSlot] = null;
    activeItemType = "energy-drink";
    itemUseState = "chugging";
    drinkUseElapsed = 0;
    drinkThrowElapsed = 0;
    energyDrinkAudio.currentTime = 0;
    energyDrinkAudioFailed = false;
    energyDrinkAudioFinished = false;
    updateHotbar();
    ensureEnergyDrinkAudioPlaying();
    showToast("ENERGY DRINK! CHUG TIME!");
  }

  function cancelItemUse() {
    energyDrinkAudio.pause();
    energyDrinkAudio.currentTime = 0;
    energyDrinkAudioPending = false;
    itemUseState = "idle";
    activeItemType = null;
    drinkUseElapsed = 0;
    drinkThrowElapsed = 0;
    bananaPlaceElapsed = 0;
    bananaWasPlaced = false;
    bananaPlacementAttempted = false;
    bananaDropPosition = null;
  }

  function getBananaDropPosition() {
    const forwardX = -Math.sin(player.yaw);
    const forwardZ = -Math.cos(player.yaw);
    for (const distance of [1.05, 0.65, 0]) {
      const x = playerPosition.x + forwardX * distance;
      const z = playerPosition.z + forwardZ * distance;
      if (canStandAt(x, z) && !isDoorwayBlocked(x, z)) {
        return { x, z };
      }
    }
    return null;
  }

  function placeBananaPeel(time) {
    if (!bananaDropPosition) return false;
    const sprite = createLitBillboard(textures.bananaPeel, 0.03);
    sprite.position.set(bananaDropPosition.x, 0.34, bananaDropPosition.z);
    sprite.scale.set(0.78, 0.78, 1);
    placedBananaPeels.push({
      sprite,
      x: bananaDropPosition.x,
      z: bananaDropPosition.z,
      playerImmuneUntil: time + BANANA_PEEL_IMMUNITY_MS,
      used: false
    });
    return true;
  }

  function interact() {
    if (shopOpen) {
      endToadInteraction();
      return;
    }
    if (toadDialogueOpen) {
      if (toadDialogueAction === "shop") openToadShop();
      else endToadInteraction();
      return;
    }
    if (isAimingAtToad()) {
      toadFound = true;
      toadShopHadPointerLock = document.pointerLockElement === renderer.domElement;
      if (hasNoToadStock()) {
        showToadDialogue(TOAD_SOLD_OUT_MESSAGE, "leave");
      } else if (
        toadLastVisitEndedAt !== null
        && performance.now() - toadLastVisitEndedAt >= TOAD_RETURN_INTERVAL_MS
      ) {
        showToadDialogue(TOAD_RETURN_GREETING, "shop");
      } else {
        showToadDialogue(TOAD_GREETING, "shop");
      }
      return;
    }

    const dx = playerPosition.x - door.center.x;
    const dz = playerPosition.z - door.center.z;
    if (Math.hypot(dx, dz) > 2.7) return;
    if (flowersFound < FLOWER_COUNT) {
      showToast(`${FLOWER_COUNT - flowersFound} fireflower${FLOWER_COUNT - flowersFound === 1 ? "" : "s"} left!`);
      return;
    }
    if (doorOpen) {
      showToast("The way is open. Keep going.");
      return;
    }
    if (!isAimingAtExitDoor()) {
      showToast("Aim at the garage door to open it.");
      return;
    }
    doorOpen = true;
    showToast("The garage door rumbles open...");
  }

  function isAimingAtToad() {
    const dx = toad.sprite.position.x - playerPosition.x;
    const dz = toad.sprite.position.z - playerPosition.z;
    const distance = Math.hypot(dx, dz);
    if (
      distance > 5
      || !hasClearMazeLineOfSight(
        playerPosition.x,
        playerPosition.z,
        toad.sprite.position.x,
        toad.sprite.position.z,
        distance
      )
    ) return false;
    exitDoorRaycaster.setFromCamera(reticlePosition, camera);
    const intersections = exitDoorRaycaster.intersectObject(toad.sprite, false);
    return intersections.length > 0 && intersections[0].distance <= 5;
  }

  function showToadDialogue(message, nextAction) {
    if (shopOpen) {
      shopOpen = false;
      toadShop.classList.add("hidden");
    }
    toadDialogueText.textContent = message;
    toadDialogueAction = nextAction;
    toadDialogueHint.textContent = nextAction === "shop" ? "PRESS E TO CONTINUE" : "PRESS E TO LEAVE";
    toadDialogueOpen = true;
    pressed.clear();
    sprintHeld = false;
    cancelItemUse();
    toadDialogue.classList.remove("hidden");
  }

  function openToadShop() {
    toadDialogueOpen = false;
    toadDialogue.classList.add("hidden");
    shopOpen = true;
    toadShop.classList.remove("hidden");
    toadShopHadPointerLock = document.pointerLockElement === renderer.domElement;
    fallbackControls = true;
    toadShopStatus.textContent = hotbar.includes(null)
      ? "Purchases go into an empty hotbar slot."
      : "HOTBAR FULL. USE AN ITEM BEFORE BUYING.";
    updateToadShop();
    if (document.pointerLockElement === renderer.domElement) {
      toadShopHadPointerLock = true;
      document.exitPointerLock?.();
    }
  }

  function endToadInteraction() {
    shopOpen = false;
    toadDialogueOpen = false;
    toadShop.classList.add("hidden");
    toadDialogue.classList.add("hidden");
    toadLastVisitEndedAt = performance.now();
    pressed.clear();
    sprintHeld = false;
    cancelItemUse();
    if (toadShopHadPointerLock) {
      toadShopHadPointerLock = false;
      fallbackControls = false;
      requestPlayerPointerLock();
    }
  }

  function isAimingAtExitDoor() {
    exitDoorRaycaster.setFromCamera(reticlePosition, camera);
    const intersections = exitDoorRaycaster.intersectObject(door.panel, false);
    return intersections.length > 0 && intersections[0].distance <= 5;
  }

  function worldToCell(value) {
    return Math.floor((value + worldSize / 2) / CELL);
  }

  function findMazePath(start, target) {
    const previous = new Int32Array(MAZE_SIZE * MAZE_SIZE);
    previous.fill(-2);
    const startIndex = start.z * MAZE_SIZE + start.x;
    const targetIndex = target.z * MAZE_SIZE + target.x;
    const queue = [startIndex];
    previous[startIndex] = -1;

    for (let head = 0; head < queue.length && previous[targetIndex] === -2; head += 1) {
      const currentIndex = queue[head];
      const x = currentIndex % MAZE_SIZE;
      const z = Math.floor(currentIndex / MAZE_SIZE);
      for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const nextX = x + dx;
        const nextZ = z + dz;
        const nextIndex = nextZ * MAZE_SIZE + nextX;
        if (maze[nextZ]?.[nextX] !== 1 || previous[nextIndex] !== -2) continue;
        previous[nextIndex] = currentIndex;
        queue.push(nextIndex);
      }
    }

    if (previous[targetIndex] === -2) return [{ x: start.x, z: start.z }];
    const path = [];
    for (let index = targetIndex; index !== -1; index = previous[index]) {
      path.push({ x: index % MAZE_SIZE, z: Math.floor(index / MAZE_SIZE) });
    }
    return path.reverse();
  }

  function choosePatrolWaypoint(currentCell, recentPatrolTargets) {
    const distances = getDistances(maze, currentCell.x, currentCell.z);
    const currentKey = `${currentCell.x},${currentCell.z}`;
    const recent = new Set(recentPatrolTargets);
    let candidates = patrolWaypoints
      .filter(cell => `${cell.x},${cell.z}` !== currentKey && !recent.has(`${cell.x},${cell.z}`))
      .map(cell => ({ ...cell, distance: distances[cell.z][cell.x] }))
      .filter(cell => cell.distance >= 12);

    if (!candidates.length) {
      recentPatrolTargets.length = 0;
      candidates = patrolWaypoints
        .filter(cell => `${cell.x},${cell.z}` !== currentKey)
        .map(cell => ({ ...cell, distance: distances[cell.z][cell.x] }))
        .filter(cell => cell.distance > 0);
    }

    candidates.sort((a, b) => b.distance - a.distance);
    const farChoices = candidates.slice(0, Math.min(5, candidates.length));
    const target = farChoices[Math.floor(Math.random() * farChoices.length)];
    if (!target) return { ...currentCell };
    recentPatrolTargets.push(`${target.x},${target.z}`);
    if (recentPatrolTargets.length > 5) recentPatrolTargets.shift();
    return { x: target.x, z: target.z };
  }

  function canEnemySeePlayer(enemy, distance) {
    return distance <= MALLEO_SIGHT_RANGE && hasClearMazeLineOfSight(
      enemy.sprite.position.x,
      enemy.sprite.position.z,
      playerPosition.x,
      playerPosition.z,
      distance
    );
  }

  function hasClearMazeLineOfSight(startX, startZ, endX, endZ, distance) {
    const dx = endX - startX;
    const dz = endZ - startZ;
    const steps = Math.ceil(distance / 0.45);
    for (let step = 1; step < steps; step += 1) {
      const progress = step / steps;
      const x = worldToCell(startX + dx * progress);
      const z = worldToCell(startZ + dz * progress);
      if (maze[z]?.[x] !== 1) return false;
    }
    return true;
  }

  function triggerEnemySlip(enemy) {
    const peel = placedBananaPeels.find(item =>
      !item.used && Math.hypot(enemy.sprite.position.x - item.x, enemy.sprite.position.z - item.z) < 1.05
    );
    if (!peel) return false;

    peel.used = true;
    scene.remove(peel.sprite);
    enemy.slipState = { phase: "falling", elapsed: 0, roll: (Math.random() - 0.5) * 1.2 };
    playSoundEffect(bananaPeelSlipAudio, "Banana slip sound");
    showToast(`${enemy.name.toUpperCase()} HIT A BANANA PEEL!`);
    return true;
  }

  function updateEnemySlip(enemy, delta) {
    const state = enemy.slipState;
    if (!state) return;
    state.elapsed += delta;
    enemy.lastPlayerSightedAt += delta * 1000;
    enemy.nextPathTime += delta * 1000;
    const height = 3.65;
    const width = height * (275 / 507);

    if (state.phase === "falling") {
      const progress = THREE.MathUtils.clamp(state.elapsed / BANANA_MALLEO_FALL_TIME, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      enemy.sprite.position.y = 1.825 - eased * 1.65 + Math.sin(progress * Math.PI * 4) * 0.12 * (1 - progress);
      enemy.sprite.userData.roll = state.roll * eased + Math.sin(progress * Math.PI * 3) * 0.72;
      enemy.sprite.scale.set(width * (1 + Math.sin(progress * Math.PI * 5) * 0.13), height * (1 - eased * 0.68), 1);
      if (progress >= 1) {
        enemy.sprite.visible = false;
        enemy.flatMesh.position.set(enemy.sprite.position.x, 0.035, enemy.sprite.position.z);
        enemy.flatMesh.material.opacity = 1;
        enemy.flatMesh.visible = true;
        state.phase = "down";
        playSoundEffect(bananaPeelFallAudio, "Banana fall sound");
        if (enemy === weegeeEnemy) playRandomEnemyVoice(enemy, "Weegee impact voice");
        else playSoundEffect(malleoOofAudio, "Malleo impact sound");
      }
      return;
    }

    if (state.phase === "down") {
      if (state.elapsed >= BANANA_MALLEO_DOWN_TIME / 1000) {
        state.phase = "recovering";
        state.elapsed = 0;
        enemy.sprite.visible = true;
        enemy.sprite.position.y = 0.08;
        enemy.sprite.material.opacity = 0;
      }
      return;
    }

    const progress = THREE.MathUtils.clamp(state.elapsed / BANANA_MALLEO_RECOVER_TIME, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    const flatOpacity = 1 - THREE.MathUtils.clamp(progress * 2.2, 0, 1);
    enemy.flatMesh.position.set(enemy.sprite.position.x, 0.035, enemy.sprite.position.z);
    enemy.flatMesh.material.opacity = flatOpacity;
    enemy.flatMesh.visible = flatOpacity > 0.02;
    enemy.sprite.visible = progress > 0.05;
    enemy.sprite.material.opacity = THREE.MathUtils.clamp(progress * 2, 0, 1);
    enemy.sprite.position.y = 0.08 + eased * 1.745;
    enemy.sprite.userData.roll = state.roll * (1 - eased);
    enemy.sprite.scale.set(width, height * (0.32 + eased * 0.68), 1);
    if (progress >= 1) {
      enemy.sprite.position.y = 1.825;
      enemy.sprite.userData.roll = 0;
      enemy.sprite.material.opacity = 1;
      enemy.sprite.scale.set(width, height, 1);
      enemy.sprite.visible = true;
      enemy.flatMesh.visible = false;
      enemy.flatMesh.material.opacity = 1;
      if (enemy === weegeeEnemy) playRandomEnemyVoice(enemy, "Weegee recovery voice");
      else playSoundEffect(malleoMammaMiaAudio, "Malleo recovery sound");
      enemy.slipState = null;
    }
  }

  function updateEnemy(enemy, time, delta) {
    if (!enemy.spawned) return;
    if (enemy.slipState) {
      updateEnemySlip(enemy, delta);
      return;
    }
    const position = enemy.sprite.position;
    const currentCell = { x: worldToCell(position.x), z: worldToCell(position.z) };
    const playerCell = { x: worldToCell(playerPosition.x), z: worldToCell(playerPosition.z) };
    const directDistance = Math.hypot(playerPosition.x - position.x, playerPosition.z - position.z);
    const hasLineOfSight = canEnemySeePlayer(enemy, directDistance);
    const withinHearingRange = directDistance <= MALLEO_HEARING_RADIUS;
    const spotted = withinHearingRange || hasLineOfSight;

    if (spotted) {
      if (enemy.mode !== "chase") {
        enemy.mode = "chase";
        enemy.patrolTarget = null;
        enemy.nextPathTime = 0;
        showToast(`${enemy.name.toUpperCase()} ${hasLineOfSight ? "SPOTTED" : "HEARD"} YOU! RUN!`);
      }
      if (!enemy.lastKnownPlayerPosition) enemy.lastKnownPlayerPosition = new THREE.Vector3();
      enemy.lastKnownPlayerPosition.set(playerPosition.x, 0, playerPosition.z);
      enemy.lastPlayerSightedAt = time;
    } else if (enemy.mode === "chase" && time - enemy.lastPlayerSightedAt > MALLEO_CHASE_MEMORY) {
      enemy.mode = "patrol";
      enemy.lastKnownPlayerPosition = null;
      enemy.patrolTarget = null;
      enemy.nextPathTime = 0;
      showToast(`${enemy.name} lost your trail. Keep moving!`);
    }

    if (hasLineOfSight) {
      enemy.hasSeenPlayer = true;
      enemy.lastVisualSightedAt = time;
    }

    if (enemy.mode === "patrol") {
      const patrolX = enemy.patrolTarget ? cellWorld(enemy.patrolTarget.x) : 0;
      const patrolZ = enemy.patrolTarget ? cellWorld(enemy.patrolTarget.z) : 0;
      if (!enemy.patrolTarget || Math.hypot(patrolX - position.x, patrolZ - position.z) < 0.65) {
        enemy.patrolTarget = choosePatrolWaypoint(currentCell, enemy.recentPatrolTargets);
        enemy.nextPathTime = 0;
      }
    }

    const targetX = enemy.mode === "chase"
      ? enemy.lastKnownPlayerPosition.x
      : cellWorld(enemy.patrolTarget.x);
    const targetZ = enemy.mode === "chase"
      ? enemy.lastKnownPlayerPosition.z
      : cellWorld(enemy.patrolTarget.z);
    const targetCell = { x: worldToCell(targetX), z: worldToCell(targetZ) };
    if (time >= enemy.nextPathTime) {
      enemy.path = findMazePath(currentCell, targetCell);
      const playerDistances = getDistances(maze, currentCell.x, currentCell.z);
      const playerSteps = playerDistances[playerCell.z][playerCell.x];
      if (playerSteps === 0) {
        enemy.distance = directDistance;
      } else if (playerSteps > 0) {
        const startOffset = Math.hypot(position.x - cellWorld(currentCell.x), position.z - cellWorld(currentCell.z));
        const endOffset = Math.hypot(playerPosition.x - cellWorld(playerCell.x), playerPosition.z - cellWorld(playerCell.z));
        enemy.distance = playerSteps * CELL + startOffset + endOffset;
      } else {
        enemy.distance = Infinity;
      }
      enemy.nextPathTime = time + 420;
    }

    const nextCell = enemy.path.length > 1 ? enemy.path[1] : targetCell;
    const waypointX = enemy.mode === "chase" && enemy.path.length === 1 ? targetX : cellWorld(nextCell.x);
    const waypointZ = enemy.mode === "chase" && enemy.path.length === 1 ? targetZ : cellWorld(nextCell.z);
    const dx = waypointX - position.x;
    const dz = waypointZ - position.z;
    const distanceToWaypoint = Math.hypot(dx, dz);
    const speed = enemy.mode === "chase" ? 4.5 : 2.4;
    const step = Math.min(distanceToWaypoint, speed * delta);
    if (distanceToWaypoint > 0) {
      position.x += (dx / distanceToWaypoint) * step;
      position.z += (dz / distanceToWaypoint) * step;
    }
    position.y = 1.825 + Math.sin(time * 0.006) * 0.055;
    if (triggerEnemySlip(enemy)) return;

    const close = enemy.distance < 34;
    const modeLabel = enemy.mode === "chase"
      ? (enemy.distance < 20 ? "CHASE · VERY CLOSE" : "CHASE MODE")
      : (close ? "PATROL · NEARBY" : "PATROL MODE");
    const status = enemy === weegeeEnemy ? weegeeStatus : malleoStatus;
    status.innerHTML = `<span class="signal-dot"></span>${enemy.name.toUpperCase()} <b>${modeLabel}</b>`;

    if (Math.hypot(playerPosition.x - position.x, playerPosition.z - position.z) < 1.45) {
      isPlaying = false;
      stopMusic();
      caughtEnemyImage.src = enemy === weegeeEnemy ? "./assets/weegee/Weegee.png" : "./assets/malleo/Malleo.png";
      caughtEnemyImage.alt = `${enemy.name} caught you`;
      caughtTitle.innerHTML = `${enemy.name.toUpperCase()}<br><span>GOT YOU!</span>`;
      caughtDescription.textContent = enemy === weegeeEnemy
        ? "Malleo called in backup. That did not go well."
        : "Skill issue? Maybe. Maze issue? Also maybe.";
      triggerEnemyDeathAudio(enemy);
      document.exitPointerLock?.();
      setTimeout(() => caughtScreen.classList.remove("hidden"), 500);
    }
  }

  function chooseWeegeeSpawnCell() {
    const playerCell = { x: worldToCell(playerPosition.x), z: worldToCell(playerPosition.z) };
    const distances = getDistances(maze, playerCell.x, playerCell.z);
    const reachableCells = [];
    for (let z = 1; z < MAZE_SIZE - 1; z += 1) {
      for (let x = 1; x < MAZE_SIZE - 1; x += 1) {
        if (maze[z][x] !== 1 || distances[z][x] < 1) continue;
        const worldX = cellWorld(x);
        const worldZ = cellWorld(z);
        reachableCells.push({
          x,
          z,
          pathDistance: distances[z][x],
          playerDistance: Math.hypot(worldX - playerPosition.x, worldZ - playerPosition.z),
          malleoDistance: Math.hypot(worldX - malleo.position.x, worldZ - malleo.position.z)
        });
      }
    }
    const goodDistance = reachableCells.filter(cell =>
      cell.pathDistance >= 12
      && cell.pathDistance <= 20
      && cell.playerDistance >= 24
      && cell.malleoDistance >= 12
    );
    if (goodDistance.length) return goodDistance[Math.floor(Math.random() * goodDistance.length)];

    const furtherAway = reachableCells.filter(cell =>
      cell.pathDistance >= 12 && cell.playerDistance >= 24 && cell.malleoDistance >= 8
    );
    const candidates = furtherAway.length
      ? furtherAway
      : reachableCells.filter(cell => cell.pathDistance >= 8 && cell.playerDistance >= 20);
    const fallback = candidates.length ? candidates : reachableCells;
    fallback.sort((a, b) => b.pathDistance - a.pathDistance);
    const farthestChoices = fallback.slice(0, Math.min(5, fallback.length));
    return farthestChoices[Math.floor(Math.random() * farthestChoices.length)] || playerCell;
  }

  function spawnWeegee(time) {
    const cell = chooseWeegeeSpawnCell();
    weegee.position.set(cellWorld(cell.x), 1.825, cellWorld(cell.z));
    weegee.visible = true;
    weegeeFlatMesh.visible = false;
    weegeeEnemy.spawned = true;
    weegeeEnemy.nextPathTime = 0;
    weegeeEnemy.nextVoiceLineTime = time + 6000;
    playSoundEffect(weegeeAnnouncementAudio, "Weegee spawn announcement");
    showToast("MALLEO LOST YOUR TRAIL. WEEGEE JOINED THE HUNT!");
  }

  function updateMalleo(time, delta) {
    updateEnemy(malleoEnemy, time, delta);
    if (!isPlaying) return;
    if (malleoEnemy.hasSeenPlayer
      && !weegeeEnemy.spawned
      && weegeeSpawnDelay === null) {
      weegeeSpawnDelay = WEEGEE_SPAWN_MIN_DELAY
        + Math.random() * (WEEGEE_SPAWN_MAX_DELAY - WEEGEE_SPAWN_MIN_DELAY);
    }
    if (malleoEnemy.lastVisualSightedAt !== null
      && !weegeeEnemy.spawned
      && time - malleoEnemy.lastVisualSightedAt >= weegeeSpawnDelay) {
      spawnWeegee(time);
    }
    if (weegeeEnemy.spawned) updateEnemy(weegeeEnemy, time, delta);
    updateEnemyHud();
  }

  function updateEnemyHud() {
    weegeeStatus.classList.toggle("inactive", !weegeeEnemy.spawned);
    weegeeStatus.setAttribute("aria-hidden", String(!weegeeEnemy.spawned));
    const threateningEnemies = [malleoEnemy, weegeeEnemy]
      .filter(enemy => enemy.spawned && enemy.mode === "chase");
    const closestEnemy = threateningEnemies
      .filter(enemy => enemy.distance < 20)
      .sort((a, b) => a.distance - b.distance)[0];
    malleoWarning.innerHTML = `<span>!!!</span> ${closestEnemy?.name.toUpperCase() || "MALLEO"} IS CLOSE <span>!!!</span>`;
    malleoWarning.classList.toggle("visible", Boolean(closestEnemy));
    hud.classList.toggle("hud-danger", threateningEnemies.some(enemy => enemy.distance < 34));
  }

  function canStandAt(x, z) {
    const offsets = [
      [-PLAYER_RADIUS, -PLAYER_RADIUS], [PLAYER_RADIUS, -PLAYER_RADIUS],
      [-PLAYER_RADIUS, PLAYER_RADIUS], [PLAYER_RADIUS, PLAYER_RADIUS]
    ];
    for (const [ox, oz] of offsets) {
      const pointX = x + ox;
      const pointZ = z + oz;
      const cellX = worldToCell(pointX);
      const cellZ = worldToCell(pointZ);
      if (maze[cellZ]?.[cellX] !== 1 && !isOpenExitDoorway(pointX, pointZ)) return false;
    }
    return true;
  }

  function isOpenExitDoorway(x, z) {
    if (!doorOpen || doorProgress < 1) return false;
    const dx = x - door.center.x;
    const dz = z - door.center.z;
    const outwardDistance = dx * door.normal.x + dz * door.normal.y;
    const lateralDistance = door.acrossX ? dx : dz;
    return outwardDistance >= 0
      && outwardDistance <= CELL + PLAYER_RADIUS * 2
      && Math.abs(lateralDistance) < door.width / 2;
  }

  function isDoorwayBlocked(x, z) {
    if (doorOpen && doorProgress >= 1) return false;
    const dx = x - door.center.x;
    const dz = z - door.center.z;
    const distance = dx * door.normal.x + dz * door.normal.y;
    const lateral = door.acrossX ? dx : dz;
    return Math.abs(distance) < 0.48 && Math.abs(lateral) < door.width * 0.56;
  }

  function movePlayer(delta) {
    const forward = Number(pressed.has("w") || pressed.has("arrowup")) - Number(pressed.has("s") || pressed.has("arrowdown"));
    const strafe = Number(pressed.has("d") || pressed.has("arrowright")) - Number(pressed.has("a") || pressed.has("arrowleft"));
    if (!forward && !strafe) return false;
    playerWasWalkingBackward = forward < 0;
    const sprintRequested = sprintHeld && stamina > 0 && itemUseState !== "chugging";
    const drinkBoost = speedBoostRemaining > 0 ? ENERGY_DRINK_SPEED_MULTIPLIER : 1;
    const movementSpeed = player.speed * (sprintRequested ? SPRINT_MULTIPLIER : 1) * drinkBoost;
    const length = Math.hypot(forward, strafe);
    const f = forward / length;
    const s = strafe / length;
    const moveX = (-Math.sin(player.yaw) * f + Math.cos(player.yaw) * s) * movementSpeed * delta;
    const moveZ = (-Math.cos(player.yaw) * f - Math.sin(player.yaw) * s) * movementSpeed * delta;
    const nextX = playerPosition.x + moveX;
    if (canStandAt(nextX, playerPosition.z) && !isDoorwayBlocked(nextX, playerPosition.z)) playerPosition.x = nextX;
    const nextZ = playerPosition.z + moveZ;
    if (canStandAt(playerPosition.x, nextZ) && !isDoorwayBlocked(playerPosition.x, nextZ)) playerPosition.z = nextZ;
    camera.position.x = playerPosition.x;
    camera.position.z = playerPosition.z;
    return true;
  }

  function updateStamina(delta, movementRequested) {
    if (itemUseState === "chugging") {
      const previousStamina = stamina;
      stamina = Math.min(MAX_STAMINA, stamina + ENERGY_DRINK_REFILL_RATE * delta);
      isSprinting = false;
      isStaminaRecovering = stamina > previousStamina && stamina < MAX_STAMINA;
    } else if (movementRequested && sprintHeld && stamina > 0) {
      stamina = Math.max(0, stamina - delta);
      isSprinting = stamina > 0;
      isStaminaRecovering = false;
    } else {
      isSprinting = false;
      if (!movementRequested) {
        const previousStamina = stamina;
        stamina = Math.min(MAX_STAMINA, stamina + STAMINA_RECOVERY_RATE * delta);
        isStaminaRecovering = stamina > previousStamina && stamina < MAX_STAMINA;
      } else {
        isStaminaRecovering = false;
      }
    }
    updateStaminaDisplay();
  }

  function updateViewBob(delta, movementRequested, controlsActive) {
    const sprinting = controlsActive && movementRequested && isSprinting;
    const walking = controlsActive && movementRequested && !sprinting;
    const rate = sprinting ? 10.5 : walking ? 7.5 : 1.2;
    const amplitude = sprinting ? 0.072 : walking ? 0.038 : 0.009;
    viewBobPhase += delta * rate;
    const verticalOffset = Math.sin(viewBobPhase * (walking || sprinting ? 2 : 1)) * amplitude;
    const roll = Math.sin(viewBobPhase) * (sprinting ? 0.022 : walking ? 0.012 : 0.003);
    camera.position.y = playerPosition.y + (controlsActive ? verticalOffset : 0);
    camera.rotation.set(player.pitch, player.yaw, controlsActive ? roll : 0);
  }

  function updateItemUse(delta, controlsActive, time) {
    syncEnergyDrinkAudio(controlsActive);
    if (!controlsActive) return;

    if (itemUseState === "chugging") {
      drinkUseElapsed += delta;
      if (stamina >= MAX_STAMINA && drinkUseElapsed >= ENERGY_DRINK_MIN_CHUG_TIME) {
        energyDrinkAudio.pause();
        energyDrinkAudio.currentTime = 0;
        itemUseState = "throwing";
        drinkThrowElapsed = 0;
      }
    } else if (itemUseState === "throwing") {
      drinkThrowElapsed += delta;
      if (drinkThrowElapsed >= ENERGY_DRINK_THROW_TIME) {
        itemUseState = "idle";
        activeItemType = null;
        speedBoostRemaining = ENERGY_DRINK_BOOST_DURATION;
        updateStaminaDisplay();
        showToast("ENERGY RUSH! SPEED BOOST FOR 7 SECONDS!");
      }
    } else if (itemUseState === "placing") {
      bananaPlaceElapsed += delta;
      if (!bananaPlacementAttempted && bananaPlaceElapsed >= BANANA_PLACE_RELEASE_TIME) {
        bananaWasPlaced = placeBananaPeel(time);
        bananaPlacementAttempted = true;
      }
      if (bananaPlaceElapsed >= BANANA_PLACE_DURATION) {
        if (!bananaWasPlaced) {
          const slot = hotbar.indexOf(null);
          if (slot >= 0) {
            hotbar[slot] = "banana-peel";
            updateHotbar();
          }
        }
        itemUseState = "idle";
        activeItemType = null;
        bananaPlaceElapsed = 0;
        bananaWasPlaced = false;
        bananaPlacementAttempted = false;
        bananaDropPosition = null;
      }
    }
  }

  function updateHeldItemAnimation(controlsActive) {
    const heldType = activeItemType || (itemUseState === "idle" ? hotbar[selectedHotbarSlot] : null);
    const hasItemInHand = heldType === "energy-drink"
      || heldType === "banana-peel"
      || heldType === "fireflower-tracker";
    heldItemSprite.visible = hasItemInHand;
    if (!hasItemInHand) {
      heldItemMaterial.opacity = 1;
      heldItemMaterial.rotation = 0;
      return;
    }

    const heldTexture = heldType === "banana-peel"
      ? textures.bananaPeel
      : heldType === "fireflower-tracker"
        ? textures.fireflowerTracker
        : textures.energyDrink;
    if (heldItemMaterial.map !== heldTexture) {
      heldItemMaterial.map = heldTexture;
      heldItemMaterial.needsUpdate = true;
    }
    const sway = controlsActive ? Math.sin(viewBobPhase) : 0;
    const bob = controlsActive ? Math.sin(viewBobPhase * 2) : 0;
    const idleX = 0.47 + sway * 0.012;
    const idleY = -0.37 + bob * 0.02;
    const idleZ = -0.84;
    const idleSize = heldType === "banana-peel" ? 0.5 : heldType === "fireflower-tracker" ? 0.46 : 0.42;
    heldItemSprite.scale.set(idleSize, idleSize, 1);
    heldItemMaterial.opacity = 1;
    heldItemMaterial.rotation = sway * 0.018;

    if (itemUseState === "chugging") {
      const raise = THREE.MathUtils.clamp(drinkUseElapsed / 0.45, 0, 1);
      heldItemSprite.position.set(
        idleX - 0.26 * raise,
        idleY + 0.57 * raise + Math.sin(drinkUseElapsed * 18) * 0.018,
        idleZ + 0.24 * raise
      );
      heldItemSprite.scale.set(0.42 + raise * 0.05, 0.42 + raise * 0.05, 1);
      heldItemMaterial.rotation = Math.sin(drinkUseElapsed * 18) * 0.045;
    } else if (itemUseState === "throwing") {
      const progress = THREE.MathUtils.clamp(drinkThrowElapsed / ENERGY_DRINK_THROW_TIME, 0, 1);
      const eased = progress * progress * (3 - 2 * progress);
      heldItemSprite.position.set(
        0.21 + eased * 0.88,
        0.2 - eased * 0.78,
        -0.6 - eased * 0.2
      );
      heldItemSprite.scale.set(0.47 * (1 - progress * 0.25), 0.47 * (1 - progress * 0.25), 1);
      heldItemMaterial.opacity = 1 - progress;
      heldItemMaterial.rotation = progress * 5.5;
    } else if (heldType === "fireflower-tracker"
      && activeFireflowerTrackerTarget
      && fireflowerTrackerElapsed < FIREFLOWER_TRACKER_ACTIVATION_MS) {
      const progress = fireflowerTrackerElapsed / FIREFLOWER_TRACKER_ACTIVATION_MS;
      const pulse = 1 + Math.sin(progress * Math.PI * 4) * 0.12;
      heldItemSprite.position.set(
        idleX + Math.sin(progress * Math.PI * 6) * 0.025,
        idleY + progress * 0.045,
        idleZ
      );
      heldItemSprite.scale.set(idleSize * pulse, idleSize * pulse, 1);
      heldItemMaterial.rotation = Math.sin(progress * Math.PI * 6) * 0.12 * (1 - progress);
    } else if (itemUseState === "placing") {
      const progress = THREE.MathUtils.clamp(bananaPlaceElapsed / BANANA_PLACE_DURATION, 0, 1);
      const eased = progress * progress * (3 - 2 * progress);
      heldItemSprite.position.set(
        idleX + eased * 0.38,
        idleY - eased * 0.56,
        idleZ + eased * 0.28
      );
      heldItemSprite.scale.set(idleSize * (1 - progress * 0.32), idleSize * (1 - progress * 0.32), 1);
      heldItemMaterial.opacity = 1 - Math.max(0, (progress - 0.55) / 0.45);
      heldItemMaterial.rotation = eased * 4.2;
    } else {
      heldItemSprite.position.set(idleX, idleY, idleZ);
    }
  }

  function drawMinimap(time) {
    const size = minimapCanvas.width;
    const padding = 12;
    const cellSize = (size - padding * 2) / MAZE_SIZE;
    const context = minimapContext;
    context.clearRect(0, 0, size, size);
    context.fillStyle = "#07150f";
    context.fillRect(padding, padding, size - padding * 2, size - padding * 2);

    context.beginPath();
    context.strokeStyle = "#3cff88";
    context.lineWidth = 1.5;
    for (let z = 0; z < MAZE_SIZE; z += 1) {
      for (let x = 0; x < MAZE_SIZE; x += 1) {
        if (maze[z][x] !== 1) continue;
        const left = padding + x * cellSize;
        const top = padding + z * cellSize;
        const right = left + cellSize;
        const bottom = top + cellSize;
        if (z === 0 || maze[z - 1][x] === 0) {
          context.moveTo(left, top);
          context.lineTo(right, top);
        }
        if (x === MAZE_SIZE - 1 || maze[z][x + 1] === 0) {
          context.moveTo(right, top);
          context.lineTo(right, bottom);
        }
        if (z === MAZE_SIZE - 1 || maze[z + 1][x] === 0) {
          context.moveTo(right, bottom);
          context.lineTo(left, bottom);
        }
        if (x === 0 || maze[z][x - 1] === 0) {
          context.moveTo(left, bottom);
          context.lineTo(left, top);
        }
      }
    }
    context.stroke();

    const mapX = worldX => padding + ((worldX + worldSize / 2) / CELL) * cellSize;
    const mapZ = worldZ => padding + ((worldZ + worldSize / 2) / CELL) * cellSize;
    for (const enemy of [malleoEnemy, weegeeEnemy]) {
      if (!enemy.spawned || enemy.distance > MALLEO_SIGHT_RANGE) continue;
      const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * 0.02));
      context.globalAlpha = pulse;
      context.fillStyle = enemy === weegeeEnemy ? "#35ff4e" : "#ff344f";
      context.shadowColor = enemy === weegeeEnemy ? "#20ff38" : "#ff163e";
      context.shadowBlur = 9;
      context.beginPath();
      context.arc(mapX(enemy.sprite.position.x), mapZ(enemy.sprite.position.z), 5, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      context.globalAlpha = 1;
    }

    const exitHintElapsed = time - exitHintStartedAt;
    if (flowersFound === FLOWER_COUNT && exitHintElapsed >= 0 && exitHintElapsed < EXIT_HINT_DURATION) {
      const fadeTime = 500;
      const alpha = Math.min(1, exitHintElapsed / fadeTime, (EXIT_HINT_DURATION - exitHintElapsed) / fadeTime);
      context.globalAlpha = alpha;
      context.fillStyle = "#ff9d38";
      context.shadowColor = "#ff8a24";
      context.shadowBlur = 10;
      context.beginPath();
      context.arc(mapX(door.center.x), mapZ(door.center.z), 5.5, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      context.globalAlpha = 1;
    }

    const trackerHintElapsed = fireflowerTrackerElapsed - FIREFLOWER_TRACKER_ACTIVATION_MS;
    if (isPlaying
      && activeFireflowerTrackerTarget
      && !activeFireflowerTrackerTarget.found
      && trackerHintElapsed >= 0) {
      const cyclePosition = trackerHintElapsed % FIREFLOWER_TRACKER_INTERVAL_MS;
      if (cyclePosition < FIREFLOWER_TRACKER_DURATION_MS) {
        const fadeTime = 500;
        const alpha = Math.min(1, cyclePosition / fadeTime, (FIREFLOWER_TRACKER_DURATION_MS - cyclePosition) / fadeTime);
        const flowerPosition = activeFireflowerTrackerTarget.sprite.position;
        context.globalAlpha = alpha;
        context.fillStyle = "#fff";
        context.shadowColor = "#fff";
        context.shadowBlur = 10;
        context.beginPath();
        context.arc(mapX(flowerPosition.x), mapZ(flowerPosition.z), 5.5, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;
        context.globalAlpha = 1;
      }
    }

    if (!toadFound && toadHintElapsed >= TOAD_HINT_INITIAL_DELAY_MS) {
      const pulse = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(toadHintElapsed * 0.012));
      context.globalAlpha = pulse;
      context.fillStyle = "#50baff";
      context.shadowColor = "#1598ff";
      context.shadowBlur = 10;
      context.beginPath();
      context.arc(mapX(toad.sprite.position.x), mapZ(toad.sprite.position.z), 5.5, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      context.globalAlpha = 1;
    }

    context.save();
    context.translate(mapX(playerPosition.x), mapZ(playerPosition.z));
    context.rotate(-player.yaw);
    context.fillStyle = "#fff36b";
    context.strokeStyle = "#151006";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(0, -8);
    context.lineTo(5.5, 6);
    context.lineTo(0, 3.5);
    context.lineTo(-5.5, 6);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  }

  function checkFireflowers(time) {
    for (const flower of fireflowers) {
      if (flower.found) continue;
      const bob = Math.sin(time * 0.003 + flower.phase) * 0.1;
      flower.sprite.position.y = 1.12 + bob;
      const pulse = 1.3 + Math.sin(time * 0.004 + flower.phase) * 0.08;
      flower.sprite.scale.set(pulse, pulse, 1);
      if (flower.sprite.position.distanceTo(playerPosition) < 1.35) {
        flower.found = true;
        scene.remove(flower.sprite);
        removeFireflowerTrackers(flower);
        flowersFound += 1;
        updateObjective();
        playFireflowerJingle();
        if (flowersFound === FLOWER_COUNT) {
          nextExitHintTime = time + EXIT_HINT_INTERVAL;
          exitHintStartedAt = -Infinity;
        }
        showToast(flowersFound === FLOWER_COUNT ? "All six! Go make that door regret existing." : "FIRE FLOWER GET! Extremely plumber-coded.");
      }
    }
  }

  function removeFireflowerTrackers(flower) {
    let removed = false;
    for (let slot = 0; slot < HOTBAR_SLOT_COUNT; slot += 1) {
      if (hotbar[slot] !== "fireflower-tracker" || fireflowerTrackerTargets[slot] !== flower) continue;
      hotbar[slot] = null;
      fireflowerTrackerTargets[slot] = null;
      removed = true;
    }
    if (removed) updateHotbar();
  }

  function updateExitHint(time) {
    if (flowersFound !== FLOWER_COUNT || time < nextExitHintTime) return;
    exitHintStartedAt = time;
    nextExitHintTime = time + EXIT_HINT_INTERVAL;
    playExitHintBeep();
  }

  function updateToadHint(delta) {
    if (toadFound) return;
    toadHintElapsed += delta * 1000;
    if (toadHintElapsed < nextToadHintTime) return;
    nextToadHintTime += TOAD_HINT_INTERVAL_MS;
    playToadHintBeep();
  }

  function updateFireflowerTracker(delta) {
    const selectedTarget = hotbar[selectedHotbarSlot] === "fireflower-tracker"
      ? fireflowerTrackerTargets[selectedHotbarSlot]
      : null;
    if (selectedTarget !== activeFireflowerTrackerTarget) {
      activeFireflowerTrackerTarget = selectedTarget;
      fireflowerTrackerElapsed = 0;
      lastTrackerBeepCycle = -1;
    }
    if (!isPlaying || !selectedTarget || selectedTarget.found) return;

    fireflowerTrackerElapsed += delta * 1000;
    if (fireflowerTrackerElapsed < FIREFLOWER_TRACKER_ACTIVATION_MS) return;
    const beepCycle = Math.floor(
      (fireflowerTrackerElapsed - FIREFLOWER_TRACKER_ACTIVATION_MS) / FIREFLOWER_TRACKER_INTERVAL_MS
    );
    if (beepCycle > lastTrackerBeepCycle) {
      lastTrackerBeepCycle = beepCycle;
      playFireflowerTrackerBeep();
    }
  }

  function checkEnergyDrinkPickups(time) {
    for (const pickup of energyDrinkPickups) {
      if (pickup.found) continue;
      const bob = Math.sin(time * 0.003 + pickup.phase) * 0.1;
      pickup.sprite.position.y = 0.9 + bob;
      const pulse = 0.9 + Math.sin(time * 0.004 + pickup.phase) * 0.06;
      pickup.sprite.scale.set(pulse, pulse, 1);
      const distance = Math.hypot(
        pickup.sprite.position.x - playerPosition.x,
        pickup.sprite.position.z - playerPosition.z
      );
      if (distance > 1.25) {
        pickup.notifiedFull = false;
        continue;
      }

      const slot = hotbar.indexOf(null);
      if (slot < 0) {
        if (!pickup.notifiedFull) showToast("HOTBAR FULL! Make room for that Energy Drink.");
        pickup.notifiedFull = true;
        continue;
      }

      pickup.found = true;
      scene.remove(pickup.sprite);
      hotbar[slot] = "energy-drink";
      updateHotbar();
      showToast(`ENERGY DRINK GET! SLOT ${slot + 1}.`);
    }
  }

  function checkBananaPeelPickups(time) {
    for (const pickup of bananaPeelPickups) {
      if (pickup.found) continue;
      const bob = Math.sin(time * 0.003 + pickup.phase) * 0.08;
      pickup.sprite.position.y = 0.56 + bob;
      const pulse = 0.82 + Math.sin(time * 0.004 + pickup.phase) * 0.05;
      pickup.sprite.scale.set(pulse, pulse, 1);
      const distance = Math.hypot(
        pickup.sprite.position.x - playerPosition.x,
        pickup.sprite.position.z - playerPosition.z
      );
      if (distance > 1.25) {
        pickup.notifiedFull = false;
        continue;
      }

      const slot = hotbar.indexOf(null);
      if (slot < 0) {
        if (!pickup.notifiedFull) showToast("HOTBAR FULL! Make room for that banana peel.");
        pickup.notifiedFull = true;
        continue;
      }

      pickup.found = true;
      scene.remove(pickup.sprite);
      hotbar[slot] = "banana-peel";
      updateHotbar();
      showToast(`BANANA PEEL GET! SLOT ${slot + 1}.`);
    }
  }

  function checkFireflowerTrackerPickups(time) {
    for (const pickup of fireflowerTrackerPickups) {
      if (pickup.found) continue;
      const bob = Math.sin(time * 0.003 + pickup.phase) * 0.08;
      pickup.sprite.position.y = 0.9 + bob;
      const pulse = 0.75 + Math.sin(time * 0.004 + pickup.phase) * 0.05;
      pickup.sprite.scale.set(pulse, pulse, 1);
      if (Math.hypot(
        pickup.sprite.position.x - playerPosition.x,
        pickup.sprite.position.z - playerPosition.z
      ) > 1.25) continue;

      const slot = hotbar.indexOf(null);
      if (slot < 0) {
        if (!pickup.notifiedFull) showToast("HOTBAR FULL! Make room for the Fireflower Tracker.");
        pickup.notifiedFull = true;
        continue;
      }

      const assignedTargets = new Set(fireflowerTrackerTargets.filter(Boolean));
      const targets = fireflowers.filter(flower => !flower.found && !assignedTargets.has(flower));
      if (!targets.length) {
        pickup.found = true;
        scene.remove(pickup.sprite);
        showToast("NO FIREFLOWERS LEFT TO TRACK.");
        continue;
      }

      const target = targets[Math.floor(Math.random() * targets.length)];
      pickup.found = true;
      scene.remove(pickup.sprite);
      hotbar[slot] = "fireflower-tracker";
      fireflowerTrackerTargets[slot] = target;
      updateHotbar();
      showToast(`FIREFLOWER TRACKER GET! SLOT ${slot + 1}.`);
    }
  }

  function checkCoinBagPickups(time) {
    for (const pickup of coinBagPickups) {
      if (pickup.found) continue;
      const bob = Math.sin(time * 0.003 + pickup.phase) * 0.08;
      pickup.sprite.position.y = 0.68 + bob;
      const scale = 0.72 + Math.sin(time * 0.004 + pickup.phase) * 0.04;
      pickup.sprite.scale.set(scale, scale, 1);
      if (Math.hypot(
        pickup.sprite.position.x - playerPosition.x,
        pickup.sprite.position.z - playerPosition.z
      ) > 1.25) continue;

      pickup.found = true;
      scene.remove(pickup.sprite);
      coins += COINS_PER_BAG;
      updateCoinDisplay();
      playCoinBagJingle();
      showToast(`+${COINS_PER_BAG} COINS · ${coins} TOTAL.`);
    }
  }

  function checkPlayerBananaPeelSlip(time) {
    if (playerSlipState) return;
    const peel = placedBananaPeels.find(item =>
      !item.used
      && time >= item.playerImmuneUntil
      && Math.hypot(playerPosition.x - item.x, playerPosition.z - item.z) < 0.86
    );
    if (!peel) return;

    peel.used = true;
    scene.remove(peel.sprite);
    playerSlipState = {
      phase: "falling",
      elapsed: 0,
      backward: playerWasWalkingBackward,
      startPitch: player.pitch
    };
    playSoundEffect(bananaPeelSlipAudio, "Banana slip sound");
    showToast("BANANA PEEL! DOWN YOU GO!");
  }

  function updatePlayerSlip(delta) {
    const state = playerSlipState;
    if (!state) return;
    state.elapsed += delta;
    const targetPitch = state.backward ? 1.32 : -1.32;
    const downHeight = 0.24;

    if (state.phase === "falling") {
      const progress = THREE.MathUtils.clamp(state.elapsed / BANANA_PLAYER_FALL_TIME, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      camera.position.y = playerPosition.y - eased * (playerPosition.y - downHeight);
      camera.rotation.set(
        state.startPitch + (targetPitch - state.startPitch) * eased,
        player.yaw + Math.sin(progress * Math.PI) * (state.backward ? -0.22 : 0.22),
        Math.sin(progress * Math.PI) * (state.backward ? -0.32 : 0.32)
      );
      if (progress >= 1) {
        state.phase = "down";
        state.elapsed = 0;
        playSoundEffect(bananaPeelFallAudio, "Banana fall sound");
      }
      return;
    }

    if (state.phase === "down") {
      camera.position.y = downHeight;
      camera.rotation.set(targetPitch, player.yaw, state.backward ? -0.12 : 0.12);
      if (state.elapsed >= BANANA_PLAYER_DOWN_TIME) {
        state.phase = "recovering";
        state.elapsed = 0;
      }
      return;
    }

    const progress = THREE.MathUtils.clamp(state.elapsed / BANANA_PLAYER_RECOVER_TIME, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    camera.position.y = downHeight + (playerPosition.y - downHeight) * eased;
    camera.rotation.set(
      targetPitch + (state.startPitch - targetPitch) * eased,
      player.yaw,
      (state.backward ? -0.12 : 0.12) * (1 - eased)
    );
    if (progress >= 1) playerSlipState = null;
  }

  function checkExit() {
    if (!doorOpen || doorProgress < 1 || isWon || playerSlipState) return;
    const dx = playerPosition.x - door.center.x;
    const dz = playerPosition.z - door.center.z;
    const outwardDistance = dx * door.normal.x + dz * door.normal.y;
    const lateralDistance = door.acrossX ? dx : dz;
    if (
      outwardDistance >= EXIT_SEQUENCE_TRIGGER_DISTANCE
      && Math.abs(lateralDistance) < door.width / 2 - PLAYER_RADIUS
    ) {
      startExitSequence();
    }
  }

  function startExitSequence() {
    isWon = true;
    isPlaying = false;
    pressed.clear();
    sprintHeld = false;
    fallbackControls = false;
    exitSequence = {
      elapsed: 0,
      startYaw: player.yaw,
      targetYaw: Math.atan2(-door.normal.x, -door.normal.y),
      startPitch: player.pitch
    };
    endingDescription.textContent = weegeeEnemy.spawned
      ? "Six fireflowers collected. Malleo and Weegee are both absolutely fuming."
      : "Six fireflowers collected. One Malleo absolutely fuming.";
    stopMusic();
    cancelItemUse();
    updateFootsteps(0);
    stopEnemyVoiceLines(malleoEnemy);
    stopEnemyVoiceLines(weegeeEnemy);
    clearTimeout(winTimer);
  }

  function updateExitSequence(delta) {
    if (!exitSequence) return;
    const step = Math.min(delta, EXIT_WALK_DURATION - exitSequence.elapsed);
    exitSequence.elapsed += step;
    const turnProgress = THREE.MathUtils.clamp(exitSequence.elapsed / EXIT_TURN_DURATION, 0, 1);
    const easedTurn = turnProgress * turnProgress * (3 - 2 * turnProgress);
    const yawDelta = Math.atan2(
      Math.sin(exitSequence.targetYaw - exitSequence.startYaw),
      Math.cos(exitSequence.targetYaw - exitSequence.startYaw)
    );
    player.yaw = exitSequence.startYaw + yawDelta * easedTurn;
    player.pitch = exitSequence.startPitch * (1 - easedTurn);
    playerPosition.x += door.normal.x * EXIT_WALK_SPEED * step;
    playerPosition.z += door.normal.y * EXIT_WALK_SPEED * step;
    camera.position.x = playerPosition.x;
    camera.position.z = playerPosition.z;

    if (exitSequence.elapsed >= EXIT_WALK_DURATION) {
      exitSequence = null;
      document.exitPointerLock?.();
      transitionFade.classList.remove("reveal");
      transitionFade.classList.add("active");
      winTimer = setTimeout(() => {
        gameElement.classList.add("ending-active");
        ending.classList.remove("hidden");
        playSoundEffect(victoryAudio, "Victory sound", false);
        requestAnimationFrame(() => transitionFade.classList.add("reveal"));
        winTimer = setTimeout(() => {
          transitionFade.classList.remove("active", "reveal");
          winTimer = null;
        }, 700);
      }, 700);
    }
  }

  function animate(time) {
    requestAnimationFrame(animate);
    const delta = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    const controlsActive = isPlaying && (document.pointerLockElement === renderer.domElement || fallbackControls);
    const movementAllowed = controlsActive && !playerSlipState && !toadDialogueOpen && !shopOpen;
    let movementRequested = false;
    let movementSpeed = 0;
    if (controlsActive) {
      speedBoostRemaining = Math.max(0, speedBoostRemaining - delta);
      if (movementAllowed) {
        const previousX = playerPosition.x;
        const previousZ = playerPosition.z;
        movementRequested = movePlayer(delta);
        movementSpeed = delta > 0
          ? Math.hypot(playerPosition.x - previousX, playerPosition.z - previousZ) / delta
          : 0;
        updateStamina(delta, movementRequested);
        updateItemUse(delta, true, time);
      } else {
        updateItemUse(delta, false, time);
      }
      updateMalleo(time, delta);
      if (isPlaying) {
        updateToadHint(delta);
        checkFireflowers(time);
        updateExitHint(time);
        checkEnergyDrinkPickups(time);
        checkBananaPeelPickups(time);
        checkFireflowerTrackerPickups(time);
        checkCoinBagPickups(time);
        checkPlayerBananaPeelSlip(time);
        checkExit();
        if (shopOpen) updateToadShop();
      }
    } else {
      updateItemUse(delta, false, time);
    }
    updateExitSequence(delta);
    if (doorOpen && doorProgress < 1) {
      doorProgress = Math.min(1, doorProgress + delta / EXIT_DOOR_OPEN_DURATION);
      const eased = doorProgress * doorProgress * (3 - 2 * doorProgress);
      door.panel.position.y = EXIT_DOOR_OPENING_HEIGHT / 2 + eased * EXIT_DOOR_OPENING_HEIGHT;
    }
    updateFireflowerTracker(delta);
    updateViewBob(delta, movementRequested, movementAllowed && isPlaying);
    if (playerSlipState && isPlaying && !toadDialogueOpen && !shopOpen) updatePlayerSlip(delta);
    updateHeldItemAnimation(movementAllowed && isPlaying && !playerSlipState);
    updateFootsteps(isPlaying ? movementSpeed : 0);
    drawMinimap(time);
    updateSpatialAudio();
    if (isPlaying) {
      if (!malleoEnemy.slipState) updateEnemyVoice(malleoEnemy, time);
      if (!weegeeEnemy.slipState) updateEnemyVoice(weegeeEnemy, time);
    }
    const nearDoor = Math.hypot(playerPosition.x - door.center.x, playerPosition.z - door.center.z) < 3.2;
    const flashlightHint = `F <span class="flashlight-state">LIGHT ${flashlight.visible ? "ON" : "OFF"}</span>`;
    hint.innerHTML = nearDoor
      ? `${flowersFound === FLOWER_COUNT ? "E <span>OPEN EXIT</span>" : `E <span>${FLOWER_COUNT - flowersFound} FLOWERS LEFT</span>`}<b>·</b>${flashlightHint}`
      : `WASD <span>MOVE</span><b>·</b> MOUSE <span>LOOK</span><b>·</b>${flashlightHint}`;
    updateLitBillboards();
    updateExitTreeBillboards();
    renderer.render(scene, camera);
  }

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(Math.max(320, Math.floor(window.innerWidth * 0.52)), Math.max(180, Math.floor(window.innerHeight * 0.52)), false);
  });

  animate(performance.now());
})();