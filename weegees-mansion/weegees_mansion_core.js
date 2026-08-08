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
      if (itemUseAnim.type === 'plush') {
        placeMarioPlush();
      }
      if (itemUseAnim.type === 'shroom') {
        shroomEffectTimeLeft = SHROOM_EFFECT_DURATION;
        shroomFadeWarningPlayed = false;
        if (typeof playPlayerWoahSound === 'function') playPlayerWoahSound();
      }
      itemUseAnim.active = false;
      itemUseAnim.t = 0;
      itemUseAnim.chugging = false;
      stopDewChugSound();
      updateHandItem();
    }
  }

  if (placedPlush && placedPlush.mesh) {
    placedPlush.mesh.rotation.y = camera.rotation.y;
  }

  let shroomSwayX = 0;
  let shroomSwayZ = 0;
  let shroomSwayY = 0;

  if (handMesh && handMesh.material.visible) {
    const moving = keys['w']||keys['s']||keys['a']||keys['d']||keys['arrowup']||keys['arrowdown']||keys['arrowleft']||keys['arrowright'] || (Math.abs(gamepadState.moveX) > 0.05 || Math.abs(gamepadState.moveY) > 0.05);
    const bSpeed = isSprinting ? 12 : (isSneaking && moving ? 3.5 : (moving ? 7 : 2));
    const bAmt = isSprinting ? 0.03 : (isSneaking && moving ? 0.008 : (moving ? 0.015 : 0.003));
    handMesh.position.y = -0.22 + Math.sin(elapsed * bSpeed) * bAmt;
    handMesh.position.x = 0.28 + Math.cos(elapsed * bSpeed * 0.5) * (bAmt * 0.6);
  }

  if (playerLight) {
    playerLight.position.set(player.x, 1.5, player.z);
  }

  if (shroomEffectTimeLeft > 0) {
    const fadeFactor = Math.min(1, shroomEffectTimeLeft / SHROOM_EFFECT_FADE);
    const activeFactor = shroomEffectTimeLeft > SHROOM_EFFECT_FADE ? 1 : fadeFactor;
    // Stronger, less linear sway while under the Shroom effect
    const swayAmpBase = 0.06;         // base amplitude (world radians)
    const swaySpeedBase = 2.6;        // base angular speed
    const swayAmp = swayAmpBase * Math.pow(activeFactor, 0.95);
    const swaySpeed = swaySpeedBase * (0.8 + 0.4 * activeFactor);
    shroomSwayZ = Math.sin(elapsed * swaySpeed) * swayAmp;
    shroomSwayX = Math.cos(elapsed * swaySpeed * 0.9) * swayAmp * 0.6;
    // Add a yaw sway so camera turns left/right slightly (harder to aim)
    shroomSwayY = Math.sin(elapsed * swaySpeed * 0.7) * swayAmp * 0.5;

    const hue = 200 + Math.sin(elapsed * 1.1) * 40;
    const contrast = 1 + 0.4 * activeFactor;
    const saturate = 1 + 2.0 * activeFactor;
    const brightness = 1 + 0.06 * activeFactor;
    const sceneFilter = `hue-rotate(${hue}deg) saturate(${saturate}) contrast(${contrast}) brightness(${brightness}) blur(0px)`;
    const handsColorize = 0.5 + 0.5 * activeFactor;
    const handsFilter = `sepia(${handsColorize}) saturate(${2.2 + 1.8 * activeFactor}) hue-rotate(${hue}deg) contrast(${contrast}) brightness(${brightness}) blur(0px)`;

    overlayEl.style.backdropFilter = sceneFilter;
    overlayEl.style.filter = sceneFilter;
    overlayEl.style.background = `rgba(255,255,255,${0.02 * activeFactor})`;
    if (armsCanvas) {
      armsCanvas.style.filter = handsFilter;
      armsCanvas.style.opacity = String(activeFactor);
    }

    if (playerLight) {
      playerLight.intensity = PLAYER_LIGHT_BASE_INTENSITY + (PLAYER_LIGHT_MAX_INTENSITY - PLAYER_LIGHT_BASE_INTENSITY) * activeFactor;
    }
    if (ambientLight) {
      ambientLight.intensity = AMBIENT_LIGHT_BASE_INTENSITY + (AMBIENT_LIGHT_MAX_INTENSITY - AMBIENT_LIGHT_BASE_INTENSITY) * activeFactor;
    }

    if (shroomEffectTimeLeft <= SHROOM_EFFECT_FADE && shroomEffectTimeLeft > 0 && !shroomFadeWarningPlayed) {
      shroomFadeWarningPlayed = true;
      if (typeof playPlayerShiverSound === 'function') playPlayerShiverSound();
    }

    shroomEffectTimeLeft = Math.max(0, shroomEffectTimeLeft - dt);
    if (shroomEffectTimeLeft === 0) {
      overlayEl.style.backdropFilter = '';
      overlayEl.style.filter = '';
      overlayEl.style.background = 'rgba(0,0,0,0)';
      if (armsCanvas) {
        armsCanvas.style.filter = '';
        armsCanvas.style.opacity = '1';
      }
      if (playerLight) {
        playerLight.intensity = PLAYER_LIGHT_BASE_INTENSITY;
      }
      if (ambientLight) {
        ambientLight.intensity = AMBIENT_LIGHT_BASE_INTENSITY;
      }
    }
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
    // Match the camera's smooth sneak drop so the beam stays at eye level
    // whether standing or crouching. player._sneakCamY is the same interpolated
    // value the camera uses, so the two always stay perfectly in sync.
    const flashlightY = 1.55 - (player._sneakCamY || 0);
    flashlight.position.set(player.x, flashlightY, player.z);
    
    const lookX = -Math.sin(player.yaw) * Math.cos(player.pitch);
    const lookY = Math.sin(player.pitch);
    const lookZ = -Math.cos(player.yaw) * Math.cos(player.pitch);
    flashlight.target.position.set(player.x + lookX, flashlightY + lookY, player.z + lookZ);

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
  const onPuddle = isPlayerOverPuddleDecal();
  const usePuddleSounds = currentlyWalking && onPuddle;

  // While sneaking on a dry floor the player is silent — no normal footsteps.
  // Puddle footsteps always play even while sneaking (wet floors give you away).
  const dryFootstepsAudible = currentlyWalking && !usePuddleSounds && !isSneaking;

  // Sprint footsteps are louder so Weegee can hear them further away.
  // Volume 1.0 = normal, 1.3 = sprint boost (clamped by the Audio API to 1.0
  // on most browsers, but the intent is read by the hearing-radius logic in
  // moveWeegee, not just the audible volume — the volume nudge is a nice extra).
  const sprintVolBoost = isSprinting ? 1.3 : 1.0;

  if (currentlyWalking) {
    if (!isWalking) {
      isWalking = true;
      footstepsAudio.currentTime = 0;
      puddleFootstepsAudio.currentTime = 0;
    }

    if (usePuddleSounds) {
      // Puddle sounds: always play, even while sneaking. Sprint = louder + faster.
      if (puddleFootstepsAudio.paused) {
        puddleFootstepsAudio.play().catch(err => console.warn(err));
      }
      puddleFootstepsAudio.playbackRate = isSprinting ? 1.7 : (isSneaking ? 0.8 : 1.1);
      puddleFootstepsAudio.volume = Math.min(1, isSprinting ? 1.3 : 1.0);
      if (!footstepsAudio.paused) footstepsAudio.pause();
    } else if (dryFootstepsAudible) {
      // Dry floor, not sneaking: normal footsteps. Sprint = louder + faster.
      if (footstepsAudio.paused) {
        footstepsAudio.play().catch(err => console.warn(err));
      }
      footstepsAudio.playbackRate = isSprinting ? 1.5 : 1.0;
      footstepsAudio.volume = Math.min(1, sprintVolBoost);
      if (!puddleFootstepsAudio.paused) puddleFootstepsAudio.pause();
    } else {
      // Sneaking on dry floor: completely silent footsteps.
      if (!footstepsAudio.paused) footstepsAudio.pause();
      if (!puddleFootstepsAudio.paused) puddleFootstepsAudio.pause();
    }
  } else {
    if (isWalking) {
      isWalking = false;
      footstepsAudio.pause();
      puddleFootstepsAudio.pause();
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

  // Camera drops while sneaking (crouch effect). Sneak height transitions
  // smoothly by tracking a sneak target — no jarring pop when pressing Ctrl.
  if (typeof player._sneakCamY === 'undefined') player._sneakCamY = 0;
  const sneakTargetDrop = (isSneaking && !playerSlipState.active) ? SNEAK_CAMERA_DROP : 0;
  player._sneakCamY += (sneakTargetDrop - player._sneakCamY) * Math.min(1, dt * 12);
  camera.position.set(
    player.x,
    1.55 - player._sneakCamY + computeViewBob(elapsed, currentlyWalking && !playerSlipState.active && !isSneaking) - playerSlipState.heightDrop,
    player.z
  );
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  // Apply Shroom yaw sway (makes horizontal look oscillate while tripping)
  if (shroomSwayY) camera.rotation.y += shroomSwayY;
  // During slip: pitch is set by updatePlayerSlip, not clamped here
  camera.rotation.x = player.pitch + shroomSwayX;
  // Sneaking gets a gentler tilt — no sprint-sway while crouched
  camera.rotation.z = (playerSlipState.active
    ? playerSlipState.roll
    : (currentlyWalking && !isSneaking ? Math.sin(elapsed * (isSprinting ? 14 : 8)) * (isSprinting ? 0.022 : 0.01) : 0)) + shroomSwayZ;

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

// ── e.code → keys[] alias map ─────────────────────────────────────────────
// Using e.code (physical key, modifier-blind) for all tracked keys ensures
// the set/clear paths in keydown/keyup are always symmetric — a key can only
// be cleared in keyup if it was set in keydown via the exact same code path.
// Space is sneak (toggle on keydown); restart on death screen is also Space
// but handled separately before the sneak toggle so isDead always wins.
const CODE_TO_KEY = {
  'KeyW': 'w', 'KeyA': 'a', 'KeyS': 's', 'KeyD': 'd',
  'ArrowUp': 'arrowup', 'ArrowDown': 'arrowdown',
  'ArrowLeft': 'arrowleft', 'ArrowRight': 'arrowright',
  'ShiftLeft': 'shift', 'ShiftRight': 'shift',
  'KeyF': 'f', 'KeyQ': 'q', 'KeyP': 'p',
  'Digit1': '1', 'Digit2': '2', 'Digit3': '3', 'Digit4': '4', 'Digit5': '5',
};

document.addEventListener('keydown', e => {
  // ── Key state: use e.code (physical key, modifier-blind) for ALL tracked
  // keys so the set/clear paths in keydown/keyup are always symmetric.
  const codeKey = CODE_TO_KEY[e.code];
  if (codeKey) {
    keys[codeKey] = true;
  } else {
    // Non-movement keys (digits, etc.) still use e.key as a fallback,
    // only for keys not in CODE_TO_KEY so there's no double-write.
    keys[e.key.toLowerCase()] = true;
  }

  // Space on the death screen restarts — checked first so isDead always wins
  // over the sneak toggle below.
  if (e.code === 'Space' && isDead) {
    restartGame();
    return;
  }

  // Space in-game toggles sneak (like D-pad down on gamepad).
  // Sneak and sprint are mutually exclusive — sneak wins.
  if (e.code === 'Space' && gameStarted && !isDead && !isPaused) {
    keys['sneak'] = !keys['sneak'];
    if (keys['sneak'] && keys['shift']) keys['shift'] = false;
  }

  if (e.code === 'KeyF') {
    toggleFlashlight();
  }

  if(['1','2','3','4','5'].includes(e.key)) {
    selectedSlot = parseInt(e.key) - 1;
    updateInventoryUI();
  }

  if(e.code === 'KeyQ') {
    tryPickupItem();
  }

  if(e.code === 'KeyP') {
    togglePause();
  }

  if ((e.code === 'ArrowUp' || e.code === 'KeyW') && !isDead && gameStarted && !isPaused) {
    for (const s of stairPositions) {
      const dx = s.x - player.x, dz = s.z - player.z;
      if (dx*dx + dz*dz < 1.44) {
        climbStairs();
        break;
      }
    }
  }
});
document.addEventListener('keyup', e => {
  // Mirror the keydown logic exactly: clear via e.code for tracked keys,
  // fall back to e.key only for keys not in CODE_TO_KEY.
  // This guarantees keyup can never clear a key that keydown never set.
  // Space is a toggle (handled in keydown) so keyup deliberately does nothing for it.
  if (e.code === 'Space') return;
  const codeKey = CODE_TO_KEY[e.code];
  if (codeKey) {
    keys[codeKey] = false;
  } else {
    keys[e.key.toLowerCase()] = false;
  }
});

// Clear all held key state on window blur so nothing gets stuck.
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });


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
  // When the player is dead or the game is paused the normal gameLoop
  // early-returns before calling renderer.render(), so the canvas goes black
  // after a fullscreen toggle. Force one render here so the 3D scene stays
  // visible behind the death / pause / victory overlay screens.
  if (scene && camera && renderer && (isDead || isPaused)) {
    renderer.render(scene, camera);
  }
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
  weegeeActive = false;
  shroomEffectTimeLeft = 0;
  isSneaking = false;
  if (typeof player._sneakCamY !== 'undefined') player._sneakCamY = 0;
  weegeeLastHeardCell = null;
  weegeeHearTimer = 0;

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
  if (typeof armsCanvas !== 'undefined' && armsCanvas) {
    armsCanvas.style.filter = '';
    armsCanvas.style.opacity = '1';
  }

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
    const fl = new THREE.PointLight(0xffddaa, PLAYER_LIGHT_BASE_INTENSITY, 18);
    fl.position.set(player.x, 1.5, player.z);
    scene.add(fl);
    playerLight = fl;
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

overlayEl = document.getElementById('overlay');
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
      // Reset the master gain node so it isn't stuck at 0 from the death
      // pause, then resume the rain loop now that gameStarted is true again.
      if (wxMasterGain) wxMasterGain.gain.value = 0.18;
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
      gamepadState.sneakToggle = false;
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
    // DPAD_DOWN toggles sneak (mirrors how Circle toggles sprint — no need to hold)
    if (justPressed(BTN.DPAD_DOWN)) {
      if (inGame) {
        gamepadState.sneakToggle = !gamepadState.sneakToggle;
        // Sneak and sprint are mutually exclusive — sneak wins
        if (gamepadState.sneakToggle && gamepadState.sprintToggle) {
          gamepadState.sprintToggle = false;
        }
      } else {
        gamepadState.sneakToggle = false;
      }
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