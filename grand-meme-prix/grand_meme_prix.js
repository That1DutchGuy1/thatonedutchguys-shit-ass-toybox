const cannonReady = import('../cannon-es.js');
let CannonBody = null;
let CannonSphere = null;
let CannonVec3 = null;
let CannonWorld = null;
cannonReady.then(({ Body, Sphere, Vec3, World }) => {
  CannonBody = Body;
  CannonSphere = Sphere;
  CannonVec3 = Vec3;
  CannonWorld = World;
});

// =============================================
// MEME CHARACTERS ARRAY — add new ones easily!
// Just drop PNG files next to the HTML and add entries here.
// =============================================
const CHARACTERS = [
  // color      = kart body colour in the 3D scene (Three.js hex, lit by scene lighting)
  // lightbarColor = DS4 lightbar LED colour, separate from the kart colour.
  { name: "Mama Luigi",    img: "assets/Mama-Luigi.png",     color: 0x228B22, lightbarColor: 0x00FF00, voicelines: ['assets/voicelines/mama-luigi-hit.mp3', 'assets/voicelines/mama-luigi-win.mp3', 'assets/voicelines/mama-luigi-lose.mp3'] }, // vivid green
  { name: "King Harkinian",img: "assets/King-Harkinian.png", color: 0xDAA520, lightbarColor: 0xFF8C00, voicelines: ['assets/voicelines/king-harkinian-hit.mp3', 'assets/voicelines/king-harkinian-win.mp3', 'assets/voicelines/king-harkinian-lose.mp3'] }, // bright orange-gold
  { name: "Doge",          img: "assets/Doge.png",           color: 0xCBB987, lightbarColor: 0xFFDD44, voicelines: ['assets/voicelines/doge-hit.mp3', 'assets/voicelines/doge-win.mp3', 'assets/voicelines/doge-lose.mp3'] }, // warm yellow
  { name: "Gwonam",        img: "assets/Gwonam.png",         color: 0x8A45A1, lightbarColor: 0xCC00FF, voicelines: ['assets/voicelines/gwonam-hit.mp3', 'assets/voicelines/gwonam-win.mp3', 'assets/voicelines/gwonam-lose.mp3'] }, // vivid purple
  { name: "Zelda",         img: "assets/Zelda.png",          color: 0xFF00AA, lightbarColor: 0xFF00CC, voicelines: ['assets/voicelines/zelda-hit.mp3', 'assets/voicelines/zelda-win.mp3', 'assets/voicelines/zelda-lose.mp3'] }, // hot pink
  { name: "Longcat",       img: "assets/Longcat.png",        color: 0xDEDEDE, lightbarColor: 0xDEDEDE, voicelines: ['assets/voicelines/longcat-hit.mp3', 'assets/voicelines/longcat-win.mp3', 'assets/voicelines/longcat-lose.mp3'] }, // creamy white
  { name: "Rick Astley",   img: "assets/Rick-Astley.png",    color: 0x363030, lightbarColor: 0x363030, voicelines: ['assets/voicelines/rick-astley-hit.mp3', 'assets/voicelines/rick-astley-win.mp3', 'assets/voicelines/rick-astley-lose.mp3'] }, // almost black
  { name: "Weegee",        img: "assets/Weegee.png",         color: 0x4c7e66, lightbarColor: 0x33cc66, voicelines: ['assets/voicelines/weegee-hit.mp3', 'assets/voicelines/weegee-win.mp3', 'assets/voicelines/weegee-lose.mp3'] }, // emerald green (distinct from Mama Luigi green)
  { name: "Morshu",        img: "assets/Morshu.png",         color: 0xFF8000, lightbarColor: 0xFFA500, voicelines: ['assets/voicelines/morshu-hit.mp3', 'assets/voicelines/morshu-win.mp3', 'assets/voicelines/morshu-lose.mp3'] }, // orange
  { name: "Malleo",        img: "assets/Malleo.png",         color: 0xb30c0c, lightbarColor: 0xFF0000, voicelines: ['assets/voicelines/malleo-hit.mp3', 'assets/voicelines/malleo-win.mp3', 'assets/voicelines/malleo-lose.mp3'] }, // red
  { name: "Mayor Cravendish", img: "assets/Mayor-Cravendish.png", color: 0x0fa4c8, lightbarColor: 0x0000FF, voicelines: ['assets/voicelines/mayor-cravendish-hit.mp3', 'assets/voicelines/mayor-cravendish-win.mp3', 'assets/voicelines/mayor-cravendish-lose.mp3'] }, // blue
];

// =============================================
// HALL OF MEMES — floating space background sprites on the main menu
// Just use various assets from across all game folders to avoid duplicating assets.
// =============================================
const HALL_OF_MEMES = [
  { img: "../meme-claw-machine/memes/Doge.png" },
  { img: "../weegees-mansion/Weegee-Sprites/Weegee_Left.png" },
  { img: "../meme-claw-machine/memes/Rickroll.png" },
  { img: "../meme-claw-machine/memes/Longcat.png" },
  { img: "../meme-claw-machine/memes/Morshu-CD-i.png" },
  { img: "../meme-claw-machine/memes/Malleo.png" },
  { img: "../meme-claw-machine/memes/Mama-Luigi.png" },
  { img: "../meme-claw-machine/memes/King-Harkinian-CD-i.png" },
  { img: "../meme-claw-machine/memes/Zelda-CD-i.png" },
  { img: "../meme-claw-machine/memes/Gwonam-CD-i.png" },
  { img: "../meme-claw-machine/memes/Michael-Rosen.png" },
  { img: "../meme-claw-machine/memes/Mayor-Cravendish.png" },
  { img: "../meme-claw-machine/memes/Pingas.png" },
  { img: "../meme-claw-machine/memes/Shoop-Da-Whoop.png" },
  { img: "../meme-claw-machine/memes/Trollface.png" },
  { img: "../meme-claw-machine/memes/NyanCat.png" },
  { img: "../meme-claw-machine/memes/Link-CD-i.png" },
  { img: "../meme-claw-machine/memes/Ganon-CD-i.png" },
  { img: "../meme-claw-machine/memes/Sanic.png" },
  { img: "../meme-claw-machine/memes/HotelMarioMario.png" },
  { img: "../meme-claw-machine/memes/HotelMarioLuigi.png" },
  { img: "../big-meme-quiz/assets/memes/leeroy-jenkins.png" },
  { img: "../big-meme-quiz/assets/memes/peanut-butter-jelly-time.png" },
  { img: "../meme-claw-machine/memes/Bad-Luck-Brian.png"}
];

// =============================================
// SETTINGS  (persisted to localStorage)
// =============================================
const SETTINGS_KEY = 'gmp_settings_v1';
const settings = (() => {
  const defaults = { musicVol: 35, sfxVol: 70, voicelineVol: 100, shadows: false };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    return Object.assign({}, defaults, saved);
  } catch { return { ...defaults }; }
})();

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
}

// Called whenever a slider / toggle changes
function onSettingChange() {
  const musicSlider      = document.getElementById('settingMusicVol');
  const sfxSlider        = document.getElementById('settingSfxVol');
  const voicelineSlider  = document.getElementById('settingVoicelineVol');
  const shadowToggle     = document.getElementById('settingShadows');

  settings.musicVol      = parseInt(musicSlider.value,     10);
  settings.sfxVol        = parseInt(sfxSlider.value,       10);
  settings.voicelineVol  = parseInt(voicelineSlider.value, 10);
  settings.shadows       = shadowToggle.checked;

  // Update slider gradient fill
  updateSliderFill(musicSlider);
  updateSliderFill(sfxSlider);
  updateSliderFill(voicelineSlider);
  document.getElementById('settingMusicValLabel').textContent     = settings.musicVol;
  document.getElementById('settingSfxValLabel').textContent       = settings.sfxVol;
  document.getElementById('settingVoicelineValLabel').textContent = settings.voicelineVol;

  applySettings();
  saveSettings();
}

function updateSliderFill(slider) {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.setProperty('--pct', pct + '%');
  // For browsers that don't support CSS vars on range, fall back to background
  slider.style.background =
    `linear-gradient(to right, #FFD700 0%, #FFD700 ${pct}%, rgba(255,255,255,0.15) ${pct}%, rgba(255,255,255,0.15) 100%)`;
}

// Push current settings values into the live game
function applySettings() {
  // Music (MP3 background track)
  if (typeof bgmEl !== 'undefined' && bgmEl) bgmEl.volume = settings.musicVol / 100;
  // Win sound (MP3)
  if (typeof winSoundEl !== 'undefined' && winSoundEl) winSoundEl.volume = settings.sfxVol / 100;
  activeSfxAudio.forEach(el => { el.volume = settings.sfxVol / 100; });
  // One-shot Web Audio SFX (countdown, slip, shell, launch sounds)
  if (sfxMasterGain) sfxMasterGain.gain.value = settings.sfxVol / 100;
  // Engine synth — masterGain nodes are stored on each voice
  if (typeof engineVoices !== 'undefined') {
    engineVoices.forEach(v => {
      if (v && v.masterGain) v.masterGain.gain.value = (settings.sfxVol / 100) * 0.12;
    });
  }
  // Shadows — THREE.js does NOT support toggling shadowMap.enabled after first render.
  // The correct runtime kill-switch is light.castShadow: when false, Three.js skips the
  // entire shadow-map render pass for that light (zero extra GPU draw calls).
  // We also sync castShadow/receiveShadow on meshes so no stale shadow artifacts linger.
  if (typeof scenes !== 'undefined' && scenes.length) {
    scenes.forEach(scene => {
      scene.traverse(obj => {
        if (obj.isDirectionalLight || obj.isSpotLight || obj.isPointLight) {
          obj.castShadow = settings.shadows;
        }
        if (obj.isMesh) {
          obj.castShadow    = settings.shadows;
          obj.receiveShadow = settings.shadows;
        }
      });
    });
  }
}

function openSettings() {
  // Sync UI to current settings values
  const musicSlider     = document.getElementById('settingMusicVol');
  const sfxSlider       = document.getElementById('settingSfxVol');
  const voicelineSlider = document.getElementById('settingVoicelineVol');
  const shadowToggle    = document.getElementById('settingShadows');
  musicSlider.value     = settings.musicVol;
  sfxSlider.value       = settings.sfxVol;
  voicelineSlider.value = settings.voicelineVol;
  shadowToggle.checked  = settings.shadows;
  document.getElementById('settingMusicValLabel').textContent     = settings.musicVol;
  document.getElementById('settingSfxValLabel').textContent       = settings.sfxVol;
  document.getElementById('settingVoicelineValLabel').textContent = settings.voicelineVol;
  updateSliderFill(musicSlider);
  updateSliderFill(sfxSlider);
  updateSliderFill(voicelineSlider);

  document.getElementById('screenModeSelect').style.display = 'none';
  document.getElementById('screenSettings').style.display   = 'flex';
}

function closeSettings() {
  document.getElementById('screenSettings').style.display   = 'none';
  document.getElementById('screenModeSelect').style.display = 'flex';
}

function resetSettings() {
  settings.musicVol     = 35;
  settings.sfxVol       = 70;
  settings.voicelineVol = 100;
  settings.shadows      = false;

  // Sync UI sliders and toggle to the reset values
  const musicSlider     = document.getElementById('settingMusicVol');
  const sfxSlider       = document.getElementById('settingSfxVol');
  const voicelineSlider = document.getElementById('settingVoicelineVol');
  const shadowToggle    = document.getElementById('settingShadows');
  musicSlider.value     = settings.musicVol;
  sfxSlider.value       = settings.sfxVol;
  voicelineSlider.value = settings.voicelineVol;
  shadowToggle.checked  = settings.shadows;
  document.getElementById('settingMusicValLabel').textContent     = settings.musicVol;
  document.getElementById('settingSfxValLabel').textContent       = settings.sfxVol;
  document.getElementById('settingVoicelineValLabel').textContent = settings.voicelineVol;
  updateSliderFill(musicSlider);
  updateSliderFill(sfxSlider);
  updateSliderFill(voicelineSlider);

  applySettings();
  saveSettings();
}

// =============================================
// PLAYER STATE
// =============================================
let playerChars = [0, 1 % CHARACTERS.length, 2 % CHARACTERS.length, 3 % CHARACTERS.length];
let gameMode = 'coop';
let soloAI = null;         // legacy single-AI state (kept for compatibility)
let soloAIs = [];          // array of AI personality objects, one per CPU
let soloNumCPUs = 1;       // 1-3 CPUs in solo mode

function changeChar(player, dir) {
  playerChars[player] = (playerChars[player] + dir + CHARACTERS.length) % CHARACTERS.length;
  updateCharUI();
  // Update lightbar live if this player is using a gamepad
  const usingGp = (gameMode === 'solo' && player === 0 && soloInputMethod === 'gamepad')
               || (gameMode === 'coop' && coopInputMethods[player] === 'gamepad');
  if (usingGp) menuLightbarUpdate(player);
}

function updateCharUI() {
  const c0 = CHARACTERS[playerChars[0]];
  const c1 = CHARACTERS[playerChars[1]];
  const p1img = document.getElementById('p1img');
  const p1name = document.getElementById('p1name');
  const p2img = document.getElementById('p2img');
  const p2name = document.getElementById('p2name');
  const p1imgCoop = document.getElementById('p1img_co');
  const p1nameCoop = document.getElementById('p1name_co');
  const p2imgCoop = document.getElementById('p2img_co');
  const p2nameCoop = document.getElementById('p2name_co');
  if (p1img) p1img.src = c0.img;
  if (p1name) p1name.textContent = c0.name;
  if (p2img) p2img.src = '';
  if (p2name) p2name.textContent = '???';
  if (p1imgCoop) p1imgCoop.src = c0.img;
  if (p1nameCoop) p1nameCoop.textContent = c0.name;
  if (p2imgCoop) p2imgCoop.src = c1.img;
  if (p2nameCoop) p2nameCoop.textContent = c1.name;
  // Update CPU count selector display
  const cpuCountEl = document.getElementById('cpuCountDisplay');
  if (cpuCountEl) cpuCountEl.textContent = soloNumCPUs;
}

function changeCPUCount(dir) {
  soloNumCPUs = Math.max(1, Math.min(3, soloNumCPUs + dir));
  updateCharUI();
}

// =============================================
// INPUT METHOD STATE
// =============================================
// Solo: 'keyboard' | 'gamepad'
// Coop: each player independently 'keyboard' | 'gamepad'
let soloInputMethod = 'keyboard';
let coopInputMethods = ['keyboard', 'gamepad']; // P1, P2

// Gamepad index assignments: null = unassigned
// In solo gamepad mode, gpAssign[0] = pad index for P1
// In coop, gpAssign[0] = P1 pad, gpAssign[1] = P2 pad
const gpAssign = [null, null];

// ── Coop dual-gamepad first-press P1 claim ────────────────────────────────
// When both players pick gamepad in coop mode, the first pad to fire a button
// press claims P1. We poll every frame (rAF) until both slots are claimed.
let _coopGpClaimActive = false;     // true while the polling loop is running
let _coopGpClaimedP1   = null;      // pad index that claimed P1 (or null)
let _coopGpClaimRafId  = null;      // rAF handle so we can cancel it

// ── Event-based gamepad registry ──────────────────────────────────────────
// On Linux (Chrome/Chromium) getGamepads() returns an empty array until the
// browser fires a 'gamepadconnected' event — which only happens after the
// user presses a physical button. Polling at race-start therefore always sees
// zero pads if the player hasn't wiggled the stick yet.
//
// Fix: maintain a live Set of known-connected pad indices updated by the two
// browser events. assignGamepads() reads from here instead of cold-polling.
const _connectedPadIndices = new Set();

window.addEventListener('gamepadconnected', (e) => {
  _connectedPadIndices.add(e.gamepad.index);
  console.log(`[GMP] gamepadconnected — index=${e.gamepad.index} id="${e.gamepad.id}" mapping="${e.gamepad.mapping}"`);
  updateGamepadReadyUI(); // live-update hint to "Controller ready ✓"
});

window.addEventListener('gamepaddisconnected', (e) => {
  _connectedPadIndices.delete(e.gamepad.index);
  console.log(`[GMP] gamepaddisconnected — index=${e.gamepad.index}`);
});

// ── DS4 Lightbar via WebHID ───────────────────────────────────────────────
//
// The Web Gamepad API has no lightbar method. WebHID is the only browser API
// that lets us send HID output reports to the DS4 to control the light bar.
//
// HOW IT WORKS:
//   1. When the player picks gamepad mode, we call ds4Lightbar.request() which
//      calls navigator.hid.requestDevice() — this shows Chrome's one-time
//      permission picker. The user selects their DS4 and we cache the HIDDevice.
//      The permission persists across reloads for this origin.
//   2. ds4Lightbar.setColor(r, g, b) sends a 32-byte wired USB output report
//      (report ID 0x05) or 79-byte BT report (0x11), with R/G/B at the right
//      offsets. We auto-detect USB vs BT from the HIDDevice.collections info.
//   3. ds4Lightbar.reset() sets the bar back to the DS4's default blue.
//   4. If WebHID is absent (Firefox, Safari) or the user denies, we silently
//      skip — the game works fine without it.
//
// DS4 USB output report 0x05 (32 bytes):
//   [0]=0x05  [1]=0xff (enable rumble+lightbar)  [2-3]=0x00
//   [4]=rightRumble  [5]=leftRumble
//   [6]=R  [7]=G  [8]=B
//   [9]=flashOn  [10]=flashOff  [11-31]=0x00
//
// DS4 BT output report 0x11 (79 bytes):
//   [0]=0x11  [1]=0xc0  [2]=0x20  [3]=0xf3  [4]=0x04
//   [5]=rightRumble  [6]=leftRumble
//   [7]=0x00  [8]=R  [9]=G  [10]=B  [rest]=0x00
//
// Sony VID 0x054C, DS4 PIDs: 0x05C4 (original) and 0x09CC (v2/slim).

const ds4Lightbar = (() => {
  const SONY_VID  = 0x054C;
  const DS4_PIDS  = new Set([0x05C4, 0x09CC]);

  // Map from gamepad index → { device: HIDDevice, isBT: boolean }
  const _devices = new Map();

  // Parse "Vendor: 054c Product: 09cc" out of a gamepad.id string.
  function _parseVidPid(gpId) {
    const m = gpId.match(/Vendor:\s*([0-9a-f]+)\s+Product:\s*([0-9a-f]+)/i);
    if (!m) return null;
    return { vid: parseInt(m[1], 16), pid: parseInt(m[2], 16) };
  }

  // Is this HIDDevice a DS4?
  function _isDS4(dev) {
    return dev.vendorId === SONY_VID && DS4_PIDS.has(dev.productId);
  }

  // Detect USB vs BT: USB exposes report ID 0x05 in its collections.
  function _isBluetooth(dev) {
    for (const col of dev.collections) {
      for (const out of (col.outputReports || [])) {
        if (out.reportId === 0x05) return false; // USB report present
      }
    }
    return true; // assume BT
  }

  // Build the output buffer and send it.
  async function _send(dev, isBT, r, g, b) {
    let reportId, data;
    if (!isBT) {
      // Wired USB — 32 bytes (excluding the report ID byte Chrome prepends)
      data = new Uint8Array(31);
      data[0] = 0xff; // enable rumble + lightbar flags
      data[5] = r;
      data[6] = g;
      data[7] = b;
      reportId = 0x05;
    } else {
      // Bluetooth — 78 bytes (excluding report ID)
      data = new Uint8Array(78);
      data[0] = 0xc0;
      data[1] = 0x20;
      data[2] = 0xf3;
      data[3] = 0x04;
      data[7] = r;
      data[8] = g;
      data[9] = b;
      reportId = 0x11;
    }
    try {
      await dev.sendReport(reportId, data);
    } catch (e) {
      console.warn('[GMP] lightbar sendReport failed:', e);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────

  // Ensure the HIDDevice for the DS4 at gpIndex is open and cached.
  // Separated from setColorHex so the early-exit only skips the open/request
  // steps — NOT the colour update — when the device is already known.
  // Must be called from a user-gesture context (startGame click qualifies).
  async function _ensureDevice(gpIndex) {
    if (!navigator.hid) return false;
    if (gpIndex === null || gpIndex === undefined) return false;

    // If already cached, nothing to do — device stays open across races.
    if (_devices.has(gpIndex)) return true;

    // Try to confirm this is a DS4 via the Gamepad API. On Linux (Chrome/Chromium)
    // getGamepads() returns an empty array after a page reload until the user presses
    // a physical button — so gp may be null here even though the pad is connected.
    // In that case we skip the VID/PID pre-check and let hid.getDevices() decide;
    // if a DS4 HID permission was granted in a prior session it will appear there.
    const gp = (navigator.getGamepads ? navigator.getGamepads() : [])[gpIndex];
    if (gp) {
      const ids = _parseVidPid(gp.id);
      if (!ids || ids.vid !== SONY_VID || !DS4_PIDS.has(ids.pid)) {
        console.log('[GMP] Lightbar: pad is not a DS4, skipping WebHID request.');
        return false;
      }
    }
    // If gp is null (Linux reload before first button press) we fall through and
    // try the HID permission path — worst case requestDevice shows the picker and
    // the user can dismiss it; we catch that below.

    // Check if we already have permission for this device from a prior session.
    let devices = await navigator.hid.getDevices();
    let dev = devices.find(_isDS4);

    if (!dev) {
      // Ask the user to pick their DS4 — one-time permission prompt.
      try {
        const granted = await navigator.hid.requestDevice({
          filters: [{ vendorId: SONY_VID }]
        });
        dev = granted.find(_isDS4);
      } catch (e) {
        console.log('[GMP] Lightbar: WebHID permission denied or dismissed.', e);
        return false;
      }
    }

    if (!dev) return false;

    if (!dev.opened) {
      try { await dev.open(); }
      catch (e) {
        console.warn('[GMP] Lightbar: could not open HID device:', e);
        return false;
      }
    }

    const isBT = _isBluetooth(dev);
    _devices.set(gpIndex, { dev, isBT });
    console.log(`[GMP] Lightbar ready — gpIndex=${gpIndex} BT=${isBT} pid=0x${dev.productId.toString(16)}`);
    return true;
  }

  // Request WebHID access for the DS4 at gpIndex, then immediately set its colour.
  // Keeps _ensureDevice (open/cache) separate from the colour update so that
  // subsequent races always apply the new character colour even when the device
  // is already cached from a prior race.
  async function request(gpIndex, colorHex) {
    const ready = await _ensureDevice(gpIndex);
    if (ready && colorHex !== undefined) await setColorHex(gpIndex, colorHex);
  }

  // Set the lightbar colour for the pad at gpIndex. r/g/b are 0-255.
  async function setColor(gpIndex, r, g, b) {
    const entry = _devices.get(gpIndex);
    if (!entry) return;
    await _send(entry.dev, entry.isBT, r, g, b);
  }

  // Set the lightbar from a Three.js / hex colour integer (e.g. 0xFF00AA).
  async function setColorHex(gpIndex, hex) {
    await setColor(gpIndex, (hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff);
  }

  // Reset to DS4 default blue.
  async function reset(gpIndex) {
    await setColor(gpIndex, 0, 0, 64);
  }

  // Reset all known pads (call on backToMenu).
  async function resetAll() {
    for (const [idx] of _devices) await reset(idx);
  }

  return { request, setColor, setColorHex, reset, resetAll };
})();

// Reset the DS4 lightbar to default blue whenever the page is left — covers
// F5 refresh, tab close, and navigating away mid-race (cases where backToMenu()
// is never called). pagehide is preferred over beforeunload because it fires
// reliably on mobile and bfcache-eligible pages; beforeunload is the fallback
// for browsers that don't support pagehide.
// NOTE: async/await won't finish inside these handlers — sendReport is called
// synchronously-as-possible and we just let the browser flush what it can.
function _resetLightbarOnExit() {
  ds4Lightbar.resetAll();
}
window.addEventListener('pagehide',     _resetLightbarOnExit);
window.addEventListener('beforeunload', _resetLightbarOnExit);


// ── Menu lightbar: request HID permission (first time) and set character colour.
// Must be called from a user-gesture handler (button click) so the WebHID picker
// can show. Subsequent calls with the device already open just update the colour.
// playerSlot: 0 = P1, 1 = P2.
function menuLightbarUpdate(playerSlot) {
  if (!navigator.hid) return; // WebHID not available (Firefox/Safari)

  // Resolve the best pad index for this player slot using the same scoring logic
  // as assignGamepads(), without locking gpAssign[] (that happens at race start).
  const pads = getConnectedGamepads();
  const padIndex = pads[playerSlot] ? pads[playerSlot].index
                 : pads[0]          ? pads[0].index
                 : undefined;
  if (padIndex === undefined) return;

  const charColor = CHARACTERS[playerChars[playerSlot]].lightbarColor;
  ds4Lightbar.request(padIndex, charColor);
}

function setSoloInput(method) {
  soloInputMethod = method;
  document.getElementById('soloKbBtn').classList.toggle('active', method === 'keyboard');
  document.getElementById('soloGpBtn').classList.toggle('active', method === 'gamepad');
  const hint = document.getElementById('soloControlsHint');
  if (method === 'keyboard') {
    hint.innerHTML = '<span>WASD</span> to drive<br><span>SPACE</span> = item';
  } else {
    hint.innerHTML = '<span>L-Stick</span> steer &nbsp;<span>R2</span> gas<br><span>L2</span> brake &nbsp;<span>✕</span> item';
    updateGamepadReadyUI();
    menuLightbarUpdate(0); // request HID permission + set P1 character colour
  }
}

function setCoopInput(player, method) {
  coopInputMethods[player] = method;
  const prefix = player === 0 ? 'coopP1' : 'coopP2';
  document.getElementById(prefix + 'KbBtn').classList.toggle('active', method === 'keyboard');
  document.getElementById(prefix + 'GpBtn').classList.toggle('active', method === 'gamepad');
  const hint = document.getElementById(prefix + 'ControlsHint');
  if (method === 'keyboard') {
    if (player === 0) hint.innerHTML = '<span>WASD</span> to drive<br><span>SPACE</span> = item';
    else hint.innerHTML = '<span>↑↓←→</span> to drive<br><span>ENTER</span> = item';
  } else {
    const padNum = player === 0 ? '1' : '2';
    hint.innerHTML = `<span>L-Stick</span> steer &nbsp;<span>R2</span> gas<br><span>L2</span> brake &nbsp;<span>✕</span> item (Pad ${padNum})`;
    updateGamepadReadyUI();
    menuLightbarUpdate(player); // request HID permission + set character colour
  }
  // Update PAD button labels to always show which pad slot is assigned
  updateCoopPadLabels();

  // Start/stop first-press P1 claim when both players are on gamepad
  const bothPad = coopInputMethods[0] === 'gamepad' && coopInputMethods[1] === 'gamepad';
  if (bothPad) {
    startCoopGpClaim();
  } else {
    stopCoopGpClaim();
    _coopGpClaimedP1 = null;
  }
}

function updateCoopPadLabels() {
  // Clarify to user: if both are gamepad, P1=pad1, P2=pad2; if only one is gamepad it's pad1
  const bothPad = coopInputMethods[0] === 'gamepad' && coopInputMethods[1] === 'gamepad';
  document.getElementById('coopP1GpBtn').textContent = bothPad ? '🎮 PAD1' : '🎮 PAD';
  document.getElementById('coopP2GpBtn').textContent = bothPad ? '🎮 PAD2' : '🎮 PAD';
}

// ── Coop dual-gamepad first-press assignment ──────────────────────────────
// Starts a rAF polling loop that watches all connected gamepads.
// The first pad to press any button becomes P1; the remaining pad becomes P2.
function startCoopGpClaim() {
  if (_coopGpClaimActive) return; // already running
  _coopGpClaimActive = true;
  _coopGpClaimedP1   = null;

  // Snapshot button states so only NEW presses (not held buttons) trigger claim.
  const _prevPressed = new Map(); // padIndex → Set of button indices pressed last frame

  function _pollClaim() {
    if (!_coopGpClaimActive) return; // cancelled

    const pads = getConnectedGamepads();

    if (_coopGpClaimedP1 === null) {
      // Phase 1 — wait for first button press on any pad → that pad claims P1
      for (const pad of pads) {
        const prev = _prevPressed.get(pad.index) || new Set();
        for (let b = 0; b < pad.buttons.length; b++) {
          const nowPressed = pad.buttons[b].pressed || pad.buttons[b].value > 0.5;
          if (nowPressed && !prev.has(b)) {
            // New press detected — this pad claims P1!
            _coopGpClaimedP1 = pad.index;
            console.log(`[GMP] Coop claim: pad ${pad.index} pressed button ${b} → P1`);
            _updateCoopGpClaimUI();
            break;
          }
        }
        // Update prev state
        const nowSet = new Set();
        for (let b = 0; b < pad.buttons.length; b++) {
          if (pad.buttons[b].pressed || pad.buttons[b].value > 0.5) nowSet.add(b);
        }
        _prevPressed.set(pad.index, nowSet);
        if (_coopGpClaimedP1 !== null) break;
      }
    } else {
      // Phase 2 — P1 is claimed; wait for a DIFFERENT pad to press any button → P2
      const p2Pads = pads.filter(p => p.index !== _coopGpClaimedP1);
      let p2Claimed = null;
      for (const pad of p2Pads) {
        const prev = _prevPressed.get(pad.index) || new Set();
        for (let b = 0; b < pad.buttons.length; b++) {
          const nowPressed = pad.buttons[b].pressed || pad.buttons[b].value > 0.5;
          if (nowPressed && !prev.has(b)) {
            p2Claimed = pad.index;
            console.log(`[GMP] Coop claim: pad ${pad.index} pressed button ${b} → P2`);
            break;
          }
        }
        const nowSet = new Set();
        for (let b = 0; b < pad.buttons.length; b++) {
          if (pad.buttons[b].pressed || pad.buttons[b].value > 0.5) nowSet.add(b);
        }
        _prevPressed.set(pad.index, nowSet);
        if (p2Claimed !== null) break;
      }

      if (p2Claimed !== null) {
        // Both assigned — stop polling and lock in
        stopCoopGpClaim();
        _coopGpClaimedP1 = _coopGpClaimedP1; // already set
        _updateCoopGpClaimUI(p2Claimed);
        return;
      }
    }

    _coopGpClaimRafId = requestAnimationFrame(_pollClaim);
  }

  _coopGpClaimRafId = requestAnimationFrame(_pollClaim);
  _updateCoopGpClaimUI(); // show initial "press a button" prompt
}

function stopCoopGpClaim() {
  _coopGpClaimActive = false;
  if (_coopGpClaimRafId !== null) {
    cancelAnimationFrame(_coopGpClaimRafId);
    _coopGpClaimRafId = null;
  }
}

// Update the coop character-select hints to reflect claim status.
// p2PadIndex is only passed once P2 is also claimed.
function _updateCoopGpClaimUI(p2PadIndex) {
  const hint1 = document.getElementById('coopP1ControlsHint');
  const hint2 = document.getElementById('coopP2ControlsHint');

  if (_coopGpClaimedP1 === null) {
    // Nobody has claimed yet
    const msg = '<span style="color:#FFD700;font-size:14px">👉 First to press a button = P1!</span>';
    if (hint1) hint1.innerHTML = msg;
    if (hint2) hint2.innerHTML = msg;
  } else if (p2PadIndex === undefined) {
    // P1 claimed, waiting for P2
    if (hint1) hint1.innerHTML =
      `<span style="color:#00ff88">✅ P1 claimed! (Pad ${_coopGpClaimedP1})</span><br>`
      + `<span>L-Stick</span> steer &nbsp;<span>R2</span> gas<br>`
      + `<span>L2</span> brake &nbsp;<span>✕</span> item`;
    if (hint2) hint2.innerHTML =
      '<span style="color:#FFD700;font-size:14px">👉 P2: press any button on your pad!</span>';
  } else {
    // Both claimed!
    if (hint1) hint1.innerHTML =
      `<span style="color:#00ff88">✅ P1 ready! (Pad ${_coopGpClaimedP1})</span><br>`
      + `<span>L-Stick</span> steer &nbsp;<span>R2</span> gas<br>`
      + `<span>L2</span> brake &nbsp;<span>✕</span> item`;
    if (hint2) hint2.innerHTML =
      `<span style="color:#00ff88">✅ P2 ready! (Pad ${p2PadIndex})</span><br>`
      + `<span>L-Stick</span> steer &nbsp;<span>R2</span> gas<br>`
      + `<span>L2</span> brake &nbsp;<span>✕</span> item`;
  }
}

function selectMode(mode) {
  gameMode = mode === 'dev' ? 'solo' : mode; // dev uses solo plumbing
  gameMode_dev = (mode === 'dev');
  document.getElementById('screenModeSelect').style.display = 'none';
  if (mode === 'dev') {
    // Show the solo char screen but hide the CPU panel
    document.getElementById('screenCharSolo').style.display = 'flex';
    const cpuPanel = document.querySelector('.cpu-select');
    if (cpuPanel) cpuPanel.style.display = 'none';
  } else {
    const cpuPanel = document.querySelector('.cpu-select');
    if (cpuPanel) cpuPanel.style.display = '';
    document.getElementById(mode === 'solo' ? 'screenCharSolo' : 'screenCharCoop').style.display = 'flex';
  }
  updateCharUI();
}

function goBack() {
  stopCoopGpClaim();
  _coopGpClaimedP1 = null;
  gameMode_dev = false;
  const cpuPanel = document.querySelector('.cpu-select');
  if (cpuPanel) cpuPanel.style.display = '';
  document.getElementById('screenCharSolo').style.display = 'none';
  document.getElementById('screenCharCoop').style.display = 'none';
  document.getElementById('screenModeSelect').style.display = 'flex';
}

// =============================================
// GAMEPAD HELPERS — DS4 aware (standard + raw Linux mapping)
// =============================================
//
// DS4 STANDARD mapping (Windows / Mac / some Linux with xpad):
//   buttons[0]=Cross  buttons[1]=Circle  buttons[2]=Square  buttons[3]=Triangle
//   buttons[4]=L1     buttons[5]=R1
//   buttons[6]=L2 (value 0..1)   buttons[7]=R2 (value 0..1)
//   buttons[8]=Share  buttons[9]=Options
//   buttons[12]=DUp   buttons[13]=DDown  buttons[14]=DLeft  buttons[15]=DRight
//   axes[0]=LX  axes[1]=LY  axes[2]=RX  axes[3]=RY
//
// DS4 RAW mapping (Linux Chrome/Chromium wired USB, gp.mapping === ""):
//   buttons[0]=Square    buttons[1]=Cross(✕)  buttons[2]=Circle  buttons[3]=Triangle
//   buttons[4]=L1        buttons[5]=R1
//   buttons[6]=L2        buttons[7]=R2        ← buttons exist BUT .value is always 0 on many kernels!
//   buttons[8]=Share     buttons[9]=Options
//   buttons[10]=L3       buttons[11]=R3
//   buttons[12]=PS       buttons[13]=Touchpad
//   axes[0]=LX  axes[1]=LY  axes[2]=RX  axes[3]=RY
//   axes[4]=L2  axes[5]=R2  ← THESE are the real analog trigger axes (range: -1 released → +1 fully pressed)
//   axes[6]=DPad-X (-1/0/+1 hat)   axes[7]=DPad-Y (-1/0/+1 hat)
//
// CRITICAL: On wired USB DS4 on Linux the trigger VALUES live in axes[4/5].
// buttons[6/7] exist in the array but their .value stays 0 — they are useless.
// gp.axes is a Float32Array; every slot up to length-1 exists (never undefined),
// so check axes.length, not typeof/undefined.

const GP_DEADZONE = 0.12;  // stick deadzone

function isRawMapping(gp) {
  // Empty string = raw Linux mapping. 'standard' = Windows/Mac/some Linux.
  return gp.mapping !== 'standard';
}

function getGamepadInputs(gp) {
  if (!gp) return null;
  const raw = isRawMapping(gp);

  let r2, l2;
  if (raw) {
    // Raw Linux DS4: triggers MUST come from axes[4] (L2) and axes[5] (R2).
    // Range is -1 (released) → +1 (fully pressed). Remap to 0..1.
    // buttons[6/7].value is unreliable on wired USB — ignore it entirely.
    if (gp.axes.length > 5) {
      // axes[4/5] range: -1 (released) → +1 (fully pressed).
      // HOWEVER: on Linux the triggers report 0 (not -1) until physically moved
      // for the first time, making (0+1)/2 = 0.5 at rest — falsely half-pressed.
      // Apply a threshold: only register input once the axis clearly exceeds its
      // resting noise floor. -1 = fully released, so anything ≤ -0.5 is "at rest".
      const rawL2 = gp.axes[4];
      const rawR2 = gp.axes[5];
      l2 = rawL2 > -0.5 ? (rawL2 + 1) / 2 : 0;
      r2 = rawR2 > -0.5 ? (rawR2 + 1) / 2 : 0;
    } else {
      // Fallback for unusual kernel/driver combos that don't expose trigger axes
      l2 = gp.buttons[6] ? gp.buttons[6].value : 0;
      r2 = gp.buttons[7] ? gp.buttons[7].value : 0;
    }
    // Clamp to 0..1 in case of slight driver noise below -1
    l2 = Math.max(0, Math.min(1, l2));
    r2 = Math.max(0, Math.min(1, r2));
  } else {
    // Standard mapping: triggers are proper button values 0..1
    r2 = gp.buttons[7] ? gp.buttons[7].value : 0;
    l2 = gp.buttons[6] ? gp.buttons[6].value : 0;
  }

  // ── Left stick X — same axis index in both mappings ──
  const lx = gp.axes[0] || 0;

  // ── Cross / ✕ button ──
  // Standard: buttons[0] = Cross
  // Raw Linux: buttons[1] = Cross  (buttons[0] = Square)
  let cross;
  if (raw) {
    const btn = gp.buttons[1];
    cross = btn ? (btn.pressed || btn.value > 0.5) : false;
  } else {
    const btn = gp.buttons[0];
    cross = btn ? (btn.pressed || btn.value > 0.5) : false;
  }

  return { r2, l2, lx, cross };
}

// Returns fresh gamepad object (must re-poll each frame — Gamepad API snapshots)
function getGamepad(index) {
  if (index === null || index === undefined) return null;
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  return pads[index] || null;
}

// Find all connected gamepads with enough axes/buttons to be a real controller,
// sorted so genuine game controllers come first.
//
// Problem: non-game HID devices (RGB lighting controllers, ASRock LED strips, etc.)
// sometimes enumerate as gamepads with index 0, pushing the real controller to
// index 1. The old code just took whatever was first.
//
// Fix: score each pad and sort higher-quality controllers to the front:
//   +2  mapping === 'standard'  (browser positively identified it as a gamepad)
//   +1  buttons.length >= 10    (real controllers have lots of buttons)
//   +1  axes.length >= 4        (real controllers have two sticks)
//   -10 id contains known non-game keywords
//
// This keeps the logic generic — no hardcoded VIDs — while reliably demoting
// LED/lighting/audio controllers that masquerade as gamepads.
const _FAKE_PAD_KEYWORDS = [
  'led', 'lighting', 'rgb', 'asrock', 'asus aura', 'corsair', 'razer chroma',
  'audio', 'capture', 'virtual', 'xinput compatible hid device',
];
function _padScore(gp) {
  let score = 0;
  if (gp.mapping === 'standard') score += 2;
  if (gp.buttons.length >= 10)   score += 1;
  if (gp.axes.length >= 4)       score += 1;
  const idLower = gp.id.toLowerCase();
  if (_FAKE_PAD_KEYWORDS.some(kw => idLower.includes(kw))) score -= 10;
  return score;
}

function getConnectedGamepads() {
  const rawPads = navigator.getGamepads ? navigator.getGamepads() : [];
  return Array.from(rawPads)
    .filter(gp => gp && gp.buttons.length >= 4 && gp.axes.length >= 2)
    .sort((a, b) => _padScore(b) - _padScore(a)); // highest score first
}

// Check whether getGamepads() can already see a pad (gamepadconnected has fired).
// Updates the controls hint inline so the user knows they need to press a button.
// Called when: (a) gamepad input mode is selected, (b) gamepadconnected fires.
function updateGamepadReadyUI() {
  const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
  const ready = pads.length > 0;

  // Solo hint
  const soloHint = document.getElementById('soloControlsHint');
  if (soloHint && soloInputMethod === 'gamepad') {
    if (ready) {
      soloHint.innerHTML = '<span style="color:#00ff88">✓ Controller ready!</span><br>'
        + '<span>L-Stick</span> steer &nbsp;<span>R2</span> gas<br>'
        + '<span>L2</span> brake &nbsp;<span>✕</span> item';
    } else {
      soloHint.innerHTML = '<span style="color:#FFD700">👉 Press any button on your controller</span><br>'
        + '<span style="color:#aaa;font-size:12px">Chrome needs one button press to activate it</span>';
    }
  }

  // Coop hints
  ['coopP1', 'coopP2'].forEach((prefix, i) => {
    const hint = document.getElementById(prefix + 'ControlsHint');
    if (hint && coopInputMethods[i] === 'gamepad') {
      const padNum = i === 0 ? '1' : '2';
      if (ready) {
        hint.innerHTML = `<span style="color:#00ff88">✓ Controller ready!</span><br>`
          + `<span>L-Stick</span> steer &nbsp;<span>R2</span> gas<br>`
          + `<span>L2</span> brake &nbsp;<span>✕</span> item (Pad ${padNum})`;
      } else {
        hint.innerHTML = '<span style="color:#FFD700">👉 Press any button on your controller</span><br>'
          + '<span style="color:#aaa;font-size:12px">Chrome needs one button press to activate it</span>';
      }
    }
  });
}

// Kept for assignGamepads() to call if Start is clicked before the controller wakes up.
function showGamepadWarning() {
  let warn = document.getElementById('_gpWarn');
  if (!warn) {
    warn = document.createElement('div');
    warn.id = '_gpWarn';
    warn.style.cssText = [
      'position:fixed', 'top:50%', 'left:50%',
      'transform:translate(-50%,-50%)',
      'background:rgba(0,0,0,0.88)', 'border:3px solid #FF4444',
      'color:#fff', 'font-family:inherit', 'font-size:18px',
      'padding:20px 32px', 'border-radius:10px', 'z-index:999',
      'text-align:center', 'pointer-events:none', 'max-width:420px',
      'line-height:1.6',
    ].join(';');
    document.body.appendChild(warn);
  }
  warn.innerHTML = '⚠️ <b style="color:#FF4444">Gamepad not detected</b><br>'
    + '<span style="color:#FFD700">Press any button on your controller</span><br>'
    + 'then click <b>START RACE</b> again.';
  warn.style.display = 'block';
  clearTimeout(warn._t);
  warn._t = setTimeout(() => { warn.style.display = 'none'; }, 5000);
}

// Assign gamepad indices before the race starts.
// On Linux a wired DS4 requires the user to have pressed at least one button
// since page load before the browser exposes it via getGamepads(). Pressing the
// Options button on the character-select screen is enough. We snapshot
// whatever is connected at race start time and lock those indices in.
function assignGamepads() {
  // getConnectedGamepads() polls getGamepads() directly. On the rare chance it
  // returns empty (some Linux kernels need one extra tick after a user gesture),
  // we do one immediate re-poll here as a second attempt before giving up.
  let pads = getConnectedGamepads();
  if (pads.length === 0) {
    const retry = navigator.getGamepads ? navigator.getGamepads() : [];
    pads = Array.from(retry).filter(gp => gp && gp.buttons.length >= 4 && gp.axes.length >= 2);
  }
  gpAssign[0] = undefined;
  gpAssign[1] = undefined;

  const isSolo = gameMode === 'solo';
  if (isSolo) {
    if (soloInputMethod === 'gamepad') {
      // Use undefined (not null) for undetected pads: binds._gpIndex checks !== undefined,
      // so null would silently enter the gamepad path with no inputs rather than
      // falling back to keyboard. undefined correctly skips the gamepad branch.
      gpAssign[0] = pads[0] ? pads[0].index : undefined;
      if (gpAssign[0] === undefined) {
        console.warn('[GMP] Gamepad mode selected but no pad detected. On Linux the browser only exposes the pad after a gamepadconnected event fires — press any button on your controller BEFORE clicking Start Race.');
        showGamepadWarning();
      }
    }
  } else {
    const p1Needs = coopInputMethods[0] === 'gamepad';
    const p2Needs = coopInputMethods[1] === 'gamepad';

    if (p1Needs && p2Needs && _coopGpClaimedP1 !== null) {
      // Both players chose gamepad and the first-press claim resolved P1.
      // P1 gets the pad that pressed first; P2 gets whichever other pad is available.
      gpAssign[0] = _coopGpClaimedP1;
      const p2Pad = pads.find(p => p.index !== _coopGpClaimedP1);
      gpAssign[1] = p2Pad ? p2Pad.index : undefined;
      stopCoopGpClaim(); // clean up the polling loop if still running
    } else {
      // Fallback: one or neither player is on gamepad, or claim hasn't resolved yet.
      // Assign by sorted pad order (original behaviour).
      const padPool = [...pads];
      if (p1Needs) { gpAssign[0] = padPool.length ? padPool.shift().index : undefined; }
      if (p2Needs) { gpAssign[1] = padPool.length ? padPool.shift().index : undefined; }
    }

    if ((p1Needs && gpAssign[0] === undefined) || (p2Needs && gpAssign[1] === undefined)) {
      console.warn('[GMP] One or more gamepad slots unassigned — not enough pads detected.');
      showGamepadWarning();
    }
  }
  // Debug: log what we found (visible in browser console)
  console.log('[GMP] gpAssign:', gpAssign, '| pads found:',
    pads.map(p => '[' + p.index + '] "' + p.id + '" mapping="' + p.mapping + '" btns=' + p.buttons.length + ' axes=' + p.axes.length));
}

// Stars background
(function makeStars(){
  const container = document.getElementById('starsContainer');
  for (let i=0; i<120; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const sz = Math.random()*3+1;
    s.style.cssText = `width:${sz}px;height:${sz}px;top:${Math.random()*100}%;left:${Math.random()*100}%;animation-delay:${Math.random()*2}s;animation-duration:${1+Math.random()*2}s`;
    container.appendChild(s);
  }
})();

updateCharUI();

// =============================================
// FLOATING MEME CHARACTERS — space background ambience
// =============================================
(function initFloatingMemes() {
  const container  = document.getElementById('starsContainer');
  const TARGET_MIN = 2;   // minimum characters on-screen at once
  const TARGET_MAX = 6;   // maximum characters on-screen at once
  const CHAR_SIZE  = 80;  // px — matches CSS .meme-floater width/height
  const DURATION_MIN = 18; // seconds to cross the screen (slow drift)
  const DURATION_MAX = 32;

  // ── Alpha-test collision canvas (shared, off-screen) ──────────────────────
  // We sample a tiny region of a pre-drawn alpha map to do pixel-perfect
  // collision checks between two physics memes without touching the DOM.
  // Each character image is rendered once into _alphaCache at ALPHA_RES²
  // resolution. At collision time we look up ~SAMPLE_N random pixel pairs
  // from the overlapping rectangle and call it a hit if any alpha pair both
  // exceed ALPHA_THRESH. Classic Mario-Kart-style "one opaque pixel is enough".
  const _alphaCache   = new Map(); // img.src → Uint8ClampedArray (ALPHA_RES²)
  const ALPHA_RES     = 32;        // resolution of each character's alpha map
  const ALPHA_THRESH  = 30;        // 0-255 — pixels below this are "transparent"
  const SAMPLE_N      = 12;        // number of random pixel pairs to test

  const _alphaCtx = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = ALPHA_RES;
    return c.getContext('2d', { willReadFrequently: true });
  })();

  // Returns a Uint8ClampedArray of alpha values (one per pixel, row-major)
  // for the given <img> element. Cached after first call.
  function getAlphaMap(img) {
    if (_alphaCache.has(img.src)) return _alphaCache.get(img.src);
    _alphaCtx.clearRect(0, 0, ALPHA_RES, ALPHA_RES);
    try {
      _alphaCtx.drawImage(img, 0, 0, ALPHA_RES, ALPHA_RES);
      const raw = _alphaCtx.getImageData(0, 0, ALPHA_RES, ALPHA_RES).data;
      // Extract just the alpha channel
      const alphas = new Uint8ClampedArray(ALPHA_RES * ALPHA_RES);
      for (let i = 0; i < alphas.length; i++) alphas[i] = raw[i * 4 + 3];
      _alphaCache.set(img.src, alphas);
      return alphas;
    } catch (_) {
      // Cross-origin / not-yet-loaded: return a filled map (treat as solid)
      const fallback = new Uint8ClampedArray(ALPHA_RES * ALPHA_RES).fill(255);
      _alphaCache.set(img.src, fallback);
      return fallback;
    }
  }

  // Sample alpha at (u, v) in [0,1]² from a pre-built alpha map
  function sampleAlpha(alphaMap, u, v) {
    const px = Math.min(ALPHA_RES - 1, Math.max(0, Math.floor(u * ALPHA_RES)));
    const py = Math.min(ALPHA_RES - 1, Math.max(0, Math.floor(v * ALPHA_RES)));
    return alphaMap[py * ALPHA_RES + px];
  }

  // Alpha-test overlap check for two axis-aligned squares (no rotation for
  // simplicity — the physics bounce is already chaotic enough lol).
  // Returns true if the two memes have at least one overlapping opaque pixel.
  function alphaTestCollision(a, b) {
    const aSize = CHAR_SIZE * a.scale;
    const bSize = CHAR_SIZE * b.scale;
    // AABB overlap rect in screen-space
    const left   = Math.max(a.x, b.x);
    const right  = Math.min(a.x + aSize, b.x + bSize);
    const top    = Math.max(a.y, b.y);
    const bottom = Math.min(a.y + aSize, b.y + bSize);
    if (right <= left || bottom <= top) return false; // no overlap at all

    const alphaA = getAlphaMap(a.el);
    const alphaB = getAlphaMap(b.el);

    // Test SAMPLE_N random points inside the overlap rect
    for (let s = 0; s < SAMPLE_N; s++) {
      const sx = left  + Math.random() * (right  - left);
      const sy = top   + Math.random() * (bottom - top);

      // UV coords inside each sprite's own bounding box
      const uA = (sx - a.x) / aSize;
      const vA = (sy - a.y) / aSize;
      const uB = (sx - b.x) / bSize;
      const vB = (sy - b.y) / bSize;

      if (sampleAlpha(alphaA, uA, vA) > ALPHA_THRESH &&
          sampleAlpha(alphaB, uB, vB) > ALPHA_THRESH) {
        return true; // found a solid pixel overlap!
      }
    }
    return false;
  }

  // ── State ─────────────────────────────────────────────────────────────────
  const activeIndices = new Set();
  // CSS-animated floaters (the normal 90%)
  const activeEls = [];
  // Physics floaters (the chaotic 10%) — tracked separately
  // Each entry: { el, charIdx, x, y, vx, vy, rot, rotV, scale, dead }
  const physicsMemes = [];

  // ── Trajectory helpers ────────────────────────────────────────────────────
  function randomTrajectory() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const edge = Math.floor(Math.random() * 4);
    let x0, y0, x1, y1;

    if (edge === 0) {
      x0 = Math.random() * W; y0 = -CHAR_SIZE - 20;
      x1 = (Math.random() * 1.4 - 0.2) * W; y1 = H + CHAR_SIZE + 20;
    } else if (edge === 1) {
      x0 = W + CHAR_SIZE + 20; y0 = Math.random() * H;
      x1 = -CHAR_SIZE - 20; y1 = (Math.random() * 1.4 - 0.2) * H;
    } else if (edge === 2) {
      x0 = Math.random() * W; y0 = H + CHAR_SIZE + 20;
      x1 = (Math.random() * 1.4 - 0.2) * W; y1 = -CHAR_SIZE - 20;
    } else {
      x0 = -CHAR_SIZE - 20; y0 = Math.random() * H;
      x1 = W + CHAR_SIZE + 20; y1 = (Math.random() * 1.4 - 0.2) * H;
    }
    return { x0, y0, x1, y1 };
  }

  // ── CSS floater spawn (unchanged 90%) ────────────────────────────────────
  function spawnCssFloater(pick, charIdx) {
    const traj     = randomTrajectory();
    const duration = DURATION_MIN + Math.random() * (DURATION_MAX - DURATION_MIN);
    const spinDeg  = (Math.random() < 0.5 ? 1 : -1) * (120 + Math.random() * 300);
    const startRot = Math.random() * 360;
    const scale    = 0.7 + Math.random() * 0.7;

    const img = document.createElement('img');
    img.className = 'meme-floater';
    img.src       = pick.img;
    img.alt       = '';
    img.style.setProperty('--mx0', traj.x0 + 'px');
    img.style.setProperty('--my0', traj.y0 + 'px');
    img.style.setProperty('--mx1', traj.x1 + 'px');
    img.style.setProperty('--my1', traj.y1 + 'px');
    img.style.setProperty('--mr0', startRot + 'deg');
    img.style.setProperty('--mr1', (startRot + spinDeg) + 'deg');
    img.style.setProperty('--ms',  scale);
    img.style.animationDuration = duration + 's';
    img.style.top  = '0';
    img.style.left = '0';

    activeIndices.add(charIdx);
    const entry = { el: img, charIdx };
    activeEls.push(entry);
    // Remove only when the CSS animation actually ends — i.e. the meme is
    // genuinely off-screen. Never rely on a wall-clock timer which can fire
    // while the sprite is still visible on large/unexpected screen sizes.
    img.addEventListener('animationend', () => {
      img.remove();
      activeIndices.delete(charIdx);
      const idx = activeEls.indexOf(entry);
      if (idx !== -1) activeEls.splice(idx, 1);
    }, { once: true });
    container.appendChild(img);
  }

  // ── Physics floater spawn (10%) ───────────────────────────────────────────
  // Physics memes don't use CSS animations — they're positioned by JS every
  // rAF tick. They enter from a random edge on a collision-course trajectory
  // and are specifically paired so they're heading toward each other.
  function spawnPhysicsMeme(pick, charIdx, x, y, vx, vy) {
    const scale = 0.9 + Math.random() * 0.6;  // slightly bigger so they're easy to see
    const img   = document.createElement('img');
    img.className = 'meme-floater meme-floater--physics'; // extra class kills CSS anim
    img.src       = pick.img;
    img.alt       = '';
    // Kill the CSS animation entirely; we drive transform directly
    img.style.animation = 'none';
    img.style.position  = 'fixed';
    img.style.top       = '0';
    img.style.left      = '0';
    img.style.width     = CHAR_SIZE + 'px';
    img.style.height    = CHAR_SIZE + 'px';
    img.style.transformOrigin = 'center center';
    img.style.willChange      = 'transform';
    img.style.zIndex          = '2'; // above CSS floaters (z:0) but below #mainMenu (z:100)

    const entry = {
      el: img, charIdx,
      x, y, vx, vy,
      rot: Math.random() * 360,
      rotV: (Math.random() < 0.5 ? 1 : -1) * (60 + Math.random() * 180), // deg/s
      scale,
      dead: false,
      collided: false,  // prevent double-bounce same frame
    };

    activeIndices.add(charIdx);
    physicsMemes.push(entry);
    container.appendChild(img);
    return entry;
  }

  // Spawn a collision-course pair: two memes aimed to cross each other's path
  function spawnCollisionPair() {
    const available = HALL_OF_MEMES.filter((_, i) => !activeIndices.has(i));
    if (available.length < 2) return;

    const W = window.innerWidth;
    const H = window.innerHeight;

    // Pick two characters
    const idxA = Math.floor(Math.random() * available.length);
    const pickA = available[idxA];
    const availB = available.filter((_, i) => i !== idxA);
    const pickB = availB[Math.floor(Math.random() * availB.length)];
    const charA = HALL_OF_MEMES.indexOf(pickA);
    const charB = HALL_OF_MEMES.indexOf(pickB);

    // Speed: pixels per second — faster than normal drifters for drama
    const speed = 80 + Math.random() * 60;

    // Choose a random meeting point somewhere near the centre of the screen
    const meetX = W * (0.3 + Math.random() * 0.4);
    const meetY = H * (0.3 + Math.random() * 0.4);

    // Spawn A from a random edge, aimed at the meeting point
    const edgeA = Math.floor(Math.random() * 4);
    let ax, ay;
    if (edgeA === 0)      { ax = Math.random() * W; ay = -CHAR_SIZE - 20; }
    else if (edgeA === 1) { ax = W + CHAR_SIZE + 20; ay = Math.random() * H; }
    else if (edgeA === 2) { ax = Math.random() * W; ay = H + CHAR_SIZE + 20; }
    else                  { ax = -CHAR_SIZE - 20; ay = Math.random() * H; }

    const dxA = meetX - ax, dyA = meetY - ay;
    const lenA = Math.hypot(dxA, dyA) || 1;
    const vxA = (dxA / lenA) * speed;
    const vyA = (dyA / lenA) * speed;

    // Spawn B from roughly the opposite direction
    const edgeB = (edgeA + 2) % 4;
    let bx, by;
    if (edgeB === 0)      { bx = Math.random() * W; by = -CHAR_SIZE - 20; }
    else if (edgeB === 1) { bx = W + CHAR_SIZE + 20; by = Math.random() * H; }
    else if (edgeB === 2) { bx = Math.random() * W; by = H + CHAR_SIZE + 20; }
    else                  { bx = -CHAR_SIZE - 20; by = Math.random() * H; }

    const dxB = meetX - bx, dyB = meetY - by;
    const lenB = Math.hypot(dxB, dyB) || 1;
    const vxB = (dxB / lenB) * speed;
    const vyB = (dyB / lenB) * speed;

    spawnPhysicsMeme(pickA, charA, ax, ay, vxA, vyA);
    spawnPhysicsMeme(pickB, charB, bx, by, vxB, vyB);
  }

  // ── Normal spawn (CSS floater or collision pair) ──────────────────────────
  function spawnOne() {
    const available = HALL_OF_MEMES.filter((_, i) => !activeIndices.has(i));
    if (available.length === 0) return;

    // 10% chance → spawn a collision-course physics pair instead
    if (Math.random() < 0.10 && available.length >= 2) {
      spawnCollisionPair();
      return;
    }

    const pick    = available[Math.floor(Math.random() * available.length)];
    const charIdx = HALL_OF_MEMES.indexOf(pick);
    spawnCssFloater(pick, charIdx);
  }

  // ── Physics simulation loop ───────────────────────────────────────────────
  let _lastPhysicsTime = null;

  function physicsStep(now) {
    if (_lastPhysicsTime === null) { _lastPhysicsTime = now; return; }
    const dt = Math.min((now - _lastPhysicsTime) / 1000, 0.1); // cap at 100ms
    _lastPhysicsTime = now;

    const W = window.innerWidth;
    const H = window.innerHeight;
    const MARGIN = CHAR_SIZE * 2;

    // Integrate positions
    for (const m of physicsMemes) {
      if (m.dead) continue;
      m.x   += m.vx * dt;
      m.y   += m.vy * dt;
      m.rot += m.rotV * dt;

      const size = CHAR_SIZE * m.scale;
      // Mark dead when fully off-screen
      if (m.x > W + MARGIN || m.x < -MARGIN - size ||
          m.y > H + MARGIN || m.y < -MARGIN - size) {
        m.dead = true;
        m.el.remove();
        activeIndices.delete(m.charIdx);
      }
    }

    // ── Alpha-test collision detection between all physics meme pairs ─────
    for (let i = 0; i < physicsMemes.length; i++) {
      const a = physicsMemes[i];
      if (a.dead || a.collided) continue;
      for (let j = i + 1; j < physicsMemes.length; j++) {
        const b = physicsMemes[j];
        if (b.dead || b.collided) continue;

        if (alphaTestCollision(a, b)) {
          // ── Elastic-ish asteroid collision ────────────────────────────
          // Decompose velocities along the collision normal (centre-to-centre)
          const aCx = a.x + (CHAR_SIZE * a.scale) / 2;
          const aCy = a.y + (CHAR_SIZE * a.scale) / 2;
          const bCx = b.x + (CHAR_SIZE * b.scale) / 2;
          const bCy = b.y + (CHAR_SIZE * b.scale) / 2;

          let nx = bCx - aCx;
          let ny = bCy - aCy;
          const nl = Math.hypot(nx, ny) || 1;
          nx /= nl; ny /= nl;

          // Project velocities onto normal
          const dvA = a.vx * nx + a.vy * ny;
          const dvB = b.vx * nx + b.vy * ny;

          // Only resolve if they're actually approaching each other
          if (dvA - dvB > 0) {
            // Equal-mass elastic: exchange normal components
            a.vx += (dvB - dvA) * nx;
            a.vy += (dvB - dvA) * ny;
            b.vx += (dvA - dvB) * nx;
            b.vy += (dvA - dvB) * ny;

            // Add a little spin kick for comedy value
            a.rotV = (Math.random() < 0.5 ? 1 : -1) * (200 + Math.random() * 400);
            b.rotV = (Math.random() < 0.5 ? 1 : -1) * (200 + Math.random() * 400);

            // Brief collision-flash scale pulse — squish → stretch
            flashCollider(a);
            flashCollider(b);

            // Lock out further collision checks this frame to avoid jitter
            a.collided = true;
            b.collided = true;
          }
        }
      }
    }

    // Clear collided flags for next frame
    for (const m of physicsMemes) m.collided = false;

    // Apply transforms
    for (const m of physicsMemes) {
      if (m.dead) continue;
      const size = CHAR_SIZE * m.scale;
      m.el.style.transform =
        `translate(${m.x}px, ${m.y}px) rotate(${m.rot}deg) scale(${m.scale})`;
      // width/height remain CHAR_SIZE; scale is handled in the transform
    }

    // Prune dead entries
    for (let i = physicsMemes.length - 1; i >= 0; i--) {
      if (physicsMemes[i].dead) physicsMemes.splice(i, 1);
    }
  }

  // Quick visual flash on collision — scale bump then back
  function flashCollider(m) {
    const orig = m.scale;
    let t = 0;
    const FLASH_DUR = 0.25; // seconds
    let last = performance.now();
    function step(now) {
      const dt2 = (now - last) / 1000;
      last = now;
      t += dt2;
      const progress = Math.min(t / FLASH_DUR, 1);
      // Squish: scale drops then bounces back
      const bump = 1 + 0.35 * Math.sin(progress * Math.PI);
      m.el.style.filter = progress < 1
        ? `brightness(${1 + (1 - progress) * 3}) drop-shadow(0 0 8px #FFD700)`
        : '';
      if (progress < 1) requestAnimationFrame(step);
      else m.el.style.filter = '';
    }
    requestAnimationFrame(step);
  }

  // ── CSS floater tick (top-up only — cleanup is handled by animationend) ──
  function tick() {
    const target = TARGET_MIN + Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1));
    const needed = target - activeEls.length - physicsMemes.length;
    for (let n = 0; n < needed; n++) spawnOne();
  }

  // ── rAF loop for physics memes ────────────────────────────────────────────
  function physicsLoop(now) {
    // Only run while the main menu is visible
    if (document.getElementById('mainMenu').style.display !== 'none') {
      physicsStep(now);
    }
    requestAnimationFrame(physicsLoop);
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  const initialCount = TARGET_MIN + Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1));
  for (let i = 0; i < initialCount; i++) spawnOne();

  setInterval(tick, 3000);
  requestAnimationFrame(physicsLoop);
})();

// =============================================
// TRACK DEFINITION — smooth closed CatmullRom circuit
// =============================================
const TRACK_CONTROL_PTS = [
  [0,0,0],
  [50,0,-10],
  [110,0,-8],
  [145,0,20],
  [148,0,60],
  [130,0,95],
  [100,0,115],
  [60,0,128],
  [15,0,130],
  [-30,0,118],
  [-60,0,90],
  [-70,0,55],
  [-60,0,25],
  [-40,0,8],
  [-15,0,-5],
].map(p => new THREE.Vector3(...p));

// Build smooth CatmullRom curve (closed loop)
const TRACK_CURVE = new THREE.CatmullRomCurve3(TRACK_CONTROL_PTS, true, 'catmullrom', 0.5);
const TRACK_SAMPLES = 200;
const TRACK_WIDTH = 14;

// Sample the curve into waypoints used for isOnTrack / checkpoints
const TRACK_WAYPOINTS = TRACK_CURVE.getPoints(TRACK_SAMPLES);
const TOTAL_LAPS = 3;

// =============================================
// GAME STATE
// =============================================
let scenes = [], cameras = [], renderers = [], players = [];
let raceRunning = false;
let racePaused = false;
let pauseStart = 0;   // timestamp when pause began (for adjusting raceStart)
let raceStart = 0;
let raceTimer = 0;
let animId;
let keys = {};
let itemBoxes = [];
let kartBumpWorld = null;
let kartBumpBodies = [];
const KART_BUMP_RADIUS = 1.35;
const KART_BUMP_CONTACT_DISTANCE_SQ = (KART_BUMP_RADIUS * 2.05) ** 2;

function initKartBumpPhysics() {
  kartBumpWorld = new CannonWorld({ gravity: new CannonVec3(0, 0, 0) });
  kartBumpWorld.solver.iterations = 4;
  kartBumpWorld.solver.tolerance = 1e-4;
  kartBumpWorld.defaultContactMaterial.restitution = 0.55;
  kartBumpWorld.defaultContactMaterial.friction = 0.12;
  kartBumpBodies = players.map(player => {
    const body = new CannonBody({
      mass: 1.4,
      shape: new CannonSphere(KART_BUMP_RADIUS),
      fixedRotation: true,
      linearDamping: 0,
      angularDamping: 1,
      allowSleep: false,
    });
    body.position.set(player.kart.position.x, 0, player.kart.position.z);
    body._inputVelocity = new CannonVec3();
    kartBumpWorld.addBody(body);
    return body;
  });
}

function updateKartBumpPhysics(delta) {
  if (!kartBumpWorld || kartBumpBodies.length !== players.length) return;

  players.forEach((player, index) => {
    const body = kartBumpBodies[index];
    if (player.bombAirborneTimer > 0) {
      body.position.set(player.kart.position.x, 0, player.kart.position.z);
      body.velocity.set(0, 0, 0);
      return;
    }
    const velocity = body._inputVelocity;
    velocity.set(
      Math.sin(player.angle) * player.speed,
      0,
      Math.cos(player.angle) * player.speed,
    );
    body.position.set(
      player.kart.position.x - velocity.x * delta,
      0,
      player.kart.position.z - velocity.z * delta,
    );
    body.velocity.copy(velocity);
    body.wakeUp();
  });

  let contactPossible = false;
  for (let i = 0; i < players.length && !contactPossible; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const dx = players[i].kart.position.x - players[j].kart.position.x;
      const dz = players[i].kart.position.z - players[j].kart.position.z;
      if (dx * dx + dz * dz < KART_BUMP_CONTACT_DISTANCE_SQ) {
        contactPossible = true;
        break;
      }
    }
  }
  if (!contactPossible) return;

  kartBumpWorld.step(delta);

  players.forEach((player, index) => {
    const body = kartBumpBodies[index];
    if (player.bombAirborneTimer > 0) return;
    player.kart.position.x = body.position.x;
    player.kart.position.z = body.position.z;

    const vx = body.velocity.x;
    const vz = body.velocity.z;
    const resolvedSpeed = Math.hypot(vx, vz);
    if (resolvedSpeed > 0.01) {
      player.angle = Math.atan2(vx, vz);
      player.speed = resolvedSpeed;
    } else {
      player.speed = 0;
    }
  });

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const first = players[i];
      const second = players[j];
      if (first.kart.position.distanceTo(second.kart.position) >= 2.8) continue;

      const starPlayer = first.starTimer > 0 && second.starTimer <= 0 ? first
        : second.starTimer > 0 && first.starTimer <= 0 ? second
        : null;
      const target = starPlayer === first ? second : starPlayer === second ? first : null;
      if (!target || target.spinoutTimer > 0) continue;

      target.spinoutTimer = 3.0;
      target.spinoutAngle = 0;
      target.stunTimer = 3.0;
      target.speed *= 0.4;
      starPlayer.speed *= 0.92;
      playSlipSound();
      playCharacterVoiceline(target.charIndex, 'hit');
    }
  }
}

// =============================================
// DEV MODE
// =============================================
let devModeUnlocked = false;
let gameMode_dev = false;       // true when the actual race is running in dev mode
let devFreecam   = false;       // 9 key toggle
let devDebugMenu = false;       // 8 key toggle
let devHudHidden = false;       // 7 key toggle
let devModeTimer = 0;           // seconds spent in dev mode race, counting up
let devFreecamYaw   = 0;        // freecam look horizontal
let devFreecamPitch = -0.3;     // freecam look vertical (slight downward default)

// Konami-style unlock: press 3,4,5,2 within 4 seconds on the main menu
(function setupDevUnlock() {
  const SEQ = ['Digit3','Digit4','Digit5','Digit2'];
  let progress = 0;
  let resetTimer = null;

  document.addEventListener('keydown', (e) => {
    // Only listen on the main menu (game not running)
    if (raceRunning || gameMode_dev) return;
    if (e.code === SEQ[progress]) {
      progress++;
      if (resetTimer) clearTimeout(resetTimer);
      if (progress === SEQ.length) {
        progress = 0;
        if (!devModeUnlocked) {
          devModeUnlocked = true;
          showDevUnlockFlash();
        }
      } else {
        resetTimer = setTimeout(() => { progress = 0; }, 4000);
      }
    } else {
      progress = 0;
      if (resetTimer) { clearTimeout(resetTimer); resetTimer = null; }
    }
  });
})();

function showDevUnlockFlash() {
  // Add the DEV MODE button if not already present
  const existing = document.getElementById('devModeBtn');
  if (existing) return;

  // Flash banner
  const flash = document.createElement('div');
  flash.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:500;pointer-events:none;';
  flash.innerHTML = '<div style="font-family:\'Comic Sans MS\',cursive;font-size:52px;color:#00ff88;text-shadow:3px 3px 0 #000,0 0 30px #00ff88;animation:devFlash 1.8s ease-out forwards;padding:20px 40px;background:rgba(0,0,0,0.7);border-radius:12px;border:3px solid #00ff88;">🔧 DEV MODE UNLOCKED</div>';
  document.body.appendChild(flash);
  const style = document.createElement('style');
  style.textContent = '@keyframes devFlash{0%{opacity:0;transform:scale(0.6)}20%{opacity:1;transform:scale(1.05)}80%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1)}}';
  document.head.appendChild(style);
  setTimeout(() => flash.remove(), 1800);

  // Inject the DEV MODE button into screenModeSelect
  const modeGroup = document.querySelector('.mode-btn-group');
  if (modeGroup) {
    const btn = document.createElement('button');
    btn.id = 'devModeBtn';
    btn.className = 'mode-btn';
    btn.style.cssText = 'border-color:#00ff88;color:#00ff88;background:linear-gradient(180deg,#001a00,#000800);';
    btn.innerHTML = '🔧 DEV MODE<br><span class="mode-btn-sub" style="color:#aaa">NO CPU</span>';
    btn.onclick = () => selectMode('dev');
    modeGroup.appendChild(btn);
  }
}

// =============================================
// PAUSE SYSTEM — ESC key + DS4 Options button
// =============================================
let _gpOptionsWasPressed = [false, false]; // edge-detect Options button per pad

function togglePause() {
  if (!raceRunning && !racePaused) return; // not in a race
  const _ws = document.getElementById('winScreen');
  if (_ws && _ws.style.display === 'flex') return; // race over — win screen is visible
  if (racePaused) {
    resumeGame();
  } else {
    pauseGame();
  }
}

function pauseGame() {
  if (racePaused) return;
  racePaused = true;
  raceRunning = false;
  pauseStart = Date.now();
  document.getElementById('pauseScreen').style.display = 'flex';
  // Stop engine audio so it doesn't drone on while paused
  if (typeof stopEngineAudio === 'function') stopEngineAudio();
  if (typeof bgmEl !== 'undefined' && bgmEl) bgmEl.pause();
}

function resumeGame() {
  if (!racePaused) return;
  racePaused = false;
  raceRunning = true;
  // Adjust raceStart by the amount of time we were paused so the timer is accurate
  raceStart += (Date.now() - pauseStart);
  document.getElementById('pauseScreen').style.display = 'none';
  // Restart engine audio and BGM
  if (typeof startEngineAudio === 'function') startEngineAudio();
  if (typeof bgmEl !== 'undefined' && bgmEl) bgmEl.play().catch(() => {});
}

// ESC key listener for pause (global, always active)
document.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    // Don't pause during countdown (raceRunning is false but we're not in menu either)
    const _menu = document.getElementById('mainMenu');
    const _ws   = document.getElementById('winScreen');
    if (_menu && _menu.style.display !== 'none') return; // on main menu
    if (_ws   && _ws.style.display   === 'flex') return; // win screen visible
    togglePause();
  }
});

// ── Dev mode freecam state ──
const _devCamPos   = new THREE.Vector3(0, 10, 0);
const _devCamSpeed = 30; // units per second

function updateDevFreecam(delta, camera) {
  // Mouse-look: track pointer lock for yaw/pitch
  // Movement: WASD + Space (up) + Shift (down)
  const spd = _devCamSpeed * delta;
  const fwd = new THREE.Vector3(
    Math.sin(devFreecamYaw) * Math.cos(devFreecamPitch),
    Math.sin(devFreecamPitch),
    Math.cos(devFreecamYaw) * Math.cos(devFreecamPitch)
  );
  const right = new THREE.Vector3(-Math.cos(devFreecamYaw), 0, Math.sin(devFreecamYaw));

  if (keys['KeyW']) _devCamPos.addScaledVector(fwd, spd);
  if (keys['KeyS']) _devCamPos.addScaledVector(fwd, -spd);
  if (keys['KeyA']) _devCamPos.addScaledVector(right, -spd);
  if (keys['KeyD']) _devCamPos.addScaledVector(right, spd);
  if (keys['Space'])      _devCamPos.y += spd;
  if (keys['ShiftLeft'] || keys['ShiftRight']) _devCamPos.y -= spd;

  camera.position.copy(_devCamPos);
  camera.rotation.order = 'YXZ';
  camera.rotation.set(devFreecamPitch, devFreecamYaw, 0, 'YXZ');
}

// Mouse-move handler for freecam look (requires pointer lock)
document.addEventListener('mousemove', (e) => {
  if (!devFreecam) return;
  const sens = 0.002;
  devFreecamYaw   -= e.movementX * sens;
  devFreecamPitch -= e.movementY * sens;
  devFreecamPitch  = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, devFreecamPitch));
});

// ── Dev debug overlay ──
let _devDebugEl = null;
function getDevDebugEl() {
  if (_devDebugEl) return _devDebugEl;
  const el = document.createElement('div');
  el.id = '_devDebug';
  el.className = 'dev-debug-overlay';
  el.style.display = 'none';
  document.body.appendChild(el);
  _devDebugEl = el;
  return el;
}

function updateDevDebugOverlay() {
  const el = getDevDebugEl();
  if (!devDebugMenu || !gameMode_dev) { el.style.display = 'none'; return; }
  el.style.display = 'block';

  const p = players[0];
  const char = CHARACTERS[playerChars[0]];
  const spd  = p ? p.speed.toFixed(4) : '—';
  const input = soloInputMethod;
  const mins  = Math.floor(devModeTimer / 60).toString().padStart(2, '0');
  const secs  = (devModeTimer % 60).toFixed(2).padStart(5, '0');
  const colorHex  = '#' + char.color.toString(16).padStart(6, '0');
  const lbHex     = '#' + char.lightbarColor.toString(16).padStart(6, '0');
  const imgFile   = char.img.split('/').pop();

  // Build banana peel list
  const peelLines = bananaPeels
    .filter(p => p.active)
    .map((p, i) => {
      const pos = p.position;
      return `<span style="color:#aaa">peel-${i+1}:</span> <b>${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}</b>`;
    });

  // Build red shell list
  const shellLines = redShells
    .filter(s => s.active)
    .map((s, i) => {
      const pos = s.mesh1.position;
      return `<span style="color:#aaa">shell-${i+1}:</span> <b>${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}</b>`;
    });

  el.innerHTML = [
    '<b style="color:#00ff88;font-size:16px">🔧 DEV DEBUG</b>',
    `<span style="color:#aaa">Speed (internal):</span> <b>${spd}</b> u/s`,
    `<span style="color:#aaa">Character:</span> <b>${imgFile}</b>`,
    `<span style="color:#aaa">Kart color:</span> <span style="color:${colorHex}">■</span> <b>${colorHex}</b>`,
    `<span style="color:#aaa">Lightbar:</span> <span style="color:${lbHex}">■</span> <b>${lbHex}</b>`,
    `<span style="color:#aaa">Input:</span> <b>${input}</b>`,
    `<span style="color:#aaa">Dev time:</span> <b>${mins}:${secs}</b>`,
    devFreecam ? '<span style="color:#FFD700">📷 FREECAM (9 to exit)</span>' : '',
    devHudHidden ? '<span style="color:#ff8888">👁 HUD HIDDEN (7 to restore)</span>' : '',
    peelLines.length ? '<b style="color:#FFD700;margin-top:4px">🍌 Banana Peels (' + peelLines.length + ')</b>' : '',
    ...peelLines,
    shellLines.length ? '<b style="color:#ff4444;margin-top:4px">🔴 Red Shells (' + shellLines.length + ')</b>' : '',
    ...shellLines,
  ].filter(Boolean).join('<br>');
}

// Stadium wall segments for collision (built once, shared — world-space centre + inward normal + half-depth)
// Each entry: { cx, cz, nx, nz, halfW, halfD, angle }
const stadiumWalls = [];

// =============================================
// ENGINE AUDIO — Web Audio API, one voice per player
// =============================================
let audioCtx = null;
let sfxMasterGain = null; // master gain for all one-shot Web Audio SFX
const engineVoices = [null, null, null, null]; // up to 4 players

function initAudioContext() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  // Single gain node that all one-shot SFX route through — lets the SFX slider
  // control countdown beeps, slip, shell launch/hit, and launch boost/stall sounds.
  sfxMasterGain = audioCtx.createGain();
  sfxMasterGain.gain.value = settings.sfxVol / 100;
  sfxMasterGain.connect(audioCtx.destination);
}

// Build one engine voice. Returns an object with an update(speed) method and a stop() method.
// Architecture per voice:
//   [osc1 sawtooth] ──┐
//   [osc2 sawtooth] ──┼──► [gainNode] ──► [lowpassFilter] ──► [masterGain] ──► destination
//   [noise buf loop] ─┘ (via noiseGain)
function createEngineVoice(ctx, masterGain, idleOffset) {
  // idleOffset: small random Hz nudge so two voices never phase-lock
  const idleBase = 60 + idleOffset;
  const detune   = 1.04 + Math.random() * 0.015; // randomised detune ratio per voice

  // --- oscillators ---
  const osc1 = ctx.createOscillator();
  osc1.type = 'sawtooth';
  osc1.frequency.value = idleBase;

  const osc2 = ctx.createOscillator();
  osc2.type = 'sawtooth';
  osc2.frequency.value = idleBase * detune;

  // --- white noise buffer (1 second, looped) ---
  const bufLen = ctx.sampleRate;
  const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) noiseData[i] = Math.random() * 2 - 1;
  const noiseNode = ctx.createBufferSource();
  noiseNode.buffer = noiseBuf;
  noiseNode.loop = true;

  // --- gains ---
  const oscGain   = ctx.createGain();
  oscGain.gain.value = 0.15;
  const noiseGain  = ctx.createGain();
  noiseGain.gain.value = 0.015; // subtle road grit

  // --- lowpass filter (makes engine sound muffled at low RPM, open at high) ---
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  filter.Q.value = 1.8;

  // --- slight distortion for crunchiness ---
  const waveshaper = ctx.createWaveShaper();
  (function makeDistCurve(amount) {
    const n = 256, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((Math.PI + amount) * x) / (Math.PI + amount * Math.abs(x));
    }
    waveshaper.curve = curve;
    waveshaper.oversample = '2x';
  })(60);

  // --- routing ---
  osc1.connect(oscGain);
  osc2.connect(oscGain);
  noiseNode.connect(noiseGain);
  oscGain.connect(waveshaper);
  noiseGain.connect(waveshaper);
  waveshaper.connect(filter);
  filter.connect(masterGain);

  osc1.start();
  osc2.start();
  noiseNode.start();

  return {
    update(speed) {
      const t = ctx.currentTime;
      // Normalise speed 0→1 (use abs so reverse also sounds right, but quieter)
      const absSpeed = Math.abs(speed);
      const norm = Math.min(absSpeed / MAX_SPEED, 1);
      const reverse = speed < -0.5;

      // Frequency: idle→full throttle, non-linear feel curve; each voice has unique offsets
      const freqBase = idleBase + Math.pow(norm, 0.7) * 148;
      osc1.frequency.setTargetAtTime(freqBase,             t, 0.05);
      osc2.frequency.setTargetAtTime(freqBase * detune,    t, 0.05);

      // Filter cutoff opens up with RPM
      const cutoff = 350 + Math.pow(norm, 0.8) * 3800;
      filter.frequency.setTargetAtTime(cutoff, t, 0.08);

      // Oscillator volume: quiet at idle, full at speed; reverse gets 60% vol
      const oscVol = (0.06 + norm * 0.10) * (reverse ? 0.6 : 1);
      oscGain.gain.setTargetAtTime(oscVol, t, 0.04);

      // Noise: more road roar at speed
      noiseGain.gain.setTargetAtTime(0.008 + norm * 0.025, t, 0.06);
    },
    stop() {
      try {
        osc1.stop(); osc2.stop(); noiseNode.stop();
        osc1.disconnect(); osc2.disconnect(); noiseNode.disconnect();
        oscGain.disconnect(); noiseGain.disconnect();
        waveshaper.disconnect(); filter.disconnect();
      } catch(e) { /* already stopped */ }
    }
  };
}

function startEngineAudio() {
  initAudioContext();
  if (!audioCtx) return;
  stopEngineAudio(); // clean up any previous voices

  // Create one engine voice per player (solo: P1 + CPUs, coop: 2 players)
  const numVoices = players.length;
  // Pan spread: -0.4 (left) to +0.4 (right) evenly distributed
  for (let i = 0; i < numVoices; i++) {
    const masterGain = audioCtx.createGain();
    masterGain.gain.value = (settings.sfxVol / 100) * 0.12;

    // Subtle stereo pan per player
    const panVal = numVoices === 1 ? 0 : ((i / (numVoices - 1)) * 0.8 - 0.4);
    const panner = audioCtx.createStereoPanner ? audioCtx.createStereoPanner() : null;
    if (panner) {
      panner.pan.value = panVal;
      masterGain.connect(panner);
      panner.connect(audioCtx.destination);
    } else {
      masterGain.connect(audioCtx.destination);
    }

    const detune = i === 0 ? 0 : 5 + Math.random() * 8 + i * 3; // each CPU has a different pitch
    const voice = createEngineVoice(audioCtx, masterGain, detune);
    voice.masterGain = masterGain; // expose so applySettings() can reach it
    engineVoices[i] = voice;
  }
}

function stopEngineAudio() {
  engineVoices.forEach((v, i) => {
    if (v) { v.stop(); engineVoices[i] = null; }
  });
}

// ── COUNTDOWN BEEPS (Mario Kart style: 3 low + 1 high GO) ──
function playCountdownBeeps() {
  initAudioContext();
  if (!audioCtx) return;
  // Beep at t+0, t+0.9, t+1.8 (low), then high GO beep at t+2.7
  const beepTimes = [0, 0.9, 1.8];
  beepTimes.forEach(offset => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 480; // low beep
    gain.gain.setValueAtTime(0, audioCtx.currentTime + offset);
    gain.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + offset + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + offset + 0.35);
    osc.connect(gain);
    gain.connect(sfxMasterGain);
    osc.start(audioCtx.currentTime + offset);
    osc.stop(audioCtx.currentTime + offset + 0.4);
  });
  // GO! — higher pitch, longer
  const goOsc = audioCtx.createOscillator();
  const goGain = audioCtx.createGain();
  goOsc.type = 'sine';
  goOsc.frequency.value = 960; // high GO beep
  goGain.gain.setValueAtTime(0, audioCtx.currentTime + 2.7);
  goGain.gain.linearRampToValueAtTime(0.45, audioCtx.currentTime + 2.71);
  goGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 3.4);
  goOsc.connect(goGain);
  goGain.connect(sfxMasterGain);
  goOsc.start(audioCtx.currentTime + 2.7);
  goOsc.stop(audioCtx.currentTime + 3.5);
}

// ── BACKGROUND MUSIC via <audio> element ──
let bgmEl = null;
const activeSfxAudio = new Set();

function playSfxAudio(src) {
  const el = document.createElement('audio');
  el.src = src;
  el.volume = settings.sfxVol / 100;
  const cleanup = () => {
    activeSfxAudio.delete(el);
    el.remove();
  };
  el.onended = cleanup;
  el.onerror = cleanup;
  activeSfxAudio.add(el);
  document.body.appendChild(el);
  el.play().catch(cleanup);
}

function startBGM() {
  if (!bgmEl) {
    bgmEl = document.createElement('audio');
    bgmEl.src = 'assets/main-theme.mp3';
    bgmEl.loop = true;
    bgmEl.volume = settings.musicVol / 100;
    document.body.appendChild(bgmEl);
  }
  bgmEl.currentTime = 0;
  bgmEl.play().catch(() => {}); // silently ignore autoplay block (already unlocked by button click)
}

function stopBGM() {
  if (bgmEl) {
    bgmEl.pause();
    bgmEl.currentTime = 0;
  }
}
let winSoundEl = null;
function playWinSound() {
  if (!winSoundEl) {
    winSoundEl = document.createElement('audio');
    winSoundEl.src = 'assets/win.mp3';
    winSoundEl.volume = settings.sfxVol / 100;
    document.body.appendChild(winSoundEl);
  }
  winSoundEl.currentTime = 0;
  winSoundEl.play().catch(() => {});
}


// ── CHARACTER VOICELINES ──
// Plays the hit or win voiceline for a character if they have one.
// type: 'hit' | 'win'
// Runs via a fresh <audio> element each call so voicelines overlap freely
// with existing Web Audio SFX (engine, shell, slip, etc.) and with each other.
function playCharacterVoiceline(charIndex, type) {
  const char = CHARACTERS[charIndex];
  if (!char || !char.voicelines || char.voicelines.length === 0) return;
  const line = char.voicelines.find(path => path.includes(type));
  if (!line) return;
  const el = document.createElement('audio');
  el.src = line;
  el.volume = settings.voicelineVol / 100;
  // Clean up the element once it finishes (or errors) so we don't leak DOM nodes
  el.onended = () => el.remove();
  el.onerror = () => el.remove();
  document.body.appendChild(el);
  el.play().catch(() => {});
}

function updateEngineAudio() {
  if (!audioCtx || !raceRunning) return;
  players.forEach((p, i) => {
    if (engineVoices[i]) {
      // Lightning pitch shift: pass a boosted virtual speed so the engine sounds higher-pitched
      const virtualSpeed = p._lightningPitchShift ? Math.abs(p.speed) * 2.2 + MAX_SPEED * 0.4 : p.speed;
      engineVoices[i].update(virtualSpeed);
    }
  });
}

// =============================================
// BUILD SCENE
// =============================================
function buildScene(sceneObj) {
  sceneObj.background = new THREE.Color(0x1a0033);
  sceneObj.fog = new THREE.Fog(0x1a0033, 150, 500);

  sceneObj.add(new THREE.AmbientLight(0xffffff, 0.7));
  const sun = new THREE.DirectionalLight(0xfff0cc, 1.2);
  sun.position.set(20, 50, 20);
  sun.castShadow = settings.shadows;
  // Shadow map resolution — 2048 gives crisp shadows; drop to 1024 if perf is an issue
  sun.shadow.mapSize.width  = 2048;
  sun.shadow.mapSize.height = 2048;
  // Frustum large enough to cover the whole track (~220 units across)
  sun.shadow.camera.near   =  1;
  sun.shadow.camera.far    = 400;
  sun.shadow.camera.left   = -200;
  sun.shadow.camera.right  =  200;
  sun.shadow.camera.top    =  200;
  sun.shadow.camera.bottom = -200;
  sun.shadow.bias          = -0.001; // prevents shadow acne on flat surfaces
  sceneObj.add(sun);

  // Ground plane
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 1200, 40, 40),
    new THREE.MeshLambertMaterial({ color: 0x3a6b22 })
  );
  ground.rotation.x = -Math.PI/2;
  ground.position.set(35, -0.05, 55);
  ground.receiveShadow = settings.shadows;
  sceneObj.add(ground);

  // Stars in sky
  for (let i = 0; i < 60; i++) {
    const star = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 4, 4),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    star.position.set((Math.random()-0.5)*300, 20+Math.random()*80, (Math.random()-0.5)*300);
    sceneObj.add(star);
  }

  buildTrack(sceneObj);
  addDecorations(sceneObj);
  return sceneObj;
}

function buildTrack(sceneObj) {
  const N = TRACK_SAMPLES;
  const hw = TRACK_WIDTH / 2;
  const verts = [], inds = [], colors = [], uvs = [];

  for (let i = 0; i <= N; i++) {
    const t0 = i / N;
    const p = TRACK_CURVE.getPoint(t0);
    const tan = TRACK_CURVE.getTangent(t0).normalize();
    const perp = new THREE.Vector3(-tan.z, 0, tan.x);

    const L = p.clone().addScaledVector(perp, -hw);
    const R = p.clone().addScaledVector(perp,  hw);

    verts.push(L.x, 0.01, L.z,  R.x, 0.01, R.z);
    uvs.push(0, t0 * 40,  1, t0 * 40);

    const asphalt = (i % 20 < 2) ? [0.23,0.23,0.25] : [0.17,0.17,0.19];
    colors.push(...asphalt, ...asphalt);

    if (i < N) {
      const b = i * 2;
      inds.push(b, b+1, b+2,  b+1, b+3, b+2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(inds);
  geo.computeVertexNormals();
  const trackMesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  trackMesh.receiveShadow = settings.shadows;
  sceneObj.add(trackMesh);

  // Kerbs — build N+1 rings where ring N is a copy of ring 0's *positions*.
  // This guarantees the closing quad's far edge lands exactly on ring 0,
  // sealing the loop with no gap, no spike, and no twisted geometry.
  for (let side = -1; side <= 1; side += 2) {
    const kVerts = [], kInds = [], kCols = [];

    // Collect the N ring positions first so we can copy ring 0 at the end.
    const rings = [];
    for (let i = 0; i < N; i++) {
      const t    = i / N;
      const p    = TRACK_CURVE.getPoint(t);
      const tan  = TRACK_CURVE.getTangent(t).normalize();
      const perp = new THREE.Vector3(-tan.z, 0, tan.x);
      const inner = p.clone().addScaledVector(perp, side * hw);
      const outer = p.clone().addScaledVector(perp, side * (hw + 2.8));
      rings.push({ inner, outer });
    }

    // Push N rings then close with an exact copy of ring 0's positions.
    for (let i = 0; i <= N; i++) {
      const { inner, outer } = rings[i % N]; // ring N reuses ring 0 positions exactly
      kVerts.push(inner.x, 0.02, inner.z,  outer.x, 0.02, outer.z);
      const kColor = Math.floor(i / 3) % 2 === 0 ? [1,0.1,0.1] : [1,1,1];
      kCols.push(...kColor, ...kColor);
    }

    // N quads, each connecting ring i to ring i+1 — no wrap-around needed.
    for (let i = 0; i < N; i++) {
      const b  = i * 2;
      const nb = (i + 1) * 2;
      if (side === 1) {
        kInds.push(b, b+1, nb,  b+1, nb+1, nb);
      } else {
        kInds.push(nb, b+1, b,  nb, nb+1, b+1);
      }
    }

    const kg = new THREE.BufferGeometry();
    kg.setAttribute('position', new THREE.Float32BufferAttribute(kVerts, 3));
    kg.setAttribute('color',    new THREE.Float32BufferAttribute(kCols, 3));
    kg.setIndex(kInds);
    kg.computeVertexNormals();
    const kerbMesh = new THREE.Mesh(kg, new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }));
    kerbMesh.renderOrder = 1;
    kerbMesh.receiveShadow = settings.shadows;
    sceneObj.add(kerbMesh);
  }

  // Centre dashed line
  for (let i = 0; i < N; i += 4) {
    const t = i / N;
    const p = TRACK_CURVE.getPoint(t);
    const p2 = TRACK_CURVE.getPoint((i+2)/N);
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.Float32BufferAttribute([p.x,0.03,p.z, p2.x,0.03,p2.z], 3));
    sceneObj.add(new THREE.Line(dg, new THREE.LineBasicMaterial({ color: 0xFFDD00 })));
  }

  // Start/Finish — flat 2D chequered texture decal on the asphalt
  const sfTan = TRACK_CURVE.getTangent(0).normalize();
  const sfPerp = new THREE.Vector3(-sfTan.z, 0, sfTan.x);
  const sfOrigin = TRACK_CURVE.getPoint(0);

  const flCols = 12, flRows = 4;
  const flCanvas = document.createElement('canvas');
  flCanvas.width  = flCols * 32;
  flCanvas.height = flRows * 32;
  const flCtx = flCanvas.getContext('2d');
  for (let ci = 0; ci < flCols; ci++) {
    for (let ri = 0; ri < flRows; ri++) {
      flCtx.fillStyle = (ci + ri) % 2 === 0 ? '#ffffff' : '#000000';
      flCtx.fillRect(ci * 32, ri * 32, 32, 32);
    }
  }
  const flTex = new THREE.CanvasTexture(flCanvas);
  flTex.anisotropy = 4;

  const flW = TRACK_WIDTH;
  const flD = 4.5;
  const flGeo = new THREE.PlaneGeometry(flW, flD);
  const flMat = new THREE.MeshBasicMaterial({ map: flTex, transparent: false, depthWrite: true,
    polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
  const flMesh = new THREE.Mesh(flGeo, flMat);

  const flAngle = Math.atan2(sfTan.x, sfTan.z);
  flMesh.rotation.x = -Math.PI / 2;
  flMesh.rotation.z = -flAngle;
  flMesh.position.set(sfOrigin.x, 0.04, sfOrigin.z);
  flMesh.renderOrder = 2;
  sceneObj.add(flMesh);
}

// =============================================
// ON-TRACK CHECK
// =============================================
function isOnTrack(pos) {
  let minDist = Infinity;
  for (let i = 0; i < TRACK_WAYPOINTS.length; i += 2) {
    const p = TRACK_WAYPOINTS[i];
    const dx = pos.x - p.x, dz = pos.z - p.z;
    const d = Math.sqrt(dx*dx + dz*dz);
    if (d < minDist) minDist = d;
    if (minDist < 4) break;
  }
  return minDist < TRACK_WIDTH / 2 + 3;
}

function addDecorations(sceneObj) {
  // Trees removed

  // ── FULL STADIUM: stands placed outside every track segment ──
  const STADIUM_OFFSET = 26;
  const STAND_SEGMENT = 18;
  const STAND_H = 7;
  const STAND_D = 8;
  const standMat = new THREE.MeshLambertMaterial({ color: 0x778899 });
  const roofMat  = new THREE.MeshLambertMaterial({ color: 0xCC3300 });
  const seatColors = [0x1144CC, 0xCC1111, 0xFFDD00, 0x119922, 0xAA22CC];

  const STAND_SAMPLES = 80;
  for (let si = 0; si < STAND_SAMPLES; si++) {
    const t = si / STAND_SAMPLES;
    const pt = TRACK_CURVE.getPoint(t);
    const tan = TRACK_CURVE.getTangent(t).normalize();
    const perp = new THREE.Vector3(-tan.z, 0, tan.x);
    const standAngle = Math.atan2(tan.x, tan.z);

    for (const side of [-1, 1]) {
      const ox = pt.x + perp.x * side * (TRACK_WIDTH / 2 + STADIUM_OFFSET);
      const oz = pt.z + perp.z * side * (TRACK_WIDTH / 2 + STADIUM_OFFSET);

      const stand = new THREE.Mesh(new THREE.BoxGeometry(STAND_SEGMENT, STAND_H, STAND_D), standMat);
      stand.position.set(ox, STAND_H / 2, oz);
      stand.rotation.y = standAngle;
      stand.traverse(obj => { if (obj.isMesh) { obj.receiveShadow = settings.shadows; obj.castShadow = settings.shadows; } });
      sceneObj.add(stand);

      // Register this stand's OBB for collision (only once, not duplicated per scene)
      if (sceneObj === scenes[0] || scenes.length === 0) {
        stadiumWalls.push({
          cx: ox, cz: oz,
          halfW: STAND_SEGMENT / 2,
          halfD: STAND_D / 2,
          cosA: Math.cos(standAngle),
          sinA: Math.sin(standAngle),
        });
      }

      const roof = new THREE.Mesh(new THREE.BoxGeometry(STAND_SEGMENT + 1, 0.4, STAND_D + 3), roofMat);
      roof.position.set(ox, STAND_H + 0.2, oz);
      roof.rotation.y = standAngle;
      sceneObj.add(roof);

      for (let row = 0; row < 3; row++) {
        const seatCol = seatColors[(si * 3 + row + (side > 0 ? 2 : 0)) % seatColors.length];
        const rowMesh = new THREE.Mesh(
          new THREE.BoxGeometry(STAND_SEGMENT - 0.5, 0.6, 0.8),
          new THREE.MeshLambertMaterial({ color: seatCol })
        );
        rowMesh.position.set(
          ox + perp.x * side * -1.5,
          1.0 + row * 1.8,
          oz + perp.z * side * -1.5
        );
        rowMesh.rotation.y = standAngle;
        sceneObj.add(rowMesh);
      }

      for (let pi = -1; pi <= 1; pi += 2) {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.4, STAND_H, 6),
          new THREE.MeshLambertMaterial({ color: 0x555566 })
        );
        pillar.position.set(
          ox + Math.cos(standAngle) * pi * (STAND_SEGMENT / 2 - 1),
          STAND_H / 2,
          oz - Math.sin(standAngle) * pi * (STAND_SEGMENT / 2 - 1)
        );
        sceneObj.add(pillar);
      }
    }
  }

  // Item boxes are added by startGame(), not here.
}

// Shared item-box texture (created once)
let _itemBoxTex = null;
function getItemBoxTexture() {
  if (_itemBoxTex) return _itemBoxTex;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  // Gold background
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(0, 0, 64, 64);
  // Dark border
  ctx.strokeStyle = '#7A5000';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, 60, 60);
  // Inner border highlight
  ctx.strokeStyle = '#FFF8A0';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, 52, 52);
  // Question mark
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 38px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', 32, 34);
  _itemBoxTex = new THREE.CanvasTexture(c);
  return _itemBoxTex;
}

function makeItemBox() {
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(1.4, 1.4, 1.4);
  const tex = getItemBoxTexture();
  // Same texture on all 6 faces
  const mats = Array(6).fill(null).map(() =>
    new THREE.MeshLambertMaterial({ map: tex })
  );
  const mesh = new THREE.Mesh(geo, mats);
  group.add(mesh);
  // Thin black edge outline
  const edgeGeo = new THREE.EdgesGeometry(geo);
  group.add(new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0x553300 })));
  group._spin = 1.2; // picked up by the animation loop
  group.traverse(obj => { if (obj.isMesh) { obj.castShadow = settings.shadows; obj.receiveShadow = settings.shadows; } });
  return group;
}

// =============================================
// KART BUILDER
// =============================================
function buildKart(charIndex, scene) {
  const char = CHARACTERS[charIndex];
  const group = new THREE.Group();

  const bodyMat     = new THREE.MeshLambertMaterial({ color: char.color });
  const bodyDarkMat = new THREE.MeshLambertMaterial({ color: 0x111111 });  // cockpit surround / sidepod accent
  const bodyMidMat  = new THREE.MeshLambertMaterial({ color: 0x1a1a1a }); // underbelly / floor

  // ── MAIN BODY ────────────────────────────────────────────────────────────
  // Central tub — extended length to cover the wheel axles front and rear
  const tubGeo = new THREE.BoxGeometry(1.6, 0.72, 3.6);
  const tub = new THREE.Mesh(tubGeo, bodyMat);
  tub.position.set(0, 0.06, -0.0);
  group.add(tub);

  // Floor pan — wide flat slab that gives karts their low-slung look
  const floorGeo = new THREE.BoxGeometry(2.05, 0.18, 3.4);
  const floor = new THREE.Mesh(floorGeo, bodyMidMat);
  floor.position.set(0, -0.31, -0.05);
  group.add(floor);

  // Left sidepod — flat panel running alongside the tub
  const podGeoL = new THREE.BoxGeometry(0.22, 0.44, 2.4);
  const podL = new THREE.Mesh(podGeoL, bodyMat);
  podL.position.set(-0.91, -0.04, -0.2);
  group.add(podL);

  // Right sidepod
  const podR = new THREE.Mesh(podGeoL, bodyMat);
  podR.position.set( 0.91, -0.04, -0.2);
  group.add(podR);

  // Sidepod accent strips — dark trim along the outer face of each pod
  const stripGeo = new THREE.BoxGeometry(0.05, 0.30, 2.3);
  const stripL = new THREE.Mesh(stripGeo, bodyDarkMat);
  stripL.position.set(-1.03, -0.04, -0.2);
  group.add(stripL);
  const stripR = new THREE.Mesh(stripGeo, bodyDarkMat);
  stripR.position.set( 1.03, -0.04, -0.2);
  group.add(stripR);

  // ── NOSE / FRONT WING ────────────────────────────────────────────────────
  // Nose tip — very narrow wedge that sticks out further and tapers to a point
  // Tub front face is at z = 0.0 + 3.6/2 = 1.8
  // noseTip length = 0.85, so center = 1.8 + 0.425 = 2.225 to sit flush
  // Y matches tub vertical center (0.06) so it doesn't float
  const noseTipGeo = new THREE.CylinderGeometry(0.01, 0.38, 0.85, 8);
  const noseTip = new THREE.Mesh(noseTipGeo, bodyMat);
  noseTip.rotation.x = Math.PI / 2; // flip: wide base at rear blending into cone, point faces forward
  noseTip.position.set(0, 0.06, 2.225);
  group.add(noseTip);

  // Front wing main plane — wide flat element beneath the nose
  // Nose tip point is at z = 2.65, y = 0.06.
  // Wing is centered at z=2.65 so it sits directly under the tip,
  // and raised to y=-0.10 so it visually connects to the cone point.
  const fwMainGeo = new THREE.BoxGeometry(2.1, 0.06, 0.6);
  const fwMain = new THREE.Mesh(fwMainGeo, bodyMat);
  fwMain.position.set(0, 0.06, 2.4);
  group.add(fwMain);

  // Front wing end plates — dedicated material with polygonOffset so the dark faces
  // always render in front of the main wing surface, properly eliminating z-fighting.
  const fwEndMat = new THREE.MeshLambertMaterial({
    color: 0x111111,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const fwEndGeo = new THREE.BoxGeometry(0.06, 0.18, 0.64);
  const fwEndL = new THREE.Mesh(fwEndGeo, fwEndMat);
  fwEndL.position.set(-1.02, 0.09, 2.4);
  group.add(fwEndL);
  const fwEndR = new THREE.Mesh(fwEndGeo, fwEndMat);
  fwEndR.position.set( 1.02, 0.09, 2.4);
  group.add(fwEndR);

  // ── COCKPIT SURROUND — F1-style monocoque opening ────────────────────────
  // Outer rim — the high sides of the cockpit surround (body colour)
  const rimGeo = new THREE.BoxGeometry(1.62, 0.18, 1.4);
  const rim = new THREE.Mesh(rimGeo, bodyDarkMat);
  rim.position.set(0, 0.44, 0.3);
  group.add(rim);

  // F1 seating hole — black recessed walls forming an open-top cockpit tub.
  // Wide enough for even the widest sprite characters.
  const cockpitWallMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
  // Left wall
  const cwGeo = new THREE.BoxGeometry(0.14, 0.38, 1.3);
  const cwL = new THREE.Mesh(cwGeo, cockpitWallMat);
  cwL.position.set(-0.68, 0.52, 0.25);
  group.add(cwL);
  // Right wall
  const cwR = new THREE.Mesh(cwGeo, cockpitWallMat);
  cwR.position.set( 0.68, 0.52, 0.25);
  group.add(cwR);
  // Rear wall
  const cwRearGeo = new THREE.BoxGeometry(1.5, 0.38, 0.14);
  const cwRear = new THREE.Mesh(cwRearGeo, cockpitWallMat);
  cwRear.position.set(0, 0.52, -0.4);
  group.add(cwRear);
  // Front lip (shorter — open at top like F1)
  const cwFrontGeo = new THREE.BoxGeometry(1.5, 0.18, 0.14);
  const cwFront = new THREE.Mesh(cwFrontGeo, cockpitWallMat);
  cwFront.position.set(0, 0.42, 0.9);
  group.add(cwFront);
  // Floor of the hole — flat black base
  const cwFloorGeo = new THREE.BoxGeometry(1.5, 0.06, 1.3);
  const cwFloor = new THREE.Mesh(cwFloorGeo, cockpitWallMat);
  cwFloor.position.set(0, 0.34, 0.25);
  group.add(cwFloor);

  // ── Character initial on tub nose ────────────────────────────────────────
  // Small Comic Sans letter on a flat canvas plane, sits on top of the tub
  // near the nose cone.
  const initialCanvas = document.createElement('canvas');
  initialCanvas.width  = 128;
  initialCanvas.height = 128;
  const ictx = initialCanvas.getContext('2d');
  ictx.clearRect(0, 0, 128, 128);
  ictx.font = 'bold 88px "Comic Sans MS", "Comic Sans", cursive';
  ictx.fillStyle = '#111111';
  ictx.textAlign = 'center';
  ictx.textBaseline = 'middle';
  ictx.fillText(char.name.charAt(0).toUpperCase(), 64, 64);
  const initialTex = new THREE.CanvasTexture(initialCanvas);
  const initialMat = new THREE.MeshBasicMaterial({ map: initialTex, transparent: true, depthWrite: false });
  const initialPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), initialMat);
  initialPlane.rotation.x = -Math.PI / 2; // lay flat on top of tub
  initialPlane.position.set(0, 0.43, 1.3); // near the nose, on top of tub
  group.add(initialPlane);

  // Front fairing — slopes up from nose to cockpit (purely visual wedge)
  const fairingGeo = new THREE.CylinderGeometry(0.25, 0.55, 0.6, 8, 1, false, Math.PI * 0.1, Math.PI * 0.8);
  const fairing = new THREE.Mesh(fairingGeo, bodyMat);
  fairing.position.set(0, 0.1, 1.35);
  group.add(fairing);

  // ── REAR BODYWORK ─────────────────────────────────────────────────────────
  // Engine cover hump behind the seat
  const humpGeo = new THREE.CylinderGeometry(0.28, 0.48, 0.7, 10, 1, false, 0, Math.PI);
  const hump = new THREE.Mesh(humpGeo, bodyMat);
  hump.rotation.z = Math.PI;    // dome faces upward
  hump.rotation.y = Math.PI / 2;
  hump.position.set(0, 0.36, -0.85);
  group.add(hump);

  const wheelMat    = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const hubMat      = new THREE.MeshLambertMaterial({ color: 0xCCCCCC });
  const axleMat     = new THREE.MeshLambertMaterial({ color: 0x444444 });
  const tyreSidemat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

  // Wheel hierarchy per corner:
  //   wheelGroup  ← no parent tilt; local X = world X = axle direction
  //     ├─ tyre cylinder  (mesh.rotation.z=PI/2 bakes its axis along X, wheel stands upright)
  //     ├─ torus sidewall (mesh.rotation.y=PI/2 rings around the X axle)
  //     ├─ hub            (mesh.rotation.z=PI/2 same as tyre)
  //     └─ spokes         (radiate in YZ plane, rotated around X)
  //
  // wheelGroup.rotation.x += rollDelta  → rotates around the X axle = forward/back rolling. ✅

  function makeWheel() {
    const wheelGroup = new THREE.Group();

    // Tyre cylinder — rotate geometry so its axis runs along X (sideways/axle direction)
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.38, 16), wheelMat);
    tyre.rotation.z = Math.PI / 2;
    wheelGroup.add(tyre);

    // Torus sidewall — lies flat in XY by default, which is exactly what we want
    // (it rings around the tread, perpendicular to the X axle)
    const sidewall = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 8, 20), tyreSidemat);
    sidewall.rotation.y = Math.PI / 2;
    wheelGroup.add(sidewall);

    // Hub — same cylinder-along-X orientation
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.40, 8), hubMat);
    hub.rotation.z = Math.PI / 2;
    wheelGroup.add(hub);

    // Five spokes radiating in the YZ plane (perpendicular to the X axle).
    // Each spoke is a thin box, long along Y, rotated around X to fan out like clock hands.
    const spokeMat = new THREE.MeshLambertMaterial({ color: 0xAAAAAA });
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      // Spoke box: thin in X (axle direction), tall in Y, narrow in Z
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.38, 0.06), spokeMat);
      // Rotate around X so each spoke points in a different direction in the YZ plane
      spoke.rotation.x = angle;
      // Offset along the spoke's local Y so it starts near the hub
      spoke.position.set(0, Math.sin(angle) * 0.19, Math.cos(angle) * 0.19);
      wheelGroup.add(spoke);
    }

    return wheelGroup;
  }

  // Axle pivot groups — front one also steers (rotation.y)
  const frontAxlePivot = new THREE.Group();
  frontAxlePivot.position.set(0, -0.35, 1.2);
  group.add(frontAxlePivot);

  const rearAxlePivot = new THREE.Group();
  rearAxlePivot.position.set(0, -0.35, -1.2);
  group.add(rearAxlePivot);

  // Axle rod — cylinder along X
  function addAxleRod(pivot) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), axleMat);
    rod.rotation.z = Math.PI / 2;
    pivot.add(rod);
  }
  addAxleRod(frontAxlePivot);
  addAxleRod(rearAxlePivot);

  // Returns array of wheelGroups (what we rotate for rolling)
  function addWheelPair(pivot) {
    const wheelGroups = [];
    for (const side of [-1, 1]) {
      const wheelGroup = makeWheel();
      wheelGroup.position.set(side * 1.15, 0, 0);
      pivot.add(wheelGroup);
      wheelGroups.push(wheelGroup);
    }
    return wheelGroups;
  }

  const frontWheels = addWheelPair(frontAxlePivot);
  const rearWheels  = addWheelPair(rearAxlePivot);

  group.userData.frontAxlePivot = frontAxlePivot;
  group.userData.frontWheels    = frontWheels;  // array of spinGroups
  group.userData.rearWheels     = rearWheels;   // array of spinGroups
  group.userData.steerAngle     = 0;

  // Seat — reclined bucket seat inside cockpit surround
  const seatMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  // Main seat base
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 1.1), seatMat);
  seat.position.set(0, 0.45, 0.25);
  group.add(seat);
  // Seat back — angled slightly back for driver comfort (lol)
  const seatBack = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 0.12), seatMat);
  seatBack.position.set(0, 0.66, -0.31);
  seatBack.rotation.x = 0.15; // slight recline
  group.add(seatBack);
  // Seat sides / bolsters
  const bolsterGeo = new THREE.BoxGeometry(0.10, 0.35, 0.9);
  const bolsterL = new THREE.Mesh(bolsterGeo, seatMat);
  bolsterL.position.set(-0.56, 0.62, 0.2);
  group.add(bolsterL);
  const bolsterR = new THREE.Mesh(bolsterGeo, seatMat);
  bolsterR.position.set( 0.56, 0.62, 0.2);
  group.add(bolsterR);

  // 3D Spoiler — two uprights + horizontal wing blade at the rear
  const spoilerMat  = new THREE.MeshLambertMaterial({ color: char.color });
  const spoilerDark = new THREE.MeshLambertMaterial({ color: 0x111111 });

  // Left upright
  const uprightGeo = new THREE.BoxGeometry(0.12, 0.55, 0.12);
  const uprightL = new THREE.Mesh(uprightGeo, spoilerDark);
  uprightL.position.set(-0.72, 0.72, -1.55);
  group.add(uprightL);

  // Right upright
  const uprightR = new THREE.Mesh(uprightGeo, spoilerDark);
  uprightR.position.set( 0.72, 0.72, -1.55);
  group.add(uprightR);

  // Wing blade — angled upward like a real spoiler
  const wingGeo = new THREE.BoxGeometry(2.0, 0.10, 0.55);
  const wing = new THREE.Mesh(wingGeo, spoilerMat);
  wing.position.set(0, 1.02, -1.55);
  wing.rotation.x = Math.PI * 0.18; // ~32° tilt so it reads as a raised wing
  group.add(wing);

  // Thin end plates on each tip of the blade
  const endPlateGeo = new THREE.BoxGeometry(0.08, 0.28, 0.55);
  const endPlateL = new THREE.Mesh(endPlateGeo, spoilerMat);
  endPlateL.position.set(-0.96, 1.02, -1.55);
  endPlateL.rotation.x = Math.PI * 0.18;
  group.add(endPlateL);

  const endPlateR = new THREE.Mesh(endPlateGeo, spoilerMat);
  endPlateR.position.set( 0.96, 1.02, -1.55);
  endPlateR.rotation.x = Math.PI * 0.18;
  group.add(endPlateR);

  // ── Dual exhaust pipes — lower rear of kart ──
  const exhaustGunmetal = new THREE.MeshLambertMaterial({ color: 0x4a4a4a }); // dark gunmetal outer
  const exhaustRim      = new THREE.MeshLambertMaterial({ color: 0x6a6a6a }); // slightly lighter rim ring
  const exhaustDark     = new THREE.MeshLambertMaterial({ color: 0x111111 }); // near-black inner mouth

  [-0.22, 0.22].forEach((xOffset) => {
    const pipeGroup = new THREE.Group();

    // Main pipe body — tapered slightly toward the mouth like real exhaust tips
    const pipeGeo = new THREE.CylinderGeometry(0.13, 0.155, 0.55, 14);
    const pipe = new THREE.Mesh(pipeGeo, exhaustGunmetal);
    pipe.rotation.x = Math.PI / 2; // lay along Z axis, pointing out the back
    pipeGroup.add(pipe);

    // Outer lip ring — sits right at the exit, slightly lighter to catch light
    const flareGeo = new THREE.TorusGeometry(0.155, 0.025, 8, 18);
    const flare = new THREE.Mesh(flareGeo, exhaustRim);
    flare.position.z = -0.27;
    pipeGroup.add(flare);

    // Dark inner mouth disc — sells the hollow pipe look
    const mouthGeo = new THREE.CircleGeometry(0.128, 14);
    const mouth = new THREE.Mesh(mouthGeo, exhaustDark);
    mouth.position.z = -0.285;
    pipeGroup.add(mouth);

    // Subtle darker band near exit — like heat discoloration on real exhausts
    const bandGeo = new THREE.TorusGeometry(0.138, 0.016, 6, 14);
    const bandMat = new THREE.MeshLambertMaterial({ color: 0x2e2e2e });
    const band = new THREE.Mesh(bandGeo, bandMat);
    band.position.z = -0.17;
    pipeGroup.add(band);

    // Tight cluster, centered, no outward splay — pipes point straight back with a downward droop
    pipeGroup.position.set(xOffset, -0.12, -1.72);
    pipeGroup.rotation.x = 0.18; // more pronounced downward tilt like the reference

    group.add(pipeGroup);
  });

  // 2D sprite character
  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = 128; spriteCanvas.height = 128;
  const ctx = spriteCanvas.getContext('2d');
  const spriteTex = new THREE.CanvasTexture(spriteCanvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex, transparent: true }));
  sprite.scale.set(2.2, 2.2, 1);
  sprite.position.set(0, 1.6, 0.3);
  group.add(sprite);
  group.userData.charSprite = sprite; // expose for flip logic

  const img = new Image();
  img.crossOrigin = '';
  img.onload = () => {
    ctx.clearRect(0,0,128,128);
    const aspect = img.width / img.height;
    let dw = 120, dh = 120;
    if (aspect > 1) dh = dw / aspect;
    else dw = dh * aspect;
    ctx.drawImage(img, (128-dw)/2, (128-dh)/2, dw, dh);
    spriteTex.needsUpdate = true;
  };
  img.onerror = () => {
    ctx.fillStyle = '#' + char.color.toString(16).padStart(6,'0');
    ctx.fillRect(10,10,108,108);
    ctx.fillStyle = '#fff';
    ctx.font = '64px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('?', 64, 80);
    spriteTex.needsUpdate = true;
  };
  img.src = char.img;

  // Make every mesh in the kart cast and receive shadows (respects settings)
  group.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow    = settings.shadows;
      obj.receiveShadow = settings.shadows;
    }
  });

  // Blob shadow under the character sprite — a flat dark disc on the ground.
  // Sprites can't cast shadowmap shadows, so this classic trick fills the gap.
  const blobGeo = new THREE.CircleGeometry(0.8, 16);
  const blobMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const blobShadow = new THREE.Mesh(blobGeo, blobMat);
  blobShadow.rotation.x = -Math.PI / 2;
  blobShadow.position.set(0, -0.84 + 0.01, 0.3); // just above ground (kart origin is 0.85 up)
  blobShadow.renderOrder = 2;
  group.add(blobShadow);

  scene.add(group);
  return group;
}

// =============================================
// PLAYER PHYSICS
// =============================================
function createPlayer(charIndex, startPos, startAngle, scene) {
  const kartGroup = buildKart(charIndex, scene);
  kartGroup.position.copy(startPos);
  kartGroup.rotation.y = startAngle;

  return {
    kart: kartGroup,
    angle: startAngle,
    speed: 0,
    lap: 1,
    checkpoint: 0,
    lastCheckpoint: -1,
    finishTime: null,
    item: null,
    itemCooldown: 0,
    stunTimer: 0,
    spinoutTimer: 0,   // > 0 while spinning from a banana
    spinoutAngle: 0,   // accumulated extra rotation during spinout
    bananaImmune: 0,   // > 0 = immune to banana peels (just threw one)
    starTimer: 0,      // > 0 while star power-up is active (10s)
    boostTimer: 0,     // > 0 while boost is active (3s)
    charIndex,
    camDist: 14,
    camHeight: 6,
    // ── Rocket start state ──
    launchResult: null,      // null | 'boost' | 'stall' | 'normal' — resolved at GO
    launchStallTimer: 0,     // > 0 = engine stalled, can't move forward
    launchBoostTimer: 0,     // > 0 = launch boost active (separate from item boost)
    launchHoldStart: null,   // timestamp (ms) when forward was first held during countdown
    launchSmokeTimer: 0,     // > 0 = emit dark smoke from exhaust
    lightningTimer: 0,       // > 0 = shrunk + half speed from lightning strike (13s)
    _scaleAnim: null,        // active scale animation { type, from, to, duration, elapsed }
    _lightningPitchShift: false,
    bombAirborneTimer: 0,
    bombAirborneElapsed: 0,
    bombAirborneStartY: 0,
    bombAirborneDistance: 0,
    bombAirborneAngle: 0,
  };
}

// =============================================
// CHECKPOINT SYSTEM
// =============================================
const NUM_CHECKPOINTS = 24;
const CHECKPOINTS = [];
for (let i = 0; i < NUM_CHECKPOINTS; i++) {
  CHECKPOINTS.push(TRACK_CURVE.getPoint(i / NUM_CHECKPOINTS));
}

function updateLaps(player) {
  const pos = player.kart.position;
  const nextIdx = (player.checkpoint + 1) % NUM_CHECKPOINTS;
  const next = CHECKPOINTS[nextIdx];
  const dist = new THREE.Vector2(pos.x - next.x, pos.z - next.z).length();

  if (dist < 12) {
    player.checkpoint = nextIdx;
    if (player.checkpoint === 0 && player.lastCheckpoint === NUM_CHECKPOINTS - 1) {
      player.lap++;
      if (player.lap > TOTAL_LAPS && !player.finishTime) {
        player.finishTime = (Date.now() - raceStart) / 1000;
        // The crossing order is the final finishing place, even while other
        // racers are still driving toward the line.
        player.finishPlace = players.filter(p => p.finishTime !== null).length;
        const charIdx = player.charIndex;
        setTimeout(() => {
          playCharacterVoiceline(charIdx, player.finishPlace === 1 ? 'win' : 'lose');
        }, 1000);
        checkAllFinished();
      }
    }
    player.lastCheckpoint = player.checkpoint;
  }
}

let _finishFallbackTimer = null;

// ── Post-finish cinematic delay ──────────────────────────────────────────────
// After the last racer crosses the line we play 10 seconds of cinematic camera
// before showing the win screen.  _cinematicCountdownEl shows a small "podium
// in Ns" overlay so the player isn't confused by the delay.
let _postFinishTimer = null;   // setTimeout handle for the 10s delay

function _startPostFinishCinematic() {
  if (_postFinishTimer) return; // don't start twice
  _postFinishTimer = setTimeout(() => {
    _postFinishTimer = null;
    if (raceRunning) showFinish();
  }, 10000);
}

function _clearPostFinishCinematic() {
  if (_postFinishTimer) { clearTimeout(_postFinishTimer); _postFinishTimer = null; }
}

function checkAllFinished() {
  if (gameMode_dev) return; // dev mode has no finish condition

  const isSolo    = gameMode === 'solo';
  const numHumans = isSolo ? 1 : 2;

  // Identify which players are human (indices 0..numHumans-1)
  const humanPlayers  = players.slice(0, numHumans);
  const allFinished   = players.every(p => p.finishTime !== null);
  const someFinished  = players.some(p => p.finishTime !== null);

  // A finished human must keep driving under the cinematic AI. A CPU may have
  // claimed winnerAI earlier, so selecting only when winnerAI is null leaves a
  // human kart frozen as soon as updatePlayer() starts skipping it.
  const latestHuman = humanPlayers
    .filter(p => p.finishTime !== null)
    .sort((a, b) => b.finishTime - a.finishTime)[0];
  const latestHumanIdx = latestHuman ? players.indexOf(latestHuman) : -1;

  // ── All racers done → start 10-second cinematic then show podium ─────────
  if (allFinished) {
    // Activate cinematic camera on the last human to finish (they just crossed)
    // so their camera gets the cool treatment during the countdown.
    if (latestHuman && (!winnerAI || winnerAI.playerIdx !== latestHumanIdx)) {
      activateWinnerAI(latestHumanIdx);
    }
    _startPostFinishCinematic();
    return;
  }

  // ── Some (but not all) finished ───────────────────────────────────────────
  if (someFinished) {
    const finishedIndices = players
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.finishTime !== null)
      .map(({ i }) => i);

    // Activate winnerAI for the first finisher so their kart keeps driving while
    // we wait for everyone else.  Only do this once (winnerAI guard).
    const cinematicIdx = latestHumanIdx !== -1 ? latestHumanIdx : finishedIndices[0];
    if (!winnerAI || winnerAI.playerIdx !== cinematicIdx) {
      activateWinnerAI(cinematicIdx);
    }

    // In solo mode: if all CPUs have finished but the human hasn't yet, we wait
    // patiently — no forced finish, no early cinematic.  The human finishing
    // will re-call checkAllFinished() and hit the allFinished branch above.

    // In co-op: one human finished; wait for the other to finish naturally.

    // Safety fallback: if someone never crosses after 90 s, force the podium.
    if (_finishFallbackTimer) clearTimeout(_finishFallbackTimer);
    _finishFallbackTimer = setTimeout(() => {
      if (raceRunning) {
        // Force-finish any player still racing so the podium has all times
        players.forEach(p => {
          if (p.finishTime === null) p.finishTime = (Date.now() - raceStart) / 1000;
        });
        const forcedHuman = humanPlayers[humanPlayers.length - 1];
        const forcedHumanIdx = players.indexOf(forcedHuman);
        if (forcedHuman && (!winnerAI || winnerAI.playerIdx !== forcedHumanIdx)) {
          activateWinnerAI(forcedHumanIdx);
        }
        _startPostFinishCinematic();
      }
    }, 90000);
  }
}

// =============================================
// ITEMS
// =============================================
// Weighted item pool — Lightning is rare (1 entry vs 4 for common items)
const ITEMS_WEIGHTED = [
  '🍌 Banana', '🍌 Banana', '🍌 Banana', '🍌 Banana',
  '🔴 Shell',  '🔴 Shell',  '🔴 Shell',  '🔴 Shell',
  '⭐ Star',   '⭐ Star',   '⭐ Star',   '⭐ Star',
  '💨 Boost',  '💨 Boost',  '💨 Boost',  '💨 Boost',
  '⚡ Lightning',  // rare — only 1 entry out of 17
  '💣 Bomb',
];
const ITEMS = ITEMS_WEIGHTED; // kept for any external references

// =============================================
// BANANA PEELS — live 3D objects in world space
// =============================================
// Each entry: { mesh1, mesh2, position, active }
// mesh1 lives in scenes[0], mesh2 in scenes[1]
let bananaPeels = [];

function makeBananaPeelMesh() {
  const group = new THREE.Group();

  // ── Main peel body: flattened ellipsoid via scaled sphere ──
  const bodyGeo = new THREE.SphereGeometry(0.38, 10, 6);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xFFE135 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.scale.set(1, 0.22, 1.6);
  body.position.set(0, 0.07, 0);
  group.add(body);

  // ── Four curled peel flaps ──
  const flapMat = new THREE.MeshLambertMaterial({ color: 0xFFD700, side: THREE.DoubleSide });
  const flapInnerMat = new THREE.MeshLambertMaterial({ color: 0xFFF176, side: THREE.DoubleSide });

  const flapAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  flapAngles.forEach((baseAngle, fi) => {
    // Outer flap strip
    const fGeo = new THREE.PlaneGeometry(0.18, 0.55, 1, 4);
    // Curl the flap by offsetting top verts upward
    const pos = fGeo.attributes.position;
    for (let vi = 0; vi < pos.count; vi++) {
      const t = (pos.getY(vi) + 0.275) / 0.55; // 0 at base, 1 at tip
      pos.setY(vi, pos.getY(vi) + t * t * 0.28); // curl upward
      pos.setX(vi, pos.getX(vi) * (1 - t * 0.4)); // taper
    }
    pos.needsUpdate = true;
    fGeo.computeVertexNormals();

    const flap = new THREE.Mesh(fGeo, fi % 2 === 0 ? flapMat : flapInnerMat);
    flap.rotation.x = -Math.PI / 2;
    // Rotate flap in XZ plane around peel centre
    flap.position.set(
      Math.sin(baseAngle) * 0.3,
      0.05,
      Math.cos(baseAngle) * 0.3 * 1.4
    );
    flap.rotation.z = baseAngle;
    group.add(flap);
  });

  // ── Brown bruise spots ──
  const spotMat = new THREE.MeshLambertMaterial({ color: 0xC8A000 });
  [[-0.1, 0.13, 0.1], [0.12, 0.13, -0.15], [-0.05, 0.13, -0.05]].forEach(([x, y, z]) => {
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 4), spotMat);
    spot.scale.set(1, 0.3, 1);
    spot.position.set(x, y, z);
    group.add(spot);
  });

  // Lay flat on the ground
  group.position.y = 0.08;
  group.traverse(obj => { if (obj.isMesh) { obj.castShadow = settings.shadows; obj.receiveShadow = settings.shadows; } });
  return group;
}

function spawnBananaPeel(thrower) {
  // Drop it 3 units behind the thrower
  const behind = new THREE.Vector3(
    -Math.sin(thrower.angle) * 3,
    0,
    -Math.cos(thrower.angle) * 3
  );
  const spawnPos = thrower.kart.position.clone().add(behind);
  spawnPos.y = 0;

  const mesh1 = makeBananaPeelMesh();
  const mesh2 = scenes[1] ? makeBananaPeelMesh() : null;
  // Random slight rotation so each peel looks unique
  const yRot = Math.random() * Math.PI * 2;
  mesh1.rotation.y = yRot;
  if (mesh2) mesh2.rotation.y = yRot;
  mesh1.position.copy(spawnPos);
  if (mesh2) mesh2.position.copy(spawnPos);
  scenes[0].add(mesh1);
  if (mesh2) scenes[1].add(mesh2);

  bananaPeels.push({ mesh1, mesh2, position: spawnPos.clone(), active: true });
}

function updateBananaPeels(delta, playersArr) {
  bananaPeels.forEach((peel) => {
    if (!peel.active) return;

    // Gentle wobble so it's not completely static
    peel.mesh1.rotation.y += delta * 0.4;
    if (peel.mesh2) peel.mesh2.rotation.y += delta * 0.4;

    // Check collision with each player.
    // IMPORTANT: use a for-loop with break so that if one player consumes the peel,
    // no other player can also trigger off it in the same frame.
    for (const player of playersArr) {
      if (!peel.active) break; // already consumed this frame — stop immediately
      if (player.bananaImmune > 0) continue;
      if (player.stunTimer > 0) continue;

      const dist = player.kart.position.distanceTo(peel.position);
      if (dist < 2.2) {
        // Consume the peel atomically FIRST so nothing else can claim it
        peel.active = false;
        scenes[0].remove(peel.mesh1);
        if (peel.mesh2) scenes[1].remove(peel.mesh2);

        // Star-powered player destroys the peel — no damage, no spinout!
        if (player.starTimer > 0) break;

        // Now apply spinout to the player who hit it
        player.spinoutTimer = 3.0;
        player.spinoutAngle = 0;
        player.stunTimer    = 3.0;
        player.speed       *= 0.4;
        showSlipEffect(player);
        playSlipSound();
        playCharacterVoiceline(player.charIndex, 'hit');
      }
    }
  });

  // Purge inactive peels
  bananaPeels = bananaPeels.filter(p => p.active);
}

function showSlipEffect(player) {
  // No color overlay — the spinout animation speaks for itself
}

function playSlipSound() {
  if (!audioCtx) return;
  // Cartoon slip: descending glide
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(600, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.5);
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
  osc.connect(gain);
  gain.connect(sfxMasterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.65);
}

// =============================================
// LIGHTNING BOLT ITEM
// =============================================
// Builds a jagged 3D lightning bolt mesh descending from above the target kart.
// Build the zigzag bolt geometry.
// The bolt spans from y=totalH down to y=0 (impact point at origin).
// All segment kink offsets are baked in at creation time so the shape is crisp.
function makeLightningBoltMesh() {
  const group = new THREE.Group();

  // Two materials per segment — thick yellow outer + thin white hot core
  // We clone per segment so each can be faded independently via opacity.
  const SEGMENTS = 8;
  const TOTAL_H  = 18;  // world-units tall (kart is at group origin, bolt top is above)
  const segH = TOTAL_H / SEGMENTS;

  // Pre-bake kink offsets for the whole bolt
  const kinks = [{ x: 0, z: 0 }]; // bottom anchor (y=0, impact)
  for (let i = 1; i < SEGMENTS; i++) {
    kinks.unshift({
      x: (Math.random() - 0.5) * 1.6,
      z: (Math.random() - 0.5) * 1.6,
    });
  }
  kinks.unshift({ x: 0, z: 0 }); // top anchor (y=TOTAL_H, entry from sky)

  // Build segments bottom→top so segment 0 is the lowest (nearest the kart)
  for (let i = 0; i < SEGMENTS; i++) {
    const bKink = kinks[i];       // bottom of this segment
    const tKink = kinks[i + 1];   // top of this segment

    const botY = i       * segH;
    const topY = (i + 1) * segH;

    // Width widens slightly toward the top (entry is narrower at impact, thicker from sky)
    const w = 0.08 + (i / SEGMENTS) * 0.14;

    // Direction vector for this segment
    const dx = tKink.x - bKink.x;
    const dy = topY    - botY;
    const dz = tKink.z - bKink.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Yellow outer bar
    const outerGeo = new THREE.BoxGeometry(w, len, w);
    const outerMat = new THREE.MeshBasicMaterial({ color: 0xFFEE00, transparent: true, opacity: 1.0 });
    const outer = new THREE.Mesh(outerGeo, outerMat);
    outer.position.set(
      (bKink.x + tKink.x) * 0.5,
      (botY    + topY)    * 0.5,
      (bKink.z + tKink.z) * 0.5
    );
    // Align box Y-axis along the segment direction
    const up = new THREE.Vector3(dx, dy, dz).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    outer.quaternion.copy(quat);
    group.add(outer);

    // White hot core — ~30% width of outer
    const coreGeo = new THREE.BoxGeometry(w * 0.3, len, w * 0.3);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 1.0 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.copy(outer.position);
    core.quaternion.copy(outer.quaternion);
    group.add(core);
  }

  return group;
}

// Play the lightning-strike.mp3 sound file
function playLightningStrikeSound() {
  playSfxAudio('assets/lightning-strike.mp3');
}

// ── Live bolt entries — updated every frame by updateLightningEffects() ──────
// Each entry: { bolt1, bolt2, target (player), elapsed, phase }
// phase: 'strike' → bolt is visible and flashing
//        'done'   → ready to remove
const _activeBolts = [];

// Set all mesh opacities inside a bolt group
function _setBoltOpacity(boltGroup, opacity) {
  boltGroup.traverse(obj => {
    if (obj.isMesh && obj.material && obj.material.transparent) {
      obj.material.opacity = opacity;
    }
  });
}

// Spawn a lightning bolt anchored to targetPlayer's kart. The bolt is added to
// _activeBolts and kept alive / removed by updateLightningEffects() each frame.
function spawnLightningVFX(targetPlayer) {
  const bolt1 = makeLightningBoltMesh();
  // Position so bolt bottom (y=0 in group space) sits right at kart level.
  // The group origin = kart position; the bolt mesh spans 0→TOTAL_H upward.
  bolt1.position.copy(targetPlayer.kart.position);
  bolt1.position.y = 0; // bolt geometry already goes up from y=0
  scenes[0].add(bolt1);

  let bolt2 = null;
  if (scenes[1]) {
    bolt2 = makeLightningBoltMesh();
    bolt2.position.copy(bolt1.position);
    scenes[1].add(bolt2);
  }

  // Start invisible — updateLightningEffects will flash it in immediately
  _setBoltOpacity(bolt1, 0);
  if (bolt2) _setBoltOpacity(bolt2, 0);

  _activeBolts.push({ bolt1, bolt2, target: targetPlayer, elapsed: 0, phase: 'strike' });
}

// Called every frame from the main loop. Animates all live bolts and handles
// the kart scale shrink-in and the eventual grow-back animation.
function updateLightningEffects(delta) {
  // ── Bolt flash animation ──────────────────────────────────────────────────
  for (let i = _activeBolts.length - 1; i >= 0; i--) {
    const b = _activeBolts[i];
    b.elapsed += delta;

    if (b.phase === 'strike') {
      // Snap bolt X/Z to follow the kart even while it's spinning
      b.bolt1.position.x = b.target.kart.position.x;
      b.bolt1.position.z = b.target.kart.position.z;
      if (b.bolt2) {
        b.bolt2.position.x = b.target.kart.position.x;
        b.bolt2.position.z = b.target.kart.position.z;
      }

      // Three-flash sequence: flash-in(0→0.08s), hold(0.08→0.22s),
      // flicker-off(0.22→0.28s), flicker-on(0.28→0.38s), fade-out(0.38→0.60s)
      const e = b.elapsed;
      let opacity;
      if      (e < 0.08) opacity = e / 0.08;           // flash in
      else if (e < 0.22) opacity = 1.0;                 // hold bright
      else if (e < 0.28) opacity = 1.0 - (e - 0.22) / 0.06; // flicker off
      else if (e < 0.38) opacity = (e - 0.28) / 0.10;  // flicker back on
      else if (e < 0.60) opacity = 1.0 - (e - 0.38) / 0.22; // fade out
      else               opacity = 0;

      _setBoltOpacity(b.bolt1, Math.max(0, opacity));
      if (b.bolt2) _setBoltOpacity(b.bolt2, Math.max(0, opacity));

      if (e >= 0.60) {
        b.phase = 'done';
        scenes[0].remove(b.bolt1);
        if (b.bolt2) scenes[1].remove(b.bolt2);
        _activeBolts.splice(i, 1);
      }
    }
  }

  // ── Kart scale animations ─────────────────────────────────────────────────
  players.forEach(player => {
    const sa = player._scaleAnim;
    if (!sa) return;

    sa.elapsed += delta;
    const t = Math.min(sa.elapsed / sa.duration, 1.0);

    let scale;
    if (sa.type === 'shrink') {
      // Elastic squish: overshoot slightly then settle at 0.5
      // Uses a dampened spring feel: fast drop, tiny bounce at the bottom
      const ease = t < 0.7
        ? 1.0 - (t / 0.7)           // linear drop to 0 over first 70%
        : (t - 0.7) / 0.3 * 0.08;  // tiny bounce back up to ~0.08 extra
      scale = sa.from + (sa.to - sa.from) * (1.0 - ease);
      // Add a squeeze pulse at impact (t≈0.7): kart squashes wide then tall
      const squishPhase = Math.sin(t * Math.PI * 3) * 0.12 * (1 - t);
      player.kart.scale.set(
        scale + squishPhase,
        scale - squishPhase * 0.5,
        scale + squishPhase
      );
    } else {
      // 'restore' — elastic spring back to 1.0: overshoot then settle
      // Overshoots to ~1.15 at t≈0.6 then bounces back to exactly 1.0
      const overshoot = Math.sin(t * Math.PI) * 0.18 * (1 - t * 0.8);
      scale = sa.from + (sa.to - sa.from) * t + overshoot;
      player.kart.scale.setScalar(scale);
    }

    if (t >= 1.0) {
      player.kart.scale.setScalar(sa.to);
      player._scaleAnim = null;
    }
  });
}

// Restore a player that was shrunk by lightning — animate the grow-back
function restoreFromLightning(player) {
  const currentScale = player.kart.scale.x; // whatever scale we're at right now
  player._scaleAnim = {
    type:     'restore',
    from:     currentScale,
    to:       1.0,
    duration: 0.45,  // 450ms grow-back
    elapsed:  0,
  };
  player._lightningPitchShift = false;
}

// Apply lightning shrink + spinout to one target player
function applyLightningToPlayer(target) {
  if (target.finishTime !== null) return;
  if (target.starTimer > 0) return; // star power blocks lightning

  target.lightningTimer = 13;

  // Spinout
  target.spinoutTimer = 2.5;
  target.spinoutAngle = 0;
  target.stunTimer    = 2.5;
  target.speed       *= 0.25;

  // Animated shrink — from current scale down to 0.5
  const currentScale = target.kart.scale.x;
  target._scaleAnim = {
    type:     'shrink',
    from:     currentScale,
    to:       0.5,
    duration: 0.35,  // 350ms shrink
    elapsed:  0,
  };

  target._lightningPitchShift = true;
  playCharacterVoiceline(target.charIndex, 'hit');

  // Screen flash for human players
  const isHuman = gameMode === 'solo'
    ? target === players[0]
    : (target === players[0] || target === players[1]);
  if (isHuman) {
    const flash = document.createElement('div');
    flash.className = 'lightning-flash-overlay';
    document.body.appendChild(flash);
    flash.addEventListener('animationend', () => flash.remove());
  }
}

// Main lightning item use — hits ALL opponents at once with a staggered delay
function triggerLightningStrike(thrower) {
  const targets = players.filter(p => p !== thrower && p.finishTime === null);
  if (targets.length === 0) return;

  targets.forEach((target, idx) => {
    // Stagger bolts slightly for dramatic effect (50ms apart)
    setTimeout(() => {
      if (!raceRunning) return;
      spawnLightningVFX(target);
      playLightningStrikeSound();
      applyLightningToPlayer(target);
    }, idx * 80);
  });
}

// =============================================
// RED SHELL PROJECTILE SYSTEM
// =============================================
// Each shell: { mesh1, mesh2, owner, target, active,
//              trackT,         ← current t on the CatmullRom curve (0-1)
//              speed,          ← units/s along curve
//              homingDist,     ← switch to direct homing when target within this range
//              homingVel,      ← {x,z} velocity used during direct homing phase
//              phase }         ← 'track' | 'homing'
let redShells = [];

// =============================================
// BOMB ITEM
// =============================================
let bombs = [];
const BOMB_FUSE_DURATION = 3;
const BOMB_BLAST_RADIUS = 6;
const BOMB_AIRBORNE_DURATION = 5;

function makeBombMesh() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.75, 16, 12),
    new THREE.MeshLambertMaterial({ color: 0x171717 })
  );
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.28, 0.18, 12),
    new THREE.MeshLambertMaterial({ color: 0x555555 })
  );
  cap.position.y = 0.7;
  group.add(body, cap);

  const fuse = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.8, 8),
    new THREE.MeshLambertMaterial({ color: 0x8b5a2b })
  );
  fuse.position.set(0, 1.15, 0);
  fuse.rotation.z = -0.18;
  group.add(fuse);

  const spark = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffcc00 })
  );
  spark.position.set(0.07, 1.55, 0);
  group.add(spark);
  group.userData.spark = spark;
  group.userData.fuse = fuse;
  group.userData.spin = 1.8;
  group.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = settings.shadows;
      obj.receiveShadow = settings.shadows;
    }
  });
  return group;
}

function spawnBomb(thrower) {
  const behind = new THREE.Vector3(
    -Math.sin(thrower.angle) * 3.2,
    0,
    -Math.cos(thrower.angle) * 3.2
  );
  const position = thrower.kart.position.clone().add(behind);
  position.y = 0.75;
  const mesh1 = makeBombMesh();
  const mesh2 = scenes[1] ? makeBombMesh() : null;
  mesh1.position.copy(position);
  if (mesh2) mesh2.position.copy(position);
  scenes[0].add(mesh1);
  if (mesh2) scenes[1].add(mesh2);
  bombs.push({ mesh1, mesh2, position: position.clone(), fuse: BOMB_FUSE_DURATION, exploded: false });
}

function makeExplosionMesh() {
  const group = new THREE.Group();
  const outer = new THREE.Mesh(
    new THREE.SphereGeometry(1, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xff5a00, transparent: true, opacity: 0.9 })
  );
  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 1 })
  );
  group.add(outer, inner);
  for (let i = 0; i < 10; i++) {
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 1.5, 6),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff2200 : 0xffaa00, transparent: true, opacity: 0.85 })
    );
    const angle = (i / 10) * Math.PI * 2;
    spike.position.set(Math.cos(angle) * 0.75, 0.4, Math.sin(angle) * 0.75);
    spike.rotation.z = Math.PI / 2;
    spike.rotation.y = angle;
    group.add(spike);
  }
  return group;
}

function playBombExplosionSound() {
  playSfxAudio('assets/bomb-explosion.mp3');
}

function launchPlayerFromBomb(player, origin) {
  if (player.finishTime !== null || player.bombAirborneTimer > 0) return;
  const dx = player.kart.position.x - origin.x;
  const dz = player.kart.position.z - origin.z;
  const distance = Math.hypot(dx, dz) || 1;
  const strength = Math.max(0.35, 1 - distance / BOMB_BLAST_RADIUS);
  player.bombAirborneTimer = BOMB_AIRBORNE_DURATION;
  player.bombAirborneElapsed = 0;
  player.bombAirborneStartY = player.kart.position.y;
  player.bombAirborneStartX = player.kart.position.x;
  player.bombAirborneStartZ = player.kart.position.z;
  player.bombAirborneDistance = 5 + strength * 7;
  player.bombAirborneAngle = Math.atan2(dx, dz);
  player.speed = 0;
  player.stunTimer = BOMB_AIRBORNE_DURATION;
  player.spinoutTimer = 0;
  player.kart.rotation.z = 0;
  playCharacterVoiceline(player.charIndex, 'hit');
}

function explodeBomb(bomb) {
  bomb.exploded = true;
  scenes[0].remove(bomb.mesh1);
  if (bomb.mesh2) scenes[1].remove(bomb.mesh2);
  const explosion1 = makeExplosionMesh();
  const explosion2 = scenes[1] ? makeExplosionMesh() : null;
  explosion1.position.copy(bomb.position);
  if (explosion2) explosion2.position.copy(bomb.position);
  scenes[0].add(explosion1);
  if (explosion2) scenes[1].add(explosion2);
  const effect = { mesh1: explosion1, mesh2: explosion2, elapsed: 0 };
  bomb.effect = effect;
  playBombExplosionSound();

  for (const player of players) {
    if (player.starTimer > 0) continue;
    const dx = player.kart.position.x - bomb.position.x;
    const dz = player.kart.position.z - bomb.position.z;
    if (dx * dx + dz * dz <= BOMB_BLAST_RADIUS * BOMB_BLAST_RADIUS) {
      launchPlayerFromBomb(player, bomb.position);
    }
  }
}

function updateBombs(delta) {
  for (const bomb of bombs) {
    if (!bomb.exploded) {
      const bombHitDistanceSq = 2.2 * 2.2;
      const bombHit = players.some(player => {
        if (player.finishTime !== null || player.bombAirborneTimer > 0) return false;
        const dx = player.kart.position.x - bomb.position.x;
        const dz = player.kart.position.z - bomb.position.z;
        return dx * dx + dz * dz <= bombHitDistanceSq;
      });
      if (bombHit) bomb.fuse = 0;
      bomb.fuse -= delta;
      const fuseProgress = Math.max(0, bomb.fuse / BOMB_FUSE_DURATION);
      const fuseLength = 0.8 * fuseProgress;
      bomb.mesh1.userData.fuse.scale.y = fuseProgress;
      bomb.mesh1.userData.fuse.position.y = 0.75 + fuseLength / 2;
      bomb.mesh1.userData.spark.position.y = 0.75 + fuseLength + 0.08;
      bomb.mesh1.rotation.y += delta * bomb.mesh1.userData.spin;
      bomb.mesh1.userData.spark.visible = Math.floor(bomb.fuse * 10) % 2 === 0;
      if (bomb.mesh2) {
        bomb.mesh2.rotation.y = bomb.mesh1.rotation.y;
        bomb.mesh2.userData.fuse.scale.y = fuseProgress;
        bomb.mesh2.userData.fuse.position.y = 0.75 + fuseLength / 2;
        bomb.mesh2.userData.spark.position.y = 0.75 + fuseLength + 0.08;
        bomb.mesh2.userData.spark.visible = bomb.mesh1.userData.spark.visible;
      }
      if (bomb.fuse <= 0) explodeBomb(bomb);
    }
    if (!bomb.effect) continue;
    bomb.effect.elapsed += delta;
    const progress = Math.min(bomb.effect.elapsed / 0.8, 1);
    const scale = 1 + progress * BOMB_BLAST_RADIUS;
    bomb.effect.mesh1.scale.setScalar(scale);
    bomb.effect.mesh1.children.forEach(child => { child.material.opacity = 1 - progress; });
    if (bomb.effect.mesh2) {
      bomb.effect.mesh2.scale.setScalar(scale);
      bomb.effect.mesh2.children.forEach(child => { child.material.opacity = 1 - progress; });
    }
    if (progress >= 1) {
      scenes[0].remove(bomb.effect.mesh1);
      if (bomb.effect.mesh2) scenes[1].remove(bomb.effect.mesh2);
      bomb.effect = null;
    }
  }
  bombs = bombs.filter(bomb => !bomb.exploded || bomb.effect);
}

function updateBombAirborne(player, delta) {
  if (player.bombAirborneTimer <= 0) return false;
  player.bombAirborneTimer = Math.max(0, player.bombAirborneTimer - delta);
  player.bombAirborneElapsed += delta;
  const progress = Math.min(player.bombAirborneElapsed / BOMB_AIRBORNE_DURATION, 1);
  const smoothProgress = progress * progress * (3 - 2 * progress);
  const arc = Math.sin(progress * Math.PI);
  player.kart.position.x = player.bombAirborneStartX
    + Math.sin(player.bombAirborneAngle) * player.bombAirborneDistance * smoothProgress;
  player.kart.position.z = player.bombAirborneStartZ
    + Math.cos(player.bombAirborneAngle) * player.bombAirborneDistance * smoothProgress;
  player.kart.position.y = player.bombAirborneStartY + arc * 8;
  player.kart.rotation.y = player.bombAirborneAngle + progress * Math.PI * 8;
  const landingBlend = Math.sin(progress * Math.PI);
  player.kart.rotation.x = landingBlend * Math.PI * 2;
  player.kart.rotation.z = landingBlend * Math.PI * 3;
  player.speed = 0;
  if (progress >= 1) {
    player.kart.position.y = player.bombAirborneStartY;
    player.kart.rotation.x = 0;
    player.kart.rotation.z = 0;
    player.bombAirborneTimer = 0;
    player.stunTimer = 0;
  }
  return true;
}

// ── Build a 3D red shell mesh ──
function makeRedShellMesh() {
  const group = new THREE.Group();

  // Bottom dome (flattened hemisphere) — red
  const bottomGeo = new THREE.SphereGeometry(0.55, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const redMat = new THREE.MeshLambertMaterial({ color: 0xCC1100 });
  const bottom = new THREE.Mesh(bottomGeo, redMat);
  bottom.rotation.x = Math.PI; // flip so dome faces down
  bottom.position.y = 0.05;
  group.add(bottom);

  // Top dome — lighter red, slightly smaller
  const topGeo = new THREE.SphereGeometry(0.52, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const topMat = new THREE.MeshLambertMaterial({ color: 0xEE2200 });
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.y = 0.05;
  group.add(top);

  // White belly plate (flat circle on underside)
  const bellyGeo = new THREE.CircleGeometry(0.48, 16);
  const bellyMat = new THREE.MeshLambertMaterial({ color: 0xFFEECC });
  const belly = new THREE.Mesh(bellyGeo, bellyMat);
  belly.rotation.x = -Math.PI / 2;
  belly.position.y = 0.04;
  group.add(belly);

  // Ridge ring around equator — dark outline
  const ridgeGeo = new THREE.TorusGeometry(0.52, 0.045, 8, 32);
  const ridgeMat = new THREE.MeshLambertMaterial({ color: 0x880000 });
  const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
  ridge.rotation.x = Math.PI / 2;
  ridge.position.y = 0.05;
  group.add(ridge);

  // Shell segments — 6 raised ridges radiating from top
  const segMat = new THREE.MeshLambertMaterial({ color: 0xAA0000 });
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const segGeo = new THREE.BoxGeometry(0.07, 0.06, 0.44);
    const seg = new THREE.Mesh(segGeo, segMat);
    seg.position.set(Math.sin(angle) * 0.22, 0.32, Math.cos(angle) * 0.22);
    seg.rotation.y = angle;
    seg.rotation.x = 0.35; // tilt to follow dome curve
    group.add(seg);
  }

  // Shine highlight (small white ellipse near top of dome)
  const shineGeo = new THREE.SphereGeometry(0.13, 8, 6);
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.7 });
  const shine = new THREE.Mesh(shineGeo, shineMat);
  shine.scale.set(1, 0.45, 0.7);
  shine.position.set(-0.15, 0.42, -0.2);
  group.add(shine);

  // Position shell hovering just above ground
  group.position.y = 0.6;
  group.traverse(obj => { if (obj.isMesh) { obj.castShadow = settings.shadows; obj.receiveShadow = settings.shadows; } });
  return group;
}

// Find the closest t on the track curve to a given world position — full search
function closestTrackT(pos) {
  let bestT = 0;
  let bestDist = Infinity;
  for (let i = 0; i < TRACK_SAMPLES; i++) {
    const t = i / TRACK_SAMPLES;
    const pt = TRACK_CURVE.getPoint(t);
    const dx = pos.x - pt.x, dz = pos.z - pt.z;
    const d = dx * dx + dz * dz;
    if (d < bestDist) { bestDist = d; bestT = t; }
  }
  return bestT;
}

function spawnRedShell(thrower, target) {
  // Launch shell from just in front of the thrower
  const frontX = thrower.kart.position.x + Math.sin(thrower.angle) * 3;
  const frontZ = thrower.kart.position.z + Math.cos(thrower.angle) * 3;
  const spawnPos = new THREE.Vector3(frontX, 0, frontZ);

  // Snap shell and target to nearest track t (full search — no blind spot)
  const shellT  = closestTrackT(spawnPos);
  const targetT = closestTrackT(target.kart.position);

  // Choose the direction (forward or backward around the loop) that reaches
  // the target in fewer steps — this is what makes it actually chase the right way
  const fwdSteps = ((targetT - shellT + 1) % 1) * TRACK_SAMPLES;
  const bwdSteps = ((shellT - targetT + 1) % 1) * TRACK_SAMPLES;
  const trackDir = fwdSteps <= bwdSteps ? 1 : -1; // +1 = forward, -1 = backward

  const mesh1 = makeRedShellMesh();
  const mesh2 = scenes[1] ? makeRedShellMesh() : null;
  mesh1.position.copy(spawnPos).setY(0.6);
  if (mesh2) mesh2.position.copy(spawnPos).setY(0.6);
  scenes[0].add(mesh1);
  if (mesh2) scenes[1].add(mesh2);

  redShells.push({
    mesh1, mesh2,
    owner: thrower,
    target,
    active: true,
    trackT: shellT,
    trackDir,            // which way to travel around the curve
    speed: 48,           // m/s along curve — noticeably faster than max kart speed
    homingDist: 40,      // large window: switch to direct homing within 40 units
    homingVel: new THREE.Vector3(Math.sin(thrower.angle), 0, Math.cos(thrower.angle)),
    phase: 'track',
    spinAngle: 0,
    lifeTimer: 30,       // self-destruct after 30s if something goes very wrong
  });

  playShellLaunchSound();
}

function updateRedShells(delta) {
  redShells.forEach(shell => {
    if (!shell.active) return;

    shell.lifeTimer -= delta;
    if (shell.lifeTimer <= 0) {
      destroyRedShell(shell);
      return;
    }

    // Spin the shell visually
    shell.spinAngle += delta * 5;
    shell.mesh1.rotation.y = shell.spinAngle;
    if (shell.mesh2) shell.mesh2.rotation.y = shell.spinAngle;

    const targetPos = shell.target.kart.position;
    const dist = shell.mesh1.position.distanceTo(targetPos);

    if (shell.phase === 'track') {
      // ── TRACK-FOLLOWING PHASE ──
      const arcLength = TRACK_CURVE.getLength();
      const dt = (shell.speed * delta) / arcLength;

      // Advance in the pre-computed direction (toward target around the loop)
      shell.trackT = ((shell.trackT + dt * shell.trackDir) % 1 + 1) % 1;

      const pt  = TRACK_CURVE.getPoint(shell.trackT);
      const tan = TRACK_CURVE.getTangent(shell.trackT).normalize();

      shell.mesh1.position.set(pt.x, 0.6, pt.z);
      if (shell.mesh2) shell.mesh2.position.set(pt.x, 0.6, pt.z);

      // Face direction of travel (account for trackDir so reversed shell still faces forward)
      const facingTan = shell.trackDir === 1 ? tan : tan.clone().negate();
      const shellAngle = Math.atan2(facingTan.x, facingTan.z);
      shell.mesh1.rotation.y = shellAngle + shell.spinAngle;
      if (shell.mesh2) shell.mesh2.rotation.y = shellAngle + shell.spinAngle;

      // Switch to direct homing when close enough to target
      if (dist < shell.homingDist) {
        shell.phase = 'homing';
        shell.homingVel.set(facingTan.x, 0, facingTan.z).multiplyScalar(shell.speed);
      }

    } else {
      // ── HOMING PHASE ──
      // Steer toward target with a generous turn rate — this is the guarantee it lands
      const toTarget = new THREE.Vector3(
        targetPos.x - shell.mesh1.position.x,
        0,
        targetPos.z - shell.mesh1.position.z
      ).normalize();

      const TURN_RATE = 9; // rad/s — sharp enough to always catch a turning kart
      const currentDir = shell.homingVel.clone().normalize();

      const cross = currentDir.x * toTarget.z - currentDir.z * toTarget.x;
      const dot   = currentDir.dot(toTarget);
      const angleErr = Math.atan2(cross, dot);
      const maxTurn = TURN_RATE * delta;
      // Positive angleErr = target is to the left → turn left (positive Y rotation)
      const turn = Math.max(-maxTurn, Math.min(maxTurn, angleErr));

      const cosT = Math.cos(turn), sinT = Math.sin(turn);
      const newX = shell.homingVel.x * cosT - shell.homingVel.z * sinT;
      const newZ = shell.homingVel.x * sinT + shell.homingVel.z * cosT;
      shell.homingVel.set(newX, 0, newZ).normalize().multiplyScalar(shell.speed);

      shell.mesh1.position.x += shell.homingVel.x * delta;
      shell.mesh1.position.z += shell.homingVel.z * delta;
      shell.mesh1.position.y = 0.6;
      if (shell.mesh2) shell.mesh2.position.copy(shell.mesh1.position);
    }

    // ── HIT CHECK ──
    const hitDist = shell.mesh1.position.distanceTo(targetPos);
    if (hitDist < 2.4 && shell.target.stunTimer <= 0) {
      // Star-powered target smashes through the shell — destroyed, no damage!
      if (shell.target.starTimer > 0) {
        destroyRedShell(shell);
        return;
      }
      // DIRECT HIT — full spinout
      shell.target.spinoutTimer = 3.0;
      shell.target.spinoutAngle = 0;
      shell.target.stunTimer    = 3.0;
      shell.target.speed       *= 0.3;
      playShellHitSound();
      playCharacterVoiceline(shell.target.charIndex, 'hit');
      destroyRedShell(shell);
    }
  });

  // Clean up inactive shells
  redShells = redShells.filter(s => s.active);
}

function destroyRedShell(shell) {
  shell.active = false;
  scenes[0].remove(shell.mesh1);
  if (shell.mesh2) scenes[1].remove(shell.mesh2);
}

function playShellLaunchSound() {
  if (!audioCtx) return;
  // Short rising whistle
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(300, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(900, audioCtx.currentTime + 0.18);
  gain.gain.setValueAtTime(0.22, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
  osc.connect(gain);
  gain.connect(sfxMasterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.28);
}

function playShellHitSound() {
  if (!audioCtx) return;
  // Ceramic crack + descending thud
  [0, 0.06].forEach(offset => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = offset === 0 ? 'square' : 'sawtooth';
    osc.frequency.setValueAtTime(offset === 0 ? 700 : 300, audioCtx.currentTime + offset);
    osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + offset + 0.35);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + offset + 0.4);
    osc.connect(gain);
    gain.connect(sfxMasterGain);
    osc.start(audioCtx.currentTime + offset);
    osc.stop(audioCtx.currentTime + offset + 0.45);
  });
}

function playLaunchBoostSound() {
  if (!audioCtx) return;
  // Rising engine rev + turbo whoosh
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(120, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.3);
  gain.gain.setValueAtTime(0.28, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(sfxMasterGain);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.55);
}

function playLaunchStallSound() {
  if (!audioCtx) return;
  // Sputtering backfire — repeated low pops + a dying engine groan
  [0, 0.08, 0.18, 0.30].forEach((offset, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80 + i * 15, audioCtx.currentTime + offset);
    osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + offset + 0.12);
    gain.gain.setValueAtTime(0.22, audioCtx.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + offset + 0.14);
    osc.connect(gain);
    gain.connect(sfxMasterGain);
    osc.start(audioCtx.currentTime + offset);
    osc.stop(audioCtx.currentTime + offset + 0.18);
  });
  // Long groan
  const groan = audioCtx.createOscillator();
  const groanGain = audioCtx.createGain();
  groan.type = 'sawtooth';
  groan.frequency.setValueAtTime(55, audioCtx.currentTime + 0.35);
  groan.frequency.exponentialRampToValueAtTime(25, audioCtx.currentTime + 1.0);
  groanGain.gain.setValueAtTime(0.18, audioCtx.currentTime + 0.35);
  groanGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
  groan.connect(groanGain);
  groanGain.connect(sfxMasterGain);
  groan.start(audioCtx.currentTime + 0.35);
  groan.stop(audioCtx.currentTime + 1.25);
}

function collectItem(player, idx) {
  if (!player.item && itemBoxes[idx].active) {
    player.item = ITEMS[Math.floor(Math.random()*ITEMS.length)];
    itemBoxes[idx].active = false;
    itemBoxes[idx].mesh.visible = false;
    itemBoxes[idx].respawnTimer = 8;
  }
}

// Find the nearest player ahead of `thrower` on the track; falls back to nearest overall.
function findShellTarget(thrower) {
  const throwerT = closestTrackT(thrower.kart.position);
  let bestAhead = null, bestAheadDist = Infinity;
  let bestAny   = null, bestAnyDist   = Infinity;

  for (const p of players) {
    if (p === thrower || p.finishTime !== null) continue;
    const pT = closestTrackT(p.kart.position);
    // "Ahead" means larger t (wrapping). Steps forward from thrower to p.
    const stepsAhead = ((pT - throwerT + 1) % 1) * TRACK_SAMPLES;
    const stepsBack  = ((throwerT - pT + 1) % 1) * TRACK_SAMPLES;
    // World-space distance for tie-breaking
    const worldDist = thrower.kart.position.distanceTo(p.kart.position);

    if (stepsAhead < stepsBack) {
      // p is ahead of thrower
      if (worldDist < bestAheadDist) { bestAheadDist = worldDist; bestAhead = p; }
    }
    if (worldDist < bestAnyDist) { bestAnyDist = worldDist; bestAny = p; }
  }
  return bestAhead || bestAny; // prefer someone ahead, fall back to nearest
}

function useItem(player, otherPlayer) {
  if (!player.item || player.itemCooldown > 0) return;

  if (player.item.includes('Boost')) {
    player.boostTimer = 3.0; // 3 seconds of fire 🔥
    player.speed = Math.max(player.speed, MAX_SPEED * 1.3); // immediate kick

  } else if (player.item.includes('Star')) {
    player.starTimer = 10; // 10 seconds of ABSOLUTE POWER 🌟

  } else if (player.item.includes('Banana')) {
    // Spawn a 3D peel behind the kart
    spawnBananaPeel(player);
    // Thrower gets 2.5s immunity so they don't immediately roll over their own peel
    player.bananaImmune = 2.5;

  } else if (player.item.includes('Shell')) {
    // Target the nearest player ahead; fallback to any opponent
    const shellTarget = findShellTarget(player) || otherPlayer;
    if (shellTarget) spawnRedShell(player, shellTarget);

  } else if (player.item.includes('Lightning')) {
    // Strike ALL other racers simultaneously — Mario Kart style
    triggerLightningStrike(player);

  } else if (player.item.includes('Bomb')) {
    spawnBomb(player);
  }

  player.item = null;
  player.itemCooldown = 1;
}

function showHitEffect(player) {
  // No color overlay — handled by spinout animation
}

// =============================================
// INPUT HANDLING
// =============================================
const GAME_KEYS = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter']);
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (GAME_KEYS.has(e.code)) e.preventDefault();

  // ── Dev mode hotkeys ──
  if (gameMode_dev && raceRunning) {
    if (e.code === 'Digit9') {
      devFreecam = !devFreecam;
      if (devFreecam) {
        // Seed freecam position and orientation from current camera
        _devCamPos.copy(cameras[0].position);
        // Derive yaw/pitch from the camera's current world direction
        const dir = new THREE.Vector3();
        cameras[0].getWorldDirection(dir);
        devFreecamYaw   = Math.atan2(dir.x, dir.z);
        devFreecamPitch = Math.asin(Math.max(-1, Math.min(1, dir.y)));
        cameras[0].rotation.order = 'YXZ';
        // Request pointer lock for mouse-look
        document.body.requestPointerLock();
      } else {
        document.exitPointerLock();
      }
      e.preventDefault();
    }
    if (e.code === 'Digit8') {
      devDebugMenu = !devDebugMenu;
      updateDevDebugOverlay();
      e.preventDefault();
    }
    if (e.code === 'Digit7') {
      devHudHidden = !devHudHidden;
      const hudEls = [
        document.getElementById('hud'),
        document.getElementById('hub-btn'),
        document.getElementById('divider'),
      ];
      hudEls.forEach(el => {
        if (!el) return;
        el.style.visibility = devHudHidden ? 'hidden' : '';
      });
      // raceTimer is inside #hud so it hides with it; handle separately for safety
      const rt = document.getElementById('raceTimer');
      if (rt) rt.style.visibility = devHudHidden ? 'hidden' : '';
      e.preventDefault();
    }
  }
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

const P1_KEYS = { forward:'KeyW', back:'KeyS', left:'KeyA', right:'KeyD', item:'Space' };
const P2_KEYS = { forward:'ArrowUp', back:'ArrowDown', left:'ArrowLeft', right:'ArrowRight', item:'Enter' };

// Per-player gamepad button edge detection (for item use — we want press, not hold)
const _gpItemWasPressed = [false, false];

// =============================================
// UPDATE PLAYER
// Physics values:
//   MAX_SPEED = 20.83 m/s = 75 km/h
//   FRICTION applied as speed *= FRICTION^delta so it's frame-rate independent.
//   At FRICTION=0.15 the time-constant gives a comfortable top speed feel.
//   HUD shows speed * 3.6 (m/s → km/h).
// =============================================
const ACCEL        = 90;       // m/s² acceleration
const BRAKE        = 70;       // m/s² braking
const MAX_SPEED    = 20.83;    // m/s  (= 75 km/h)
const STEER        = 3.8;      // rad/s steering rate
const FRICTION_PER_SEC = 0.18; // fraction of speed lost per second (frame-rate independent)
const OFFTRACK_MULT = 0.3;     // speed multiplier when off track

function updatePlayer(player, binds, delta, otherPlayer) {
  if (player.finishTime) return;

  if (updateBombAirborne(player, delta)) return;

  // Tick immunity timer
  if (player.bananaImmune > 0) player.bananaImmune -= delta;

  // Tick star timer
  if (player.starTimer > 0) {
    player.starTimer -= delta;
    if (player.starTimer < 0) player.starTimer = 0;
  }

  // Tick boost timer
  if (player.boostTimer > 0) {
    player.boostTimer -= delta;
    if (player.boostTimer < 0) player.boostTimer = 0;
  }

  // Tick lightning timer — restore size when it expires
  if (player.lightningTimer > 0) {
    player.lightningTimer -= delta;
    if (player.lightningTimer <= 0) {
      player.lightningTimer = 0;
      restoreFromLightning(player);
    }
  }

  // ── Launch boost timer (separate from item boost) ──
  if (player.launchBoostTimer > 0) {
    player.launchBoostTimer -= delta;
    if (player.launchBoostTimer < 0) player.launchBoostTimer = 0;
  }

  // ── Launch stall + smoke timers — both tick independently ──
  if (player.launchStallTimer > 0) player.launchStallTimer = Math.max(0, player.launchStallTimer - delta);
  if (player.launchSmokeTimer > 0) player.launchSmokeTimer = Math.max(0, player.launchSmokeTimer - delta);

  // ── Star cancels incoming spinouts ──
  if (player.starTimer > 0 && player.spinoutTimer > 0) {
    player.spinoutTimer = 0;
    player.stunTimer    = 0;
    player.speed        = 0;
  }

  // ── Spinout from banana peel ──
  const spinning = player.spinoutTimer > 0;
  if (spinning) {
    player.spinoutTimer -= delta;
    // Fast spin: ~4 full rotations over 3 seconds, eases out near the end
    const t = Math.max(player.spinoutTimer, 0) / 3.0; // 1→0
    const spinRate = 8 * t + 2;                         // fast at start, slows down
    player.angle += spinRate * delta;
    // Friction brings speed to ~0 quickly but not instant (over ~1.5s)
    player.speed *= Math.pow(0.12, delta);
    // Once timer expires, make sure kart is fully stopped
    if (player.spinoutTimer <= 0) {
      player.spinoutTimer = 0;
      player.stunTimer    = 0;
      player.speed        = 0;
    }
  }

  const stunned = player.stunTimer > 0 || spinning;
  if (player.stunTimer > 0 && !spinning) player.stunTimer -= delta;

  const onTrack = isOnTrack(player.kart.position);
  const speedMult = onTrack ? 1 : OFFTRACK_MULT;

  const stalled = player.launchStallTimer > 0;

  if (!stunned) {
    // ── Gather analog gamepad inputs if this player uses a pad ──
    const gpInputs = binds._gpIndex !== undefined ? getGamepadInputs(getGamepad(binds._gpIndex)) : null;
    const playerIdx = binds._playerIdx !== undefined ? binds._playerIdx : 0;

    let accelInput = 0, brakeInput = 0, steerInput = 0;
    let wantsItem = false;

    if (gpInputs) {
      // Gamepad: R2 = gas (analog), L2 = brake/reverse (analog), L-stick X = steer
      accelInput = gpInputs.r2;  // 0..1
      brakeInput = gpInputs.l2;  // 0..1
      // Steer: apply deadzone, then full rate * stick axis
      const sx = Math.abs(gpInputs.lx) > GP_DEADZONE ? gpInputs.lx : 0;
      steerInput = sx; // −1..+1, negative = left, positive = right

      // Cross = item: edge detect (press, not hold)
      if (gpInputs.cross && !_gpItemWasPressed[playerIdx]) wantsItem = true;
      _gpItemWasPressed[playerIdx] = gpInputs.cross;
    } else {
      // Keyboard: digital
      if (keys[binds.forward]) accelInput = 1;
      if (keys[binds.back])    brakeInput = 1;
      if (keys[binds.left])    steerInput = -1;
      if (keys[binds.right])   steerInput =  1;
      wantsItem = !!keys[binds.item];
    }

    // Forward blocked during stall — can steer and brake but not accelerate
    if (accelInput > 0 && !stalled) player.speed += ACCEL * accelInput * delta * speedMult;
    if (brakeInput > 0) {
      if (player.speed > 0) {
        // Braking
        player.speed -= BRAKE * brakeInput * delta * speedMult;
        if (player.speed < 0) player.speed = 0;
      } else if (!stalled) {
        // Reversing — L2 analog controls reverse speed (max 6 m/s)
        // Blocked during stall so the engine backfire can't be escaped by reversing
        player.speed -= (BRAKE * 0.5) * brakeInput * delta * speedMult;
      }
    }
    if (steerInput !== 0) {
      player.angle += -steerInput * STEER * delta * (Math.abs(player.speed) / MAX_SPEED + 0.15);
      // Mirror sprite via texture repeat.x: THREE.Sprite ignores scale sign, so
      // we flip the UV instead. repeat.x=-1 + offset.x=1 = horizontal mirror.
      const spr = player.kart.userData.charSprite;
      if (spr && spr.material.map) {
        const facing = steerInput > 0 ? 1 : -1;
        spr.material.map.repeat.x = facing;
        spr.material.map.offset.x = facing === -1 ? 1 : 0;
        spr.material.map.needsUpdate = true;
      }
    }
    if (wantsItem) useItem(player, otherPlayer);
  }

  // Stall: clamp forward speed to 0 (can't drive forward) and decay to 0
  if (stalled && player.speed > 0) player.speed *= Math.pow(0.05, delta);

  // Clamp speed — launch boost stacks additively with item boost; star wins over all
  const speedCap = player.starTimer > 0 ? MAX_SPEED * 1.55
                 : player.launchBoostTimer > 0 ? MAX_SPEED * 1.38
                 : player.boostTimer > 0 ? MAX_SPEED * 1.4
                 : player.lightningTimer > 0 ? MAX_SPEED * 0.5
                 : MAX_SPEED;
  player.speed = Math.max(-6, Math.min(speedCap * speedMult, player.speed));

  // Frame-rate-independent friction: multiply by (1 - friction)^delta
  player.speed *= Math.pow(1 - FRICTION_PER_SEC, delta);

  // Move
  player.kart.position.x += Math.sin(player.angle) * player.speed * delta;
  player.kart.position.z += Math.cos(player.angle) * player.speed * delta;
  player.kart.rotation.y = player.angle;

  // Tilt on turns (suppressed during spinout — the spin is on Y anyway)
  // For gamepad: use the raw analog stick value so tilt scales with how far the
  // stick is pushed (gentle nudge = subtle lean, full deflection = full lean).
  // For keyboard: binary ±1 as before (keys are either on or off).
  let _tiltAmount = 0;
  if (!stunned) {
    const gpInputsTilt = binds._gpIndex !== undefined ? getGamepadInputs(getGamepad(binds._gpIndex)) : null;
    if (gpInputsTilt) {
      const sx = Math.abs(gpInputsTilt.lx) > GP_DEADZONE ? gpInputsTilt.lx : 0;
      // Negate: positive lx = right = tilt left (negative Z rotation)
      _tiltAmount = -sx;
    } else {
      _tiltAmount = keys[binds.left] ? 1 : keys[binds.right] ? -1 : 0;
    }
  }
  player.kart.rotation.z = spinning ? 0 : -player.speed * 0.01 * _tiltAmount;

  if (player.itemCooldown > 0) player.itemCooldown -= delta;

  // Stadium wall collision — OBB test per stand, hard bounce with velocity reflection
  const KART_R = 1.4; // half-width of kart for collision
  for (const wall of stadiumWalls) {
    const dx = player.kart.position.x - wall.cx;
    const dz = player.kart.position.z - wall.cz;
    // Rotate delta into stand-local space (stand's local X = along stand length, Z = into/out of stand depth)
    const cosA = wall.cosA, sinA = wall.sinA;
    const localX =  dx * cosA + dz * sinA;
    const localZ = -dx * sinA + dz * cosA;

    const extX = wall.halfW + KART_R;
    const extZ = wall.halfD + KART_R;
    const overlapX = extX - Math.abs(localX);
    const overlapZ = extZ - Math.abs(localZ);

    if (overlapX > 0 && overlapZ > 0) {
      // Determine which axis has the least penetration = separation axis
      let pushLocalX = 0, pushLocalZ = 0;
      if (overlapX < overlapZ) {
        // Separate along local X (along stand length)
        pushLocalX = overlapX * (localX < 0 ? -1 : 1);
      } else {
        // Separate along local Z (perpendicular to stand face — this is the wall face)
        pushLocalZ = overlapZ * (localZ < 0 ? -1 : 1);
      }
      // Rotate push back to world space
      player.kart.position.x += pushLocalX * cosA - pushLocalZ * sinA;
      player.kart.position.z += pushLocalX * sinA + pushLocalZ * cosA;

      // Velocity: project current movement onto the wall normal (local Z axis in world space)
      // Wall normal in world space = (-sinA, cosA) for local Z axis
      const wallNx = -sinA, wallNz = cosA;
      const velX = Math.sin(player.angle) * player.speed;
      const velZ = Math.cos(player.angle) * player.speed;
      const velDotN = velX * wallNx + velZ * wallNz;
      // Only reflect if moving into the wall
      if (velDotN * (pushLocalZ !== 0 ? (localZ < 0 ? -1 : 1) : 0) < 0 || pushLocalX !== 0) {
        // Hard stop: kill 85% of speed, reflect angle away from wall
        player.speed *= -0.15;
      }
    }
  }

  // Item box collision
  itemBoxes.forEach((box, i) => {
    if (!box.active) return;
    if (player.kart.position.distanceTo(box.mesh.position) < 2.5) collectItem(player, i);
  });

  updateLaps(player);
}

function updateSoloAI(delta, cpuIdx) {
  // cpuIdx is the index into players[] (1 for first CPU, 2 for second, etc.)
  if (cpuIdx === undefined) cpuIdx = 1;
  const ai = players[cpuIdx];
  const aiState = soloAIs[cpuIdx - 1]; // personality object for this CPU
  const human = players[0];
  if (!ai) return;

  if (updateBombAirborne(ai, delta)) return;

  // ── POST-FINISH: CPU already crossed the line ─────────────────────────────
  // Keep ticking all effect timers so star/lightning/boost still expire properly,
  // then drive the kart along the track using the same lookahead logic as winnerAI.
  // We do NOT return early — this replaces the old hard stop.
  if (ai.finishTime) {
    // Tick every effect timer so visual effects don't freeze
    if (ai.bananaImmune   > 0) ai.bananaImmune   -= delta;
    if (ai.itemCooldown   > 0) ai.itemCooldown   -= delta;
    if (ai.starTimer      > 0) ai.starTimer       = Math.max(0, ai.starTimer      - delta);
    if (ai.boostTimer     > 0) ai.boostTimer      = Math.max(0, ai.boostTimer     - delta);
    if (ai.launchBoostTimer > 0) ai.launchBoostTimer = Math.max(0, ai.launchBoostTimer - delta);
    if (ai.launchSmokeTimer > 0) ai.launchSmokeTimer = Math.max(0, ai.launchSmokeTimer - delta);
    if (ai.launchStallTimer > 0) ai.launchStallTimer = Math.max(0, ai.launchStallTimer - delta);
    if (ai.lightningTimer > 0) {
      ai.lightningTimer = Math.max(0, ai.lightningTimer - delta);
      if (ai.lightningTimer === 0) restoreFromLightning(ai);
    }

    drivePostFinishAI(ai, aiState, delta);
    return;
  }

  if (ai.bananaImmune > 0) ai.bananaImmune -= delta;
  if (ai.itemCooldown > 0) ai.itemCooldown -= delta;
  if (ai.starTimer > 0) ai.starTimer = Math.max(0, ai.starTimer - delta);
  if (ai.boostTimer > 0) ai.boostTimer = Math.max(0, ai.boostTimer - delta);
  if (ai.lightningTimer > 0) {
    ai.lightningTimer = Math.max(0, ai.lightningTimer - delta);
    if (ai.lightningTimer === 0) restoreFromLightning(ai);
  }
  if (ai.launchBoostTimer > 0) ai.launchBoostTimer = Math.max(0, ai.launchBoostTimer - delta);
  if (ai.launchSmokeTimer > 0) ai.launchSmokeTimer = Math.max(0, ai.launchSmokeTimer - delta);
  if (ai.launchStallTimer > 0) {
    ai.launchStallTimer = Math.max(0, ai.launchStallTimer - delta);
    // Stall: AI can't drive forward — decay speed to zero
    if (ai.speed > 0) ai.speed *= Math.pow(0.05, delta);
    ai.kart.rotation.y = ai.angle;
    updateLaps(ai);
    return; // skip normal AI steering while stalled
  }

  // Initialise AI personality state on first call
  if (aiState.swerveTimer    === undefined) aiState.swerveTimer  = 0;
  if (aiState.swerveOffset   === undefined) aiState.swerveOffset = 0;
  if (aiState.swerveDir      === undefined) aiState.swerveDir    = 0;
  if (aiState.peelDodge      === undefined) aiState.peelDodge    = null;

  // ── Star cancels incoming spinouts for the AI too ──
  if (ai.starTimer > 0 && ai.spinoutTimer > 0) {
    ai.spinoutTimer = 0;
    ai.stunTimer    = 0;
    ai.speed        = 0;
  }

  if (ai.spinoutTimer > 0) {
    ai.spinoutTimer = Math.max(0, ai.spinoutTimer - delta);
    ai.stunTimer = ai.spinoutTimer;
    ai.angle += (2 + ai.spinoutTimer * 2) * delta;
    ai.speed *= Math.pow(0.12, delta);
    if (ai.spinoutTimer === 0) {
      ai.stunTimer = 0;
      ai.speed = 0;
    }
    ai.kart.rotation.y = ai.angle;
    updateLaps(ai);
    return;
  }

  // ── Star collision: any star-powered racer rams this AI ──
  for (const other of players) {
    if (other === ai) continue;
    const distToOther = ai.kart.position.distanceTo(other.kart.position);
    if (distToOther < 2.5 && other.starTimer > 0 && ai.starTimer <= 0 && ai.spinoutTimer <= 0) {
      ai.spinoutTimer = 3.0;
      ai.spinoutAngle = 0;
      ai.stunTimer    = 3.0;
      ai.speed       *= 0.4;
      playSlipSound();
      break;
    }
  }

  const aiT = closestTrackT(ai.kart.position);
  const humanT = closestTrackT(human.kart.position);
  const distanceBehind = (aiT - humanT + 1) % 1;

  // ── Banana peel avoidance with 50/50 dodge chance ──
  // Tick down any active dodge decision
  if (aiState.peelDodge && aiState.peelDodge.timer > 0) {
    aiState.peelDodge.timer -= delta;
    if (aiState.peelDodge.timer <= 0) aiState.peelDodge = null;
  }
  // Scan for nearby peels — make one dodge decision per peel encounter
  const PEEL_LOOK_DIST = 7;
  if (!aiState.peelDodge) {
    for (const peel of bananaPeels) {
      if (!peel.active) continue;
      if (ai.kart.position.distanceTo(peel.position) < PEEL_LOOK_DIST) {
        const willDodge = Math.random() < 0.5;          // 50% chance to even try
        const dodgeDir  = Math.random() < 0.5 ? 1 : -1; // random side
        aiState.peelDodge = {
          dir:   willDodge ? dodgeDir : 0, // 0 = failed to react, drives straight into it
          timer: 1.4,                       // hold decision for 1.4 s
        };
        break;
      }
    }
  }

  // ── Random swerve personality ──
  // Periodically pick a new lateral bias so the AI weaves around the track a bit.
  // Suppressed while actively dodge-steering away from a peel.
  // Each AI gets a slightly different cadence so they don't all swerve in sync.
  aiState.swerveTimer -= delta;
  if (aiState.swerveTimer <= 0) {
    aiState.swerveTimer = 1.6 + Math.random() * 2.8 + (cpuIdx * 0.3); // staggered timing per CPU
    const roll = Math.random();
    if      (roll < 0.35) aiState.swerveDir =  1;      // drift right
    else if (roll < 0.70) aiState.swerveDir = -1;      // drift left
    else                  aiState.swerveDir =  0;       // go straight
    aiState.swerveOffset = (0.6 + Math.random() * 1.8) * aiState.swerveDir;
  }

  // ── Kart avoidance: steer around nearby karts (CPU and human) ──
  // Only applies when the AI does NOT have a star — a star-powered kart intentionally
  // rams into opponents. Also tick the overtake cooldown so passing manoeuvres feel
  // deliberate rather than instant jitters.
  if (aiState.avoidTimer === undefined) aiState.avoidTimer = 0;
  if (aiState.avoidDir   === undefined) aiState.avoidDir   = 0;
  if (aiState.avoidTimer > 0) aiState.avoidTimer -= delta;

  const AVOID_LOOK_DIST = 5.5;  // how far ahead the AI sees other karts
  const AVOID_SIDE_DIST = 3.2;  // lateral overlap threshold (kart width ~ 2.4)

  if (ai.starTimer <= 0 && aiState.avoidTimer <= 0) {
    // Build the track-forward and track-perp vectors at AI's current position
    const aiForwardX = Math.sin(ai.angle);
    const aiForwardZ = Math.cos(ai.angle);

    let bestAvoidDir = 0;    // signed: +1 = go right (wider), -1 = go left
    let closestDot   = -1;   // dot product of closest threat (higher = more directly ahead)

    for (const other of players) {
      if (other === ai) continue;
      if (other.finishTime !== null) continue;

      const dx = other.kart.position.x - ai.kart.position.x;
      const dz = other.kart.position.z - ai.kart.position.z;
      const worldDist = Math.sqrt(dx * dx + dz * dz);
      if (worldDist > AVOID_LOOK_DIST + 2) continue; // quick early-out

      // How far directly ahead is the other kart?
      const forwardDot = dx * aiForwardX + dz * aiForwardZ;
      if (forwardDot < 0.5) continue; // behind or beside us — no action needed

      // How far to the side is the other kart?
      const rightX = aiForwardZ;   // perpendicular-right in XZ
      const rightZ = -aiForwardX;
      const sideDot = dx * rightX + dz * rightZ; // positive = other kart is to our right

      // Is the other kart close enough laterally to be a collision threat?
      if (Math.abs(sideDot) > AVOID_SIDE_DIST) continue; // far enough to the side — no issue

      if (forwardDot > closestDot) {
        closestDot = forwardDot;
        // Pick the side with more space to go around:
        // Negative sideDot = other kart is to our LEFT → we go RIGHT (+1)
        // Positive sideDot = other kart is to our RIGHT → we go LEFT (-1)
        // Additionally, every ~30% of the time the AI attempts a pass on the
        // opposite side (adds overtaking flavour so CPUs don't always queue up).
        const preferredSide = sideDot <= 0 ? 1 : -1;
        const tryOvertake   = Math.random() < 0.30;
        bestAvoidDir = tryOvertake ? -preferredSide : preferredSide;
      }
    }

    if (bestAvoidDir !== 0) {
      // Hold avoidance direction for a short time so the kart actually clears the obstacle
      aiState.avoidDir   = bestAvoidDir;
      aiState.avoidTimer = 0.8 + Math.random() * 0.6;
    } else {
      aiState.avoidDir = 0;
    }
  }

  // ── Steering: lookahead point + lateral nudge ──
  const lookaheadT = (aiT + 0.025) % 1;
  const target     = TRACK_CURVE.getPoint(lookaheadT);
  const tan        = TRACK_CURVE.getTangent(lookaheadT).normalize();
  const perp       = new THREE.Vector3(-tan.z, 0, tan.x); // perpendicular to track

  // Priority: peel dodge > kart avoidance > random swerve
  // Peel dodge dir=0 means AI froze (will hit the peel); avoidDir always has a real side
  let lateralBias = aiState.swerveOffset;
  if (aiState.avoidDir !== 0 && ai.starTimer <= 0) {
    // Avoidance: nudge 2.5–3.5 units to the chosen side, strength scales with speed
    const avoidStrength = 2.5 + (Math.abs(ai.speed) / MAX_SPEED) * 1.0;
    lateralBias = aiState.avoidDir * avoidStrength;
  }
  if (aiState.peelDodge && aiState.peelDodge.dir !== 0) {
    lateralBias = aiState.peelDodge.dir * 3.5;
  }

  const nudgedTarget = target.clone().addScaledVector(perp, lateralBias);
  const desiredAngle = Math.atan2(
    nudgedTarget.x - ai.kart.position.x,
    nudgedTarget.z - ai.kart.position.z
  );
  let angleDiff = desiredAngle - ai.angle;
  while (angleDiff >  Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  ai.angle += Math.max(-2.8 * delta, Math.min(2.8 * delta, angleDiff));

  // Mirror AI sprite via texture repeat.x
  if (Math.abs(angleDiff) > 0.01) {
    const aiSpr = ai.kart.userData.charSprite;
    if (aiSpr && aiSpr.material.map) {
      const facing = angleDiff > 0 ? 1 : -1;
      aiSpr.material.map.repeat.x = facing;
      aiSpr.material.map.offset.x = facing === -1 ? 1 : 0;
      aiSpr.material.map.needsUpdate = true;
    }
  }

  const onTrack = isOnTrack(ai.kart.position);
  const speedCap = ai.starTimer > 0 ? MAX_SPEED * 1.55
    : ai.launchBoostTimer > 0 ? MAX_SPEED * 1.38
    : ai.boostTimer > 0 ? MAX_SPEED * 1.4
    : ai.lightningTimer > 0 ? MAX_SPEED * 0.5
    : MAX_SPEED;
  const targetSpeed = (onTrack ? speedCap : MAX_SPEED * 0.25);
  if (ai.speed < targetSpeed) ai.speed += ACCEL * delta;
  ai.speed = Math.min(speedCap, ai.speed);
  ai.speed *= Math.pow(1 - FRICTION_PER_SEC, delta);
  ai.kart.position.x += Math.sin(ai.angle) * ai.speed * delta;
  ai.kart.position.z += Math.cos(ai.angle) * ai.speed * delta;
  ai.kart.rotation.y = ai.angle;
  ai.kart.rotation.z = 0;

  itemBoxes.forEach((box, index) => {
    if (box.active && !ai.item && ai.kart.position.distanceTo(box.mesh.position) < 2.5) collectItem(ai, index);
  });

  // ── Strategic item usage ──
  // The AI holds items and only uses them when the situation calls for it.
  // A random "hesitation delay" (0.5–2.5 s) is rolled each time a new item is
  // picked up, so the CPU never reacts instantly — it feels like a real player
  // thinking about what to do.

  if (ai.item && ai.itemCooldown <= 0) {
    const item = ai.item;

    // Initialise a hesitation delay when the item was just collected
    if (aiState.itemHesitation === undefined || aiState.itemHesitation === null) {
      aiState.itemHesitation = 0.5 + Math.random() * 2.0; // 0.5 – 2.5 s before even considering using it
    }
    aiState.itemHesitation -= delta;
    if (aiState.itemHesitation > 0) {
      // Still thinking…
    } else {
      // Check if a red shell is currently targeting the AI and closing in
      const shellIncoming = redShells.some(s =>
        s.active && s.target === ai && s.mesh1.position.distanceTo(ai.kart.position) < 18
      );

      let shouldUse = false;

      if (item.includes('Star')) {
        // Use star immediately if a shell is incoming, or just randomly once hesitation expires
        shouldUse = shellIncoming || Math.random() < 0.6;
      } else if (item.includes('Boost')) {
        // Use boost when behind or just ready to go
        shouldUse = distanceBehind > 0.05 || Math.random() < 0.5;
      } else if (item.includes('Shell')) {
        // Fire at the nearest opponent ahead — works for any number of racers
        const shellTarget = findShellTarget(ai);
        shouldUse = shellTarget !== null && (Math.random() < 0.7 || distanceBehind > 0.5);
      } else if (item.includes('Banana')) {
        // Drop banana when a rival is close behind or shell incoming (desperation)
        const nearestDist = players.reduce((min, p) => {
          if (p === ai) return min;
          return Math.min(min, ai.kart.position.distanceTo(p.kart.position));
        }, Infinity);
        shouldUse = (nearestDist < 8 && distanceBehind < 0.45) || (shellIncoming && Math.random() < 0.4);
      } else if (item.includes('Lightning')) {
        // Use lightning when losing or just randomly — it's a powerful nuke
        shouldUse = distanceBehind > 0.08 || Math.random() < 0.55;
      } else if (item.includes('Bomb')) {
        const aiTrackT = closestTrackT(ai.kart.position);
        const kartBehind = players.some(other => {
          if (other === ai || other.finishTime !== null || other.bombAirborneTimer > 0) return false;
          if (other.speed <= 0.5) return false;
          const otherTrackT = closestTrackT(other.kart.position);
          const trackDistanceBehind = (aiTrackT - otherTrackT + 1) % 1;
          const worldDistance = ai.kart.position.distanceTo(other.kart.position);
          return trackDistanceBehind > 0.002 && trackDistanceBehind < 0.08 && worldDistance < 10;
        });
        // Bombs are primarily defensive: wait for a moving kart to be close behind.
        shouldUse = kartBehind ? Math.random() < 0.9 : Math.random() < 0.08;
      }

      if (shouldUse) {
        useItem(ai, human); // useItem now calls findShellTarget internally for shells
        aiState.itemHesitation = null; // reset for next item
      }
    }
  } else if (!ai.item) {
    // No item held — clear hesitation so a fresh delay is set when next item is picked up
    aiState.itemHesitation = null;
  }

  updateLaps(ai);
}

// =============================================
// CAMERA
// =============================================
function updateCamera(camera, player) {
  const behind = new THREE.Vector3(
    Math.sin(player.angle) * -player.camDist,
    player.camHeight,
    Math.cos(player.angle) * -player.camDist
  );
  camera.position.lerp(player.kart.position.clone().add(behind), 0.12);
  camera.lookAt(player.kart.position.clone().add(new THREE.Vector3(0, 1, 0)));
}

// =============================================
// WINNER AI DRIVER + CINEMATIC CAMERA
// =============================================
// winnerAI: { playerIdx, trackT, cinCam: { mode, timer, modeTimer } }
let winnerAI = null;

const AI_SPEED_TARGET = MAX_SPEED * 0.82; // a little slower than max so it feels natural
const AI_STEER_RATE   = 2.6;              // rad/s steering correction

// Shared post-finish driver for CPUs and the cinematic-controlled racer.
function drivePostFinishAI(player, state, delta) {
  const LOOKAHEAD = 0.025;
  const arcLen = TRACK_CURVE.getLength();
  const dtPerSec = AI_SPEED_TARGET / arcLen;

  if (state.postFinishTrackT === undefined) {
    state.postFinishTrackT = closestTrackT(player.kart.position);
  }
  state.postFinishTrackT = (state.postFinishTrackT + dtPerSec * delta) % 1;

  const targetPt = TRACK_CURVE.getPoint((state.postFinishTrackT + LOOKAHEAD) % 1);
  const dx = targetPt.x - player.kart.position.x;
  const dz = targetPt.z - player.kart.position.z;
  const desiredAngle = Math.atan2(dx, dz);
  let angleDiff = desiredAngle - player.angle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

  const maxSteer = AI_STEER_RATE * delta;
  player.angle += Math.max(-maxSteer, Math.min(maxSteer, angleDiff));
  if (player.speed < AI_SPEED_TARGET) player.speed += ACCEL * 0.7 * delta;
  player.speed = Math.min(player.speed, AI_SPEED_TARGET);
  player.speed *= Math.pow(1 - FRICTION_PER_SEC, delta);
  player.kart.position.x += Math.sin(player.angle) * player.speed * delta;
  player.kart.position.z += Math.cos(player.angle) * player.speed * delta;
  player.kart.rotation.y = player.angle;
  player.kart.rotation.z = 0;
}

function activateWinnerAI(playerIdx) {
  const p = players[playerIdx];
  // Snap to the nearest track position so the AI has a clean starting t
  const snapT = closestTrackT(p.kart.position);
  winnerAI = {
    playerIdx,
    trackT: snapT,
    // Cinematic camera state for the winner's viewport
    cinCam: {
      mode: 'chase',       // 'chase' | 'side' | 'high' | 'ahead'
      modeTimer: 0,        // time spent in current mode
      modeDuration: 3.5,   // seconds before switching to next mode
      t: 0,                // global time accumulator for smooth motion
    },
  };
}

function updateWinnerAI(delta) {
  if (!winnerAI) return;
  const pi  = winnerAI.playerIdx;
  const p   = players[pi];
  if (!p || p.finishTime === null) return; // safety — shouldn't happen

  // ── 1. DRIVE ALONG THE TRACK ──
  drivePostFinishAI(p, winnerAI, delta);

  // Tick effect timers so fire/rainbow effects still expire during the cinematic.
  // (updatePlayer is skipped for the winner, so we must handle this here.)
  if (p.starTimer       > 0) p.starTimer       = Math.max(0, p.starTimer       - delta);
  if (p.boostTimer      > 0) p.boostTimer      = Math.max(0, p.boostTimer      - delta);
  if (p.launchBoostTimer > 0) p.launchBoostTimer = Math.max(0, p.launchBoostTimer - delta);
  if (p.lightningTimer  > 0) {
    p.lightningTimer = Math.max(0, p.lightningTimer - delta);
    if (p.lightningTimer === 0) restoreFromLightning(p);
  }

  // Still track laps so the HUD is accurate
  updateLaps(p);

  // ── 2. CINEMATIC CAMERA ──
  updateCinematicCamera(delta, pi);
}

// Camera modes: each shoots from a different angle relative to the kart / track
const CIN_MODES = ['chase', 'side', 'high', 'ahead'];
let cinModeIdx = 0;

function updateCinematicCamera(delta, playerIdx) {
  const cc  = winnerAI.cinCam;
  const p   = players[playerIdx];
  const cam = cameras[playerIdx];
  if (!cam) return;
  cc.t += delta;
  cc.modeTimer += delta;

  // Cycle to next mode after modeTimer expires
  if (cc.modeTimer >= cc.modeDuration) {
    cc.modeTimer = 0;
    cinModeIdx = (cinModeIdx + 1) % CIN_MODES.length;
    cc.mode = CIN_MODES[cinModeIdx];
    // Vary duration so cuts don't feel mechanical
    cc.modeDuration = 3.0 + Math.random() * 2.5;
  }

  const kpos  = p.kart.position;
  const fwdX  = Math.sin(p.angle);
  const fwdZ  = Math.cos(p.angle);
  const rightX =  fwdZ;   // perpendicular right in XZ
  const rightZ = -fwdX;

  // Smooth blend factor for lerp (faster lerp = snappier cut; ease in on fresh mode)
  const blend = Math.min(cc.modeTimer / 0.5, 1) * 0.08 + 0.02;

  let targetPos, lookAt;

  if (cc.mode === 'chase') {
    // Classic chase cam but floated up higher and further back than gameplay cam
    const dist = 18 + Math.sin(cc.t * 0.4) * 3;
    const height = 9 + Math.sin(cc.t * 0.3) * 2;
    targetPos = new THREE.Vector3(
      kpos.x - fwdX * dist,
      kpos.y + height,
      kpos.z - fwdZ * dist
    );
    lookAt = kpos.clone().add(new THREE.Vector3(fwdX * 4, 1.5, fwdZ * 4));

  } else if (cc.mode === 'side') {
    // Tracking shot from the side, slowly drifting
    const side = 20 + Math.sin(cc.t * 0.25) * 5;
    const sign = Math.sin(cc.t * 0.1) >= 0 ? 1 : -1; // alternate which side
    targetPos = new THREE.Vector3(
      kpos.x + rightX * side * sign,
      kpos.y + 7 + Math.sin(cc.t * 0.5) * 2,
      kpos.z + rightZ * side * sign
    );
    lookAt = kpos.clone().add(new THREE.Vector3(0, 1, 0));

  } else if (cc.mode === 'high') {
    // Overhead / blimp shot — hovers above a fixed track point, kart drives under it
    const highT   = (winnerAI.trackT + 0.12) % 1;
    const highPt  = TRACK_CURVE.getPoint(highT);
    targetPos = new THREE.Vector3(highPt.x, 45 + Math.sin(cc.t * 0.2) * 5, highPt.z);
    lookAt = kpos.clone().add(new THREE.Vector3(0, 0, 0));

  } else { // 'ahead'
    // Camera placed ahead on the track, kart drives toward it
    const aheadT  = (winnerAI.trackT + 0.06) % 1;
    const aheadPt = TRACK_CURVE.getPoint(aheadT);
    const aheadTan = TRACK_CURVE.getTangent(aheadT).normalize();
    targetPos = new THREE.Vector3(
      aheadPt.x - aheadTan.x * 3 + rightX * (Math.sin(cc.t * 0.3) * 4),
      kpos.y + 4 + Math.sin(cc.t * 0.4) * 1.5,
      aheadPt.z - aheadTan.z * 3 + rightZ * (Math.sin(cc.t * 0.3) * 4)
    );
    lookAt = kpos.clone().add(new THREE.Vector3(0, 1, 0));
  }

  cam.position.lerp(targetPos, blend);
  cam.lookAt(lookAt);
}

// =============================================
// ITEM BOXES UPDATE
// =============================================
function updateItemBoxes(delta) {
  itemBoxes.forEach(box => {
    if (!box.active) {
      box.respawnTimer -= delta;
      if (box.respawnTimer <= 0) {
        box.active = true;
        box.mesh.visible = true;
        if (box.mesh2) box.mesh2.visible = true;
      }
    }
    if (box.active) {
      box.mesh.rotation.y += delta * 2;
      box.mesh.position.y = 0.8 + Math.sin(Date.now() * 0.003) * 0.15;
    }
  });
}

// =============================================
// RACE SETUP & START
// =============================================
async function startGame() {
  await cannonReady;
  const isSolo = gameMode === 'solo';
  soloAI = null;
  soloAIs = [];
  if (isSolo && !gameMode_dev) {
    // Randomly assign unique characters for each CPU slot
    const used = new Set([playerChars[0]]);
    for (let ci = 1; ci <= soloNumCPUs; ci++) {
      const available = CHARACTERS.map((_, index) => index).filter(index => !used.has(index));
      playerChars[ci] = available[Math.floor(Math.random() * available.length)];
      used.add(playerChars[ci]);
    }
  }
  // Reset dev state
  if (gameMode_dev) {
    devFreecam   = false;
    devDebugMenu = false;
    devModeTimer = 0;
    _devCamPos.set(0, 10, 0);
    devFreecamYaw   = 0;
    devFreecamPitch = -0.3;
    const dbg = getDevDebugEl();
    dbg.style.display = 'none';
  }

  document.getElementById('mainMenu').style.display = 'none';
  document.getElementById('yt-credit').classList.add('hidden');
  document.getElementById('hub-btn').classList.add('hidden');
  document.getElementById('hud').style.display = 'block';
  document.getElementById('divider').style.display = isSolo ? 'none' : 'block';

  // Extra CPU HUD boxes — show only if enough CPUs selected
  const cpu2HudEl = document.getElementById('hudCpu2');
  const cpu3HudEl = document.getElementById('hudCpu3');
  if (cpu2HudEl) cpu2HudEl.style.display = (isSolo && soloNumCPUs >= 2) ? '' : 'none';
  if (cpu3HudEl) cpu3HudEl.style.display = (isSolo && soloNumCPUs >= 3) ? '' : 'none';

  const W = isSolo ? window.innerWidth : window.innerWidth / 2;
  const H = window.innerHeight;

  const c1 = document.getElementById('canvas1');
  const c2 = document.getElementById('canvas2');
  const dpr = window.devicePixelRatio || 1;
  c1.width = W * dpr; c1.height = H * dpr; c1.style.width = W+'px'; c1.style.height = H+'px';
  c2.width = W * dpr; c2.height = H * dpr; c2.style.width = W+'px'; c2.style.height = H+'px';
  c2.style.display = isSolo ? 'none' : '';
  // Ensure co-op canvas positions are correct
  c1.style.left = '0';
  c2.style.left = isSolo ? '0' : '50%';

  const r1 = new THREE.WebGLRenderer({ canvas: c1, antialias: true });
  r1.setPixelRatio(dpr);
  r1.setSize(W, H);
  r1.shadowMap.enabled = true; // always enabled; actual shadow toggle is via light.castShadow
  r1.shadowMap.type    = THREE.PCFSoftShadowMap;
  renderers = [r1];
  if (!isSolo) {
    const r2 = new THREE.WebGLRenderer({ canvas: c2, antialias: true });
    r2.setPixelRatio(dpr);
    r2.setSize(W, H);
    r2.shadowMap.enabled = true; // always enabled; actual shadow toggle is via light.castShadow
    r2.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderers.push(r2);
  }

  const s1 = new THREE.Scene();
  scenes = [s1];
  buildScene(s1);
  let s2;
  if (!isSolo) {
    s2 = new THREE.Scene();
    scenes.push(s2);
    buildScene(s2);
  }

  // Item boxes synced to both scenes — evenly spaced on track centre line
  itemBoxes = [];
  const BOX_T_OFFSETS = [0.06, 0.17, 0.28, 0.39, 0.50, 0.61, 0.72, 0.83, 0.94];
  BOX_T_OFFSETS.forEach(t => {
    const pt = TRACK_CURVE.getPoint(t);
    const b1 = makeItemBox();
    b1.position.set(pt.x, 0.8, pt.z); s1.add(b1);
    let b2 = null;
    if (!isSolo) {
      b2 = makeItemBox();
      b2.position.set(pt.x, 0.8, pt.z); s2.add(b2);
    }
    itemBoxes.push({ mesh: b1, mesh2: b2, active: true, respawnTimer: 0 });
  });

  const cam1 = new THREE.PerspectiveCamera(75, W/H, 0.1, 1200);
  cameras = [cam1];
  if (!isSolo) cameras.push(new THREE.PerspectiveCamera(75, W/H, 0.1, 1200));

  // ── SPAWN ANGLE FIX ──
  // Compute the track tangent at t=0 so karts face the direction of travel.
  // sin/cos(angle) drives movement, so angle = atan2(tan.x, tan.z) matches the movement math.
  const spawnTangent = TRACK_CURVE.getTangent(0).normalize();
  const spawnAngle = Math.atan2(spawnTangent.x, spawnTangent.z);
  const spawnPerp = new THREE.Vector3(-spawnTangent.z, 0, spawnTangent.x);

  const spawnOrigin = TRACK_WAYPOINTS[0].clone();

  // Grid layout: 2 columns (left/right), 2 rows — staggered behind start line.
  // Row 0 is on the start line, row 1 is one kart-length behind.
  // The track tangent points forward; behind = -tangent direction.
  const ROW_SPACING = 4.5; // units between front/rear rows on the grid
  const spawnSlots = [
    // [lateral offset, row offset]
    [-2,  0],          // slot 0: front-left
    [ 2,  0],          // slot 1: front-right
    [-2, -ROW_SPACING],// slot 2: rear-left
    [ 2, -ROW_SPACING],// slot 3: rear-right
  ].map(([lat, row]) =>
    spawnOrigin.clone()
      .addScaledVector(spawnPerp, lat)
      .addScaledVector(spawnTangent, row)
      .add(new THREE.Vector3(0, 0.85, 0))
  );

  if (gameMode_dev) {
    // Dev mode: only one player, no CPU at all
    players = [
      createPlayer(playerChars[0], spawnSlots[0], spawnAngle, s1),
      // Dummy ghost P2 so array indexing doesn't crash (never rendered/updated)
      createPlayer(playerChars[0], new THREE.Vector3(-9999, -9999, -9999), spawnAngle, s1),
    ];
    players[1].kart.visible = false;
    document.getElementById('hud1name').textContent = '🔧 ' + CHARACTERS[playerChars[0]].name;
    document.getElementById('hud2').style.display = 'none';
  } else if (isSolo) {
    // Solo: P1 + 1–3 CPUs, all in scene 1
    players = [];
    const totalDrivers = 1 + soloNumCPUs; // P1 + CPUs
    for (let i = 0; i < totalDrivers; i++) {
      players.push(createPlayer(playerChars[i], spawnSlots[i], spawnAngle, s1));
    }
    document.getElementById('hud1name').textContent = '🏎️ ' + CHARACTERS[playerChars[0]].name;
    document.getElementById('hud2name').textContent = '🤖 ' + CHARACTERS[playerChars[1]].name;
    document.getElementById('hud2').style.display = '';
    // Names for extra CPU HUD boxes
    if (soloNumCPUs >= 2) {
      document.getElementById('hudCpu2name').textContent = '🤖 ' + CHARACTERS[playerChars[2]].name;
    }
    if (soloNumCPUs >= 3) {
      document.getElementById('hudCpu3name').textContent = '🤖 ' + CHARACTERS[playerChars[3]].name;
    }
  } else {
    // Co-op: P1 left, P2 right
    players = [
      createPlayer(playerChars[0], spawnSlots[0], spawnAngle, s1),
      createPlayer(playerChars[1], spawnSlots[1], spawnAngle, s2),
    ];
    document.getElementById('hud1name').textContent = '🏎️ ' + CHARACTERS[playerChars[0]].name;
    document.getElementById('hud2name').textContent = '🏎️ ' + CHARACTERS[playerChars[1]].name;
    document.getElementById('hud2').style.display = '';
  }

  if (isSolo && !gameMode_dev) {
    // Create one AI personality object per CPU
    soloAIs = [];
    for (let ci = 0; ci < soloNumCPUs; ci++) {
      soloAIs.push({ itemDecisionTimer: 0 });
    }
    soloAI = soloAIs[0]; // keep legacy reference for compat
  }

  initKartBumpPhysics();

  // ── Countdown + Launch Boost detection ──
  //
  // Rules (same as Mario Kart):
  //   • Press forward DURING the "2" beat window (between the 2-beep and 1-beep, i.e.
  //     900ms–1800ms into the countdown) and hold it → BOOST START (2s speed bonus).
  //   • Hold forward for more than 2100ms total at any point → STALL (engine backfire,
  //     3s unable to drive + dark smoke).
  //   • Press too late (after "1" beep, i.e. after 1800ms) or not at all → NORMAL start.
  //   • Stall check takes priority over boost if both conditions are met.
  //
  // The countdown beeps fire at: t=0 (3), t=900ms (2), t=1800ms (1), t=2700ms (GO).
  // Race actually starts one interval later at t=3600ms.

  raceRunning = false;
  let count = 3;
  const cdEl = document.getElementById('countdown');
  cdEl.style.display = 'flex';
  cdEl.textContent = count;
  initAudioContext();
  playCountdownBeeps();

  const cdStart = performance.now();

  // Track the moment each human player first presses forward (keyboard or gamepad R2)
  const launchHoldKeydown = (e) => {
    const p1UsesKb = isSolo ? soloInputMethod === 'keyboard' : coopInputMethods[0] === 'keyboard';
    const p2UsesKb = !isSolo && coopInputMethods[1] === 'keyboard';
    if (p1UsesKb && e.code === P1_KEYS.forward && players[0].launchHoldStart === null) {
      players[0].launchHoldStart = performance.now();
    }
    if (p2UsesKb && e.code === P2_KEYS.forward && players[1].launchHoldStart === null) {
      players[1].launchHoldStart = performance.now();
    }
  };
  document.addEventListener('keydown', launchHoldKeydown);

  // Gamepad launch polling interval (checks R2 during countdown)
  const launchGpInterval = setInterval(() => {
    const p1UsesGp = isSolo ? soloInputMethod === 'gamepad' : coopInputMethods[0] === 'gamepad';
    const p2UsesGp = !isSolo && coopInputMethods[1] === 'gamepad';
    if (p1UsesGp && players[0].launchHoldStart === null) {
      const gpi = getGamepadInputs(getGamepad(gpAssign[0]));
      if (gpi && gpi.r2 > 0.15) players[0].launchHoldStart = performance.now();
    }
    if (p2UsesGp && players[1] && players[1].launchHoldStart === null) {
      const gpi = getGamepadInputs(getGamepad(gpAssign[1]));
      if (gpi && gpi.r2 > 0.15) players[1].launchHoldStart = performance.now();
    }
  }, 16);

  const cdInterval = setInterval(() => {
    count--;
    if (count > 0) {
      cdEl.textContent = count;
    } else if (count === 0) {
      cdEl.textContent = 'GO!';
      cdEl.style.color = '#00ff00';

      // ── Resolve launch results for human players at GO ──
      clearInterval(launchGpInterval);
      const now = performance.now();

      function resolveHumanLaunch(player) {
        const holdStart = player.launchHoldStart;

        // Never pressed, or pressed after the "1" beep (after 1800ms) → normal
        if (holdStart === null || (holdStart - cdStart) >= 1800) {
          player.launchResult = 'normal';
          return;
        }

        const heldFor = now - holdStart; // total ms held at the moment GO fires

        // Stall check: held for more than 2100ms total → engine overrev
        if (heldFor >= 2100) {
          player.launchResult = 'stall';
          return;
        }

        // Boost window: first pressed during the "2" beat (900ms–1800ms into countdown)
        const pressedAt = holdStart - cdStart;
        if (pressedAt >= 900 && pressedAt < 1800) {
          player.launchResult = 'boost';
          return;
        }

        // Pressed too early (before the "2" beat) but not held long enough to stall → normal
        player.launchResult = 'normal';
      }

      resolveHumanLaunch(players[0]);
      if (!isSolo) resolveHumanLaunch(players[1]);

      // ── Resolve CPU launch result ──
      if (isSolo) {
        for (let ci = 1; ci <= soloNumCPUs; ci++) {
          const roll = Math.random();
          // 50% normal, 30% boost, 20% stall
          players[ci].launchResult = roll < 0.5 ? 'normal' : roll < 0.8 ? 'boost' : 'stall';
        }
      }

    } else {
      // Race starts
      document.removeEventListener('keydown', launchHoldKeydown);
      clearInterval(launchGpInterval);
      cdEl.style.display = 'none';
      cdEl.style.color = '';
      clearInterval(cdInterval);
      raceRunning = true;
      raceStart = Date.now();
      startEngineAudio();
      startBGM();

      // ── Apply launch effects ──
      players.forEach((player, pi) => {
        if (player.launchResult === 'boost') {
          player.launchBoostTimer = 2.0;         // 2s raised speed ceiling
          player.speed = MAX_SPEED * 1.35;        // immediate speed kick
          playLaunchBoostSound();
          // Seed fire pool so particles are ready on frame 1
          initFirePool(pi);
          for (let f = 0; f < 6; f++) spawnFireParticle(_firePools[pi], player);
        } else if (player.launchResult === 'stall') {
          player.launchStallTimer = 3.0;          // 3s can't move forward
          player.launchSmokeTimer = 3.0;          // 3s dark smoke
          player.speed = 0;
          playLaunchStallSound();
        }
        // 'normal' — clean start from zero speed
      });
    }
  }, 900);

  // Assign gamepads before the race starts
  assignGamepads();
  // Reset gamepad item press state
  _gpItemWasPressed[0] = false;
  _gpItemWasPressed[1] = false;

  // Build binds objects with gamepad metadata embedded
  const isSoloGp = isSolo && soloInputMethod === 'gamepad';
  const isCoopP1Gp = !isSolo && coopInputMethods[0] === 'gamepad';
  const isCoopP2Gp = !isSolo && coopInputMethods[1] === 'gamepad';

  // If assignGamepads() couldn't find the pad via polling (it lagged behind the
  // gamepadconnected event), patch gpAssign from _connectedPadIndices NOW — before
  // the lightbar IIFE captures the indices — so both the lightbar and the race loop
  // always get the correct index. On Linux Chrome the gamepadconnected event fires
  // reliably when the user presses a button; getGamepads() may still lag at this
  // point, so _connectedPadIndices is the authoritative source.
  const _sortedPadIndices = Array.from(_connectedPadIndices).sort((a,b) => a-b);
  if (gpAssign[0] === undefined && _sortedPadIndices.length > 0) {
    gpAssign[0] = _sortedPadIndices[0];
  }
  if (gpAssign[1] === undefined && _sortedPadIndices.length > 1) {
    gpAssign[1] = _sortedPadIndices[1];
  }

  // ── DS4 Lightbar: confirm correct character colour at race start ──
  // The WebHID permission was already requested (and device opened) when the player
  // clicked the gamepad button or scrolled through characters on the menu.
  // Here we just do a final colour refresh using the already-cached device — no
  // permission picker will appear. ds4Lightbar.request() is safe to call even if
  // the device isn't cached yet (graceful no-op if permission was never granted).
  (async () => {
    const p1GpIdx = gpAssign[0];
    const p2GpIdx = gpAssign[1];
    if (isSoloGp && p1GpIdx !== undefined) {
      await ds4Lightbar.request(p1GpIdx, CHARACTERS[playerChars[0]].lightbarColor);
    }
    if (isCoopP1Gp && p1GpIdx !== undefined) {
      await ds4Lightbar.request(p1GpIdx, CHARACTERS[playerChars[0]].lightbarColor);
    }
    if (isCoopP2Gp && p2GpIdx !== undefined) {
      await ds4Lightbar.request(p2GpIdx, CHARACTERS[playerChars[1]].lightbarColor);
    }
  })();

  const p1Binds = Object.assign({}, P1_KEYS, {
    _playerIdx: 0,
    _gpIndex: isSoloGp || isCoopP1Gp ? gpAssign[0] : undefined,
  });
  const p2Binds = Object.assign({}, P2_KEYS, {
    _playerIdx: 1,
    _gpIndex: isCoopP2Gp ? gpAssign[1] : undefined,
  });

  if (animId) cancelAnimationFrame(animId);
  let lastTime = performance.now();

  function loop() {
    animId = requestAnimationFrame(loop);
    const now = performance.now();
    const delta = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    // ── DS4 Options button → pause (poll every frame, outside raceRunning guard) ──
    {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      // Check each assigned gamepad slot
      [gpAssign[0], gpAssign[1]].forEach((padIdx, slot) => {
        if (padIdx === undefined || padIdx === null) return;
        const gp = pads[padIdx];
        if (!gp) return;
        const raw = isRawMapping(gp);
        // Options button: standard mapping = buttons[9], raw Linux = buttons[9] as well
        const optBtn = gp.buttons[9];
        const pressed = optBtn ? (optBtn.pressed || optBtn.value > 0.5) : false;
        if (pressed && !_gpOptionsWasPressed[slot]) {
          // Only toggle if we're in an active race (not on menu, not on win screen)
          const _menuEl = document.getElementById('mainMenu');
          const _wsEl   = document.getElementById('winScreen');
          const _menuHidden = _menuEl && _menuEl.style.display === 'none';
          const _wsHidden   = !_wsEl  || _wsEl.style.display  !== 'flex';
          if (_menuHidden && _wsHidden) togglePause();
        }
        _gpOptionsWasPressed[slot] = pressed;
      });
    }

    if (raceRunning) {
      const aiIdx = winnerAI ? winnerAI.playerIdx : -1;

      // Dev mode: count up the dev timer
      if (gameMode_dev) devModeTimer += delta;

      // Normal player update — skip the AI-controlled winner
      // In dev freecam mode, don't update the player's driving inputs (kart stays put)
      if (aiIdx !== 0 && !(gameMode_dev && devFreecam)) updatePlayer(players[0], p1Binds, delta, players[1]);
      if (!gameMode_dev) {
        if (isSolo) {
          // Drive each CPU independently.
          // Finished CPUs are handled inside updateSoloAI (post-finish path) so we
          // always call it — winnerAI only affects the human player's camera, not CPUs.
          for (let ci = 1; ci <= soloNumCPUs; ci++) {
            updateSoloAI(delta, ci);
          }
        } else if (aiIdx !== 1) {
          updatePlayer(players[1], p2Binds, delta, players[0]);
        }
      }

      // AI drives the winner's kart (also updates that kart's laps)
      updateWinnerAI(delta);
      updateBombs(delta);

      updateKartBumpPhysics(delta);

      updateItemBoxes(delta);
      updateBananaPeels(delta, players);
      updateRedShells(delta);
      if (!isSolo) syncItemBoxVisibility();

      raceTimer = (Date.now() - raceStart) / 1000;

      // Camera
      if (gameMode_dev && devFreecam) {
        // Freecam: WASD/Space/Shift move camera, mouse-look
        updateDevFreecam(delta, cameras[0]);
      } else {
        if (aiIdx !== 0) updateCamera(cameras[0], players[0]);
        if (!isSolo && aiIdx !== 1) updateCamera(cameras[1], players[1]);
      }

      if (!isSolo) updateMirrorKarts();
      updateStarEffects(delta);
      updateLightningEffects(delta);
      updateFireParticles(delta);
      updateSmokeParticles(delta);
      updateWheels(delta);
      updateHUD();
      updateEngineAudio();

      // Dev overlays
      if (gameMode_dev) updateDevDebugOverlay();
    }

    scenes.forEach(s => {
      s.children.forEach(obj => { if (obj._spin) obj.rotation.y += delta * obj._spin; });
    });

    renderers[0].render(scenes[0], cameras[0]);
    if (!isSolo) renderers[1].render(scenes[1], cameras[1]);
  }
  loop();
}

// =============================================
// BOOST FIRE PARTICLES
// =============================================
// Two pools (one per player), each containing particle meshes in both scenes.
// Each particle: { mesh1, mesh2, life, maxLife, vx, vy, vz }
const FIRE_COLORS = [0xFF4400, 0xFF8800, 0xFFCC00, 0xFF2200, 0xFFFFAA];
const FIRE_POOL_SIZE = 28; // particles per player

// Pools are initialised lazily on first boost so scenes[] is ready.
const _firePools = [null, null, null, null]; // up to 4 players

function initFirePool(pi) {
  if (_firePools[pi]) return;
  const pool = [];
  for (let i = 0; i < FIRE_POOL_SIZE; i++) {
    const geo = new THREE.SphereGeometry(0.18, 4, 4);
    const mat1 = new THREE.MeshBasicMaterial({ color: 0xFF4400, transparent: true, opacity: 0 });
    const mat2 = mat1.clone();
    const m1 = new THREE.Mesh(geo, mat1);
    const m2 = new THREE.Mesh(geo, mat2);
    m1.visible = false; m2.visible = false;
    scenes[0].add(m1);
    if (scenes[1]) scenes[1].add(m2);
    pool.push({ mesh1: m1, mesh2: m2, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
  }
  _firePools[pi] = pool;
}

function spawnFireParticle(pool, player) {
  // Find a dead particle to recycle
  const p = pool.find(p => p.life <= 0);
  if (!p) return;

  // Exhaust exits from behind the kart
  const bx = -Math.sin(player.angle) * 1.9;
  const bz = -Math.cos(player.angle) * 1.9;

  // Random spread around the exhaust point
  const spread = 0.35;
  const ox = (Math.random() - 0.5) * spread;
  const oz = (Math.random() - 0.5) * spread;

  const worldX = player.kart.position.x + bx + ox;
  const worldY = player.kart.position.y + 0.1 + Math.random() * 0.3;
  const worldZ = player.kart.position.z + bz + oz;

  p.mesh1.position.set(worldX, worldY, worldZ);
  if (p.mesh2) p.mesh2.position.set(worldX, worldY, worldZ);

  // Velocity: mostly backward/upward with slight randomness
  const speed = 3 + Math.random() * 3;
  p.vx = bx / 1.9 * speed * 0.5 + (Math.random() - 0.5) * 1.5;
  p.vy = 1.5 + Math.random() * 2.5;
  p.vz = bz / 1.9 * speed * 0.5 + (Math.random() - 0.5) * 1.5;

  p.maxLife = 0.25 + Math.random() * 0.2;
  p.life    = p.maxLife;

  const col = FIRE_COLORS[Math.floor(Math.random() * FIRE_COLORS.length)];
  p.mesh1.material.color.set(col);
  if (p.mesh2) p.mesh2.material.color.set(col);
  p.mesh1.visible = true;
  if (p.mesh2) p.mesh2.visible = true;
}

function updateFireParticles(delta) {
  players.forEach((player, pi) => {
    const boosting = player.boostTimer > 0 || player.launchBoostTimer > 0;

    if (boosting) {
      initFirePool(pi);
      // Spawn ~8 new particles per second at 60fps feels great
      const spawnCount = Math.random() < delta * 50 ? 2 : 1;
      for (let i = 0; i < spawnCount; i++) spawnFireParticle(_firePools[pi], player);
    }

    if (!_firePools[pi]) return;

    _firePools[pi].forEach(p => {
      if (p.life <= 0) return;
      p.life -= delta;

      if (p.life <= 0) {
        p.mesh1.visible = false;
        if (p.mesh2) p.mesh2.visible = false;
        return;
      }

      // Integrate position
      p.mesh1.position.x += p.vx * delta;
      p.mesh1.position.y += p.vy * delta;
      p.mesh1.position.z += p.vz * delta;
      if (p.mesh2) p.mesh2.position.copy(p.mesh1.position);

      // Rise slows, gravity pulls back
      p.vy -= 6 * delta;

      // Fade and shrink as life runs out
      const t = p.life / p.maxLife; // 1→0
      const opacity = t * 0.9;
      const scale   = 0.4 + t * 0.6;
      p.mesh1.material.opacity = opacity;
      if (p.mesh2) p.mesh2.material.opacity = opacity;
      p.mesh1.scale.setScalar(scale);
      if (p.mesh2) p.mesh2.scale.setScalar(scale);

      // Shift colour toward yellow/white as they cool
      const hue = 0.08 - (1 - t) * 0.08; // orange → red
      p.mesh1.material.color.setHSL(hue, 1.0, 0.5 + (1 - t) * 0.3);
      if (p.mesh2) p.mesh2.material.color.copy(p.mesh1.material.color);
    });
  });
}

// =============================================
// DARK SMOKE PARTICLES — launch stall exhaust
// =============================================
const SMOKE_POOL_SIZE = 32;
const _smokePools = [null, null, null, null]; // up to 4 players

function initSmokePool(pi) {
  if (_smokePools[pi]) return;
  const pool = [];
  for (let i = 0; i < SMOKE_POOL_SIZE; i++) {
    const geo = new THREE.SphereGeometry(0.28, 5, 5);
    const mat1 = new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0 });
    const mat2 = mat1.clone();
    const m1 = new THREE.Mesh(geo, mat1);
    const m2 = new THREE.Mesh(geo, mat2);
    m1.visible = false; m2.visible = false;
    scenes[0].add(m1);
    if (scenes[1]) scenes[1].add(m2);
    pool.push({ mesh1: m1, mesh2: m2, life: 0, maxLife: 0, vx: 0, vy: 0, vz: 0 });
  }
  _smokePools[pi] = pool;
}

function spawnSmokeParticle(pool, player) {
  const p = pool.find(p => p.life <= 0);
  if (!p) return;

  const bx = -Math.sin(player.angle) * 1.9;
  const bz = -Math.cos(player.angle) * 1.9;
  const spread = 0.5;
  const ox = (Math.random() - 0.5) * spread;
  const oz = (Math.random() - 0.5) * spread;

  const worldX = player.kart.position.x + bx + ox;
  const worldY = player.kart.position.y + 0.2 + Math.random() * 0.3;
  const worldZ = player.kart.position.z + bz + oz;

  p.mesh1.position.set(worldX, worldY, worldZ);
  if (p.mesh2) p.mesh2.position.set(worldX, worldY, worldZ);

  const speed = 1.5 + Math.random() * 2;
  p.vx = bx / 1.9 * speed * 0.3 + (Math.random() - 0.5) * 0.8;
  p.vy = 1.8 + Math.random() * 2;
  p.vz = bz / 1.9 * speed * 0.3 + (Math.random() - 0.5) * 0.8;

  p.maxLife = 0.6 + Math.random() * 0.4;
  p.life    = p.maxLife;

  // Dark grey/brown smoke colour
  const grey = 0.12 + Math.random() * 0.15;
  p.mesh1.material.color.setRGB(grey, grey * 0.9, grey * 0.8);
  if (p.mesh2) p.mesh2.material.color.copy(p.mesh1.material.color);
  p.mesh1.visible = true;
  if (p.mesh2) p.mesh2.visible = true;
}

function updateSmokeParticles(delta) {
  players.forEach((player, pi) => {
    const smoking = player.launchSmokeTimer > 0;
    if (smoking) {
      player.launchSmokeTimer -= delta;
      initSmokePool(pi);
      const spawnCount = Math.random() < delta * 40 ? 3 : 2;
      for (let i = 0; i < spawnCount; i++) spawnSmokeParticle(_smokePools[pi], player);
    }
    if (!_smokePools[pi]) return;
    _smokePools[pi].forEach(p => {
      if (p.life <= 0) return;
      p.life -= delta;
      if (p.life <= 0) {
        p.mesh1.visible = false;
        if (p.mesh2) p.mesh2.visible = false;
        return;
      }
      p.mesh1.position.x += p.vx * delta;
      p.mesh1.position.y += p.vy * delta;
      p.mesh1.position.z += p.vz * delta;
      if (p.mesh2) p.mesh2.position.copy(p.mesh1.position);
      p.vy -= 1.5 * delta; // slow float up then drift
      const t = p.life / p.maxLife; // 1→0
      // Expand as smoke rises
      const scale = 0.5 + (1 - t) * 1.8;
      p.mesh1.scale.setScalar(scale);
      if (p.mesh2) p.mesh2.scale.setScalar(scale);
      p.mesh1.material.opacity = t * 0.55;
      if (p.mesh2) p.mesh2.material.opacity = t * 0.55;
    });
  });
}

// =============================================
// MIRROR KARTS (real kart copy of each player in the other player's scene)
// =============================================
let ghostKarts = null;

// =============================================
// STAR RAINBOW EFFECT
// =============================================
// Store original material colors so we can restore them when the star expires.
// We also track the last known starTimer state per player to know when to restore.
const _starOrigColors = [null, null, null, null]; // per player (up to 4), array of { mesh, color }

function updateStarEffects(delta) {
  players.forEach((player, pi) => {
    const active = player.starTimer > 0;

    if (active) {
      // Lazily snapshot original colors on first frame of star activation.
      // Use traverse so nested parts (wheels, axle rods, exhaust pipes, etc.) are included.
      if (!_starOrigColors[pi]) {
        _starOrigColors[pi] = [];
        player.kart.traverse(child => {
          if ((child.isMesh || child.isSprite) && child.material && child.material.color) {
            _starOrigColors[pi].push({ target: child.material, origColor: child.material.color.clone() });
          }
        });
      }

      // Shift hue over time — full rainbow cycle every ~0.6s, fast enough to look wild
      const hue = (Date.now() * 0.003 + pi * 0.5) % 1;
      const rainbowColor = new THREE.Color().setHSL(hue, 1.0, 0.62);

      player.kart.traverse(child => {
        if ((child.isMesh || child.isSprite) && child.material && child.material.color) {
          child.material.color.copy(rainbowColor);
        }
      });

    } else if (_starOrigColors[pi]) {
      // Star just expired — restore all original colors
      _starOrigColors[pi].forEach(({ target, origColor }) => {
        target.color.copy(origColor);
      });
      _starOrigColors[pi] = null;
    }
  });
}

function updateMirrorKarts() {
  // Build real mirror karts on first call (scenes and players are ready by then)
  if (!ghostKarts) {
    // P2's real kart is in scenes[1] — build a full copy in scenes[0] so P1 can see P2
    const g1 = buildKart(players[1].charIndex, scenes[0]);
    scenes[0].add(g1);
    // P1's real kart is in scenes[0] — build a full copy in scenes[1] so P2 can see P1
    const g2 = buildKart(players[0].charIndex, scenes[1]);
    scenes[1].add(g2);
    ghostKarts = [g1, g2];
  }
  // Sync mirror kart transforms to match the real karts every frame
  ghostKarts[0].position.copy(players[1].kart.position);
  ghostKarts[0].rotation.copy(players[1].kart.rotation);
  ghostKarts[1].position.copy(players[0].kart.position);
  ghostKarts[1].rotation.copy(players[0].kart.rotation);
}

function syncItemBoxVisibility() {
  itemBoxes.forEach(box => {
    if (box.mesh2) {
      box.mesh2.visible = box.mesh.visible;
      box.mesh2.position.copy(box.mesh.position);
      box.mesh2.rotation.copy(box.mesh.rotation);
    }
  });
}

// =============================================
// WHEEL ANIMATION — roll + steering
// =============================================
// Wheel cylinders are oriented with their Y axis along the kart's X axis (rotation.z = PI/2).
// Rolling forward = positive X rotation in the wheel's local space.
// Circumference = 2π * 0.5 = ~3.14 units, so roll rate = speed / 0.5 rad/s
const WHEEL_RADIUS = 0.5;

function updateWheels(delta) {
  players.forEach((player, pi) => {
    const ud = player.kart.userData;
    if (!ud.frontWheels) return;

    // ── Roll: spin each wheelGroup on its local X axis ──
    // The cylinder axle is baked along X (tyre.rotation.z = PI/2 on the mesh).
    // wheelGroup itself has no parent tilt, so its local X = world X = the axle.
    // Rotating wheelGroup.rotation.x therefore rolls the wheel forward/backward. ✅
    const rollRate  = player.speed / WHEEL_RADIUS;
    const rollDelta = rollRate * delta;
    [...ud.frontWheels, ...ud.rearWheels].forEach(wheelGroup => {
      wheelGroup.rotation.x += rollDelta;
    });

    // ── Steering: smooth the target steer angle and apply to front axle pivot ──
    // Determine raw steer input: check keys/gamepad for human players, or derive from angle delta for AI
    let steerTarget = 0;
    if (pi === 0) {
      const useGp = (gameMode === 'solo' && soloInputMethod === 'gamepad') ||
                    (gameMode === 'coop' && coopInputMethods[0] === 'gamepad');
      if (useGp) {
        const gpi = getGamepadInputs(getGamepad(gpAssign[0]));
        if (gpi) {
          const sx = Math.abs(gpi.lx) > GP_DEADZONE ? gpi.lx : 0;
          steerTarget = -sx * 0.45;
        }
      } else {
        if (keys[P1_KEYS.left])  steerTarget =  0.45;
        if (keys[P1_KEYS.right]) steerTarget = -0.45;
      }
    } else if (pi === 1 && gameMode === 'coop') {
      const useGp = coopInputMethods[1] === 'gamepad';
      if (useGp) {
        const gpi = getGamepadInputs(getGamepad(gpAssign[1]));
        if (gpi) {
          const sx = Math.abs(gpi.lx) > GP_DEADZONE ? gpi.lx : 0;
          steerTarget = -sx * 0.45;
        }
      } else {
        if (keys[P2_KEYS.left])  steerTarget =  0.45;
        if (keys[P2_KEYS.right]) steerTarget = -0.45;
      }
    } else {
      // AI / solo player 2 — derive from how fast the kart angle is changing
      // We store last angle in userData to compute delta
      const prevAngle = ud.lastAngle !== undefined ? ud.lastAngle : player.angle;
      const angleDelta = player.angle - prevAngle;
      steerTarget = Math.max(-0.45, Math.min(0.45, angleDelta / delta * 0.12));
    }
    ud.lastAngle = player.angle;

    // Smooth toward target (snappy in, snappy out)
    const steerSpeed = 6.0;
    ud.steerAngle += (steerTarget - ud.steerAngle) * Math.min(steerSpeed * delta, 1);

    // Apply to front axle pivot (Y rotation = left/right steer)
    ud.frontAxlePivot.rotation.y = ud.steerAngle;
  });
}

// =============================================
// HUD UPDATE
// =============================================
function updateHUD() {
  const t = raceTimer;
  const mins = Math.floor(t/60).toString().padStart(2,'0');
  const secs = Math.floor(t%60).toString().padStart(2,'0');
  document.getElementById('raceTimer').textContent = mins+':'+secs;

  // Determine race position for all players.
  // Already-finished players rank above unfinished ones (by finishTime ascending).
  // Among unfinished players, rank by lap desc then checkpoint desc.
  const allIndices = players.map((_, i) => i);
  const ranked = allIndices.slice().sort((a, b) => {
    const pa = players[a], pb = players[b];
    if (pa.finishTime !== null && pb.finishTime !== null) return pa.finishTime - pb.finishTime;
    if (pa.finishTime !== null) return -1;
    if (pb.finishTime !== null) return  1;
    if (pa.lap !== pb.lap) return pb.lap - pa.lap;
    return pb.checkpoint - pa.checkpoint;
  });
  const placeOf = new Array(players.length).fill(0);
  ranked.forEach((playerIdx, rank) => { placeOf[playerIdx] = rank + 1; });

  const placeLabels = ['🥇 1st', '🥈 2nd', '🥉 3rd', '4th'];
  const placeFinish = '✅ Finished!';

  // Only update HUD for P1 and P2 (the two visible HUD panels)
  [0, 1].forEach(i => {
    if (!players[i]) return;
    const p = players[i];
    document.getElementById(`hud${i+1}lap`).textContent = Math.min(p.lap, TOTAL_LAPS);
    document.getElementById(`hud${i+1}speed`).textContent = Math.abs(Math.round(p.speed * 3.6));
    document.getElementById(`hud${i+1}item`).textContent = p.item || '';
    const place = placeOf[i];
    document.getElementById(`hud${i+1}place`).textContent =
      p.finishTime !== null ? placeFinish : (placeLabels[place - 1] || `${place}th`);
  });

  // Extra CPU HUD boxes (indices 2 and 3 in players array = CPU2 and CPU3)
  // CPU2 box (player index 2)
  const cpu2El = document.getElementById('hudCpu2');
  if (cpu2El && cpu2El.style.display !== 'none' && players[2]) {
    const p = players[2];
    document.getElementById('hudCpu2lap').textContent = Math.min(p.lap, TOTAL_LAPS);
    document.getElementById('hudCpu2speed').textContent = Math.abs(Math.round(p.speed * 3.6));
    document.getElementById('hudCpu2item').textContent = p.item || '';
    const place = placeOf[2];
    document.getElementById('hudCpu2place').textContent =
      p.finishTime !== null ? placeFinish : (placeLabels[place - 1] || `${place}th`);
  }
  // CPU3 box (player index 3)
  const cpu3El = document.getElementById('hudCpu3');
  if (cpu3El && cpu3El.style.display !== 'none' && players[3]) {
    const p = players[3];
    document.getElementById('hudCpu3lap').textContent = Math.min(p.lap, TOTAL_LAPS);
    document.getElementById('hudCpu3speed').textContent = Math.abs(Math.round(p.speed * 3.6));
    document.getElementById('hudCpu3item').textContent = p.item || '';
    const place = placeOf[3];
    document.getElementById('hudCpu3place').textContent =
      p.finishTime !== null ? placeFinish : (placeLabels[place - 1] || `${place}th`);
  }
}

// =============================================
// FINISH / WIN SCREEN
// =============================================
function showFinish() {
  raceRunning = false;
  stopEngineAudio();
  stopBGM();

  const times = players.map((p, i) => ({
    name:      CHARACTERS[p.charIndex].name,
    img:       CHARACTERS[p.charIndex].img,
    time:      p.finishTime || raceTimer,
    player:    i + 1,
    charIndex: p.charIndex,
  }));
  times.sort((a, b) => a.time - b.time);

  // Winner portrait & name
  document.getElementById('win1img').src   = times[0].img;
  document.getElementById('win1name').textContent = times[0].name;
  document.getElementById('win1time').textContent = `${times[0].time.toFixed(2)}s`;
  document.getElementById('winTitle').textContent  = `${times[0].name} WINS THE RACE!`;

  // Runner-up (2nd)
  if (times[1]) {
    document.getElementById('win2img').src   = times[1].img;
    document.getElementById('win2name').textContent = times[1].name;
    document.getElementById('win2time').textContent = `${times[1].time.toFixed(2)}s`;
    document.getElementById('podium2nd').style.display = '';
  }

  // 3rd place — only visible when there are 3+ racers
  const podium3rd = document.getElementById('podium3rd');
  if (podium3rd) {
    if (times[2]) {
      document.getElementById('win3img').src = times[2].img;
      document.getElementById('win3name').textContent = times[2].name;
      document.getElementById('win3time').textContent = `${times[2].time.toFixed(2)}s`;
      podium3rd.style.display = '';
    } else {
      podium3rd.style.display = 'none';
    }
  }

  // Confetti burst
  spawnConfetti();

  // Win sound — HYPE! 🎉
  playWinSound();

  // Show the screen
  const ws = document.getElementById('winScreen');
  ws.style.display = 'flex';
}

function spawnConfetti() {
  // Remove any leftover confetti pieces from previous races
  document.querySelectorAll('.confetti-piece').forEach(el => el.remove());

  // Attach confetti directly to #winScreen which is position:fixed inset:0
  // so vw/vh coords map to the full viewport — no clipping from parent containers.
  const container = document.getElementById('winScreen');
  const colors = ['#FFD700','#FF0000','#00FF88','#00AEEF','#FF69B4','#FF8C00','#AA00FF','#ffffff','#FF4500','#7FFF00','#FF1493','#00FFFF','#FF6347','#ADFF2F'];

  function spawnBatch(count, delayOffset) {
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-piece';
      // Vary shapes: squares, rectangles, thin streamers
      const shapeRoll = Math.random();
      const w = shapeRoll < 0.33 ? (6 + Math.random() * 12)
              : shapeRoll < 0.66 ? (4 + Math.random() * 6)
              :                    (3 + Math.random() * 4);
      const h = shapeRoll < 0.33 ? w
              : shapeRoll < 0.66 ? (12 + Math.random() * 16)
              :                    (18 + Math.random() * 24);
      p.style.left              = Math.random() * 105 + 'vw'; // slight overshoot so edges get hit too
      p.style.top               = '-30px';
      p.style.background        = colors[Math.floor(Math.random() * colors.length)];
      p.style.width             = w + 'px';
      p.style.height            = h + 'px';
      p.style.borderRadius      = shapeRoll < 0.33 ? '2px' : '1px';
      p.style.opacity           = (0.75 + Math.random() * 0.25).toFixed(2);
      p.style.animationDuration = (4 + Math.random() * 5) + 's';  // 4-9 s, nice and slow
      p.style.animationDelay    = (delayOffset + Math.random() * 3) + 's';
      container.appendChild(p);
    }
  }

  // Wave 1 - instant burst (800 pieces)
  spawnBatch(800, 0);
  // Wave 2 - 3 s later so the sky keeps raining long after the first wave clears
  setTimeout(() => spawnBatch(600, 0), 3000);
  // Wave 3 - keep it going!
  setTimeout(() => spawnBatch(500, 0), 7000);
}

function backToMenu() {
  // Reset pause state first so resumeGame() isn't needed
  racePaused = false;
  raceRunning = false;
  document.getElementById('pauseScreen').style.display = 'none';
  document.getElementById('winScreen').style.display = 'none';
  document.getElementById('hud').style.display = 'none';
  document.getElementById('hud2').style.display = ''; // restore in case dev mode hid it
  // Hide extra CPU HUD boxes
  const cpu2El = document.getElementById('hudCpu2');
  const cpu3El = document.getElementById('hudCpu3');
  if (cpu2El) cpu2El.style.display = 'none';
  if (cpu3El) cpu3El.style.display = 'none';
  ds4Lightbar.resetAll(); // restore DS4 default blue
  document.getElementById('divider').style.display = 'none';
  document.getElementById('mainMenu').style.display = 'flex';
  document.getElementById('hub-btn').classList.remove('hidden');
  document.getElementById('yt-credit').classList.remove('hidden');
  // Clean up dev overlays
  if (_devDebugEl) _devDebugEl.style.display = 'none';
  if (devFreecam) { try { document.exitPointerLock(); } catch(_) {} }
  devFreecam   = false;
  devDebugMenu = false;
  gameMode_dev = false;
  // Restore HUD visibility in case 7 was toggled
  if (devHudHidden) {
    ["hud","hub-btn","divider","raceTimer"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.visibility = '';
    });
    devHudHidden = false;
  }
  stopEngineAudio();
  stopBGM();
  ghostKarts = null;
  kartBumpWorld = null;
  kartBumpBodies = [];
  bombs = [];
  itemBoxes = [];
  bananaPeels = [];
  redShells = [];
  _activeBolts.length = 0;
  soloAIs = [];
  winnerAI = null;
  cinModeIdx = 0;
  for (let i = 0; i < 4; i++) {
    _starOrigColors[i] = null;
    _firePools[i] = null;
    _smokePools[i] = null;
  }
  stadiumWalls.length = 0;
  players = [];
  scenes = [];
  cameras = [];
  if (animId) cancelAnimationFrame(animId);
  if (_finishFallbackTimer) { clearTimeout(_finishFallbackTimer); _finishFallbackTimer = null; }
  _clearPostFinishCinematic();
  updateCharUI();
}