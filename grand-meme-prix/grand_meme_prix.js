// =============================================
// MEME CHARACTERS ARRAY — add new ones easily!
// Just drop PNG files next to the HTML and add entries here.
// =============================================
const CHARACTERS = [
  { name: "Mama Luigi",    img: "assets/Mama-Luigi.png",     color: 0x228B22 },
  { name: "King Harkinian",img: "assets/King-Harkinian.png", color: 0xDAA520 },
  { name: "Doge",          img: "assets/Doge.png",           color:  0xCBB987 },
  { name: "Gwonam",        img: "assets/Gwonam.png",         color: 0x8A45A1 },
  { name: "Zelda",         img: "assets/Zelda.png",          color: 0xFF00AA },
  { name: "Longcat",       img: "assets/Longcat.png",        color: 0xDEDEDE },
];

// =============================================
// PLAYER STATE
// =============================================
let playerChars = [0, 1 % CHARACTERS.length];
let gameMode = 'coop';
let soloAI = null;

function changeChar(player, dir) {
  playerChars[player] = (playerChars[player] + dir + CHARACTERS.length) % CHARACTERS.length;
  updateCharUI();
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
}

function selectMode(mode) {
  gameMode = mode;
  document.getElementById('screenModeSelect').style.display = 'none';
  document.getElementById(mode === 'solo' ? 'screenCharSolo' : 'screenCharCoop').style.display = 'flex';
  updateCharUI();
}

function goBack() {
  document.getElementById('screenCharSolo').style.display = 'none';
  document.getElementById('screenCharCoop').style.display = 'none';
  document.getElementById('screenModeSelect').style.display = 'flex';
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
let raceStart = 0;
let raceTimer = 0;
let animId;
let keys = {};
let itemBoxes = [];

// Stadium wall segments for collision (built once, shared — world-space centre + inward normal + half-depth)
// Each entry: { cx, cz, nx, nz, halfW, halfD, angle }
const stadiumWalls = [];

// =============================================
// ENGINE AUDIO — Web Audio API, one voice per player
// =============================================
let audioCtx = null;
const engineVoices = [null, null]; // one per player

function initAudioContext() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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

  // P1 engine — left pan, P2 engine — right pan (subtle stereo separation)
  [0, 1].forEach(i => {
    const masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.12;

    // Subtle stereo pan per player
    const panner = audioCtx.createStereoPanner
      ? audioCtx.createStereoPanner()
      : null;
    if (panner) {
      panner.pan.value = i === 0 ? -0.3 : 0.3;
      masterGain.connect(panner);
      panner.connect(audioCtx.destination);
    } else {
      masterGain.connect(audioCtx.destination);
    }

    engineVoices[i] = createEngineVoice(audioCtx, masterGain, i === 0 ? 0 : 7 + Math.random() * 6);
  });
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
    gain.connect(audioCtx.destination);
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
  goGain.connect(audioCtx.destination);
  goOsc.start(audioCtx.currentTime + 2.7);
  goOsc.stop(audioCtx.currentTime + 3.5);
}

// ── BACKGROUND MUSIC via <audio> element ──
let bgmEl = null;

function startBGM() {
  if (!bgmEl) {
    bgmEl = document.createElement('audio');
    bgmEl.src = 'assets/main-theme.mp3';
    bgmEl.loop = true;
    bgmEl.volume = 0.35;
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

function updateEngineAudio() {
  if (!audioCtx || !raceRunning) return;
  players.forEach((p, i) => {
    if (engineVoices[i]) engineVoices[i].update(p.speed);
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
  sceneObj.add(sun);

  // Ground plane
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 1200, 40, 40),
    new THREE.MeshLambertMaterial({ color: 0x3a6b22 })
  );
  ground.rotation.x = -Math.PI/2;
  ground.position.set(35, -0.05, 55);
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
  sceneObj.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true })));

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
  return group;
}

// =============================================
// KART BUILDER
// =============================================
function buildKart(charIndex, scene) {
  const char = CHARACTERS[charIndex];
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshLambertMaterial({ color: char.color });
  group.add(new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 3.5), bodyMat));

  const noseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1), bodyMat);
  noseMesh.position.set(0, -0.05, 2.2);
  group.add(noseMesh);

  const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 8);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const hubMat   = new THREE.MeshLambertMaterial({ color: 0xCCCCCC });
  [[-1.1,-0.35,1.2],[1.1,-0.35,1.2],[-1.1,-0.35,-1.2],[1.1,-0.35,-1.2]].forEach(([x,y,z]) => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI/2;
    w.position.set(x,y,z);
    group.add(w);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.25,0.25,0.36,6), hubMat);
    hub.rotation.z = Math.PI/2;
    hub.position.set(x,y,z);
    group.add(hub);
  });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.2), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  seat.position.set(0, 0.5, 0.4);
  group.add(seat);

  // 2D sprite character
  const spriteCanvas = document.createElement('canvas');
  spriteCanvas.width = 128; spriteCanvas.height = 128;
  const ctx = spriteCanvas.getContext('2d');
  const spriteTex = new THREE.CanvasTexture(spriteCanvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTex, transparent: true }));
  sprite.scale.set(2.2, 2.2, 1);
  sprite.position.set(0, 1.6, 0.3);
  group.add(sprite);

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
        checkAllFinished();
      }
    }
    player.lastCheckpoint = player.checkpoint;
  }
}

function checkAllFinished() {
  if (players.every(p => p.finishTime !== null)) {
    showFinish();
  } else if (players.some(p => p.finishTime !== null)) {
    // Winner finished — hand their kart to the AI, wait for the other player
    const winnerIdx = players.findIndex(p => p.finishTime !== null);
    activateWinnerAI(winnerIdx);
    // Safety fallback: force finish after 60s if second player never crosses the line
    setTimeout(() => { if (raceRunning) showFinish(); }, 60000);
  }
}

// =============================================
// ITEMS
// =============================================
const ITEMS = ['🍌 Banana', '🔴 Shell', '⭐ Star', '💨 Boost'];

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

function updateBananaPeels(delta, p1, p2) {
  bananaPeels.forEach((peel, idx) => {
    if (!peel.active) return;

    // Gentle wobble so it's not completely static
    peel.mesh1.rotation.y += delta * 0.4;
    if (peel.mesh2) peel.mesh2.rotation.y += delta * 0.4;

    // Check collision with each player.
    // IMPORTANT: use a for-loop with break so that if p1 consumes the peel,
    // p2 cannot also trigger off it in the same frame (forEach can't break).
    for (const player of [p1, p2]) {
      if (!peel.active) break; // already consumed this frame — stop immediately
      if (player.bananaImmune > 0) continue;
      if (player.stunTimer > 0) continue;

      const dist = player.kart.position.distanceTo(peel.position);
      if (dist < 2.2) {
        // Consume the peel atomically FIRST so nothing else can claim it
        peel.active = false;
        scenes[0].remove(peel.mesh1);
        if (peel.mesh2) scenes[1].remove(peel.mesh2);

        // Now apply spinout to the player who hit it
        player.spinoutTimer = 3.0;
        player.spinoutAngle = 0;
        player.stunTimer    = 3.0;
        player.speed       *= 0.4;
        showSlipEffect(player);
        playSlipSound();
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
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.65);
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
    speed: 30,           // m/s along curve — comfortably faster than max kart speed
    homingDist: 40,      // large window: switch to direct homing within 40 units
    homingVel: new THREE.Vector3(Math.sin(thrower.angle), 0, Math.cos(thrower.angle)),
    phase: 'track',
    spinAngle: 0,
    lifeTimer: 15,       // self-destruct after 15s if something goes very wrong
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
      // DIRECT HIT — full spinout
      shell.target.spinoutTimer = 3.0;
      shell.target.spinoutAngle = 0;
      shell.target.stunTimer    = 3.0;
      shell.target.speed       *= 0.3;
      playShellHitSound();
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
  gain.connect(audioCtx.destination);
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
    gain.connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + offset);
    osc.stop(audioCtx.currentTime + offset + 0.45);
  });
}

function collectItem(player, idx) {
  if (!player.item && itemBoxes[idx].active) {
    player.item = ITEMS[Math.floor(Math.random()*ITEMS.length)];
    itemBoxes[idx].active = false;
    itemBoxes[idx].mesh.visible = false;
    itemBoxes[idx].respawnTimer = 8;
  }
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
    spawnRedShell(player, otherPlayer);
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
  if (e.code === 'F11') { e.preventDefault(); toggleFullscreen(); }
  // Allow F5 / Ctrl+R to refresh normally
  if (e.code === 'F5' || (e.ctrlKey && e.code === 'KeyR')) return;
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

function toggleFullscreen() {
  const el = document.documentElement;
  const isFs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement;
  if (!isFs) {
    (el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || (()=>{})).call(el);
  } else {
    (document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || (()=>{})).call(document);
  }
}

const P1_KEYS = { forward:'KeyW', back:'KeyS', left:'KeyA', right:'KeyD', item:'Space' };
const P2_KEYS = { forward:'ArrowUp', back:'ArrowDown', left:'ArrowLeft', right:'ArrowRight', item:'Enter' };

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

  if (!stunned) {
    if (keys[binds.forward]) player.speed += ACCEL * delta * speedMult;
    if (keys[binds.back])    player.speed -= BRAKE * delta * speedMult;
    if (keys[binds.left])    player.angle += STEER * delta * (player.speed / MAX_SPEED);
    if (keys[binds.right])   player.angle -= STEER * delta * (player.speed / MAX_SPEED);
    if (keys[binds.item])    useItem(player, otherPlayer);
  }

  // Clamp speed — boost raises ceiling, star raises it even higher (star wins if both)
  const speedCap = player.starTimer > 0 ? MAX_SPEED * 1.55
                 : player.boostTimer > 0 ? MAX_SPEED * 1.4
                 : MAX_SPEED;
  player.speed = Math.max(-6, Math.min(speedCap * speedMult, player.speed));

  // Frame-rate-independent friction: multiply by (1 - friction)^delta
  player.speed *= Math.pow(1 - FRICTION_PER_SEC, delta);

  // Move
  player.kart.position.x += Math.sin(player.angle) * player.speed * delta;
  player.kart.position.z += Math.cos(player.angle) * player.speed * delta;
  player.kart.rotation.y = player.angle;

  // Tilt on turns (suppressed during spinout — the spin is on Y anyway)
  player.kart.rotation.z = spinning ? 0 :
    -player.speed * 0.01 * (keys[binds.left] ? 1 : keys[binds.right] ? -1 : 0);

  if (player.itemCooldown > 0) player.itemCooldown -= delta;

  // Player–player collision
  const dist = player.kart.position.distanceTo(otherPlayer.kart.position);
  if (dist < 2.5) {
    const push = new THREE.Vector3().subVectors(player.kart.position, otherPlayer.kart.position).normalize();
    player.kart.position.addScaledVector(push, 1.5);

    if (player.starTimer > 0 && otherPlayer.starTimer <= 0) {
      // Star player smashes the other into a full spinout — KAPOW 💥
      if (otherPlayer.spinoutTimer <= 0) {
        otherPlayer.spinoutTimer = 3.0;
        otherPlayer.spinoutAngle = 0;
        otherPlayer.stunTimer    = 3.0;
        otherPlayer.speed       *= 0.4;
        playSlipSound();
      }
      // Star player barely slows down
      player.speed *= 0.92;
    } else {
      // Normal bump
      player.speed *= 0.5;
    }
  }

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

function updateSoloAI(delta) {
  const ai = players[1];
  const human = players[0];
  if (!ai || ai.finishTime) return;

  if (ai.bananaImmune > 0) ai.bananaImmune -= delta;
  if (ai.itemCooldown > 0) ai.itemCooldown -= delta;
  if (ai.starTimer > 0) ai.starTimer = Math.max(0, ai.starTimer - delta);
  if (ai.boostTimer > 0) ai.boostTimer = Math.max(0, ai.boostTimer - delta);

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

  const aiT = closestTrackT(ai.kart.position);
  const humanT = closestTrackT(human.kart.position);
  const distanceBehind = (aiT - humanT + 1) % 1;
  const lookaheadT = (aiT + 0.025) % 1;
  const target = TRACK_CURVE.getPoint(lookaheadT);
  const desiredAngle = Math.atan2(target.x - ai.kart.position.x, target.z - ai.kart.position.z);
  let angleDiff = desiredAngle - ai.angle;
  while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  ai.angle += Math.max(-2.8 * delta, Math.min(2.8 * delta, angleDiff));

  const onTrack = isOnTrack(ai.kart.position);
  const targetSpeed = (onTrack ? MAX_SPEED * 0.88 : MAX_SPEED * 0.25);
  if (ai.speed < targetSpeed) ai.speed += ACCEL * 0.72 * delta;
  const speedCap = ai.starTimer > 0 ? MAX_SPEED * 1.55 : ai.boostTimer > 0 ? MAX_SPEED * 1.4 : MAX_SPEED;
  ai.speed = Math.min(speedCap, ai.speed);
  ai.speed *= Math.pow(1 - FRICTION_PER_SEC, delta);
  ai.kart.position.x += Math.sin(ai.angle) * ai.speed * delta;
  ai.kart.position.z += Math.cos(ai.angle) * ai.speed * delta;
  ai.kart.rotation.y = ai.angle;
  ai.kart.rotation.z = 0;

  itemBoxes.forEach((box, index) => {
    if (box.active && !ai.item && ai.kart.position.distanceTo(box.mesh.position) < 2.5) collectItem(ai, index);
  });

  if (ai.item && ai.itemCooldown <= 0) {
    const item = ai.item;
    const shouldUse = item.includes('Star') || item.includes('Boost') ||
      (item.includes('Shell') && human.finishTime === null) ||
      (item.includes('Banana') && distanceBehind < 0.45);
    if (shouldUse) useItem(ai, human);
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
  // Compute the track centre-line point one lookahead distance ahead of the kart
  const LOOKAHEAD = 0.025; // fraction of curve to look ahead (~one corner)
  const arcLen    = TRACK_CURVE.getLength();
  const dtPerSec  = AI_SPEED_TARGET / arcLen; // how much t to cover per second at target speed

  // Advance internal trackT at the same rate as the kart will actually travel
  winnerAI.trackT = (winnerAI.trackT + dtPerSec * delta) % 1;

  const lookaheadT  = (winnerAI.trackT + LOOKAHEAD) % 1;
  const targetPt    = TRACK_CURVE.getPoint(lookaheadT);

  // Desired angle: from kart position toward lookahead point on curve
  const dx = targetPt.x - p.kart.position.x;
  const dz = targetPt.z - p.kart.position.z;
  const desiredAngle = Math.atan2(dx, dz);

  // Steer angle toward desired, clamped to AI_STEER_RATE
  let angleDiff = desiredAngle - p.angle;
  // Wrap to [-π, π]
  while (angleDiff >  Math.PI) angleDiff -= Math.PI * 2;
  while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
  const maxSteer = AI_STEER_RATE * delta;
  p.angle += Math.max(-maxSteer, Math.min(maxSteer, angleDiff));

  // Accelerate toward target speed
  if (p.speed < AI_SPEED_TARGET) {
    p.speed += ACCEL * 0.7 * delta;
  }
  p.speed = Math.min(p.speed, AI_SPEED_TARGET);
  p.speed *= Math.pow(1 - FRICTION_PER_SEC, delta);

  // Move the kart
  p.kart.position.x += Math.sin(p.angle) * p.speed * delta;
  p.kart.position.z += Math.cos(p.angle) * p.speed * delta;
  p.kart.rotation.y  = p.angle;
  p.kart.rotation.z  = 0;

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
      box.mesh.position.y = 0.5 + Math.sin(Date.now() * 0.003) * 0.15;
    }
  });
}

// =============================================
// RACE SETUP & START
// =============================================
function startGame() {
  const isSolo = gameMode === 'solo';
  soloAI = null;
  if (isSolo) {
    const available = CHARACTERS.map((_, index) => index).filter(index => index !== playerChars[0]);
    playerChars[1] = available[Math.floor(Math.random() * available.length)];
  }

  document.getElementById('mainMenu').style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  document.getElementById('divider').style.display = isSolo ? 'none' : 'block';

  const W = isSolo ? window.innerWidth : window.innerWidth / 2;
  const H = window.innerHeight;

  const c1 = document.getElementById('canvas1');
  const c2 = document.getElementById('canvas2');
  c1.width = W; c1.height = H; c1.style.width = W+'px'; c1.style.height = H+'px';
  c2.width = W; c2.height = H; c2.style.width = W+'px'; c2.style.height = H+'px';
  c2.style.display = isSolo ? 'none' : '';

  const r1 = new THREE.WebGLRenderer({ canvas: c1, antialias: true });
  r1.setSize(W, H);
  renderers = [r1];
  if (!isSolo) {
    const r2 = new THREE.WebGLRenderer({ canvas: c2, antialias: true });
    r2.setSize(W, H);
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
    b1.position.set(pt.x, 0.5, pt.z); s1.add(b1);
    let b2 = null;
    if (!isSolo) {
      b2 = makeItemBox();
      b2.position.set(pt.x, 0.5, pt.z); s2.add(b2);
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
  const p1Start = spawnOrigin.clone()
    .addScaledVector(spawnPerp, -2)    // left lane
    .add(new THREE.Vector3(0, 0.5, 0));
  const p2Start = spawnOrigin.clone()
    .addScaledVector(spawnPerp,  2)    // right lane
    .add(new THREE.Vector3(0, 0.5, 0));

  players = [
    createPlayer(playerChars[0], p1Start, spawnAngle, s1),
    createPlayer(playerChars[1], p2Start, spawnAngle, isSolo ? s1 : s2),
  ];

  document.getElementById('hud1name').textContent = '🏎️ ' + CHARACTERS[playerChars[0]].name;
  document.getElementById('hud2name').textContent = (isSolo ? '🤖 ' : '🏎️ ') + CHARACTERS[playerChars[1]].name;

  if (isSolo) soloAI = { itemDecisionTimer: 0 };

  // Countdown
  raceRunning = false;
  let count = 3;
  const cdEl = document.getElementById('countdown');
  cdEl.style.display = 'flex';
  cdEl.textContent = count;
  initAudioContext(); // unlock AudioContext on this user gesture
  playCountdownBeeps(); // schedule all 4 beeps immediately (timed via Web Audio clock)
  const cdInterval = setInterval(() => {
    count--;
    if (count > 0) {
      cdEl.textContent = count;
    } else if (count === 0) {
      cdEl.textContent = 'GO!';
      cdEl.style.color = '#00ff00';
    } else {
      cdEl.style.display = 'none';
      clearInterval(cdInterval);
      raceRunning = true;
      raceStart = Date.now();
      startEngineAudio();
      startBGM();
    }
  }, 900);

  if (animId) cancelAnimationFrame(animId);
  let lastTime = performance.now();

  function loop() {
    animId = requestAnimationFrame(loop);
    const now = performance.now();
    const delta = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    if (raceRunning) {
      const aiIdx = winnerAI ? winnerAI.playerIdx : -1;

      // Normal player update — skip the AI-controlled winner
      if (aiIdx !== 0) updatePlayer(players[0], P1_KEYS, delta, players[1]);
      if (isSolo) {
        if (aiIdx !== 1) updateSoloAI(delta);
      } else if (aiIdx !== 1) {
        updatePlayer(players[1], P2_KEYS, delta, players[0]);
      }

      // AI drives the winner's kart (also updates that kart's laps)
      updateWinnerAI(delta);

      updateItemBoxes(delta);
      updateBananaPeels(delta, players[0], players[1]);
      updateRedShells(delta);
      if (!isSolo) syncItemBoxVisibility();

      raceTimer = (Date.now() - raceStart) / 1000;

      // Camera: cinematic for AI player (handled inside updateWinnerAI),
      //         normal chase for the human still racing
      if (aiIdx !== 0) updateCamera(cameras[0], players[0]);
      if (!isSolo && aiIdx !== 1) updateCamera(cameras[1], players[1]);

      if (!isSolo) updateMirrorKarts();
      updateStarEffects(delta);
      updateFireParticles(delta);
      updateHUD();
      updateEngineAudio();
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
const _firePools = [null, null];

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
    const boosting = player.boostTimer > 0;

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
// MIRROR KARTS (ghost of other player in each scene)
// =============================================
let ghostKarts = null;

// =============================================
// STAR RAINBOW EFFECT
// =============================================
// Store original material colors so we can restore them when the star expires.
// We also track the last known starTimer state per player to know when to restore.
const _starOrigColors = [null, null]; // per player, array of { mesh, color }

function updateStarEffects(delta) {
  players.forEach((player, pi) => {
    const active = player.starTimer > 0;

    if (active) {
      // Lazily snapshot original colors on first frame of star activation
      if (!_starOrigColors[pi]) {
        _starOrigColors[pi] = [];
        player.kart.children.forEach(child => {
          // Kart body / wheel meshes
          if (child.isMesh && child.material && child.material.color) {
            _starOrigColors[pi].push({ target: child.material, origColor: child.material.color.clone() });
          }
          // Sprite (character portrait) — SpriteMaterial has a .color too
          if (child.isSprite && child.material && child.material.color) {
            _starOrigColors[pi].push({ target: child.material, origColor: child.material.color.clone() });
          }
        });
      }

      // Shift hue over time — full rainbow cycle every ~0.6s, fast enough to look wild
      const hue = (Date.now() * 0.003 + pi * 0.5) % 1;
      const rainbowColor = new THREE.Color().setHSL(hue, 1.0, 0.62);

      player.kart.children.forEach(child => {
        if (child.isMesh && child.material && child.material.color) {
          child.material.color.copy(rainbowColor);
        }
        if (child.isSprite && child.material && child.material.color) {
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
  if (!ghostKarts) {
    const g1 = new THREE.Mesh(new THREE.BoxGeometry(2,1.5,3.5),
      new THREE.MeshLambertMaterial({ color: CHARACTERS[playerChars[1]].color, transparent: true, opacity: 0.8 }));
    scenes[0].add(g1);
    const g2 = new THREE.Mesh(new THREE.BoxGeometry(2,1.5,3.5),
      new THREE.MeshLambertMaterial({ color: CHARACTERS[playerChars[0]].color, transparent: true, opacity: 0.8 }));
    scenes[1].add(g2);
    ghostKarts = [g1, g2];
  }
  ghostKarts[0].position.copy(players[1].kart.position);
  ghostKarts[0].rotation.y = players[1].angle;
  ghostKarts[1].position.copy(players[0].kart.position);
  ghostKarts[1].rotation.y = players[0].angle;
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
// HUD UPDATE
// =============================================
function updateHUD() {
  const t = raceTimer;
  const mins = Math.floor(t/60).toString().padStart(2,'0');
  const secs = Math.floor(t%60).toString().padStart(2,'0');
  document.getElementById('raceTimer').textContent = mins+':'+secs;

  [0,1].forEach(i => {
    const p = players[i];
    document.getElementById(`hud${i+1}lap`).textContent = Math.min(p.lap, TOTAL_LAPS);
    document.getElementById(`hud${i+1}speed`).textContent = Math.abs(Math.round(p.speed * 3.6));
    document.getElementById(`hud${i+1}item`).textContent = p.item || '';
  });
}

// =============================================
// FINISH / WIN SCREEN
// =============================================
function showFinish() {
  raceRunning = false;
  stopEngineAudio();
  stopBGM();

  const times = players.map((p, i) => ({
    name:     CHARACTERS[p.charIndex].name,
    img:      CHARACTERS[p.charIndex].img,
    time:     p.finishTime || raceTimer,
    player:   i + 1,
  }));
  times.sort((a, b) => a.time - b.time);

  // Winner portrait & name
  document.getElementById('win1img').src   = times[0].img;
  document.getElementById('win1name').textContent = times[0].name;
  document.getElementById('win1time').textContent = `${times[0].time.toFixed(2)}s`;
  document.getElementById('winTitle').textContent  = `${times[0].name} WINS THE RACE!`;

  // Runner-up
  if (times[1]) {
    document.getElementById('win2img').src   = times[1].img;
    document.getElementById('win2name').textContent = times[1].name;
    document.getElementById('win2time').textContent = `${times[1].time.toFixed(2)}s`;
  }

  // Confetti burst
  spawnConfetti();

  // Show the screen
  const ws = document.getElementById('winScreen');
  ws.style.display = 'flex';
}

function spawnConfetti() {
  const container = document.getElementById('winConfetti');
  container.innerHTML = '';
  const colors = ['#FFD700','#FF0000','#00FF88','#00AEEF','#FF69B4','#FF8C00','#AA00FF','#ffffff'];
  for (let i = 0; i < 120; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.left     = Math.random() * 100 + 'vw';
    p.style.top      = '-20px';
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.width    = (8 + Math.random() * 10) + 'px';
    p.style.height   = (8 + Math.random() * 10) + 'px';
    p.style.animationDuration = (2 + Math.random() * 3) + 's';
    p.style.animationDelay   = (Math.random() * 1.5) + 's';
    container.appendChild(p);
  }
}

function backToMenu() {
  document.getElementById('winScreen').style.display = 'none';
  document.getElementById('hud').style.display = 'none';
  document.getElementById('divider').style.display = 'none';
  document.getElementById('mainMenu').style.display = 'flex';
  stopEngineAudio();
  stopBGM();
  ghostKarts = null;
  itemBoxes = [];
  bananaPeels = [];
  redShells = [];
  winnerAI = null;
  cinModeIdx = 0;
  _starOrigColors[0] = null;
  _starOrigColors[1] = null;
  _firePools[0] = null;
  _firePools[1] = null;
  stadiumWalls.length = 0;
  players = [];
  scenes = [];
  cameras = [];
  if (animId) cancelAnimationFrame(animId);
  updateCharUI();
}