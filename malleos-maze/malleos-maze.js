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
    ...malleoVoiceLines,
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
  const pickupToast = document.getElementById("pickup-toast");
  const hint = document.getElementById("hint");
  const ending = document.getElementById("ending");
  const caughtScreen = document.getElementById("caught");
  const malleoStatus = document.getElementById("malleo-status");
  const malleoWarning = document.getElementById("malleo-warning");
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
  const HOTBAR_SLOT_COUNT = 6;
  const ENERGY_DRINK_PICKUP_COUNT = 6;
  const BANANA_PEEL_PICKUP_COUNT = 6;
  const FIREFLOWER_TRACKER_PICKUP_COUNT = 2;
  const ENERGY_DRINK_REFILL_RATE = 4;
  const ENERGY_DRINK_MIN_CHUG_TIME = 0.75;
  const ENERGY_DRINK_THROW_TIME = 0.68;
  const ENERGY_DRINK_BOOST_DURATION = 7;
  const ENERGY_DRINK_SPEED_MULTIPLIER = 1.35;
  const EXIT_HINT_INTERVAL = 10000;
  const EXIT_HINT_DURATION = 2400;
  const EXIT_DOOR_OPENING_WIDTH = 2.9;
  const EXIT_DOOR_OPENING_HEIGHT = 3.1;
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
    fireflower: textureLoader.load("./assets/collectibles/fireflower.png"),
    energyDrink: textureLoader.load("./assets/items/energy-drink-can.png"),
    bananaPeel: textureLoader.load("./assets/items/banana-peel.png"),
    fireflowerTracker: textureLoader.load("./assets/items/fireflower-tracker.png"),
    malleo: textureLoader.load("./assets/malleo/Malleo.png")
  };

  for (const texture of Object.values(textures)) {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  textures.wall.wrapS = textures.wall.wrapT = THREE.RepeatWrapping;
  textures.floor.wrapS = textures.floor.wrapT = THREE.RepeatWrapping;
  textures.ceiling.wrapS = textures.ceiling.wrapT = THREE.RepeatWrapping;

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(Math.max(320, Math.floor(window.innerWidth * 0.52)), Math.max(180, Math.floor(window.innerHeight * 0.52)), false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.setAttribute("aria-label", "First-person view of a dark maze");
  viewport.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x171310);
  scene.fog = new THREE.Fog(0x171310, 18, 83);

  const camera = new THREE.PerspectiveCamera(73, window.innerWidth / window.innerHeight, 0.08, 120);
  camera.rotation.order = "YXZ";
  scene.add(camera);
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
  scene.add(new THREE.HemisphereLight(0x897969, 0x171312, 0.42));
  scene.add(new THREE.AmbientLight(0x907b66, 0.2));

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
  const doorDirection = getDoorDirection(maze, exitCell);
  const doorWallCell = { x: exitCell.x + doorDirection.x, z: exitCell.z + doorDirection.z };
  const worldSize = MAZE_SIZE * CELL;

  const wallMaterial = new THREE.MeshStandardMaterial({ map: textures.wall, roughness: 1, metalness: 0 });
  const floorMaterial = new THREE.MeshStandardMaterial({ map: textures.floor, roughness: 1, metalness: 0 });
  const ceilingMaterial = new THREE.MeshStandardMaterial({ map: textures.ceiling, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(worldSize, worldSize), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floorMaterial.map.repeat.set(MAZE_SIZE * 0.85, MAZE_SIZE * 0.85);
  scene.add(floor);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(worldSize, worldSize), ceilingMaterial);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = WALL_HEIGHT;
  ceilingMaterial.map.repeat.set(MAZE_SIZE * 0.85, MAZE_SIZE * 0.85);
  scene.add(ceiling);

  const wallGeometry = new THREE.BoxGeometry(CELL, WALL_HEIGHT, CELL);
  const wallCenter = new THREE.Vector3();
  let lampIndex = 0;
  for (let z = 0; z < MAZE_SIZE; z += 1) {
    for (let x = 0; x < MAZE_SIZE; x += 1) {
      if (maze[z][x] === 0) {
        if (x === doorWallCell.x && z === doorWallCell.z) {
          addExitDoorwayWall(x, z, doorDirection.z !== 0, wallMaterial);
          continue;
        }
        wallCenter.set(cellWorld(x), WALL_HEIGHT / 2, cellWorld(z));
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.copy(wallCenter);
        scene.add(wall);
      } else if ((x * 7 + z * 13) % 83 === 0) {
        addLamp(cellWorld(x), cellWorld(z), lampIndex++);
      }
    }
  }

  const fireflowers = flowerCells.map(cell => createFireflower(cell));
  const energyDrinkPickups = energyDrinkCells.map(createEnergyDrinkPickup);
  const bananaPeelPickups = bananaPeelCells.map(createBananaPeelPickup);
  const fireflowerTrackerPickups = fireflowerTrackerCells.map(createFireflowerTrackerPickup);
  const malleo = createMalleo(malleoCell);
  const malleoFlatMesh = createMalleoFlatMesh();
  const door = createExitDoor(exitCell, doorDirection);
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
  let malleoSlipState = null;
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
  let nextExitHintTime = Infinity;
  let exitHintStartedAt = -Infinity;
  let exitHintAudioFailed = false;
  let activeFireflowerTrackerTarget = null;
  let fireflowerTrackerElapsed = 0;
  let lastTrackerBeepCycle = -1;
  let fireflowerTrackerAudioFailed = false;
  let isLoading = false;
  let isPlaying = false;
  let isWon = false;
  let fallbackControls = false;
  let doorOpen = false;
  let doorProgress = 0;
  let malleoPath = [];
  let nextMalleoPathTime = 0;
  let malleoDistance = Infinity;
  let malleoMode = "patrol";
  let patrolTarget = null;
  const recentPatrolTargets = [];
  let lastKnownPlayerPosition = null;
  let lastPlayerSightedAt = 0;
  let spatialAudioContext;
  let voiceLineChannels = [];
  let jumpscareChannel;
  let postKillChannel;
  let nextVoiceLineTime = 0;
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

  function addLamp(x, z, index) {
    const fixture = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.1, 0.38),
      new THREE.MeshBasicMaterial({ color: index % 3 === 0 ? 0xf3cb8b : 0xe9d2a8 })
    );
    fixture.position.set(x, WALL_HEIGHT - 0.08, z);
    scene.add(fixture);
    const light = new THREE.PointLight(index % 3 === 0 ? 0xe5a65f : 0xcbb58e, 3.4, 12, 2);
    light.position.set(x, WALL_HEIGHT - 0.4, z);
    scene.add(light);
  }

  function createFireflower(cell) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textures.fireflower,
      transparent: true,
      alphaTest: 0.04,
      depthWrite: false
    }));
    sprite.position.set(cellWorld(cell.x), 1.12, cellWorld(cell.z));
    sprite.scale.set(1.3, 1.3, 1);
    scene.add(sprite);
    return { sprite, found: false, phase: Math.random() * Math.PI * 2 };
  }

  function createEnergyDrinkPickup(cell) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textures.energyDrink,
      transparent: true,
      alphaTest: 0.03,
      depthWrite: false
    }));
    sprite.position.set(cellWorld(cell.x), 0.9, cellWorld(cell.z));
    sprite.scale.set(0.9, 0.9, 1);
    scene.add(sprite);
    return { sprite, found: false, notifiedFull: false, phase: Math.random() * Math.PI * 2 };
  }

  function createBananaPeelPickup(cell) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textures.bananaPeel,
      transparent: true,
      alphaTest: 0.03,
      depthWrite: false
    }));
    sprite.position.set(cellWorld(cell.x), 0.56, cellWorld(cell.z));
    sprite.scale.set(0.82, 0.82, 1);
    scene.add(sprite);
    return { sprite, found: false, notifiedFull: false, phase: Math.random() * Math.PI * 2 };
  }

  function createFireflowerTrackerPickup(cell) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textures.fireflowerTracker,
      transparent: true,
      alphaTest: 0.03,
      depthWrite: false
    }));
    sprite.position.set(cellWorld(cell.x), 0.9, cellWorld(cell.z));
    sprite.scale.set(0.75, 0.75, 1);
    scene.add(sprite);
    return { sprite, found: false, notifiedFull: false, phase: Math.random() * Math.PI * 2 };
  }

  function createMalleo(cell) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textures.malleo,
      transparent: true,
      alphaTest: 0.025,
      depthWrite: false
    }));
    const height = 3.65;
    sprite.position.set(cellWorld(cell.x), height / 2, cellWorld(cell.z));
    sprite.scale.set(height * (275 / 507), height, 1);
    scene.add(sprite);
    return sprite;
  }

  function createMalleoFlatMesh() {
    const height = 3.65;
    const material = new THREE.MeshBasicMaterial({
      map: textures.malleo,
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
    scene.add(mesh);
    return mesh;
  }

  function createExitDoor(cell, direction) {
    const center = new THREE.Vector3(
      cellWorld(cell.x) + direction.x * CELL * 0.5,
      0,
      cellWorld(cell.z) + direction.z * CELL * 0.5
    );
    const acrossX = direction.z !== 0;
    const width = 2.35;
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(width, EXIT_DOOR_OPENING_HEIGHT),
      new THREE.MeshStandardMaterial({ map: textures.door, roughness: 0.9, side: THREE.DoubleSide })
    );
    panel.position.set(center.x, 1.57, center.z);
    panel.rotation.y = acrossX ? 0 : Math.PI / 2;
    scene.add(panel);

    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x493325, roughness: 0.95 });
    const postGeometry = new THREE.BoxGeometry(0.22, 3.35, 0.22);
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(postGeometry, frameMaterial);
      post.position.set(center.x + (acrossX ? side * 1.34 : 0), 1.68, center.z + (acrossX ? 0 : side * 1.34));
      scene.add(post);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(
      acrossX ? EXIT_DOOR_OPENING_WIDTH : 0.22,
      0.24,
      acrossX ? 0.22 : EXIT_DOOR_OPENING_WIDTH
    ), frameMaterial);
    lintel.position.set(center.x, EXIT_DOOR_OPENING_HEIGHT + 0.19, center.z);
    scene.add(lintel);

    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.05, 0.28),
      new THREE.MeshBasicMaterial({ color: 0xd8b37c, side: THREE.DoubleSide })
    );
    sign.position.set(center.x, 3.56, center.z);
    sign.rotation.y = panel.rotation.y;
    scene.add(sign);

    return { center, panel, sign, normal: new THREE.Vector2(direction.x, direction.z), acrossX, width };
  }

  function addExitDoorwayWall(cellX, cellZ, acrossX, material) {
    const centerX = cellWorld(cellX);
    const centerZ = cellWorld(cellZ);
    const sideWidth = (CELL - EXIT_DOOR_OPENING_WIDTH) / 2;
    const headerHeight = WALL_HEIGHT - EXIT_DOOR_OPENING_HEIGHT;
    const sideGeometry = acrossX
      ? new THREE.BoxGeometry(sideWidth, WALL_HEIGHT, CELL)
      : new THREE.BoxGeometry(CELL, WALL_HEIGHT, sideWidth);
    for (const side of [-1, 1]) {
      const segment = new THREE.Mesh(sideGeometry, material);
      segment.position.set(
        centerX + (acrossX ? side * (EXIT_DOOR_OPENING_WIDTH + sideWidth) / 2 : 0),
        WALL_HEIGHT / 2,
        centerZ + (acrossX ? 0 : side * (EXIT_DOOR_OPENING_WIDTH + sideWidth) / 2)
      );
      scene.add(segment);
    }

    const headerGeometry = acrossX
      ? new THREE.BoxGeometry(EXIT_DOOR_OPENING_WIDTH, headerHeight, CELL)
      : new THREE.BoxGeometry(CELL, headerHeight, EXIT_DOOR_OPENING_WIDTH);
    const header = new THREE.Mesh(headerGeometry, material);
    header.position.set(centerX, EXIT_DOOR_OPENING_HEIGHT + headerHeight / 2, centerZ);
    scene.add(header);
  }

  function updateObjective() {
    itemCount.textContent = `${flowersFound} / ${FLOWER_COUNT}`;
    itemProgress.style.width = `${(flowersFound / FLOWER_COUNT) * 100}%`;
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
      menuDescription.innerHTML = "Malleo is still out there. He has not learned patience.<br>Catch your breath, then keep moving.";
      menuButton.querySelector("span").textContent = "BACK TO THE MAZE";
    } else {
      menuTitle.innerHTML = "MALLEO'S<br><span>MAZE!</span>";
      menuDescription.innerHTML = "Six fireflowers. One extremely suspicious plumber.<br>Find the flowers, find the exit, do NOT get bonked.";
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

  function createSpatialChannel(context, audio, stereoVoice = false) {
    const source = context.createMediaElementSource(audio);
    const panner = context.createPanner();
    panner.panningModel = "HRTF";
    panner.distanceModel = "inverse";
    panner.refDistance = 2;
    panner.maxDistance = 38;
    panner.rolloffFactor = 1.25;
    const stereoPanner = stereoVoice ? context.createStereoPanner() : null;
    const gain = context.createGain();
    gain.gain.value = 0.9;
    source.connect(panner);
    if (stereoPanner) {
      panner.connect(stereoPanner);
      stereoPanner.connect(gain);
    } else {
      panner.connect(gain);
    }
    gain.connect(context.destination);
    return { audio, panner, stereoPanner };
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
        const jumpscare = createSpatialChannel(context, jumpscareAudio);
        const postKillLine = createSpatialChannel(context, postKillAudio, true);
        spatialAudioContext = context;
        voiceLineChannels = channels;
        jumpscareChannel = jumpscare;
        postKillChannel = postKillLine;
        spatialChannels.push(...channels, jumpscare, postKillLine);
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
      setAudioCoordinates(channel.panner, "position", malleo.position);
      if (channel.stereoPanner) {
        const relativeX = malleo.position.x - camera.position.x;
        const relativeY = malleo.position.y - camera.position.y;
        const relativeZ = malleo.position.z - camera.position.z;
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

  function updateMalleoVoice(time) {
    if (!spatialAudioContext || spatialAudioContext.state !== "running") return;
    if (malleoDistance > 32 || time < nextVoiceLineTime) return;
    if (voiceLineChannels.some(channel => !channel.audio.paused)) return;
    const channel = voiceLineChannels[Math.floor(Math.random() * voiceLineChannels.length)];
    nextVoiceLineTime = time + 12000 + Math.random() * 4000;
    playSpatialChannel(channel, "Malleo voice");
  }

  function stopMalleoVoiceLines() {
    for (const channel of voiceLineChannels) {
      if (channel.audio.paused) continue;
      channel.audio.pause();
      channel.audio.currentTime = 0;
    }
  }

  function triggerMalleoDeathAudio() {
    cancelItemUse();
    updateFootsteps(0);
    gameElement.classList.add("jumpscare-shake");
    jumpscareEffect.classList.add("active");
    stopMalleoVoiceLines();
    updateSpatialAudio();
    playSpatialChannel(jumpscareChannel, "Jumpscare");
    clearTimeout(postKillLineTimer);
    postKillLineTimer = setTimeout(() => {
      playSpatialChannel(postKillChannel, "Malleo post-kill voice");
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

  document.addEventListener("pointerlockchange", () => {
    if (!isPlaying || isWon) return;
    if (document.pointerLockElement === renderer.domElement) {
      fallbackControls = false;
      menu.classList.add("hidden");
    }
    else showMenu("pause");
  });

  document.addEventListener("pointerlockerror", enableFallbackControls);

  document.addEventListener("mousemove", event => {
    const locked = document.pointerLockElement === renderer.domElement;
    if (!isPlaying || playerSlipState || (!locked && !(fallbackControls && event.buttons === 1))) return;
    player.yaw -= event.movementX * 0.0025;
    player.pitch = THREE.MathUtils.clamp(player.pitch - event.movementY * 0.0022, -1.35, 1.35);
  });

  document.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    if (key === "shift" || event.code === "ShiftLeft" || event.code === "ShiftRight") sprintHeld = true;
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) event.preventDefault();
    if (/^[1-6]$/.test(key) && isPlaying && (document.pointerLockElement === renderer.domElement || fallbackControls)) {
      selectHotbarSlot(Number(key) - 1);
      event.preventDefault();
    }
    pressed.add(key);
    if (key === "e" && isPlaying && (document.pointerLockElement === renderer.domElement || fallbackControls)) interact();
    if (key === "escape" && fallbackControls && isPlaying) {
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
    if (!isPlaying || (document.pointerLockElement !== renderer.domElement && !fallbackControls) || event.deltaY === 0) return;
    event.preventDefault();
    selectHotbarSlot((selectedHotbarSlot + (event.deltaY > 0 ? 1 : -1) + HOTBAR_SLOT_COUNT) % HOTBAR_SLOT_COUNT);
  }, { passive: false });

  document.addEventListener("mousedown", event => {
    if (event.button !== 0 || !isPlaying || (document.pointerLockElement !== renderer.domElement && !fallbackControls)) return;
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
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textures.bananaPeel,
      transparent: true,
      alphaTest: 0.03,
      depthWrite: false
    }));
    sprite.position.set(bananaDropPosition.x, 0.34, bananaDropPosition.z);
    sprite.scale.set(0.78, 0.78, 1);
    scene.add(sprite);
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
    doorOpen = true;
    showToast("The old door groans open...");
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

  function choosePatrolWaypoint(currentCell) {
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

  function canMalleoSeePlayer(distance) {
    if (distance > MALLEO_SIGHT_RANGE) return false;
    const dx = playerPosition.x - malleo.position.x;
    const dz = playerPosition.z - malleo.position.z;
    const steps = Math.ceil(distance / 0.45);
    for (let step = 1; step < steps; step += 1) {
      const progress = step / steps;
      const x = worldToCell(malleo.position.x + dx * progress);
      const z = worldToCell(malleo.position.z + dz * progress);
      if (maze[z]?.[x] !== 1) return false;
    }
    return true;
  }

  function triggerMalleoSlip() {
    const peel = placedBananaPeels.find(item =>
      !item.used && Math.hypot(malleo.position.x - item.x, malleo.position.z - item.z) < 1.05
    );
    if (!peel) return false;

    peel.used = true;
    scene.remove(peel.sprite);
    malleoSlipState = { phase: "falling", elapsed: 0, roll: (Math.random() - 0.5) * 1.2 };
    playSoundEffect(bananaPeelSlipAudio, "Banana slip sound");
    showToast("MALLEO HIT A BANANA PEEL!");
    return true;
  }

  function updateMalleoSlip(delta) {
    const state = malleoSlipState;
    if (!state) return;
    state.elapsed += delta;
    lastPlayerSightedAt += delta * 1000;
    nextMalleoPathTime += delta * 1000;
    const height = 3.65;
    const width = height * (275 / 507);

    if (state.phase === "falling") {
      const progress = THREE.MathUtils.clamp(state.elapsed / BANANA_MALLEO_FALL_TIME, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      malleo.position.y = 1.825 - eased * 1.65 + Math.sin(progress * Math.PI * 4) * 0.12 * (1 - progress);
      malleo.material.rotation = state.roll * eased + Math.sin(progress * Math.PI * 3) * 0.72;
      malleo.scale.set(width * (1 + Math.sin(progress * Math.PI * 5) * 0.13), height * (1 - eased * 0.68), 1);
      if (progress >= 1) {
        malleo.visible = false;
        malleoFlatMesh.position.set(malleo.position.x, 0.035, malleo.position.z);
        malleoFlatMesh.material.opacity = 1;
        malleoFlatMesh.visible = true;
        state.phase = "down";
        playSoundEffect(bananaPeelFallAudio, "Banana fall sound");
        playSoundEffect(malleoOofAudio, "Malleo impact sound");
      }
      return;
    }

    if (state.phase === "down") {
      if (state.elapsed >= BANANA_MALLEO_DOWN_TIME / 1000) {
        state.phase = "recovering";
        state.elapsed = 0;
        malleo.visible = true;
        malleo.position.y = 0.08;
        malleo.material.opacity = 0;
      }
      return;
    }

    const progress = THREE.MathUtils.clamp(state.elapsed / BANANA_MALLEO_RECOVER_TIME, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    const flatOpacity = 1 - THREE.MathUtils.clamp(progress * 2.2, 0, 1);
    malleoFlatMesh.position.set(malleo.position.x, 0.035, malleo.position.z);
    malleoFlatMesh.material.opacity = flatOpacity;
    malleoFlatMesh.visible = flatOpacity > 0.02;
    malleo.visible = progress > 0.05;
    malleo.material.opacity = THREE.MathUtils.clamp(progress * 2, 0, 1);
    malleo.position.y = 0.08 + eased * 1.745;
    malleo.material.rotation = state.roll * (1 - eased);
    malleo.scale.set(width, height * (0.32 + eased * 0.68), 1);
    if (progress >= 1) {
      malleo.position.y = 1.825;
      malleo.material.rotation = 0;
      malleo.material.opacity = 1;
      malleo.scale.set(width, height, 1);
      malleo.visible = true;
      malleoFlatMesh.visible = false;
      malleoFlatMesh.material.opacity = 1;
      playSoundEffect(malleoMammaMiaAudio, "Malleo recovery sound");
      malleoSlipState = null;
    }
  }

  function updateMalleo(time, delta) {
    if (malleoSlipState) {
      updateMalleoSlip(delta);
      return;
    }
    const currentCell = { x: worldToCell(malleo.position.x), z: worldToCell(malleo.position.z) };
    const playerCell = { x: worldToCell(playerPosition.x), z: worldToCell(playerPosition.z) };
    const directDistance = Math.hypot(playerPosition.x - malleo.position.x, playerPosition.z - malleo.position.z);
    const spotted = directDistance <= MALLEO_HEARING_RADIUS || canMalleoSeePlayer(directDistance);

    if (spotted) {
      if (malleoMode !== "chase") {
        malleoMode = "chase";
        patrolTarget = null;
        nextMalleoPathTime = 0;
        showToast("MALLEO SPOTTED YOU! RUN!");
      }
      if (!lastKnownPlayerPosition) lastKnownPlayerPosition = new THREE.Vector3();
      lastKnownPlayerPosition.set(playerPosition.x, 0, playerPosition.z);
      lastPlayerSightedAt = time;
    } else if (malleoMode === "chase" && time - lastPlayerSightedAt > MALLEO_CHASE_MEMORY) {
      malleoMode = "patrol";
      lastKnownPlayerPosition = null;
      patrolTarget = null;
      nextMalleoPathTime = 0;
      showToast("Malleo lost your trail. Keep moving!");
    }

    if (malleoMode === "patrol") {
      const patrolX = patrolTarget ? cellWorld(patrolTarget.x) : 0;
      const patrolZ = patrolTarget ? cellWorld(patrolTarget.z) : 0;
      if (!patrolTarget || Math.hypot(patrolX - malleo.position.x, patrolZ - malleo.position.z) < 0.65) {
        patrolTarget = choosePatrolWaypoint(currentCell);
        nextMalleoPathTime = 0;
      }
    }

    const targetX = malleoMode === "chase"
      ? lastKnownPlayerPosition.x
      : cellWorld(patrolTarget.x);
    const targetZ = malleoMode === "chase"
      ? lastKnownPlayerPosition.z
      : cellWorld(patrolTarget.z);
    const targetCell = { x: worldToCell(targetX), z: worldToCell(targetZ) };
    if (time >= nextMalleoPathTime) {
      malleoPath = findMazePath(currentCell, targetCell);
      const playerDistances = getDistances(maze, currentCell.x, currentCell.z);
      const playerSteps = playerDistances[playerCell.z][playerCell.x];
      if (playerSteps === 0) {
        malleoDistance = directDistance;
      } else if (playerSteps > 0) {
        const startOffset = Math.hypot(malleo.position.x - cellWorld(currentCell.x), malleo.position.z - cellWorld(currentCell.z));
        const endOffset = Math.hypot(playerPosition.x - cellWorld(playerCell.x), playerPosition.z - cellWorld(playerCell.z));
        malleoDistance = playerSteps * CELL + startOffset + endOffset;
      } else {
        malleoDistance = Infinity;
      }
      nextMalleoPathTime = time + 420;
    }

    const nextCell = malleoPath.length > 1 ? malleoPath[1] : targetCell;
    const waypointX = malleoMode === "chase" && malleoPath.length === 1 ? targetX : cellWorld(nextCell.x);
    const waypointZ = malleoMode === "chase" && malleoPath.length === 1 ? targetZ : cellWorld(nextCell.z);
    const dx = waypointX - malleo.position.x;
    const dz = waypointZ - malleo.position.z;
    const distanceToWaypoint = Math.hypot(dx, dz);
    const speed = malleoMode === "chase" ? 4.5 : 2.4;
    const step = Math.min(distanceToWaypoint, speed * delta);
    if (distanceToWaypoint > 0) {
      malleo.position.x += (dx / distanceToWaypoint) * step;
      malleo.position.z += (dz / distanceToWaypoint) * step;
    }
    malleo.position.y = 1.825 + Math.sin(time * 0.006) * 0.055;
    if (triggerMalleoSlip()) return;

    const close = malleoDistance < 34;
    const veryClose = malleoDistance < 20;
    const modeLabel = malleoMode === "chase"
      ? (veryClose ? "CHASE · VERY CLOSE" : "CHASE MODE")
      : (close ? "PATROL · NEARBY" : "PATROL MODE");
    malleoStatus.innerHTML = `<span class="signal-dot"></span>MALLEO <b>${modeLabel}</b>`;
    malleoWarning.classList.toggle("visible", malleoMode === "chase" && veryClose);
    hud.classList.toggle("hud-danger", malleoMode === "chase" && close);

    if (Math.hypot(playerPosition.x - malleo.position.x, playerPosition.z - malleo.position.z) < 1.45) {
      isPlaying = false;
      stopMusic();
      triggerMalleoDeathAudio();
      document.exitPointerLock?.();
      setTimeout(() => caughtScreen.classList.remove("hidden"), 500);
    }
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
    if (!doorOpen) return false;
    const dx = x - door.center.x;
    const dz = z - door.center.z;
    const outwardDistance = dx * door.normal.x + dz * door.normal.y;
    const lateralDistance = door.acrossX ? dx : dz;
    return outwardDistance >= 0
      && outwardDistance <= CELL
      && Math.abs(lateralDistance) < door.width / 2;
  }

  function isDoorwayBlocked(x, z) {
    if (doorOpen) return false;
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
    if (malleoDistance <= MALLEO_SIGHT_RANGE) {
      const pulse = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * 0.02));
      context.globalAlpha = pulse;
      context.fillStyle = "#ff344f";
      context.shadowColor = "#ff163e";
      context.shadowBlur = 9;
      context.beginPath();
      context.arc(mapX(malleo.position.x), mapZ(malleo.position.z), 5, 0, Math.PI * 2);
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
    if (!doorOpen || isWon) return;
    const distance = (playerPosition.x - door.center.x) * door.normal.x + (playerPosition.z - door.center.z) * door.normal.y;
    if (distance > 0.72) {
      isWon = true;
      isPlaying = false;
      stopMusic();
      cancelItemUse();
      updateFootsteps(0);
      stopMalleoVoiceLines();
      document.exitPointerLock?.();
      clearTimeout(winTimer);
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
    const movementAllowed = controlsActive && !playerSlipState;
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
        checkFireflowers(time);
        updateExitHint(time);
        checkEnergyDrinkPickups(time);
        checkBananaPeelPickups(time);
        checkFireflowerTrackerPickups(time);
        checkPlayerBananaPeelSlip(time);
        checkExit();
      }
    } else {
      updateItemUse(delta, false, time);
    }
    if (doorOpen && doorProgress < 1) {
      doorProgress = Math.min(1, doorProgress + delta * 0.72);
      const eased = doorProgress * doorProgress * (3 - 2 * doorProgress);
      door.panel.position.y = 1.57 + eased * 3.2;
      if (doorProgress > 0.5) door.sign.visible = false;
    }
    updateFireflowerTracker(delta);
    updateViewBob(delta, movementRequested, movementAllowed && isPlaying);
    if (playerSlipState && isPlaying) updatePlayerSlip(delta);
    updateHeldItemAnimation(movementAllowed && isPlaying && !playerSlipState);
    updateFootsteps(isPlaying ? movementSpeed : 0);
    drawMinimap(time);
    updateSpatialAudio();
    if (isPlaying && !malleoSlipState) updateMalleoVoice(time);
    const nearDoor = Math.hypot(playerPosition.x - door.center.x, playerPosition.z - door.center.z) < 3.2;
    hint.innerHTML = nearDoor ? (flowersFound === FLOWER_COUNT ? "E <span>OPEN EXIT</span>" : `E <span>${FLOWER_COUNT - flowersFound} FLOWERS LEFT</span>`) : "WASD <span>MOVE</span><b>·</b> MOUSE <span>LOOK</span>";
    renderer.render(scene, camera);
  }

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(Math.max(320, Math.floor(window.innerWidth * 0.52)), Math.max(180, Math.floor(window.innerHeight * 0.52)), false);
  });

  animate(performance.now());
})();