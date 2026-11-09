const menuScreen = document.querySelector("#menu-screen");
const gameScreen = document.querySelector("#game-screen");
const grid = document.querySelector("#lawn-grid");
const actorsLayer = document.querySelector("#actors-layer");
const skySuns = document.querySelector("#sky-suns");
const sunCount = document.querySelector("#sun-count");
const gameMessage = document.querySelector("#game-message");
const seedCards = [...document.querySelectorAll(".seed-card")];

const ROWS = 6;
const COLS = 9;
const TOTAL_LEVELS = 10;
const LEVEL_START_DELAY = 4;
const PLANTS = {
  sunflower: {
    cost: 50,
    cooldown: 5,
    rarity: "Common",
    image: "assets/memes/me-gusta-sunflower.png",
    health: 100,
    label: "Me Gusta Sunflower"
  },
  king: {
    cost: 100,
    cooldown: 9,
    rarity: "Rare",
    image: "assets/memes/king-harkinian-peashooter.png",
    health: 140,
    label: "King Harkinian"
  },
  bomb: {
    cost: 150,
    cooldown: 16,
    rarity: "Legendary",
    image: "assets/memes/morshu-bomb.png",
    health: 100,
    label: "Morshu's Bomb"
  },
  shield: {
    cost: 50,
    cooldown: 30,
    rarity: "Rare",
    image: "assets/memes/illuminati-shield.png",
    health: 300,
    label: "Illuminati Shield"
  },
  weegee: {
    cost: 225,
    cooldown: 25,
    rarity: "Epic",
    image: "assets/memes/weegee-hypnotizer.png",
    health: 50,
    label: "Weegee Hypnotizer"
  }
};
const ZOMBIE_TYPES = {
  normal: { health: 100, speed: 0.13, label: "Normal zombie" },
  cone: { health: 420, speed: 0.105, label: "Conehead zombie" },
  bucket: { health: 900, speed: 0.085, label: "Buckethead zombie" }
};
const ZOMBIE_FACES = ["🧟", "🧟‍♂️", "🧟‍♀️"];
const WEEGEE_CLONE_HEALTH = ZOMBIE_TYPES.cone.health * 2;

let suns = 150;
let selectedPlant = "sunflower";
const plantCooldowns = { sunflower: 0, king: 0, bomb: 0, shield: 0, weegee: 0 };
let currentLevel = 1;
let plants = [];
let zombies = [];
let weegeeClones = [];
let projectiles = [];
let drops = [];
let running = false;
let elapsed = 0;
let spawnClock = 0;
let skySunClock = 0;
let lastTick = 0;
let animationFrame = 0;
let nextId = 0;
let soundEnabled = true;
let audioContext;
let musicAudio;
let victoryAudio;
let loseAudio;
let mahBoiAudio;
let bombAudio;
let bombExplosionAudio;
let weegeeAudio;
let normalWaveStarted = false;
let normalWaveRemaining = 0;
let hordeRemaining = 0;
let hordeStarted = false;
let waveAlertTimer = 0;
const menuMemes = [
  { type: "king", image: PLANTS.king.image },
  { type: "sunflower", image: PLANTS.sunflower.image },
  { type: "bomb", image: PLANTS.bomb.image },
  { type: "shield", image: PLANTS.shield.image },
  { type: "weegee", image: PLANTS.weegee.image }
];

function buildLawn() {
  grid.replaceChildren();
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = document.createElement("div");
      cell.className = "lawn-cell";
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.setAttribute("role", "button");
      cell.setAttribute("aria-label", `Row ${row + 1}, column ${col + 1}`);
      cell.addEventListener("click", () => placePlant(row, col));
      grid.append(cell);
    }
  }
}

function updateSunBank() {
  sunCount.textContent = String(suns);
  updateSeedCards();
}

function updateSeedCards() {
  for (const card of seedCards) {
    const type = card.dataset.plant;
    const remaining = plantCooldowns[type];
    const cooling = remaining > 0;
    card.disabled = suns < PLANTS[type].cost || cooling;
    card.classList.toggle("is-cooling", cooling);
    card.querySelector(".cooldown-overlay b").textContent = cooling ? `${Math.ceil(remaining)}s` : "";
  }
}

function normalWaveSize() {
  if (currentLevel <= 3) return 7 + (currentLevel - 1) * 2;
  if (currentLevel <= 7) return 13 + (currentLevel - 4) * 3;
  return 27 + (currentLevel - 8) * 6;
}

function hordeSize() {
  if (currentLevel <= 3) return 10 + (currentLevel - 1) * 2;
  if (currentLevel <= 7) return 16 + (currentLevel - 4) * 3;
  return 30 + (currentLevel - 8) * 7;
}

function difficultyForLevel() {
  if (currentLevel <= 3) {
    const progress = currentLevel - 1;
    return {
      health: 1 + progress * 0.08,
      speed: 1 + progress * 0.025,
      bucketChance: 0.02 + progress * 0.02,
      coneChance: 0.16 + progress * 0.04,
      normalSpawnInterval: 3.5 - progress * 0.15,
      hordeSpawnInterval: 1.25 - progress * 0.05
    };
  }
  if (currentLevel <= 7) {
    const progress = currentLevel - 4;
    return {
      health: 1.2 + progress * 0.12,
      speed: 1.07 + progress * 0.035,
      bucketChance: 0.07 + progress * 0.025,
      coneChance: 0.28 + progress * 0.045,
      normalSpawnInterval: 3 - progress * 0.17,
      hordeSpawnInterval: 1.1 - progress * 0.06
    };
  }
  const progress = currentLevel - 8;
  return {
    health: 1.7 + progress * 0.22,
    speed: 1.22 + progress * 0.055,
    bucketChance: 0.17 + progress * 0.04,
    coneChance: 0.48 + progress * 0.035,
    normalSpawnInterval: 2.2 - progress * 0.15,
    hordeSpawnInterval: 0.82 - progress * 0.07
  };
}

function selectSeed(plantType) {
  selectedPlant = plantType;
  for (const card of seedCards) {
    const isSelected = card.dataset.plant === plantType;
    card.classList.toggle("selected", isSelected);
    card.setAttribute("aria-pressed", String(isSelected));
  }
  gameMessage.textContent = `${PLANTS[plantType].label} selected — choose an empty tile.`;
}

function placePlant(row, col) {
  if (!running) return;
  if (!selectedPlant) {
    gameMessage.textContent = "Select a plant card first.";
    return;
  }
  const plantType = selectedPlant;
  const definition = PLANTS[plantType];
  if (plants.some((plant) => plant.row === row && plant.col === col)) {
    gameMessage.textContent = "That tile is already occupied. Find another spot!";
    return;
  }
  if (suns < definition.cost) {
    gameMessage.textContent = `Not enough Me Gusta Suns — ${definition.cost} needed.`;
    return;
  }
  if (plantCooldowns[plantType] > 0) {
    gameMessage.textContent = `${definition.label} is recharging.`;
    return;
  }

  suns -= definition.cost;
  plantCooldowns[plantType] = definition.cooldown;
  const element = document.createElement("div");
  element.className = `plant-sprite ${plantType}`;
  element.style.left = `${((col + 0.5) / COLS) * 100}%`;
  element.style.top = `${((row + 0.5) / ROWS) * 100}%`;
  const image = document.createElement("img");
  image.src = definition.image;
  image.alt = definition.label;
  element.append(image);

  const plant = {
    id: nextId++,
    type: plantType,
    row,
    col,
    health: definition.health,
    maxHealth: definition.health,
    cooldown: 0,
    sunClock: 0,
    hypnosisAttempts: new WeakSet(),
    element
  };
  plants.push(plant);
  actorsLayer.append(element);
  updateSunBank();
  const placementMessages = {
    sunflower: "A Me Gusta Sunflower joined the meme team!",
    king: "King Harkinian is ready to serve up some goblets!",
    bomb: "Morshu's bomb is primed. Let the zombies come!",
    shield: "The Illuminati Shield is ready to block some bites!",
    weegee: "Weegee is ready to bring ancient YTP justice!"
  };
  gameMessage.textContent = placementMessages[plantType];
  gameMessage.textContent += ` ${definition.rarity} seed recharging for ${definition.cooldown}s.`;
  playTone(plantType === "king" ? 480 : plantType === "bomb" ? 220 : 720);
}

function triggerPlantAction(plant) {
  plant.element.classList.remove("is-acting");
  void plant.element.offsetWidth;
  plant.element.classList.add("is-acting");
  plant.element.addEventListener("animationend", () => {
    plant.element.classList.remove("is-acting");
  }, { once: true });
}

function hypnotizeZombie(plant, zombie) {
  if (!plants.includes(plant) || !zombies.includes(zombie)) return;
  plant.element.classList.remove("is-hypnotizing");
  void plant.element.offsetWidth;
  plant.element.classList.add("is-hypnotizing");
  plant.element.addEventListener("animationend", () => {
    plant.element.classList.remove("is-hypnotizing");
  }, { once: true });
  plant.hypnosisCooldown = 1.5;

  if (soundEnabled && weegeeAudio) {
    const sound = weegeeAudio.cloneNode();
    sound.volume = 0.75;
    sound.play().catch((error) => console.warn("Weegee hypnosis sound could not be played:", error));
  }

  const element = document.createElement("div");
  element.className = "weegee-clone is-turning";
  element.setAttribute("role", "img");
  element.setAttribute("aria-label", "Weegee clone, attacking zombies");
  element.style.left = `${(zombie.x / COLS) * 100}%`;
  element.style.top = `${((zombie.row + 0.5) / ROWS) * 100}%`;
  const image = document.createElement("img");
  image.src = PLANTS.weegee.image;
  image.alt = "";
  const healthBar = document.createElement("span");
  healthBar.className = "clone-hp";
  const healthFill = document.createElement("i");
  healthBar.append(healthFill);
  element.append(image, healthBar);
  image.addEventListener("animationend", () => element.classList.remove("is-turning"), { once: true });
  weegeeClones.push({
    id: nextId++,
    row: zombie.row,
    x: zombie.x,
    health: WEEGEE_CLONE_HEALTH,
    maxHealth: WEEGEE_CLONE_HEALTH,
    element,
    healthFill,
    attackClock: 0
  });
  actorsLayer.append(element);
  zombie.element.remove();
  zombies = zombies.filter((item) => item !== zombie);
  gameMessage.textContent = "OBEY WEEGEE! A zombie joined the YTP army!";
}

function createSun(x, y, source) {
  const element = document.createElement("button");
  element.className = "sky-sun";
  element.type = "button";
  element.setAttribute("aria-label", "Collect 25 Me Gusta Suns");
  const falling = source === "sky";
  const targetCol = falling ? Math.floor(Math.random() * COLS) : null;
  const targetRow = falling ? Math.floor(Math.random() * ROWS) : null;
  const targetY = falling ? ((targetRow + 0.5) / ROWS) * 100 : y;
  element.style.left = `${falling ? ((targetCol + 0.5) / COLS) * 100 : x}%`;
  element.style.top = `${falling ? -8 : y}%`;
  const image = document.createElement("img");
  image.src = "assets/misc/me-gusta-sun.png";
  image.alt = "";
  element.append(image);
  const drop = { id: nextId++, element, life: source === "sunflower" ? 10 : 12, source, falling, targetY, fallSpeed: 24 };
  element.addEventListener("click", () => collectSun(drop));
  drops.push(drop);
  skySuns.append(element);
}

function collectSun(drop) {
  if (!drops.includes(drop)) return;
  suns += 25;
  drop.element.remove();
  drops = drops.filter((item) => item !== drop);
  updateSunBank();
  gameMessage.textContent = "+25 Me Gusta Suns. Stonks!";
  playTone(880);
}

function createZombie() {
  const wave = currentLevel;
  const difficulty = difficultyForLevel();
  const roll = Math.random();
  const bucketChance = Math.min(0.35, difficulty.bucketChance + (hordeStarted ? 0.06 : 0));
  const coneChance = Math.min(1 - bucketChance, difficulty.coneChance + (hordeStarted ? 0.12 : 0));
  const type = roll < bucketChance
    ? "bucket"
    : roll < bucketChance + coneChance
      ? "cone"
      : "normal";
  const definition = ZOMBIE_TYPES[type];
  const row = Math.floor(Math.random() * ROWS);
  const element = document.createElement("div");
  element.className = `zombie ${type}`;
  element.setAttribute("role", "img");
  element.setAttribute("aria-label", definition.label);
  element.style.left = `${(9.42 / COLS) * 100}%`;
  element.style.top = `${((row + 0.5) / ROWS) * 100}%`;
  const body = document.createElement("div");
  body.className = "zombie-body";
  body.textContent = ZOMBIE_FACES[Math.floor(Math.random() * ZOMBIE_FACES.length)];
  const healthBar = document.createElement("span");
  healthBar.className = "zombie-hp";
  const healthFill = document.createElement("i");
  healthBar.append(healthFill);
  element.append(body, healthBar);
  const zombie = {
    id: nextId++,
    type,
    row,
    x: 9.42,
    health: definition.health * difficulty.health,
    maxHealth: definition.health * difficulty.health,
    speed: definition.speed * difficulty.speed,
    element,
    healthFill,
    biteClock: 0
  };
  zombies.push(zombie);
  actorsLayer.append(element);
  if (hordeStarted) hordeRemaining -= 1;
  else normalWaveRemaining -= 1;
  document.querySelector("#wave-count").textContent = hordeStarted ? "HORDE" : String(wave);
  if (!hordeStarted) gameMessage.textContent = `${definition.label} spotted in row ${row + 1}!`;
}

function killZombie(zombie, reducedToAsh = false) {
  if (!zombies.includes(zombie)) return;
  zombies = zombies.filter((item) => item !== zombie);
  zombie.element.classList.remove("bite");
  zombie.element.classList.add(reducedToAsh ? "is-ash" : "is-dead");
  zombie.element.setAttribute(
    "aria-label",
    reducedToAsh
      ? `${ZOMBIE_TYPES[zombie.type].label}, reduced to ashes`
      : `${ZOMBIE_TYPES[zombie.type].label}, defeated`
  );
  const body = zombie.element.querySelector(".zombie-body");
  body.addEventListener("animationend", (event) => {
    if (event.target !== body) return;
    window.setTimeout(() => {
      zombie.element.classList.add("is-fading");
      window.setTimeout(() => zombie.element.remove(), 1000);
    }, 5000);
  }, { once: true });
}

function fireGoblet(plant) {
  triggerPlantAction(plant);
  if (soundEnabled && mahBoiAudio) {
    const sound = mahBoiAudio.cloneNode();
    sound.volume = 0.65;
    sound.play().catch((error) => console.warn("Mah-Boi sound could not be played:", error));
  }
  const element = document.createElement("img");
  element.className = "projectile";
  element.src = "assets/projectiles/dinner-goblet.png";
  element.alt = "";
  element.style.left = `${((plant.col + 0.72) / COLS) * 100}%`;
  element.style.top = `${((plant.row + 0.5) / ROWS) * 100}%`;
  const projectile = {
    x: plant.col + 0.72,
    row: plant.row,
    damage: 38,
    speed: 4.2,
    element
  };
  projectiles.push(projectile);
  actorsLayer.append(element);
  playTone(320);
}

function startBombExplosion(plant) {
  if (plant.exploding) return;
  plant.exploding = true;
  plant.element.classList.add("is-exploding");
  gameMessage.textContent = "Morshu: 'Bombs!' Incoming mushroom cloud!";
  if (soundEnabled && bombAudio) {
    const sound = bombAudio.cloneNode();
    plant.explosionSound = sound;
    sound.volume = 0.8;
    sound.addEventListener("ended", () => detonateBomb(plant), { once: true });
    sound.play().catch((error) => {
      console.warn("Bombs sound could not be played:", error);
      detonateBomb(plant);
    });
    plant.explosionTimer = window.setTimeout(() => detonateBomb(plant), 2500);
  } else {
    plant.explosionTimer = window.setTimeout(() => detonateBomb(plant), 850);
  }
}

function detonateBomb(plant) {
  if (!plants.includes(plant)) return;
  window.clearTimeout(plant.explosionTimer);
  const cloud = document.createElement("div");
  cloud.className = "mushroom-cloud";
  cloud.setAttribute("aria-label", "Mushroom cloud");
  cloud.style.left = `${((plant.col + 0.5) / COLS) * 100}%`;
  cloud.style.top = `${((plant.row + 0.5) / ROWS) * 100}%`;
  actorsLayer.append(cloud);
  if (soundEnabled && bombExplosionAudio) {
    const sound = bombExplosionAudio.cloneNode();
    sound.volume = 0.8;
    sound.play().catch((error) => console.warn("Bomb explosion sound could not be played:", error));
  }

  for (const zombie of [...zombies]) {
    if (Math.abs(zombie.row - plant.row) > 1 || Math.abs(Math.floor(zombie.x) - plant.col) > 1) continue;
    killZombie(zombie, true);
  }
  plant.element.remove();
  plants = plants.filter((item) => item !== plant);
  gameMessage.textContent = "BOOM! Morshu turned the nearby horde to ash!";
  window.setTimeout(() => cloud.remove(), 1100);
}

function showSunPop(row, col) {
  const pop = document.createElement("span");
  pop.className = "sun-pop";
  pop.textContent = "+25";
  pop.style.left = `${((col + 0.5) / COLS) * 100}%`;
  pop.style.top = `${((row + 0.2) / ROWS) * 100}%`;
  actorsLayer.append(pop);
  window.setTimeout(() => pop.remove(), 850);
}

function updatePlants(delta) {
  for (const plant of [...plants]) {
    if (plant.type === "sunflower") {
      plant.sunClock += delta;
      if (plant.sunClock >= 8) {
        plant.sunClock -= 8;
        triggerPlantAction(plant);
        createSun(((plant.col + 0.5) / COLS) * 100, ((plant.row + 0.3) / ROWS) * 100, "sunflower");
      }
      continue;
    }
    if (plant.type === "weegee") {
      plant.hypnosisCooldown = Math.max(0, (plant.hypnosisCooldown ?? 0) - delta);
      if (plant.hypnosisCooldown === 0) {
        const target = zombies.find((zombie) =>
          zombie.row === plant.row &&
          Math.abs(zombie.x - (plant.col + 0.5)) <= 1.4 &&
          !plant.hypnosisAttempts.has(zombie)
        );
        if (target) {
          plant.hypnosisCooldown = 1.5;
          plant.hypnosisAttempts.add(target);
          if (Math.random() < 2 / 3) hypnotizeZombie(plant, target);
        }
      }
      continue;
    }
    if (plant.type !== "king") continue;

    plant.cooldown -= delta;
    const targetInLane = zombies.some((zombie) => zombie.row === plant.row && zombie.x > plant.col + 0.25);
    if (plant.cooldown <= 0 && targetInLane) {
      plant.cooldown = 1.45;
      fireGoblet(plant);
    }
  }
}

function updateWeegeeClones(delta) {
  for (const clone of [...weegeeClones]) {
    if (clone.x >= COLS) {
      clone.element.remove();
      weegeeClones = weegeeClones.filter((item) => item !== clone);
      continue;
    }

    const target = zombies
      .filter((zombie) => zombie.row === clone.row && zombie.x > clone.x)
      .sort((a, b) => a.x - b.x)[0];

    if (target && target.x - clone.x <= 0.72) {
      clone.element.classList.add("is-attacking");
      clone.attackClock += delta;
      while (clone.attackClock >= 0.85 && zombies.includes(target)) {
        clone.attackClock -= 0.85;
        target.health -= 55;
        target.healthFill.style.width = `${Math.max(0, (target.health / target.maxHealth) * 100)}%`;
        if (target.health <= 0) {
          killZombie(target);
          gameMessage.textContent = "Weegee clone obliterated a zombie. Classic YTP lore.";
          break;
        }
      }
    } else {
      clone.element.classList.remove("is-attacking");
      clone.attackClock = 0;
      if (target) {
        clone.x = Math.min(target.x - 0.65, clone.x + 0.65 * delta);
      } else {
        clone.x += 0.4 * delta;
      }
      clone.element.style.left = `${(clone.x / COLS) * 100}%`;
      if (clone.x >= COLS) {
        clone.element.remove();
        weegeeClones = weegeeClones.filter((item) => item !== clone);
      }
    }
  }
}

function updateProjectiles(delta) {
  for (const projectile of [...projectiles]) {
    projectile.x += projectile.speed * delta;
    projectile.element.style.left = `${(projectile.x / COLS) * 100}%`;
    const target = zombies.find((zombie) =>
      zombie.row === projectile.row &&
      projectile.x >= zombie.x - 0.42 &&
      projectile.x <= zombie.x + 0.4
    );
    if (target) {
      target.health -= projectile.damage;
      target.healthFill.style.width = `${Math.max(0, (target.health / target.maxHealth) * 100)}%`;
      projectile.element.remove();
      projectiles = projectiles.filter((item) => item !== projectile);
      if (target.health <= 0) {
        killZombie(target);
        gameMessage.textContent = "Goblet delivered. Zombie absolutely roasted.";
      }
    } else if (projectile.x > COLS + 0.3) {
      projectile.element.remove();
      projectiles = projectiles.filter((item) => item !== projectile);
    }
  }
}

function updateZombies(delta) {
  for (const zombie of [...zombies]) {
    const blockingClone = weegeeClones.find((clone) =>
      clone.row === zombie.row && Math.abs(zombie.x - clone.x) <= 0.58
    );
    if (blockingClone) {
      zombie.element.classList.add("bite");
      zombie.biteClock += delta;
      if (zombie.biteClock >= 1.1) {
        zombie.biteClock -= 1.1;
        blockingClone.health -= 25;
        blockingClone.healthFill.style.width =
          `${Math.max(0, (blockingClone.health / blockingClone.maxHealth) * 100)}%`;
        if (blockingClone.health <= 0) {
          blockingClone.element.remove();
          weegeeClones = weegeeClones.filter((clone) => clone !== blockingClone);
          zombie.element.classList.remove("bite");
          gameMessage.textContent = "A Weegee clone got chomped!";
        }
      }
      continue;
    }

    const blockingPlant = plants.find((plant) =>
      plant.row === zombie.row &&
      zombie.x > plant.col - 0.15 &&
      zombie.x < plant.col + 0.78
    );
    if (blockingPlant) {
      if (blockingPlant.type === "bomb") {
        startBombExplosion(blockingPlant);
        continue;
      }
      zombie.element.classList.add("bite");
      zombie.biteClock += delta;
      if (zombie.biteClock >= 1.1) {
        zombie.biteClock -= 1.1;
        blockingPlant.health -= 25;
        if (blockingPlant.type === "shield") {
          blockingPlant.element.classList.toggle("shield-half-eaten", blockingPlant.health <= blockingPlant.maxHealth * 0.5);
          blockingPlant.element.classList.toggle("shield-most-eaten", blockingPlant.health <= blockingPlant.maxHealth * 0.25);
        }
        if (blockingPlant.health <= 0) {
          blockingPlant.element.remove();
          plants = plants.filter((plant) => plant !== blockingPlant);
          zombie.element.classList.remove("bite");
          gameMessage.textContent = "A plant got chomped. Replant and regroup!";
        }
      }
      continue;
    }
    zombie.element.classList.remove("bite");
    zombie.x -= zombie.speed * delta;
    zombie.element.style.left = `${(zombie.x / COLS) * 100}%`;
    if (zombie.x < -0.15) {
      endGame(false);
      return;
    }
  }
}

function updateDrops(delta) {
  for (const drop of [...drops]) {
    if (drop.falling) {
      const currentY = Number.parseFloat(drop.element.style.top);
      const nextY = Math.min(drop.targetY, currentY + drop.fallSpeed * delta);
      drop.element.style.top = `${nextY}%`;
      if (nextY >= drop.targetY) drop.falling = false;
    }
    drop.life -= delta;
    if (drop.life <= 0) {
      if (drop.source === "sunflower") {
        collectSun(drop);
      } else {
        drop.element.remove();
        drops = drops.filter((item) => item !== drop);
      }
    }
  }
}

function updatePlantCooldowns(delta) {
  for (const type of Object.keys(plantCooldowns)) {
    plantCooldowns[type] = Math.max(0, plantCooldowns[type] - delta);
  }
  updateSeedCards();
}

function showHordeAlert() {
  const alert = document.querySelector("#wave-alert");
  alert.classList.remove("is-hidden");
  window.clearTimeout(waveAlertTimer);
  waveAlertTimer = window.setTimeout(() => alert.classList.add("is-hidden"), 3200);
}

function update(delta) {
  elapsed += delta;
  skySunClock += delta;
  updatePlantCooldowns(delta);

  if (!normalWaveStarted && elapsed >= LEVEL_START_DELAY) {
    normalWaveStarted = true;
    normalWaveRemaining = normalWaveSize();
    spawnClock = 0;
    document.querySelector("#wave-count").textContent = "1";
    document.querySelector("#goal-detail").textContent = `Normal wave: ${normalWaveRemaining} zombies left`;
    gameMessage.textContent = "The normal wave is approaching!";
  }

  if (normalWaveStarted) spawnClock += delta;
  const difficulty = difficultyForLevel();
  const normalSpawnInterval = difficulty.normalSpawnInterval;
  if (normalWaveStarted && !hordeStarted && normalWaveRemaining > 0 && spawnClock >= normalSpawnInterval) {
    spawnClock -= normalSpawnInterval;
    createZombie();
  }

  if (skySunClock >= 7) {
    skySunClock -= 7;
    createSun(10 + Math.random() * 78, -8, "sky");
  }

  updatePlants(delta);
  updateWeegeeClones(delta);
  updateProjectiles(delta);
  updateZombies(delta);
  updateDrops(delta);
  if (!running) return;

  if (normalWaveStarted && !hordeStarted && normalWaveRemaining === 0 && zombies.length === 0) {
    hordeStarted = true;
    hordeRemaining = hordeSize();
    spawnClock = 0;
    document.querySelector("#wave-count").textContent = "HORDE";
    document.querySelector("#goal-detail").textContent = `Huge wave: ${hordeRemaining} zombies`;
    showHordeAlert();
    gameMessage.textContent = "The normal wave is cleared. Hold the lawn against the horde!";
  }

  const hordeSpawnInterval = difficulty.hordeSpawnInterval;
  if (hordeStarted && hordeRemaining > 0 && spawnClock >= hordeSpawnInterval) {
    spawnClock -= hordeSpawnInterval;
    createZombie();
  }

  const normalZombiesLeft = normalWaveRemaining + zombies.length;
  const progress = hordeStarted
    ? 100
    : normalWaveStarted
      ? 100 * (normalZombiesLeft / normalWaveSize())
      : 100;
  if (normalWaveStarted && !hordeStarted) {
    document.querySelector("#goal-detail").textContent = `Normal wave: ${normalZombiesLeft} zombies left`;
  }
  document.querySelector("#time-progress").style.width = `${Math.max(0, Math.min(100, progress))}%`;

  if (hordeStarted && hordeRemaining === 0 && zombies.length === 0) {
    if (currentLevel === TOTAL_LEVELS) endGame(true);
    else completeLevel();
  }
}

function tick(now) {
  if (!running) return;
  const delta = Math.min((now - lastTick) / 1000, 0.1);
  lastTick = now;
  update(delta);
  if (running) animationFrame = window.requestAnimationFrame(tick);
}

function clearBattlefield() {
  for (const plant of plants) {
    window.clearTimeout(plant.explosionTimer);
    plant.explosionSound?.pause();
  }
  plants = [];
  zombies = [];
  weegeeClones = [];
  projectiles = [];
  drops = [];
  actorsLayer.replaceChildren();
  skySuns.replaceChildren();
  for (const type of Object.keys(plantCooldowns)) plantCooldowns[type] = 0;
  window.clearTimeout(waveAlertTimer);
  document.querySelector("#wave-alert").classList.add("is-hidden");
}

function resetGame() {
  window.cancelAnimationFrame(animationFrame);
  running = false;
  gameScreen.classList.remove("is-victory");
  clearBattlefield();
  elapsed = 0;
  spawnClock = 0;
  skySunClock = 0;
  lastTick = 0;
  nextId = 0;
  currentLevel = 1;
  normalWaveStarted = false;
  normalWaveRemaining = 0;
  hordeRemaining = 0;
  hordeStarted = false;
  suns = 150;
  document.querySelector("#wave-count").textContent = "1";
  document.querySelector("#level-count").textContent = `1 / ${TOTAL_LEVELS}`;
  document.querySelector("#goal-kicker").textContent = "LEVEL 1 MISSION";
  document.querySelector("#goal-detail").textContent = `Warm-up: ${LEVEL_START_DELAY} seconds`;
  document.querySelector("#time-progress").style.width = "0%";
  document.querySelector("#game-overlay").classList.add("is-hidden");
  document.querySelector("#next-level-button").classList.add("is-hidden");
  document.querySelector("#again-button").classList.remove("is-hidden");
  updateSunBank();
  selectedPlant = "sunflower";
  for (const card of seedCards) {
    const isSelected = card.dataset.plant === selectedPlant;
    card.classList.toggle("selected", isSelected);
    card.setAttribute("aria-pressed", String(isSelected));
  }
  gameMessage.textContent = "Enjoy the quiet — the first zombies arrive in a few seconds.";
}

function startGame() {
  resetGame();
  menuScreen.classList.add("is-hidden");
  gameScreen.classList.remove("is-hidden");
  running = true;
  stopOutcomeAudio();
  startBackgroundMusic();
  lastTick = performance.now();
  animationFrame = window.requestAnimationFrame(tick);
}

function completeLevel() {
  running = false;
  window.cancelAnimationFrame(animationFrame);
  gameScreen.classList.add("is-victory");
  document.querySelector("#overlay-stamp").textContent = "LEVEL CLEAR!";
  document.querySelector("#overlay-title").textContent = `LEVEL ${currentLevel} CLEARED`;
  document.querySelector("#overlay-message").textContent = "The lawn survived the horde. The next level brings tougher zombies and bigger waves.";
  document.querySelector("#next-level-button").classList.remove("is-hidden");
  document.querySelector("#again-button").classList.add("is-hidden");
  document.querySelector("#game-overlay").classList.remove("is-hidden");
  finishGameAudio(true);
}

function startNextLevel() {
  currentLevel += 1;
  clearBattlefield();
  suns = 150;
  elapsed = 0;
  spawnClock = 0;
  skySunClock = 0;
  normalWaveStarted = false;
  normalWaveRemaining = 0;
  hordeRemaining = 0;
  hordeStarted = false;
  document.querySelector("#level-count").textContent = `${currentLevel} / ${TOTAL_LEVELS}`;
  document.querySelector("#wave-count").textContent = "1";
  document.querySelector("#goal-kicker").textContent = `LEVEL ${currentLevel} MISSION`;
  document.querySelector("#goal-detail").textContent = `Warm-up: ${LEVEL_START_DELAY} seconds`;
  document.querySelector("#time-progress").style.width = "0%";
  document.querySelector("#game-overlay").classList.add("is-hidden");
  gameScreen.classList.remove("is-victory");
  document.querySelector("#next-level-button").classList.add("is-hidden");
  document.querySelector("#again-button").classList.remove("is-hidden");
  updateSunBank();
  gameMessage.textContent = "New level, fresh lawn, fresh suns. Enjoy the quiet!";
  running = true;
  stopOutcomeAudio();
  startBackgroundMusic();
  lastTick = performance.now();
  animationFrame = window.requestAnimationFrame(tick);
}

function endGame(won) {
  if (!running) return;
  running = false;
  document.querySelector("#overlay-stamp").textContent = won ? "BIG WIN!" : "OH NO!";
  document.querySelector("#overlay-title").textContent = won ? "LAWN STATUS: SAVED" : "THE LAWN IS TOAST";
  document.querySelector("#overlay-message").textContent = won
    ? "You survived the meme apocalypse. The internet is safe... for now."
    : "The zombies made it to the house. That lawn got absolutely ratioed.";
  document.querySelector("#next-level-button").classList.add("is-hidden");
  document.querySelector("#again-button").classList.remove("is-hidden");
  document.querySelector("#game-overlay").classList.remove("is-hidden");
  gameScreen.classList.toggle("is-victory", won);
  finishGameAudio(won);
}

function finishGameAudio(won) {
  if (musicAudio) {
    musicAudio.pause();
    musicAudio.currentTime = 0;
  }
  stopOutcomeAudio();
  const outcomeAudio = won ? victoryAudio : loseAudio;
  if (outcomeAudio) {
    outcomeAudio.currentTime = 0;
    outcomeAudio.muted = !soundEnabled;
    outcomeAudio.play().catch((error) => console.warn("Game outcome audio could not be played:", error));
  }
}

function startBackgroundMusic() {
  if (!musicAudio) return;
  musicAudio.currentTime = 0;
  musicAudio.muted = !soundEnabled;
  musicAudio.play().catch((error) => console.warn("Background music could not be played:", error));
}

function stopOutcomeAudio() {
  for (const audio of [victoryAudio, loseAudio]) {
    if (!audio) continue;
    audio.pause();
    audio.currentTime = 0;
  }
}

function playTone(frequency) {
  if (!soundEnabled || !window.AudioContext) return;
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === "suspended") audioContext.resume();
  const oscillator = audioContext.createOscillator();
  const volume = audioContext.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = frequency;
  volume.gain.setValueAtTime(0.035, audioContext.currentTime);
  volume.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.09);
  oscillator.connect(volume);
  volume.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.09);
}

function returnToMenu() {
  running = false;
  window.cancelAnimationFrame(animationFrame);
  clearBattlefield();
  gameScreen.classList.remove("is-victory");
  if (musicAudio) {
    musicAudio.pause();
    musicAudio.currentTime = 0;
  }
  stopOutcomeAudio();
  gameScreen.classList.add("is-hidden");
  menuScreen.classList.remove("is-hidden");
}

buildLawn();
setRandomMenuMeme();
updateSunBank();
for (const card of seedCards) {
  card.addEventListener("click", () => selectSeed(card.dataset.plant));
}
document.addEventListener("click", (event) => {
  if (event.target.closest("#lawn-grid, .seed-card")) return;
  selectedPlant = null;
  for (const card of seedCards) {
    card.classList.remove("selected");
    card.setAttribute("aria-pressed", "false");
  }
}, true);
document.querySelector("#start-button").addEventListener("click", startGame);
document.querySelector("#again-button").addEventListener("click", startGame);
document.querySelector("#next-level-button").addEventListener("click", startNextLevel);
document.querySelector("#menu-button").addEventListener("click", returnToMenu);
document.querySelector("#overlay-menu-button").addEventListener("click", returnToMenu);
document.querySelector("#sound-button").addEventListener("click", (event) => {
  soundEnabled = !soundEnabled;
  if (musicAudio) musicAudio.muted = !soundEnabled;
  if (victoryAudio) victoryAudio.muted = !soundEnabled;
  if (loseAudio) loseAudio.muted = !soundEnabled;
  event.currentTarget.textContent = soundEnabled ? "🔊" : "🔇";
  event.currentTarget.setAttribute("aria-label", soundEnabled ? "Mute all audio" : "Enable all audio");
});

musicAudio = new Audio("assets/audio/music/theme.mp3");
musicAudio.loop = true;
musicAudio.volume = 0.35;
musicAudio.preload = "none";
victoryAudio = new Audio("assets/audio/soundeffects/victory.mp3");
loseAudio = new Audio("assets/audio/soundeffects/lose.mp3");
mahBoiAudio = new Audio("assets/audio/soundeffects/Mah-Boi.mp3");
bombAudio = new Audio("assets/audio/soundeffects/Bombs.mp3");
bombExplosionAudio = new Audio("assets/audio/soundeffects/Bomb-Explosion.mp3");
weegeeAudio = new Audio("assets/audio/soundeffects/obey-weegee-destroy-mario.mp3");

function setRandomMenuMeme() {
  const mascot = document.querySelector(".menu-mascot");
  const image = mascot.querySelector("img");
  const meme = menuMemes[Math.floor(Math.random() * menuMemes.length)];
  mascot.dataset.meme = meme.type;
  image.src = meme.image;
}
