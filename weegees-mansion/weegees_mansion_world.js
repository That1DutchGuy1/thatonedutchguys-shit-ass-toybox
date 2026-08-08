
const WEEGEE_IMGS = {
  front: 'Weegee-Sprites/Weegee_Front.png',
  back: 'Weegee-Sprites/Weegee_Back.png',
  left: 'Weegee-Sprites/Weegee_Left.png',
  right: 'Weegee-Sprites/Weegee_Right.png'
};

function generateMaze(w, h) {
  const grid = Array.from({length: h}, () => Array(w).fill(0xF));
  const visited = Array.from({length: h}, () => Array(w).fill(false));
  function carve(cx, cy) {
    visited[cy][cx] = true;
    const dirs = [
      [-1, 0, 0, 1], 
      [1, 0, 1, 0],  
      [0, -1, 2, 3], 
      [0, 1, 3, 2]   
    ];
    dirs.sort(() => Math.random()-0.5);
    for (const [dy,dx,bit,opp] of dirs) {
      const nx=cx+dx, ny=cy+dy;
      if(nx>=0&&nx<w&&ny>=0&&ny<h&&!visited[ny][nx]){
        grid[cy][cx] &= ~(1<<bit);
        grid[ny][nx] &= ~(1<<opp);
        carve(nx,ny);
      }
    }
  }
  carve(0,0);
  return grid;
}

// Scale the UV coordinates of a BoxGeometry so a tiling texture repeats
// proportionally instead of stretching. Each face's UVs are multiplied by
// the real-world size of that face divided by the tile size (2 world units).
const UV_TILE = 2;
function scaleBoxUVs(geo, w, h, d) {
  // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
  // Each face is 2 triangles = 4 vertices in the non-indexed BufferGeometry.
  // Three.js r128 BoxGeometry IS indexed; we work on the uv attribute directly.
  const uv = geo.attributes.uv;
  const faceSizes = [
    [d, h], // +X face: width=d, height=h
    [d, h], // -X face
    [w, d], // +Y face
    [w, d], // -Y face
    [w, h], // +Z face
    [w, h], // -Z face
  ];
  // Each face has 4 unique UV entries (BoxGeometry groups them 4 per face)
  for (let face = 0; face < 6; face++) {
    const [fw, fh] = faceSizes[face];
    const su = fw / UV_TILE;
    const sv = fh / UV_TILE;
    const base = face * 4;
    for (let i = 0; i < 4; i++) {
      uv.setXY(base + i, uv.getX(base + i) * su, uv.getY(base + i) * sv);
    }
  }
  uv.needsUpdate = true;
}

function buildFloorGeometry(maze) {
  const group = new THREE.Group();
  
  // Two wall materials, identical except for their polygon-offset amount.
  // Interior/outer wall segments are deliberately extended by `wt` at each
  // end so adjoining walls overlap slightly and never leave a gap at
  // corners — but that overlap means two perpendicular wall boxes share
  // near-coincident surfaces right at the seam, which z-fights (flickers)
  // if both use the same depth bias. Giving the two orientations distinct
  // depth bias makes one of them consistently win the depth test at every
  // seam, so the flicker goes away without touching any geometry.
  //
  // Only polygonOffsetUnits (a flat depth bias) is used here, NOT
  // polygonOffsetFactor — factor scales with how edge-on a surface is to
  // the camera, so a wall seen nearly end-on (e.g. looking straight down a
  // hallway) gets a hugely exaggerated offset and visibly "detaches" from
  // the corner. Units alone give a small, constant, angle-independent bias
  // that's still enough to resolve the tie at the seam.
  const wallMatNS = new THREE.MeshStandardMaterial({map: wallTex, roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: 1});
  const wallMatEW = new THREE.MeshStandardMaterial({map: wallTex, roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: -1});
  const floorMat = new THREE.MeshStandardMaterial({map: floorTex, roughness: 1, metalness: 0});
  const ceilMat = new THREE.MeshStandardMaterial({map: ceilingTex, roughness: 1, metalness: 0});
  
  const totalW = MAZE_W * CELL;
  const totalH = MAZE_H * CELL;

  const floorGeo = new THREE.PlaneGeometry(totalW, totalH);
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI/2;
  floorMesh.position.set(totalW/2, 0, totalH/2);
  group.add(floorMesh);
  
  const ceilMesh = new THREE.Mesh(floorGeo, ceilMat);
  ceilMesh.rotation.x = Math.PI/2;
  ceilMesh.position.set(totalW/2, 3, totalH/2);
  group.add(ceilMesh);

  const wallSegs = [];
  const wh = 3, wt = 0.18;
  for (let row=0; row<MAZE_H; row++) {
    for (let col=0; col<MAZE_W; col++) {
      const cell = maze[row][col];
      const cx = col*CELL, cz = row*CELL;
      if ((cell & 1) && row > 0) { 
        const g = new THREE.BoxGeometry(CELL+wt, wh, wt);
        scaleBoxUVs(g, CELL+wt, wh, wt);
        const m = new THREE.Mesh(g, wallMatNS);
        m.position.set(cx + CELL/2, wh/2, cz);
        group.add(m);
        wallSegs.push({x:cx - wt/2, z:cz - wt/2, w:CELL + wt, d:wt, isWindow:false, isStrip:false, side:'north'});
      }
      if ((cell & 4) && col > 0) { 
        const g = new THREE.BoxGeometry(wt, wh, CELL+wt);
        scaleBoxUVs(g, wt, wh, CELL+wt);
        const m = new THREE.Mesh(g, wallMatEW);
        m.position.set(cx, wh/2, cz + CELL/2);
        group.add(m);
        wallSegs.push({x:cx - wt/2, z:cz - wt/2, w:wt, d:CELL + wt, isWindow:false, isStrip:false, side:'west'});
      }
    }
  }
  // ── Outer walls: segmented per maze-cell so window-wall.png can be placed ──
  // We build 4 sides as individual CELL-wide segments. Each segment is one maze
  // cell wide. A random subset (max 10 total per floor) get the window texture.
  // Corners (col/row 0 and MAZE_W/H-1) are never windowed — they look weird.

  // Window wall front-face material — lit, transparent, alphaTest punches out
  // the glass panes so the skybox is visible through them.
  const windowWallFaceMat = new THREE.MeshStandardMaterial({
    map: windowWallTex,
    transparent: true,
    alphaTest: 0.15,
    roughness: 1,
    metalness: 0,
    side: THREE.FrontSide,
  });

  // Collect all candidate outer-wall segment positions.
  // Each entry: { side, index } where index is the maze col or row along that side.
  // We skip index 0 and the last on every side to avoid corner weirdness.
  const windowCandidates = [];
  for (let col = 1; col < MAZE_W - 1; col++) {
    windowCandidates.push({ side: 'north', index: col });
    windowCandidates.push({ side: 'south', index: col });
  }
  for (let row = 1; row < MAZE_H - 1; row++) {
    windowCandidates.push({ side: 'west', index: row });
    windowCandidates.push({ side: 'east', index: row });
  }
  windowCandidates.sort(() => Math.random() - 0.5);
  const windowSlots = new Set();
  const maxWindows = 10;
  for (let i = 0; i < Math.min(maxWindows, windowCandidates.length); i++) {
    windowSlots.add(`${windowCandidates[i].side}_${windowCandidates[i].index}`);
  }

  // Helper: builds one outer wall segment.
  // Non-window slots: solid segMat box (collision covered by wallSegs strips).
  // Window slots: NO solid box (would block skybox via depth buffer) — just a
  //   DoubleSide transparent plane placed at the wall face. Collision still works
  //   because wallSegs full-strip AABBs are pushed after the loop regardless.
  function addOuterSeg(side, index, cx, cz) {
    const isNS = (side === 'north' || side === 'south');
    const boxW = isNS ? CELL + wt : wt;
    const boxD = isNS ? wt : CELL + wt;
    const isWindow = windowSlots.has(`${side}_${index}`);
    // Match the same NS/EW material split used for interior walls, so an
    // outer segment overlapping an interior wall's end (or another outer
    // segment) at a corner resolves the same deterministic way.
    const segMat = isNS ? wallMatNS : wallMatEW;

    if (!isWindow) {
      // Solid opaque box — normal wall segment
      const g = new THREE.BoxGeometry(boxW, wh, boxD);
      scaleBoxUVs(g, boxW, wh, boxD);
      const m = new THREE.Mesh(g, segMat);
      m.position.set(cx, wh / 2, cz);
      group.add(m);
      wallSegs.push({x: cx - wt/2, z: cz - wt/2, w: boxW, d: boxD, isWindow: false, isStrip: false, side});
      return;
    }

    // Window segment: full-thickness box matching regular walls.
    // Per-face material array: only the inward-facing face gets the window
    // texture (alpha-tested for glass cutouts); all other faces use segMat
    // so the wall is solid, properly thick, and fully lit.
    //
    // BoxGeometry face order: +X(0), -X(1), +Y(2), -Y(3), +Z(4), -Z(5)
    // N/S walls are thin in Z: interior = +Z(4) for north, -Z(5) for south.
    // E/W walls are thin in X: interior = +X(0) for west,  -X(1) for east.
    const pg = new THREE.BoxGeometry(boxW, wh, boxD);
    scaleBoxUVs(pg, boxW, wh, boxD);

    // Reset the window face's UVs to exactly 0→1 so the texture fits once,
    // flush across the whole segment — undoing the tiling scale applied above.
    // BoxGeometry UV layout: 4 vertices per face, stored at base = faceIndex * 4.
    // Default BoxGeometry UV corners (before any scaling): (0,1),(1,1),(0,0),(1,0)
    const faceMats = [segMat, segMat, segMat, segMat, segMat, segMat];
    let windowFaceIdx;
    if (side === 'north')      { faceMats[4] = windowWallFaceMat; windowFaceIdx = 4; }
    else if (side === 'south') { faceMats[5] = windowWallFaceMat; windowFaceIdx = 5; }
    else if (side === 'west')  { faceMats[0] = windowWallFaceMat; windowFaceIdx = 0; }
    else                       { faceMats[1] = windowWallFaceMat; windowFaceIdx = 1; } // east

    // Restore default (fit-once) UVs on just the window face
    const uv = pg.attributes.uv;
    const base = windowFaceIdx * 4;
    uv.setXY(base + 0, 0, 1);
    uv.setXY(base + 1, 1, 1);
    uv.setXY(base + 2, 0, 0);
    uv.setXY(base + 3, 1, 0);
    uv.needsUpdate = true;

    const pm = new THREE.Mesh(pg, faceMats);
    pm.position.set(cx, wh / 2, cz);
    group.add(pm);
    wallSegs.push({x: cx - wt/2, z: cz - wt/2, w: boxW, d: boxD, isWindow: true, isStrip: false, side});
  }

  // North outer wall — z = 0, one segment per column
  for (let col = 0; col < MAZE_W; col++) {
    addOuterSeg('north', col, col * CELL + CELL / 2, 0);
  }
  wallSegs.push({ x: -wt / 2, z: -wt / 2, w: totalW + wt, d: wt, isWindow: false, isStrip: true });

  // South outer wall — z = totalH
  for (let col = 0; col < MAZE_W; col++) {
    addOuterSeg('south', col, col * CELL + CELL / 2, totalH);
  }
  wallSegs.push({ x: -wt / 2, z: totalH - wt / 2, w: totalW + wt, d: wt, isWindow: false, isStrip: true });

  // West outer wall — x = 0, one segment per row
  for (let row = 0; row < MAZE_H; row++) {
    addOuterSeg('west', row, 0, row * CELL + CELL / 2);
  }
  wallSegs.push({ x: -wt / 2, z: -wt / 2, w: wt, d: totalH + wt, isWindow: false, isStrip: true });

  // East outer wall — x = totalW
  for (let row = 0; row < MAZE_H; row++) {
    addOuterSeg('east', row, totalW, row * CELL + CELL / 2);
  }
  wallSegs.push({ x: totalW - wt / 2, z: -wt / 2, w: wt, d: totalH + wt, isWindow: false, isStrip: true });

  const stairX = (MAZE_W-2)*CELL + CELL/2;
  const stairZ = (MAZE_H-2)*CELL + CELL/2;
  const spiralMat = new THREE.MeshLambertMaterial({color:0x888888});
  const postGeo = new THREE.CylinderGeometry(0.15, 0.15, 2.6, 8);
  const postMesh = new THREE.Mesh(postGeo, spiralMat);
  postMesh.position.set(stairX, 1.3, stairZ);
  group.add(postMesh);
  const stepCount = 14;
  const stepRadius = 1.2;
  const stepGeo = new THREE.BoxGeometry(1.3, 0.12, 0.5);
  for (let i = 0; i < stepCount; i++) {
    const stepMesh = new THREE.Mesh(stepGeo, spiralMat);
    const angle = i * (Math.PI * 2 / 8);
    const y = 0.1 + i * 0.18;
    stepMesh.position.set(
      stairX + Math.cos(angle) * stepRadius * 0.5,
      y,
      stairZ + Math.sin(angle) * stepRadius * 0.5
    );
    stepMesh.rotation.y = -angle;
    group.add(stepMesh);
  }

  return {group, wallSegs, stairX, stairZ};
}

function initThree() {
  const canvas = document.getElementById('gameCanvas');
  renderer = new THREE.WebGLRenderer({canvas, antialias: false});
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000);
  renderer.fog = new THREE.Fog(0x000000, 1, 22);

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050301, 0.16);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 90);
  clock = new THREE.Clock();

  scene.add(camera);

  ambientLight = new THREE.AmbientLight(0x0d0702, AMBIENT_LIGHT_BASE_INTENSITY);
  scene.add(ambientLight);
  const pt = new THREE.PointLight(0xff6600, 0.2, 6);
  pt.position.set(2,2,2);
  scene.add(pt);

  flashlight = new THREE.SpotLight(0xfffcaa, 4.5, 18, Math.PI/5.5, 0.55, 1.0);
  scene.add(flashlight);
  scene.add(flashlight.target);

  const wGeo = new THREE.PlaneGeometry(1.6, 2.8);
  const wMat = new THREE.MeshLambertMaterial({transparent: true, alphaTest: 0.5, side: THREE.DoubleSide});
  weegeePlane = new THREE.Mesh(wGeo, wMat);
  // YXZ order so facing-yaw and the flat-on-back pivot compose correctly
  // (default XYZ order skews the plane whenever both are nonzero at once).
  weegeePlane.rotation.order = 'YXZ';
  weegeePlane.position.y = 1.4;
  scene.add(weegeePlane);
  weegeePlane.visible = false;

  // ── Satanic banish circle + rising rays ─────────────────────────────────
  // A glowing red ring on the floor, plus BANISH_RAY_COUNT vertical ray
  // planes arranged around the ring radius, each rising upward.
  {
    const ringGeo = new THREE.RingGeometry(0.72, 1.05, 64);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 2.8,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    banishCircleMesh = new THREE.Mesh(ringGeo, ringMat);
    banishCircleMesh.position.y = 0.01;
    banishCircleMesh.visible = false;
    scene.add(banishCircleMesh);

    // ── Aurora-ray ribbon pool ───────────────────────────────────────────────
    // Pre-build BANISH_TENDRIL_POOL ribbon meshes (all hidden at start).
    // Each strand is a broad vertical curtain: local X = width of ribbon,
    // local Y = rises upward per-vertex, local Z = lateral sway.
    // The mesh is placed AT the ring edge and pointed straight up (+Y world),
    // so we don't rely on mesh rotation — we write world-space XZ into vertices
    // directly each frame. A per-vertex color gradient (warm gold at the base
    // fading through saturated red to deep wine-red at the tip) plus additive
    // blending gives the soft, glowing aurora-borealis look, just in red.
    const T_SEGS   = 32;   // segments along the height — smooth curtain curve
    const T_HALF_W = 0.16; // base half-width of each ribbon (broad curtain, not a spike)
    for (let i = 0; i < BANISH_TENDRIL_POOL; i++) {
      const vCount    = (T_SEGS + 1) * 2;
      const positions = new Float32Array(vCount * 3);
      const uvArr     = new Float32Array(vCount * 2);
      const colorArr  = new Float32Array(vCount * 3);
      const indices   = [];
      for (let s = 0; s <= T_SEGS; s++) {
        const topIdx = s * 2, botIdx = s * 2 + 1;
        positions[topIdx * 3]     = -T_HALF_W; positions[topIdx * 3 + 1] = 0; positions[topIdx * 3 + 2] = 0;
        positions[botIdx * 3]     =  T_HALF_W; positions[botIdx * 3 + 1] = 0; positions[botIdx * 3 + 2] = 0;
        uvArr[topIdx * 2] = 0; uvArr[topIdx * 2 + 1] = s / T_SEGS;
        uvArr[botIdx * 2] = 1; uvArr[botIdx * 2 + 1] = s / T_SEGS;
        if (s < T_SEGS) { const a=topIdx,b=botIdx,c=topIdx+2,d=botIdx+2; indices.push(a,b,c,b,d,c); }
      }
      const tGeo = new THREE.BufferGeometry();
      tGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      tGeo.setAttribute('uv',       new THREE.BufferAttribute(uvArr, 2));
      tGeo.setAttribute('color',    new THREE.BufferAttribute(colorArr, 3));
      tGeo.setIndex(indices);
      // MeshBasicMaterial + additive blending + vertex colors: overlapping
      // strands brighten where they cross, giving the soft glowing-veil
      // quality of a real aurora instead of a flat lit ribbon.
      const tMat = new THREE.MeshBasicMaterial({
        color: 0xffffff, vertexColors: true,
        transparent: true, opacity: 0, side: THREE.DoubleSide,
        depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(tGeo, tMat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      scene.add(mesh);
      // userData holds per-instance state; age/life managed at runtime
      mesh.userData = {
        active: false, age: 0, life: 1, angle: 0, wavePhase: 0, driftPhase: 0,
        waveFreq: 1.5, waveSpeed: 0.7, riseSpeed: 1, halfWidth: T_HALF_W, T_SEGS, T_HALF_W
      };
      banishTendrils.push(mesh);
    }

    // ── Red PointLight for actual scene illumination ─────────────────────
    banishLight = new THREE.PointLight(0xff1100, 0, 6);
    banishLight.position.set(0, 0.5, 0);
    banishLight.visible = false;
    scene.add(banishLight);
  }

  const loader = new THREE.TextureLoader();

  // Track how many scene textures still need to load before the floor can be built.
  // Weegee's directional PNGs use their own callback path and are excluded here.
  const SCENE_TEX_COUNT = 9;
  let sceneTexLoaded = 0;
  function onSceneTexLoaded() {
    sceneTexLoaded++;
    if (sceneTexLoaded === SCENE_TEX_COUNT) {
      sceneTexturesReady = true;
      buildFloorScene(0);
      // If the player already clicked "ENTER THE MANSION" while textures
      // (esp. the skybox, which is added to the scene the moment IT loads,
      // independently of the walls/floor/ceiling loaders) were still in
      // flight, finish revealing the mansion now that everything is
      // actually ready instead of back when there was no floor geometry.
      if (pendingGameStart) {
        pendingGameStart = false;
      loader.load('Decals/puddle.png', (tex) => {
        puddleDecalTexture = tex;
        puddleDecalTexture.wrapS = THREE.ClampToEdgeWrapping;
        puddleDecalTexture.wrapT = THREE.ClampToEdgeWrapping;
        if (tex.image) {
          puddleDecalMaskCanvas = document.createElement('canvas');
          puddleDecalMaskCanvas.width = tex.image.width;
          puddleDecalMaskCanvas.height = tex.image.height;
          puddleDecalMaskCtx = puddleDecalMaskCanvas.getContext('2d');
          puddleDecalMaskCtx.drawImage(tex.image, 0, 0);
          try {
            puddleDecalMaskImageData = puddleDecalMaskCtx.getImageData(0, 0, tex.image.width, tex.image.height);
          } catch (err) {
            console.warn('Unable to read puddle decal pixel data:', err);
            puddleDecalMaskImageData = null;
          }
        }
        onSceneTexLoaded();
      }, undefined, () => {
        console.warn('Puddle decal not found: Decals/puddle.png');
        puddleDecalTexture = null;
        puddleDecalMaskCanvas = null;
        puddleDecalMaskCtx = null;
        puddleDecalMaskImageData = null;
        onSceneTexLoaded();
      });
      }
    }
  }

  loader.load('Textures/wall.png', (tex) => {
    wallTex = tex;
    wallTex.wrapS = THREE.RepeatWrapping;
    wallTex.wrapT = THREE.RepeatWrapping;
    onSceneTexLoaded();
  });

  loader.load('Textures/floor.png', (tex) => {
    floorTex = tex;
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(MAZE_W, MAZE_H);
    onSceneTexLoaded();
  });

  loader.load('Textures/ceiling.png', (tex) => {
    ceilingTex = tex;
    ceilingTex.wrapS = THREE.RepeatWrapping;
    ceilingTex.wrapT = THREE.RepeatWrapping;
    // The ceiling is one full-grid plane (same size as the floor), so repeat
    // by MAZE_W x MAZE_H to get one tile per maze cell, matching the floor.
    ceilingTex.repeat.set(MAZE_W, MAZE_H);
    onSceneTexLoaded();
  });

  loader.load('Textures/skybox.png', (tex) => {
    skyboxTex = tex;
    skyboxTex.wrapS = THREE.RepeatWrapping;
    skyboxTex.wrapT = THREE.RepeatWrapping;

    // ── Skybox ──────────────────────────────────────────────────────────────
    // A large sphere surrounding the entire play area, rendered on the inside.
    // Radius (45) comfortably encloses the whole maze (half-diagonal ≈ 31)
    // while staying within the camera's far plane (90) from any position.
    const skyGeo = new THREE.SphereGeometry(45, 32, 16);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyboxTex,
      side: THREE.BackSide,
      fog: false,        // skybox ignores scene fog
      depthWrite: false, // always rendered behind everything
    });
    const skyMesh = new THREE.Mesh(skyGeo, skyMat);
    // Keep it centred on the maze at all times by parenting to the camera later
    // (we just set it to the approximate centre of the maze for now).
    skyMesh.position.set(MAZE_W * CELL / 2, 0, MAZE_H * CELL / 2);
    skyMesh.name = 'skybox';
    skyMesh.renderOrder = -1;  // draw before all other geometry
    scene.add(skyMesh);

    onSceneTexLoaded();
  });

  loader.load('Textures/window-wall.png', (tex) => {
    windowWallTex = tex;
    // ClampToEdge: the plane uses UV 0-1 exactly matching the texture, no repeat needed.
    windowWallTex.wrapS = THREE.ClampToEdgeWrapping;
    windowWallTex.wrapT = THREE.ClampToEdgeWrapping;
    onSceneTexLoaded();
  }, undefined, () => {
    // Fallback: if texture missing, just use regular wall so game doesn't stall
    windowWallTex = wallTex;
    onSceneTexLoaded();
  });

  loader.load('Decals/puddle.png', (tex) => {
    puddleDecalTexture = tex;
    puddleDecalTexture.wrapS = THREE.ClampToEdgeWrapping;
    puddleDecalTexture.wrapT = THREE.ClampToEdgeWrapping;
    if (tex.image) {
      puddleDecalMaskCanvas = document.createElement('canvas');
      puddleDecalMaskCanvas.width = tex.image.width;
      puddleDecalMaskCanvas.height = tex.image.height;
      puddleDecalMaskCtx = puddleDecalMaskCanvas.getContext('2d');
      puddleDecalMaskCtx.drawImage(tex.image, 0, 0);
      try {
        puddleDecalMaskImageData = puddleDecalMaskCtx.getImageData(0, 0, tex.image.width, tex.image.height);
      } catch (err) {
        console.warn('Unable to read puddle decal pixel data:', err);
        puddleDecalMaskImageData = null;
      }
    }
    onSceneTexLoaded();
  }, undefined, () => {
    console.warn('Puddle decal not found: Decals/puddle.png');
    puddleDecalTexture = null;
    puddleDecalMaskCanvas = null;
    puddleDecalMaskCtx = null;
    puddleDecalMaskImageData = null;
    onSceneTexLoaded();
  });

  // Load wall/blood decal textures (three variants)
  loader.load('Decals/blood-decal-01.png', (tex) => {
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    wallDecalTextures.push(tex);
    onSceneTexLoaded();
  }, undefined, () => { console.warn('Wall decal not found: Decals/blood-decal-01.png'); onSceneTexLoaded(); });

  loader.load('Decals/blood-decal-02.png', (tex) => {
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    wallDecalTextures.push(tex);
    onSceneTexLoaded();
  }, undefined, () => { console.warn('Wall decal not found: Decals/blood-decal-02.png'); onSceneTexLoaded(); });

  loader.load('Decals/blood-decal-03.png', (tex) => {
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    wallDecalTextures.push(tex);
    onSceneTexLoaded();
  }, undefined, () => { console.warn('Wall decal not found: Decals/blood-decal-03.png'); onSceneTexLoaded(); });

  ITEM_DATA.dew.texture = loader.load(ITEM_DATA.dew.icon);
  ITEM_DATA.battery.texture = loader.load(ITEM_DATA.battery.icon);
  ITEM_DATA.stake.texture = loader.load(ITEM_DATA.stake.icon);
  ITEM_DATA.banana.texture = loader.load(ITEM_DATA.banana.icon);
  ITEM_DATA.plunger.texture = loader.load(ITEM_DATA.plunger.icon);
  ITEM_DATA.plush.texture = loader.load(ITEM_DATA.plush.icon);
  ITEM_DATA.shroom.texture = loader.load(ITEM_DATA.shroom.icon);
  loader.load('Item-Sprites/plunger-projectile.png', (tex) => { plungerProjectileTexture = tex; });

  const handGeo = new THREE.PlaneGeometry(0.32, 0.32);
  const handMat = new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, visible: false });
  handMesh = new THREE.Mesh(handGeo, handMat);
  handMesh.position.set(0.28, -0.22, -0.4); 
  // Force the held item to always render on top of other transparent surfaces
  // (e.g. window-wall glass). Without this, the two transparent materials get
  // sorted by camera distance each frame and, when standing near a window
  // wall, that distance comparison flips between frames — causing the held
  // item to flicker/disappear behind the window glass.
  handMesh.renderOrder = 999;
  handMesh.frustumCulled = false;
  camera.add(handMesh);

  // 2D <img> assets for the arms-overlay canvas (Mario hands + held-item icons)
  marioHandLeftImg = new Image();
  marioHandLeftImg.src = 'Hud/Mario-Hand-Left.png';
  marioHandRightImg = new Image();
  marioHandRightImg.src = 'Hud/Mario-Hand-Right.png';
  for (const id of Object.keys(ITEM_DATA)) {
    const img = new Image();
    img.src = ITEM_DATA[id].icon;
    itemIconImages[id] = img;
  }
  for (const [key, src] of Object.entries(WEEGEE_IMGS)) {
    loader.load(src, (tex) => {
      tex.minFilter = THREE.LinearFilter;
      weegeeTextures[key] = tex;
      if (key === 'front' && weegeePlane) {
        weegeePlane.material.map = tex;
        weegeePlane.material.needsUpdate = true;
      }
    }, undefined, () => {
      console.warn('Weegee PNG not found: ' + src);
    });
  }
  // buildFloorScene(0) is now called by onSceneTexLoaded() once all 4 scene textures are ready.
}

let currentMaze;
function buildFloorScene(floorNum) {
  clearSpawnedItems();

  for (const m of floorMeshes) scene.remove(m);
  floorMeshes = [];
  walls3D = [];

  currentMaze = generateMaze(MAZE_W, MAZE_H);
  const {group, wallSegs, stairX, stairZ} = buildFloorGeometry(currentMaze);
  scene.add(group);
  floorMeshes.push(group);
  walls3D = wallSegs;
  stairPositions = [{x: stairX, z: stairZ}];

  player.x = CELL * 0.5;
  player.z = CELL * 0.5;
  player.yaw = 0;
  player.pitch = 0;

  weegee.x = (MAZE_W-2)*CELL + CELL * 0.5;
  weegee.z = (MAZE_H-2)*CELL + CELL * 0.5;
  weegee.dirX = 0;
  weegee.dirZ = -1;
  weegee.floor = floorNum;
  weegee.peeking = false;
  weegee.state = 'wander';
  weegee.targetCellX = null;
  weegee.targetCellZ = null;
  weegee._visitedCells = [];
  weegee._subOffX = 0;
  weegee._subOffZ = 0;
  weegeeInterceptTarget = null;
  weegeeInterceptTimer = 0;
  weegeeSidestepTimer    = 0;
  weegeeSidestepActive   = false;
  weegeeSidestepDuration = 0;
  weegeeSidestepDirX     = 0;
  weegeeSidestepDirZ     = 0;
  weegeePlane.visible = false;
  weegeeSpawnTimer = 6 + Math.random() * 4; 

  isWeegeeBanished = false;
  weegeeBanishAnim.active = false;
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
  // Reset slip states on floor transition
  playerSlipState.active = false; playerSlipState.t = 0; player.pitch = 0; playerSlipState.roll = 0; playerSlipState.heightDrop = 0;
  weegeeSlipState.active = false; weegeeSlipState.t = 0;
  weegeePlungerStuck.active = false; weegeePlungerStuck.t = 0; weegeePlungerStuck.duration = 0;
  if (weegeePlane) { weegeePlane.rotation.x = 0; weegeePlane.position.y = 1.4; }
  if (handMesh) updateHandItem();

  if (weegeeVoiceAudio && weegeeVoicePlaying) {
    weegeeVoiceAudio.pause();
    weegeeVoicePlaying = false;
  }
  weegeeVoiceCooldown = WEEGEE_AUDIO_COOLDOWN_MIN + Math.random() * (WEEGEE_AUDIO_COOLDOWN_MAX - WEEGEE_AUDIO_COOLDOWN_MIN);

  generateFloorLootPickups();
  generateFloorPuddles();
  if (typeof generateFloorWallDecals === 'function') generateFloorWallDecals();

  document.getElementById('floor-num').textContent = floorNum + 1;
  document.getElementById('floor-num2').textContent = floorNum + 1;

  const stairBtn = document.getElementById('stair-btn');
  if (stairBtn) stairBtn.style.display = 'none';

  weegeeActive = false;

  updateInventoryUI();
}

