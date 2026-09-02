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
  for (let i = 0; i < puddleDecals.length; i++) {
    scene.remove(puddleDecals[i].mesh);
  }
  puddleDecals = [];
  // Remove any wall decals (blood) that were placed on the previous floor
  for (let i = 0; i < wallDecals.length; i++) {
    scene.remove(wallDecals[i].mesh);
  }
  wallDecals = [];
  clearPlacedPlush();
}

function clearPlacedPlush() {
  if (placedPlush && placedPlush.mesh) {
    scene.remove(placedPlush.mesh);
  }
  placedPlush = null;
  plushDistraction.active = false;
  plushDistraction.engaged = false;
  plushDistraction.t = 0;
  plushDistraction.duration = 0;
  plushDistraction.x = 0;
  plushDistraction.z = 0;
}

function placeMarioPlush() {
  clearPlacedPlush();
  const x = player.x;
  const z = player.z;
  const geo = new THREE.PlaneGeometry(0.9, 0.9);
  const mat = new THREE.MeshLambertMaterial({
    map: ITEM_DATA.plush.texture,
    transparent: true,
    alphaTest: 0.15,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, 0.4, z);
  mesh.renderOrder = 500;
  scene.add(mesh);
  placedPlush = { mesh, x, z };
  plushDistraction.active = true;
  plushDistraction.engaged = false;
  plushDistraction.t = 0;
  plushDistraction.duration = 4 + Math.random() * 3;
  plushDistraction.x = x;
  plushDistraction.z = z;
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
  // 2 Shroom pickups per floor
  for (let i = 0; i < 2; i++) {
    if (validCells.length > 0) {
      let loc = validCells.pop();
      spawnItemEntity(loc.c * CELL + CELL/2, loc.r * CELL + CELL/2, ITEM_DATA.shroom);
    }
  }
  // 1 Mario Plush per floor
  if (validCells.length > 0) {
    let loc = validCells.pop();
    spawnItemEntity(loc.c * CELL + CELL/2, loc.r * CELL + CELL/2, ITEM_DATA.plush);
  }
}

function generateFloorPuddles() {
  if (!puddleDecalTexture) return;

  const startCellX = Math.floor((CELL * 0.5) / CELL);
  const startCellZ = Math.floor((CELL * 0.5) / CELL);
  let validCells = [];
  for (let r = 0; r < MAZE_H; r++) {
    for (let c = 0; c < MAZE_W; c++) {
      if (r === startCellZ && c === startCellX) continue;
      validCells.push({r, c});
    }
  }
  validCells.sort(() => Math.random() - 0.5);
  const puddleCount = Math.min(MAX_PUDDLES_PER_FLOOR, validCells.length);

  for (let i = 0; i < puddleCount; i++) {
    const loc = validCells.pop();
    const x = loc.c * CELL + 0.5 + Math.random() * (CELL - 1.0);
    const z = loc.r * CELL + 0.5 + Math.random() * (CELL - 1.0);
    const size = MIN_PUDDLE_DECAL_SIZE + Math.random() * (MAX_PUDDLE_DECAL_SIZE - MIN_PUDDLE_DECAL_SIZE);
    const geo = new THREE.PlaneGeometry(size, size);
    const mat = new THREE.MeshLambertMaterial({
      map: puddleDecalTexture,
      transparent: true,
      opacity: 0.85,
      alphaTest: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const rot = Math.random() * Math.PI * 2;
    // Build quaternion so the plane lies flat (plane's +Z -> world +Y) then
    // rotate around the up axis for an in-plane random rotation.
    const alignQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1), new THREE.Vector3(0,1,0));
    const rotQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), rot);
    mesh.quaternion.copy(rotQ.multiply(alignQ));
    mesh.position.set(x, 0.01, z);
    mesh.renderOrder = 100;
    scene.add(mesh);
    puddleDecals.push({mesh, x, z, size, rot});
  }
}

// Generate wall decals (blood splatters) onto non-window wall segments.
function generateFloorWallDecals() {
  if (!wallDecalTextures || wallDecalTextures.length === 0) return;
  if (!walls3D || walls3D.length === 0) return;

  // Collect candidate wall segments (exclude outer strips and windowed segments)
  const candidates = [];
  for (const w of walls3D) {
    if (w.isStrip) continue;
    if (w.isWindow) continue;
    candidates.push(w);
  }
  if (candidates.length === 0) return;

  candidates.sort(() => Math.random() - 0.5);
  const count = Math.min(MAX_WALL_DECALS_PER_FLOOR, candidates.length);
  const faceOffset = 0.01;
  const edgePadding = 0.25;
  for (let i = 0; i < count; i++) {
    const w = candidates.pop();
    const maxLength = (w.side === 'north' || w.side === 'south') ? w.w : w.d;
    const availableLength = Math.max(maxLength - edgePadding * 2, MIN_WALL_DECAL_SIZE);
    const size = Math.min(MIN_WALL_DECAL_SIZE + Math.random() * (MAX_WALL_DECAL_SIZE - MIN_WALL_DECAL_SIZE), availableLength);
    const height = MIN_WALL_DECAL_HEIGHT + Math.random() * (MAX_WALL_DECAL_HEIGHT - MIN_WALL_DECAL_HEIGHT);
    const geo = new THREE.PlaneGeometry(size, height);
    const tex = wallDecalTextures[Math.floor(Math.random() * wallDecalTextures.length)];
    const mat = new THREE.MeshLambertMaterial({
      map: tex,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);

    let px = w.x + Math.random() * Math.max(w.w, 0.01);
    let pz = w.z + Math.random() * Math.max(w.d, 0.01);
    if (w.side === 'north') {
      mesh.rotation.y = 0; // face +Z
      const xMin = w.x + edgePadding + size * 0.5;
      const xMax = w.x + w.w - edgePadding - size * 0.5;
      px = xMin <= xMax ? xMin + Math.random() * (xMax - xMin) : w.x + w.w * 0.5;
      pz = w.z + w.d + faceOffset;
    } else if (w.side === 'south') {
      mesh.rotation.y = Math.PI; // face -Z
      const xMin = w.x + edgePadding + size * 0.5;
      const xMax = w.x + w.w - edgePadding - size * 0.5;
      px = xMin <= xMax ? xMin + Math.random() * (xMax - xMin) : w.x + w.w * 0.5;
      pz = w.z - faceOffset;
    } else if (w.side === 'west') {
      mesh.rotation.y = -Math.PI / 2; // face +X
      const zMin = w.z + edgePadding + size * 0.5;
      const zMax = w.z + w.d - edgePadding - size * 0.5;
      pz = zMin <= zMax ? zMin + Math.random() * (zMax - zMin) : w.z + w.d * 0.5;
      px = w.x + w.w + faceOffset;
    } else if (w.side === 'east') {
      mesh.rotation.y = Math.PI / 2; // face -X
      const zMin = w.z + edgePadding + size * 0.5;
      const zMax = w.z + w.d - edgePadding - size * 0.5;
      pz = zMin <= zMax ? zMin + Math.random() * (zMax - zMin) : w.z + w.d * 0.5;
      px = w.x - faceOffset;
    } else if (w.w > w.d) {
      mesh.rotation.y = Math.random() * Math.PI * 2;
    } else {
      mesh.rotation.y = Math.PI/2 + Math.random() * Math.PI * 2;
    }

    const y = 0.6 + Math.random() * 1.6;
    mesh.position.set(px, y, pz);
    mesh.renderOrder = 100;
    scene.add(mesh);
    wallDecals.push({mesh, x: px, z: pz, size, height, side: w.side});
  }
}

function isPlayerOverPuddleDecal() {
  if (puddleDecals.length === 0 || !puddleDecalMaskImageData) return false;
  const px = player.x;
  const pz = player.z;
  for (let i = 0; i < puddleDecals.length; i++) {
    const decal = puddleDecals[i];
    const dx = px - decal.x;
    const dz = pz - decal.z;
    const distSq = dx * dx + dz * dz;
    const radius = decal.size * 0.5;
    if (distSq > (radius * radius)) continue;

    // Use the decal mesh's world->local transform to get precise local coords
    decal.mesh.updateMatrixWorld();
    const worldPos = new THREE.Vector3(px, 0.01, pz);
    decal.mesh.worldToLocal(worldPos);
    const lx = worldPos.x;
    const ly = worldPos.y; // plane local Y (after rotation.x = -PI/2)

    const localX = (lx / decal.size + 0.5) * puddleDecalMaskCanvas.width;
    const localY = (ly / decal.size + 0.5) * puddleDecalMaskCanvas.height;
    const ix = Math.floor(localX);
    const iy = Math.floor(localY);
    if (ix < 0 || iy < 0 || ix >= puddleDecalMaskCanvas.width || iy >= puddleDecalMaskCanvas.height) continue;

    const idx = (iy * puddleDecalMaskCanvas.width + ix) * 4;
    const alpha = puddleDecalMaskImageData.data[idx + 3] / 255;
    if (alpha > 0.1) return true;
  }
  return false;
}

function spawnItemEntity(x, z, itemType) {
  const geo = new THREE.PlaneGeometry(0.6, 0.6);
  const mat = new THREE.MeshLambertMaterial({
    map: itemType.texture, 
    transparent: true, 
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, 0.4, z);
  mesh.renderOrder = 500;
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

  // ── Ray vs. billboard-plane intersection ────────────────────────────────
  // Weegee's sprite is PlaneGeometry(1.6, 2.8) centred at (weegee.x, 1.4, weegee.z).
  // As a billboard it always faces the player, so its normal is the
  // horizontal unit vector from Weegee toward the player.
  //
  // We ray-cast the player's look ray against that infinite plane, then
  // convert the hit point to sprite-local UV coords and check whether it
  // falls inside the eye region of the Weegee_Front.png artwork.
  // This is the only approach that is immune to "looking at his hands/legs
  // still triggers because the angle to his centre is close enough".

  // Player look ray (same formula used by movement & flashlight code)
  const rayOx = player.x,   rayOy = 1.55,      rayOz = player.z;
  const rayDx = -Math.sin(player.yaw) * Math.cos(player.pitch);
  const rayDy =  Math.sin(player.pitch);
  const rayDz = -Math.cos(player.yaw) * Math.cos(player.pitch);

  // Billboard plane normal = horizontal direction from Weegee to player
  const invDist2D = 1 / dist2D;
  const normX = -dx * invDist2D; // points toward player
  const normZ = -dz * invDist2D;

  // Plane equation: dot(N, P) = dot(N, planeOrigin)
  // planeOrigin = Weegee's centre (y component irrelevant for N·P since normY=0)
  const planeDot = normX * weegee.x + normZ * weegee.z; // N·origin (Y cancels)
  const rayDotN  = rayDx * normX + rayDz * normZ;       // N·rayDir

  // Ray is parallel to / pointing away from the plane — no hit
  if (Math.abs(rayDotN) < 0.001) return false;

  // t = (planeDot - N·rayOrigin) / (N·rayDir)
  const t = (planeDot - (rayOx * normX + rayOz * normZ)) / rayDotN;
  if (t < 0.1) return false; // intersection is behind the camera

  // World-space hit point
  const hitX = rayOx + rayDx * t;
  const hitY = rayOy + rayDy * t;
  const hitZ = rayOz + rayDz * t;

  // ── Convert hit point to sprite-local coords ─────────────────────────────
  // The billboard's local right-axis is the world +X rotated to face the
  // player: right = cross(up, normal) = (-normZ, 0, normX)  (unit length).
  const rightX = -normZ;
  const rightZ =  normX;

  // Local horizontal offset from sprite centre
  const offsetX = hitX - weegee.x;
  const offsetY = hitY - 1.4;        // 1.4 = sprite centre Y
  const offsetZ = hitZ - weegee.z;

  const localU = offsetX * rightX + offsetZ * rightZ; // along billboard right
  const localV = offsetY;                              // world up

  // Sprite half-extents: width=1.6, height=2.8
  const halfW = 0.8;   // 1.6 / 2
  const halfH = 1.4;   // 2.8 / 2

  // Must hit within the full sprite bounds first
  if (localU < -halfW || localU > halfW) return false;
  if (localV < -halfH || localV > halfH) return false;

  // Convert to 0..1 UV (U: left→right, V: bottom→top)
  const u = (localU + halfW) / (halfW * 2); // 0=left edge, 1=right edge
  const v = (localV + halfH) / (halfH * 2); // 0=bottom, 1=top of sprite

  // ── Eye region in Weegee_Front.png ──────────────────────────────────────
  // Pixel-measured eye box (both eyes, generous but accurate):
  //   U: 25%..75%  (horizontal centre of face)
  //   V: 73%..81%  (eye row, bottom-to-top)
  //
  // Distance scaling: the UV box is in fixed world-space, so at greater
  // distance Weegee appears smaller on screen but the box stays the same
  // angular size — making far-away kills too easy. We shrink the box toward
  // its centre proportionally with distance so the required precision scales
  // with how large Weegee actually looks to the player.
  //   At dist2D ≤ 2  → full box (scale = 1.0)
  //   At dist2D = 8  → box shrinks to ~25 % of full size
  //   At dist2D = 14 → box shrinks to ~14 % of full size (very hard to hit)
  const EYE_U_CTR = 0.50, EYE_V_CTR = 0.77;
  const EYE_U_HALF_BASE = 0.25, EYE_V_HALF_BASE = 0.04;
  const distScale = Math.max(0.14, 2.0 / dist2D);
  const EYE_U_MIN = EYE_U_CTR - EYE_U_HALF_BASE * distScale;
  const EYE_U_MAX = EYE_U_CTR + EYE_U_HALF_BASE * distScale;
  const EYE_V_MIN = EYE_V_CTR - EYE_V_HALF_BASE * distScale;
  const EYE_V_MAX = EYE_V_CTR + EYE_V_HALF_BASE * distScale;

  if (u < EYE_U_MIN || u > EYE_U_MAX) return false;
  if (v < EYE_V_MIN || v > EYE_V_MAX) return false;

  return !isWallBetween(player.x, player.z, weegee.x, weegee.z);
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
    puddleFootstepsAudio.pause();
    
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
      if (isPlayerOverPuddleDecal()) {
        puddleFootstepsAudio.play().catch(err => console.warn(err));
      } else {
        footstepsAudio.play().catch(err => console.warn(err));
      }
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
  shroomEffectTimeLeft = 0;

  staminaCurrent = 100;
  batteryCurrent = 100;
  flashlightActive = true;
  isSneaking = false;
  if (typeof player._sneakCamY !== 'undefined') player._sneakCamY = 0;
  weegeeLastHeardCell = null;
  weegeeHearTimer = 0;
  weegeeInvestigateTimer = 0;
  inventory = [null, null, null, null, null];
  selectedSlot = 0;
  
  document.getElementById('pause-screen').style.display = 'none';
  document.getElementById('start-screen').style.display = 'flex';
  document.getElementById('stamina-wrap').style.display = 'none';
  document.getElementById('hotbar-wrap').style.display = 'none';
  if (document.getElementById('stair-btn')) document.getElementById('stair-btn').style.display = 'none';
  
  bgMusic.pause();
  bgMusic.pause();
  bgMusic.currentTime = 0;
  bgMusic.volume = 1;
  footstepsAudio.volume = 1;
  if (isWalking) {
    isWalking = false;
    footstepsAudio.pause();
    puddleFootstepsAudio.pause();
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
  overlayEl.style.backdropFilter = '';
  overlayEl.style.filter = '';
  if (typeof armsCanvas !== 'undefined' && armsCanvas) {
    armsCanvas.style.filter = '';
    armsCanvas.style.opacity = '1';
  }
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
  } else if(item === 'plush') {
    inventory[selectedSlot] = null;
    // The actual plush placement happens when the hand animation finishes.
  } else if(item === 'shroom') {
    inventory[selectedSlot] = null;
    // The actual trippy effect begins after Mario finishes eating it.
    shroomFadeWarningPlayed = false;
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
  weegeeActive = false;
  shroomEffectTimeLeft = 0;
  
  stakeFloor = Math.floor(Math.random() * FLOOR_COUNT);
  selectedSlot = 0;
  isWeegeeBanished = false;
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
  isSneaking = false;
  if (typeof player._sneakCamY !== 'undefined') player._sneakCamY = 0;
  speedBoostTimeLeft = 0;
  weegeeLastHeardCell = null;
  weegeeHearTimer = 0;
  weegeeInvestigateTimer = 0;
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
  overlayEl.style.backdropFilter = '';
  overlayEl.style.filter = '';
  if (typeof armsCanvas !== 'undefined' && armsCanvas) {
    armsCanvas.style.filter = '';
    armsCanvas.style.opacity = '1';
  }
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

  // ── Sneak state ───────────────────────────────────────────────────────────
  // Space (keyboard, toggle) or DPAD_DOWN (gamepad, toggle). Works while standing still.
  isSneaking = !!(keys['sneak'] || gamepadState.sneakToggle);
  if (isSneaking && gamepadState.sprintToggle) gamepadState.sprintToggle = false;

  // Circle button TOGGLES sprint rather than needing to be held, but it
  // still ORs cleanly with Shift so keyboard sprinting is unaffected.
  // Sneak overrides sprint: can't do both at once.
  isSprinting = !isSneaking && (keys['shift'] || gamepadState.sprintToggle) && movingInput && staminaCurrent > 0;

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

  // Sneak caps at 75% walk speed; speed boost doesn't apply while sneaking
  // (you don't get a Dew-fuelled sprint crouch).
  const currentSpeed = isSneaking
    ? baseSpeed * SNEAK_SPEED_MULT
    : (isSprinting ? baseSpeed * 1.5 : baseSpeed) * speedBoostMult;
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

// ── Suspicion Zone System ─────────────────────────────────────────────────────
// Every maze cell tracks how long ago Weegee last visited it (in seconds).
// Cells that haven't been visited for a long time become "suspicious" and get
// priority when picking a wander target, making Weegee actively patrol the
// whole map instead of clustering in areas he's already checked.
//
// WEEGEE_SUSPICION_THRESHOLD : seconds before a cell becomes suspicious
// WEEGEE_SUSPICION_WEIGHT    : how many extra "votes" a suspicious cell gets
//                              in the weighted random draw (higher = more pull)
const WEEGEE_SUSPICION_THRESHOLD = 20.0;
const WEEGEE_SUSPICION_WEIGHT    = 6;

// Flat array [MAZE_H * MAZE_W] tracking seconds-since-last-visit per cell.
// Initialised to WEEGEE_SUSPICION_THRESHOLD so every cell starts suspicious
// on a fresh floor — Weegee immediately feels pressure to explore everywhere.
let weegeeCellLastVisited = [];

function initSuspicionZones() {
  weegeeCellLastVisited = new Array(MAZE_H * MAZE_W).fill(WEEGEE_SUSPICION_THRESHOLD);
}

// Call once per frame (during updateWeegee) to age every cell's timer.
// Also marks Weegee's current cell as freshly visited (timer = 0).
function tickSuspicionZones(dt) {
  const wCol = Math.floor(weegee.x / CELL);
  const wRow = Math.floor(weegee.z / CELL);
  for (let i = 0; i < weegeeCellLastVisited.length; i++) {
    weegeeCellLastVisited[i] += dt;
  }
  // Clamp so timers don't grow unboundedly
  const idx = wRow * MAZE_W + wCol;
  if (idx >= 0 && idx < weegeeCellLastVisited.length) {
    weegeeCellLastVisited[idx] = 0;
  }
}

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

  // ── Suspicion-weighted random draw ───────────────────────────────────────
  // Each candidate gets 1 base ticket. Suspicious cells (unvisited long enough)
  // get WEEGEE_SUSPICION_WEIGHT extra tickets, making them much more likely to
  // be chosen without being guaranteed — keeps the behaviour feeling organic.
  const tickets = [];
  for (const cell of pool) {
    const cellIdx = cell.r * MAZE_W + cell.c;
    const age = weegeeCellLastVisited[cellIdx] !== undefined ? weegeeCellLastVisited[cellIdx] : WEEGEE_SUSPICION_THRESHOLD;
    const weight = age >= WEEGEE_SUSPICION_THRESHOLD ? WEEGEE_SUSPICION_WEIGHT : 1;
    for (let t = 0; t < weight; t++) tickets.push(cell);
  }
  const chosen = tickets[Math.floor(Math.random() * tickets.length)];
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

function canPlushDistractWeegee() {
  if (!placedPlush || !plushDistraction.active || plushDistraction.engaged || weegee.state !== 'aggro') return false;

  const dx = placedPlush.x - weegee.x;
  const dz = placedPlush.z - weegee.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist > 4.2 || dist < 0.25) return false;

  const lookDirX = weegee.dirX || 0;
  const lookDirZ = weegee.dirZ || 0;
  const targetDirX = dx / dist;
  const targetDirZ = dz / dist;
  const dot = lookDirX * targetDirX + lookDirZ * targetDirZ;
  if (dot < 0.96) return false;

  return !isWallBetween(weegee.x, weegee.z, placedPlush.x, placedPlush.z);
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

  const plushTargetX = placedPlush ? placedPlush.x : 0;
  const plushTargetZ = placedPlush ? placedPlush.z : 0;
  const plushDx = placedPlush ? plushTargetX - weegee.x : 0;
  const plushDz = placedPlush ? plushTargetZ - weegee.z : 0;
  const plushDist = placedPlush ? Math.sqrt(plushDx*plushDx + plushDz*plushDz) : Infinity;

  if (canPlushDistractWeegee()) {
    plushDistraction.engaged = true;
    plushDistraction.t = 0;
    weegee.state = 'distracted';
    weegeeInterceptTarget = null;
    weegeeInterceptTimer = 0;
  }

  // Increased from 14 to 18 to match the larger 11×11 maze (was tuned for 8×8).
  const AGGRO_RADIUS = 18;
  let targetX, targetZ;

  if (weegee.state === 'distracted') {
    const distractedSpeed = WEEGEE_FLOOR_SPEEDS[0];
    if (plushDistraction.active && plushDistraction.engaged) {
      plushDistraction.t += dt;
      if (plushDistraction.t >= plushDistraction.duration) {
        playWeegeeEhSound();
        plushDistraction.active = false;
        plushDistraction.engaged = false;
        weegee.state = (pDist <= AGGRO_RADIUS || !isWallBetween(weegee.x, weegee.z, player.x, player.z)) ? 'aggro' : 'wander';
      }
    }

    if (plushDist > 1.2) {
      targetX = plushTargetX;
      targetZ = plushTargetZ;
    } else {
      let perpX = -plushDz;
      let perpZ = plushDx;
      const perpLen = Math.sqrt(perpX*perpX + perpZ*perpZ) || 1;
      perpX /= perpLen;
      perpZ /= perpLen;
      const sway = Math.sin(plushDistraction.t * 2.2) * 0.9;
      targetX = plushTargetX + perpX * sway;
      targetZ = plushTargetZ + perpZ * sway;
    }

    const dx = targetX - weegee.x, dz = targetZ - weegee.z;
    const dist = Math.sqrt(dx*dx + dz*dz);
    const WRAD = 0.3;
    if (dist > 0.05) {
      weegee.dirX = dx / dist;
      weegee.dirZ = dz / dist;
      const stepX = weegee.dirX * distractedSpeed * dt;
      const stepZ = weegee.dirZ * distractedSpeed * dt;
      let nx = weegee.x + stepX;
      let nz = weegee.z + stepZ;
      const blockedX = collidesWithWalls(nx, weegee.z, WRAD);
      const blockedZ = collidesWithWalls(weegee.x, nz, WRAD);
      if (!blockedX && !blockedZ) {
        weegee.x = nx;
        weegee.z = nz;
      } else if (!blockedX && blockedZ) {
        weegee.x = nx;
      } else if (blockedX && !blockedZ) {
        weegee.z = nz;
      } else {
        const slideX = weegee.x + Math.sign(stepX) * distractedSpeed * dt;
        const slideZ = weegee.z + Math.sign(stepZ) * distractedSpeed * dt;
        if (Math.abs(stepX) >= Math.abs(stepZ)) {
          if (!collidesWithWalls(slideX, weegee.z, WRAD)) {
            weegee.x = slideX;
          } else if (!collidesWithWalls(weegee.x, slideZ, WRAD)) {
            weegee.z = slideZ;
          }
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
    return;
  }

  // ── Sound-reactive investigation ─────────────────────────────────────────────
  // If Weegee heard the player recently (weegeeLastHeardCell is set) and he is
  // currently wandering or already investigating, navigate toward that cell.
  // Once he reaches it (or gets close enough for LOS to kick in), the cell is
  // cleared and he reverts to wander — or escalates straight to aggro if the
  // player is now in range.
  // Important: investigating is lower-priority than aggro. If aggro conditions
  // are met during investigation, aggro takes over immediately.
  const hasLOS = !isWallBetween(weegee.x, weegee.z, player.x, player.z);
  const inRange = pDist <= AGGRO_RADIUS;
  const shouldAggro = inRange || (weegee.state === 'aggro' && hasLOS);

  if (!shouldAggro && !hasLOS && weegeeLastHeardCell && (weegee.state === 'wander' || weegee.state === 'investigating')) {
    // Reset the timer whenever we freshly enter investigating state
    if (weegee.state !== 'investigating') weegeeInvestigateTimer = 0;
    weegee.state = 'investigating';

    weegeeInvestigateTimer += dt;

    const targetX = weegeeLastHeardCell.col * CELL + CELL / 2;
    const targetZ = weegeeLastHeardCell.row * CELL + CELL / 2;
    const investigateDx = targetX - weegee.x;
    const investigateDz = targetZ - weegee.z;
    const investigateDist = Math.sqrt(investigateDx * investigateDx + investigateDz * investigateDz);

    if (investigateDist < CELL * 0.7 || weegeeInvestigateTimer >= WEEGEE_INVESTIGATE_TIMEOUT) {
      // Reached the heard cell, or spent too long looking — give up, back to wander
      weegeeLastHeardCell = null;
      weegeeInvestigateTimer = 0;
      weegee.state = 'wander';
      weegee.targetCellX = null;
      weegee.targetCellZ = null;
    } else {
      // Navigate toward the heard cell using BFS (wall-aware, just like chase)
      const investigateTarget = bfsNextTarget(weegee.x, weegee.z, targetX, targetZ);
      const idx = investigateTarget.x - weegee.x;
      const idz = investigateTarget.z - weegee.z;
      const idist = Math.sqrt(idx * idx + idz * idz);

      if (idist > 0.05) {
        weegee.dirX = idx / idist;
        weegee.dirZ = idz / idist;
        const WRAD = 0.3;
        // Investigating speed matches wander (slowest floor speed) — he's
        // curious, not sprinting. This keeps the behaviour fair.
        const investigateSpeed = WEEGEE_FLOOR_SPEEDS[0];
        const stepX = weegee.dirX * investigateSpeed * dt;
        const stepZ = weegee.dirZ * investigateSpeed * dt;
        const nx = weegee.x + stepX;
        const nz = weegee.z + stepZ;
        const blockedX = collidesWithWalls(nx, weegee.z, WRAD);
        const blockedZ = collidesWithWalls(weegee.x, nz, WRAD);
        if (!blockedX && !blockedZ) { weegee.x = nx; weegee.z = nz; }
        else if (!blockedX) { weegee.x = nx; }
        else if (!blockedZ) { weegee.z = nz; }
        weegee.x = Math.max(WRAD, Math.min(MAZE_W * CELL - WRAD, weegee.x));
        weegee.z = Math.max(WRAD, Math.min(MAZE_H * CELL - WRAD, weegee.z));
      }
      return; // skip normal wander/aggro movement this frame
    }
  }

  if (shouldAggro) {
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
    // Dropping out of aggro — clear any stale heard cell so Weegee doesn't
    // immediately path to an old pre-aggro position instead of genuinely wandering.
    if (weegee.state === 'aggro') weegeeLastHeardCell = null;
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
  initSuspicionZones();
  weegee._subOffX = 0;
  weegee._subOffZ = 0;
  weegeeInterceptTarget = null;
  weegeeInterceptTimer = 0;
  weegeeSidestepActive   = false;
  weegeeSidestepDuration = 0;
  weegeeSidestepTimer    = 0;
  // Reset hearing system
  weegeeLastHeardCell    = null;
  weegeeHearTimer        = 0;
  weegeeInvestigateTimer = 0;
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
      playBanishScreamGlobal();
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

// ── Weegee hearing check ───────────────────────────────────────────────────────
// Called on a throttled interval (WEEGEE_HEAR_INTERVAL) so it doesn't run
// every single frame — cheap cell lookup, not a raytrace.
//
// Sound rules:
//   - Sneaking on dry floor  → completely silent, radius 0
//   - Normal walking (dry)   → heard within WEEGEE_HEAR_WALK units
//   - Puddle walking/sprinting, or dry sprint → heard within WEEGEE_HEAR_SPRINT
//   - Standing still (no movement input) → silent, no hearing update
//
// The check only writes weegeeLastHeardCell when the player IS making an
// audible sound and Weegee is within the relevant radius. It never clears the
// cell (that happens in moveWeegee when Weegee reaches the spot).
function updateWeegeeHearing() {
  // Standing still → no sound, nothing to update this tick
  const movingInput = keys['w'] || keys['s'] || keys['a'] || keys['d'] ||
                      keys['arrowup'] || keys['arrowdown'] ||
                      Math.abs(gamepadState.moveX) > 0.1 || Math.abs(gamepadState.moveY) > 0.1;
  if (!movingInput) return;

  const onPuddle = isPlayerOverPuddleDecal();

  // Determine which sound category the player is currently producing
  let hearRadius = 0;
  if (isSprinting) {
    // Sprinting on any surface — loudest, heard furthest
    hearRadius = WEEGEE_HEAR_SPRINT;
  } else if (onPuddle) {
    // Puddle footsteps betray you even while sneaking, but only at walk radius
    hearRadius = WEEGEE_HEAR_WALK;
  } else if (!isSneaking) {
    // Normal walking on a dry floor — audible but quieter
    hearRadius = WEEGEE_HEAR_WALK;
  }
  // isSneaking && !onPuddle && !isSprinting → hearRadius stays 0 (silent)

  if (hearRadius <= 0) return; // silent — Weegee hears nothing this tick

  // Radius check: is Weegee close enough to hear?
  const dx = weegee.x - player.x;
  const dz = weegee.z - player.z;
  const distSq = dx * dx + dz * dz;
  if (distSq > hearRadius * hearRadius) return; // too far

  // Record the player's current cell as the last-heard position
  weegeeLastHeardCell = {
    col: Math.max(0, Math.min(MAZE_W - 1, Math.floor(player.x / CELL))),
    row: Math.max(0, Math.min(MAZE_H - 1, Math.floor(player.z / CELL)))
  };
}

// ── One-shot sound alert ───────────────────────────────────────────────────────
// Called by loud player reaction sounds (mamafcker, woah, haha) that should
// alert Weegee regardless of movement state or the hearing interval timer.
// Always uses WEEGEE_HEAR_SPRINT radius — these are loud outbursts.
function alertWeegeeToSound() {
  if (!gameStarted || isDead || !weegeeActive) return;
  const dx = weegee.x - player.x;
  const dz = weegee.z - player.z;
  if (dx * dx + dz * dz > WEEGEE_HEAR_SPRINT * WEEGEE_HEAR_SPRINT) return;
  weegeeLastHeardCell = {
    col: Math.max(0, Math.min(MAZE_W - 1, Math.floor(player.x / CELL))),
    row: Math.max(0, Math.min(MAZE_H - 1, Math.floor(player.z / CELL)))
  };
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

  // ── Suspicion zone tick ───────────────────────────────────────────────────
  // Ages every cell's unvisited timer and resets Weegee's current cell to 0.
  // Runs every frame regardless of state so timers are always accurate.
  tickSuspicionZones(dt);

  // ── Throttled hearing check ────────────────────────────────────────────────
  // Only runs a few times per second (WEEGEE_HEAR_INTERVAL) so it's cheap
  // even when the player is constantly moving. No work done at all if Weegee
  // is in aggro (he already has the player's position), or banished/stuck.
  if (weegee.state !== 'aggro') {
    weegeeHearTimer -= dt;
    if (weegeeHearTimer <= 0) {
      weegeeHearTimer = WEEGEE_HEAR_INTERVAL;
      updateWeegeeHearing();
    }
  }

  moveWeegee(dt);
  updateWeegeeVisibility();
  if (weegeePlane.visible) updateWeegeeSprite();
}

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
  const mat = new THREE.MeshLambertMaterial({
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
  const mat = new THREE.MeshLambertMaterial({
    map: plungerProjectileTexture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, mat);

  const startY = 1.45;
  mesh.position.set(player.x, startY, player.z);
  // Face the throw direction from the start — this Y angle is frozen on impact.
  mesh.rotation.y = player.yaw;
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
      // Always face the player on Y while airborne so the sprite is visible,
      // and tilt on X to follow the arc (nose up rising, nose down falling).
      pl.mesh.rotation.y = Math.atan2(
        camera.position.x - pl.x,
        camera.position.z - pl.z
      );
      const hSpeed = Math.sqrt(pl.velX * pl.velX + pl.velZ * pl.velZ);
      pl.mesh.rotation.x = Math.atan2(-pl.velY, hSpeed) * 0.6;
    } else {
      // Stuck — hold the rotation frozen at the angle captured on impact.
      pl.mesh.rotation.x = pl.frozenRotX;
      pl.mesh.rotation.y = pl.frozenRotY;
      pl.mesh.rotation.z = pl.frozenRotZ;

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

  if (state === 'stuckFloor') {
    // Lay flat on the floor, oriented along the throw direction.
    // Nudge up by half the sprite size so it sits flush on the surface.
    pl.mesh.position.set(x, y + 0.21, z);
    pl.frozenRotX = -Math.PI / 2;
    pl.frozenRotY = Math.atan2(pl.velX, pl.velZ);
    pl.frozenRotZ = 0;
  } else if (state === 'stuckCeiling') {
    // Lay flat against the ceiling, oriented along the throw direction.
    // Nudge down by half the sprite size so it sits flush on the surface.
    pl.mesh.position.set(x, y - 0.21, z);
    pl.frozenRotX = Math.PI / 2;
    pl.frozenRotY = Math.atan2(pl.velX, pl.velZ);
    pl.frozenRotZ = 0;
  } else if (state === 'stuckWall') {
    // Lie flat against the wall face, pointing in the throw direction.
    // Nudge the sprite forward by half its size so it sits flush on the surface.
    // Find the exact wall surface by stepping from the stuck position toward
    // the wall in small increments, then place the sprite just in front of it.
    const hLen = Math.sqrt(pl.velX * pl.velX + pl.velZ * pl.velZ) || 1;
    const throwDirX = pl.velX / hLen;
    const throwDirZ = pl.velZ / hLen;
    let sx = x, sz = z;
    for (let step = 0; step < 20; step++) {
      const tx = sx + throwDirX * 0.02;
      const tz = sz + throwDirZ * 0.02;
      if (collidesWithWalls(tx, tz, 0.01)) break;
      sx = tx; sz = tz;
    }
    pl.mesh.position.set(sx, y, sz);
    pl.frozenRotX = 0;
    pl.frozenRotY = Math.atan2(pl.velX, pl.velZ);
    pl.frozenRotZ = 0;
  } else {
    // stuckWeegee — freeze whatever mid-flight angle it had.
    pl.frozenRotX = pl.mesh.rotation.x;
    pl.frozenRotY = pl.mesh.rotation.y;
    pl.frozenRotZ = pl.mesh.rotation.z;
  }

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
  } else if (itemUseAnim.type === 'plush') {
    const offScreenY = h + rSize.h + iconSize.h + 80;
    const tx = lerp(tx0, tx0, p);
    const ty = lerp(ty0, offScreenY, easeInOut(p));
    const rot = Math.sin(p * Math.PI) * 0.18;

    ctx.save();
ctx.translate(tx, ty);
ctx.rotate(rot);
safeDraw(ctx, icon, -iconSize.w/2, -rSize.h * 0.4 - iconSize.h / 2, iconSize.w, iconSize.h);
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
  } else if (itemUseAnim.type === 'shroom') {
    const txC = w * 0.5;
    const tyC = h * 0.45;
    const rp = easeInOut(Math.min(1, itemUseAnim.t / itemUseAnim.duration));
    const tx = lerp(tx0, txC, rp);
    const ty = lerp(ty0, tyC, rp);
    const scale = lerp(1, 1.35, rp);
    const alpha = 1 - Math.max(0, (itemUseAnim.t - itemUseAnim.duration * 0.8) / (itemUseAnim.duration * 0.2));

    ctx.save();
ctx.globalAlpha = alpha;
ctx.translate(tx, ty);
ctx.rotate(Math.sin(itemUseAnim.t * 10) * 0.08);
safeDraw(ctx, icon, -iconSize.w/2, -rSize.h * 0.25 - iconSize.h / 2, iconSize.w * scale, iconSize.h * scale);
safeDraw(ctx, marioHandRightImg, -rSize.w/2, -rSize.h/2, rSize.w, rSize.h);
ctx.restore();
  } else if (itemUseAnim.type === 'plush') {
    const tx = tx0;
    const offScreenY = h + rSize.h + iconSize.h + 90;
    const ty = lerp(ty0, offScreenY, easeInOut(p));
    const rot = Math.sin(p * Math.PI) * 0.18;

    ctx.save();
ctx.translate(tx, ty);
ctx.rotate(rot);
safeDraw(ctx, icon, -iconSize.w/2, -rSize.h * 0.35 - iconSize.h / 2, iconSize.w, iconSize.h);
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
  // Sneaking gets a slower, shallower bob — deliberate and creepy.
  const bobAmp  = isSprinting ? 20 : (isSneaking && moving ? 4 : (moving ? 9 : 2));
  const bobSpeed = isSprinting ? 14 : (isSneaking && moving ? 3.5 : (moving ? 8 : 1.5));
  const swayAmp = isSprinting ? 16 : (isSneaking && moving ? 3 : (moving ? 7 : 0));
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