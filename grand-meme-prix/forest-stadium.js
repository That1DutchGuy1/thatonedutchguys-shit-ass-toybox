// Forest Stadium is the vanilla circuit. Keep its route, scenery, and visual assets together here.
const ForestStadium = (() => {
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


  const ITEM_BOX_T_OFFSETS = [0.06, 0.17, 0.28, 0.39, 0.50, 0.61, 0.72, 0.83, 0.94];
  const CHECKPOINT_COUNT = 24;

  // =============================================
  // BUILD SCENE
  // =============================================
  function buildScene(sceneObj, settings, stadiumWalls, getScenes) {
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

    // Ground plane — tiled grass texture (1024×1024 seamless, repeats every 8 world units)
    const grassTex = new THREE.TextureLoader().load('./assets/textures/grass.png');
    grassTex.wrapS = THREE.RepeatWrapping;
    grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(1200 / 8, 1200 / 8); // 150 tiles across each axis
    grassTex.anisotropy = 16; // keep it crispy at glancing angles
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(1200, 1200, 40, 40),
      new THREE.MeshLambertMaterial({ map: grassTex })
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

    buildTrack(sceneObj, settings);
    addDecorations(sceneObj, settings, stadiumWalls, getScenes);
    return sceneObj;
  }

  function buildTrack(sceneObj, settings) {
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

  // =============================================
  // TREE PLACEMENT — 3D trees scattered outside the stadium
  // =============================================

  // Helper: create a single 3D tree (trunk + layered cones)
  function makeTree(trunkH, trunkR, foliageH, foliageR, settings) {
    const group = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.6, trunkR, trunkH, 7);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5C3A1E });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);

    // Three stacked foliage cones for that classic videogame tree look
    const foliageMat = new THREE.MeshLambertMaterial({ color: 0x2D6A2D });
    const foliageMat2 = new THREE.MeshLambertMaterial({ color: 0x3A8A3A });
    for (let layer = 0; layer < 3; layer++) {
      const layerScale = 1 - layer * 0.22;
      const coneH = foliageH * (0.7 - layer * 0.1);
      const coneR = foliageR * layerScale;
      const coneGeo = new THREE.ConeGeometry(coneR, coneH, 7);
      const coneMesh = new THREE.Mesh(coneGeo, layer % 2 === 0 ? foliageMat : foliageMat2);
      coneMesh.position.y = trunkH + foliageH * 0.3 + layer * (foliageH * 0.28);
      coneMesh.castShadow = settings.shadows;
      group.add(coneMesh);
    }
    return group;
  }

  // Collect all stand OBB data so trees can check against them.
  // We gather them inline here, mirroring the same loop used below.
  function buildStandOBBs() {
    const obbs = [];
    const STADIUM_OFFSET = 26;
    const STAND_SEGMENT  = 18;
    const STAND_H        = 7;
    const STAND_D        = 8;
    const STAND_SAMPLES  = 80;
    for (let si = 0; si < STAND_SAMPLES; si++) {
      const t = si / STAND_SAMPLES;
      const pt  = TRACK_CURVE.getPoint(t);
      const tan = TRACK_CURVE.getTangent(t).normalize();
      const perp = new THREE.Vector3(-tan.z, 0, tan.x);
      const standAngle = Math.atan2(tan.x, tan.z);
      for (const side of [-1, 1]) {
        const ox = pt.x + perp.x * side * (TRACK_WIDTH / 2 + STADIUM_OFFSET);
        const oz = pt.z + perp.z * side * (TRACK_WIDTH / 2 + STADIUM_OFFSET);
        obbs.push({
          cx: ox, cz: oz,
          halfW: STAND_SEGMENT / 2 + 3, // +3 m buffer so trees don't clip the roof overhang
          halfD: STAND_D        / 2 + 3,
          cosA: Math.cos(standAngle),
          sinA: Math.sin(standAngle),
        });
      }
    }
    return obbs;
  }

  // Returns true if (x, z) is inside any stand OBB (with buffer already baked in)
  function isInsideAnyStand(x, z, standOBBs) {
    for (const obb of standOBBs) {
      const dx = x - obb.cx;
      const dz = z - obb.cz;
      const localX = dx * obb.cosA + dz * obb.sinA;
      const localZ = -dx * obb.sinA + dz * obb.cosA;
      if (Math.abs(localX) < obb.halfW && Math.abs(localZ) < obb.halfD) return true;
    }
    return false;
  }

  // Returns true if (x, z) is too close to any already-placed tree
  function isTooCloseToTree(x, z, placed, minDist) {
    for (const [px, pz] of placed) {
      const dx = x - px, dz = z - pz;
      if (dx * dx + dz * dz < minDist * minDist) return true;
    }
    return false;
  }

  function scatterTrees(sceneObj, settings) {
    const standOBBs = buildStandOBBs();

    // The grass plane is 1200×1200 centred at (35, 0, 55)
    const GRASS_CX = 35, GRASS_CZ = 55, GRASS_HALF = 580;

    // Trees only spawn outside the outermost stadium ring.
    // Stands sit at TRACK_WIDTH/2 + STADIUM_OFFSET = 7 + 26 = 33 from the track centre.
    // Their depth (STAND_D) is 8, so their outer edge is at +4 from centre → ~37 from track.
    // We push the tree inner boundary a bit further out so they feel outside the stadium.
    const TREE_INNER_TRACK_BUFFER = 47; // distance from nearest track waypoint — trees must be farther
    const MIN_TREE_SPACING = 6;          // trees can't overlap each other
    const TRACK_INNER_EXCLUSION = TRACK_WIDTH / 2 + 5; // don't plant inside the actual track

    const NUM_TREES = 260;
    const MAX_ATTEMPTS = 120; // per tree

    const placed = []; // [[x, z], …]

    // Pseudo-random but deterministic seeding via a simple LCG so layout is stable
    let seed = 0xDEADBEEF;
    function rand() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0xFFFFFFFF;
    }

    for (let i = 0; i < NUM_TREES; i++) {
      let placed_ok = false;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const x = GRASS_CX + (rand() - 0.5) * 2 * GRASS_HALF;
        const z = GRASS_CZ + (rand() - 0.5) * 2 * GRASS_HALF;

        // 1. Must be on the grass plane
        if (Math.abs(x - GRASS_CX) > GRASS_HALF || Math.abs(z - GRASS_CZ) > GRASS_HALF) continue;

        // 2. Must not be on (or too close to) the track itself
        let minTrackDist = Infinity;
        for (let wi = 0; wi < TRACK_WAYPOINTS.length; wi += 2) {
          const wp = TRACK_WAYPOINTS[wi];
          const dx = x - wp.x, dz = z - wp.z;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d < minTrackDist) minTrackDist = d;
          if (minTrackDist < TRACK_INNER_EXCLUSION) break;
        }
        if (minTrackDist < TREE_INNER_TRACK_BUFFER) continue;

        // 3. Must not be inside / clipping a stadium stand
        if (isInsideAnyStand(x, z, standOBBs)) continue;

        // 4. Must not be too close to another tree
        if (isTooCloseToTree(x, z, placed, MIN_TREE_SPACING)) continue;

        // All clear — plant it! 🌲
        const scale   = 0.75 + rand() * 0.9;  // variety: small saplings to big bois
        const tree    = makeTree(
          1.8 * scale,  // trunk height
          0.4 * scale,  // trunk radius
          4.2 * scale,  // foliage height
          2.0 * scale,  // foliage radius
          settings
        );
        tree.position.set(x, 0, z);
        tree.rotation.y = rand() * Math.PI * 2;  // random orientation 🌀
        sceneObj.add(tree);
        placed.push([x, z]);
        placed_ok = true;
        break;
      }
      // If we couldn't place after MAX_ATTEMPTS, just skip — no infinite loops here!
      void placed_ok;
    }
  }

  // =============================================
  // ADVERTISEMENT BILLBOARDS — outside the stadium, visible over the stands
  // =============================================

  /**
   * Creates a single 3D billboard.
   *
   * @param {object} opts
   *   x, z          – world position (y is always 0 / ground level)
   *   rotY          – rotation around Y axis (radians) — face this toward the track
   *   displayColor  – 0xRRGGBB hex for the flat billboard panel (easy to change!)
   *   drawFn        – function(ctx, w, h) called to paint the canvas texture
   *                   Leave null for a blank coloured panel.
   */
  function makeBillboard(sceneObj, { x, z, rotY = 0, displayColor = 0xFFFFFF, drawFn = null }, settings, getScenes) {
    const group = new THREE.Group();

    // ── Dimensions ───────────────────────────────────────────────────────────
    const BOARD_W      = 18;   // billboard width
    const BOARD_H      = 10;   // billboard height
    const BOARD_THICK  = 0.28; // billboard depth / thickness
    // Posts only go up to the bottom edge of the board — they do NOT pass through it.
    const BOARD_BOTTOM = 15;   // y-centre of the board
    const BOARD_BASE   = BOARD_BOTTOM - BOARD_H / 2; // y where the board's bottom edge sits
    const POST_H       = BOARD_BASE;  // posts reach exactly to the board's bottom edge

    // ── Steel support posts (two) ─────────────────────────────────────────────
    const steelMat = new THREE.MeshLambertMaterial({ color: 0x7B8FA1 });
    const postGeo  = new THREE.CylinderGeometry(0.22, 0.28, POST_H, 8);

    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, steelMat);
      // Position so the top of the post meets BOARD_BASE exactly
      post.position.set(side * (BOARD_W * 0.34), POST_H / 2, 0);
      post.castShadow = settings.shadows;
      group.add(post);
    }

    // ── Horizontal crossbeam — sits just below the board bottom edge ─────────
    const beamGeo  = new THREE.CylinderGeometry(0.12, 0.12, BOARD_W * 0.78, 8);
    const beam     = new THREE.Mesh(beamGeo, steelMat);
    beam.rotation.z = Math.PI / 2;
    beam.position.set(0, BOARD_BASE - 0.3, 0); // just below the board
    beam.castShadow = settings.shadows;
    group.add(beam);

    // ── Small diagonal braces — between upper post and crossbeam ─────────────
    const braceLen = 3.4;
    const braceGeo = new THREE.CylinderGeometry(0.08, 0.08, braceLen, 6);
    for (const side of [-1, 1]) {
      const brace = new THREE.Mesh(braceGeo, steelMat);
      const bx = side * (BOARD_W * 0.28);
      brace.position.set(bx, BOARD_BASE - braceLen * 0.45, 0.0);
      brace.rotation.z = side * 0.42;
      group.add(brace);
    }

    // ── Billboard panel — BACK (plain dark grey) ─────────────────────────────
    const backMat  = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const backGeo  = new THREE.BoxGeometry(BOARD_W, BOARD_H, BOARD_THICK * 0.5);
    const back     = new THREE.Mesh(backGeo, backMat);
    back.position.set(0, BOARD_BOTTOM, -BOARD_THICK * 0.35);
    back.castShadow = settings.shadows;
    back.receiveShadow = settings.shadows;
    group.add(back);

    // ── Billboard panel — FRONT (coloured / textured display face) ───────────
    let frontMat;

    if (drawFn) {
      // Canvas texture
      const CW = 512, CH = 256;
      const canvas = document.createElement('canvas');
      canvas.width = CW; canvas.height = CH;
      const ctx = canvas.getContext('2d');
      drawFn(ctx, CW, CH, getScenes);
      const tex = new THREE.CanvasTexture(canvas);
      frontMat = new THREE.MeshLambertMaterial({ map: tex });
    } else {
      // Solid colour — easy to change via displayColor parameter
      frontMat = new THREE.MeshLambertMaterial({ color: displayColor });
    }

    const frontGeo = new THREE.BoxGeometry(BOARD_W, BOARD_H, BOARD_THICK);
    const front    = new THREE.Mesh(frontGeo, [
      backMat,   // +X side
      backMat,   // -X side
      backMat,   // +Y top
      backMat,   // -Y bottom
      frontMat,  // +Z front face (facing track)
      backMat,   // -Z back face
    ]);
    front.position.set(0, BOARD_BOTTOM, BOARD_THICK * 0.1);
    front.castShadow = settings.shadows;
    front.receiveShadow = settings.shadows;
    group.add(front);

    // ── Lip / border frame around the front face ──────────────────────────────
    const frameColor = 0x1a1a1a;
    const frameMat   = new THREE.MeshLambertMaterial({ color: frameColor });
    for (const [fw, fh, fx, fy] of [
      [BOARD_W + 0.3, 0.3, 0, BOARD_BOTTOM + BOARD_H / 2 + 0.15], // top
      [BOARD_W + 0.3, 0.3, 0, BOARD_BOTTOM - BOARD_H / 2 - 0.15], // bottom
      [0.3, BOARD_H + 0.3, -BOARD_W / 2 - 0.15, BOARD_BOTTOM],    // left
      [0.3, BOARD_H + 0.3,  BOARD_W / 2 + 0.15, BOARD_BOTTOM],    // right
    ]) {
      const rim = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, BOARD_THICK + 0.1), frameMat);
      rim.position.set(fx, fy, BOARD_THICK * 0.1);
      group.add(rim);
    }

    // ── Place in the world ────────────────────────────────────────────────────
    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    sceneObj.add(group);
  }

  /**
   * Draw the Pingas Motors advertisement canvas.
   * Uses Comic Sans, bright colours, and loads the Pingas image from the shared meme-claw-machine folder.
   */
  function _drawPingasMotorsAd(ctx, w, h, getScenes) {
    // Background — vivid red with a dark vignette
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0,   '#CC0000');
    bg.addColorStop(0.5, '#FF1111');
    bg.addColorStop(1,   '#990000');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Checkerboard racing stripe along the bottom
    const stripeH = h * 0.14;
    const sqSz = stripeH;
    for (let col = 0; col < Math.ceil(w / sqSz); col++) {
      ctx.fillStyle = col % 2 === 0 ? '#FFFFFF' : '#000000';
      ctx.fillRect(col * sqSz, h - stripeH, sqSz, stripeH);
    }

    // ── Helper that draws all the text — called after the image is in place ────
    function drawText() {
      // Big headline — Comic Sans, gold, drop shadow
      ctx.font = `bold ${Math.round(h * 0.22)}px "Comic Sans MS", "Comic Sans", cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000000';
      ctx.fillText('PINGAS MOTORS', w * 0.5 + 3, h * 0.17 + 3);
      ctx.fillStyle = '#FFD700';
      ctx.fillText('PINGAS MOTORS', w * 0.5, h * 0.17);

      // Sub-tagline
      ctx.font = `bold ${Math.round(h * 0.13)}px "Comic Sans MS", "Comic Sans", cursive`;
      ctx.fillStyle = '#000000';
      ctx.fillText('SNOO-PINGAS!', w * 0.5 + 2, h * 0.36 + 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('SNOO-PINGAS!', w * 0.5, h * 0.36);

      // Small tagline
      ctx.font = `${Math.round(h * 0.09)}px "Comic Sans MS", "Comic Sans", cursive`;
      ctx.fillStyle = '#FFD700';
      ctx.fillText('★ FASTEST KARTS IN THE EGGMAN EMPIRE ★', w * 0.5, h * 0.52);
    }

    // ── Pingas image — bottom-centre, above the racing stripe, drawn FIRST ───
    // Original image is 522×478 — aspect ~1.09:1 (nearly square).
    // We render it at ~28% of canvas height so it sits neatly in the lower zone.
    const imgH   = Math.round(h * 0.28);
    const imgW   = Math.round(imgH * (522 / 478)); // preserve aspect ratio
    const imgX   = Math.round(w / 2 - imgW / 2);  // horizontally centred
    const stripeTop = h * (1 - 0.14);             // where the checkerboard starts
    const imgY   = Math.round(stripeTop - imgH);   // sit just above the stripe

    // Draw text immediately (image loads async, but text goes on top anyway)
    drawText();

    const pingas = new Image();
    pingas.src = '../meme-claw-machine/memes/Pingas.png';
    pingas.onload = () => {
      // Re-draw background over the image zone to get a clean slate,
      // then stamp the image, then redraw text so it stays on top.
      const bg2 = ctx.createLinearGradient(0, 0, w, h);
      bg2.addColorStop(0,   '#CC0000');
      bg2.addColorStop(0.5, '#FF1111');
      bg2.addColorStop(1,   '#990000');
      ctx.fillStyle = bg2;
      ctx.fillRect(0, imgY, w, imgH); // clear just the image row
      ctx.drawImage(pingas, imgX, imgY, imgW, imgH);
      // Redraw text on top of the image
      drawText();
      // Notify Three.js the canvas changed
      const parentCanvas = ctx.canvas;
      getScenes().forEach(sc => {
        sc.traverse(obj => {
          if (!obj.isMesh) return;
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => {
            if (m && m.map && m.map.isCanvasTexture && m.map.image === parentCanvas) {
              m.map.needsUpdate = true;
            }
          });
        });
      });
    };
  }

  /**
   * Draw the Weegee's Racing Goggles advertisement canvas.
   * Weegee stands tall on the left; Comic Sans copy fills the right.
   * Original sprite: 998 × 2517 px (aspect 0.397 — very narrow and tall).
   */
  function _drawWeegeeGooglesAd(ctx, w, h, getScenes) {
    // ── Background: deep green gradient ──────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0,   '#004400');
    bg.addColorStop(0.5, '#006600');
    bg.addColorStop(1,   '#002200');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle horizontal scan-lines for that unsettling Weegee vibe
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2);

    // ── Weegee sprite — left third, full height, preserving aspect ratio ─────
    // Sprite is 998 × 2517 → aspect W/H = 0.3966
    // We fill the full canvas height and derive width from the aspect ratio.
    const WEEGEE_ASPECT = 998 / 2517;
    const weegeeH = h;                           // fill full height
    const weegeeW = Math.round(weegeeH * WEEGEE_ASPECT); // ~narrow column
    const weegeeX = Math.round(w * 0.02);        // small left margin
    const weegeeY = 0;

    // ── Text layout — right of Weegee ────────────────────────────────────────
    const textX   = weegeeX + weegeeW + Math.round(w * 0.03);
    const textW   = w - textX - Math.round(w * 0.02);
    const textCX  = textX + textW / 2; // centre of text column

    // Helper: draw a text line with a black drop-shadow
    function drawLine(text, y, size, color) {
      ctx.font = `bold ${size}px "Comic Sans MS","Comic Sans",cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000000';
      ctx.fillText(text, textCX + 2, y + 2);
      ctx.fillStyle = color;
      ctx.fillText(text, textCX, y);
    }

    // Brand name
    drawLine("WEEGEE'S", Math.round(h * 0.12), Math.round(h * 0.115), '#00FF44');
    drawLine('RACING', Math.round(h * 0.27), Math.round(h * 0.105), '#FFFFFF');
    drawLine('GOGGLES™', Math.round(h * 0.40), Math.round(h * 0.105), '#00FF44');

    // Divider line
    ctx.strokeStyle = '#00AA33';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(textX, Math.round(h * 0.48));
    ctx.lineTo(textX + textW, Math.round(h * 0.48));
    ctx.stroke();

    // Taglines
    ctx.font = `${Math.round(h * 0.075)}px "Comic Sans MS","Comic Sans",cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#CCFFCC';
    const lines = [
      'YOU WILL STARE.',
      'THEY WILL STARE BACK.',
      '★ U GONNA GET WEEGEE\'D ★',
    ];
    lines.forEach((line, i) => {
      ctx.fillStyle = '#000000';
      ctx.fillText(line, textCX + 1, Math.round(h * (0.57 + i * 0.135)) + 1);
      ctx.fillStyle = i === 2 ? '#FFD700' : '#CCFFCC';
      ctx.fillText(line, textCX, Math.round(h * (0.57 + i * 0.135)));
    });

    // ── Load Weegee sprite async, then repaint ────────────────────────────────
    const weegee = new Image();
    weegee.src = '../weegees-mansion/Weegee-Sprites/Weegee_Left.png';
    weegee.onload = () => {
      ctx.drawImage(weegee, weegeeX, weegeeY, weegeeW, weegeeH);
      const parentCanvas = ctx.canvas;
      getScenes().forEach(sc => {
        sc.traverse(obj => {
          if (!obj.isMesh) return;
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => {
            if (m && m.map && m.map.isCanvasTexture && m.map.image === parentCanvas) {
              m.map.needsUpdate = true;
            }
          });
        });
      });
    };
  }

  /**
   * Draw King Harkinian's Dinner Catering Services advertisement.
   * King image (268×230, ~1.165:1) sits centre-left; Comic Sans copy to the right.
   * Orange/gold colour scheme to match his in-game kart colour.
   */
  function _drawKingHarkinianAd(ctx, w, h, getScenes) {
    // ── Background: rich warm orange gradient ─────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0,   '#7A3000');
    bg.addColorStop(0.4, '#CC5500');
    bg.addColorStop(1,   '#4A1800');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Gold decorative border strip along the top and bottom
    ctx.fillStyle = '#DAA520';
    ctx.fillRect(0, 0, w, Math.round(h * 0.06));
    ctx.fillRect(0, h - Math.round(h * 0.06), w, Math.round(h * 0.06));

    // Fancy crown emoji centred on the top border
    ctx.font = `${Math.round(h * 0.055)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👑', w / 2, Math.round(h * 0.03));

    // ── King Harkinian image — left half, vertically centred ─────────────────
    // Original: 268×230 → aspect W/H ≈ 1.165. We scale up to ~42% of canvas height.
    const kingH = Math.round(h * 0.62);
    const kingW = Math.round(kingH * (268 / 230));
    const kingX = Math.round(w * 0.04);
    const kingY = Math.round((h - kingH) / 2);

    // ── Text column — right of the king image ─────────────────────────────────
    const textX  = kingX + kingW + Math.round(w * 0.04);
    const textW  = w - textX - Math.round(w * 0.03);
    const textCX = textX + textW / 2;

    function drawLine(text, y, size, color) {
      ctx.font = `bold ${size}px "Comic Sans MS","Comic Sans",cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000000';
      ctx.fillText(text, textCX + 2, y + 2);
      ctx.fillStyle = color;
      ctx.fillText(text, textCX, y);
    }

    // Brand name — two lines so it fits
    drawLine('KING HARKINIAN\'S', Math.round(h * 0.20), Math.round(h * 0.095), '#FFD700');
    drawLine('DINNER CATERING', Math.round(h * 0.32), Math.round(h * 0.095), '#FFD700');
    drawLine('SERVICES', Math.round(h * 0.44), Math.round(h * 0.095), '#FFD700');

    // Divider
    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(textX, Math.round(h * 0.52));
    ctx.lineTo(textX + textW, Math.round(h * 0.52));
    ctx.stroke();

    // Slogan — two lines to keep it readable
    drawLine('Makes YOU wonder', Math.round(h * 0.62), Math.round(h * 0.082), '#FFFFFF');
    drawLine("what's for dinner!", Math.round(h * 0.73), Math.round(h * 0.082), '#FFFFFF');

    // Fine print
    ctx.font = `${Math.round(h * 0.058)}px "Comic Sans MS","Comic Sans",cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFCC66';
    ctx.fillText('★ BY ROYAL DECREE ★', textCX, Math.round(h * 0.855));

    // ── Load King image async ─────────────────────────────────────────────────
    const king = new Image();
    king.src = 'assets/King-Harkinian.png';
    king.onload = () => {
      ctx.drawImage(king, kingX, kingY, kingW, kingH);
      const parentCanvas = ctx.canvas;
      getScenes().forEach(sc => {
        sc.traverse(obj => {
          if (!obj.isMesh) return;
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => {
            if (m && m.map && m.map.isCanvasTexture && m.map.image === parentCanvas) {
              m.map.needsUpdate = true;
            }
          });
        });
      });
    };
  }

  /**
   * Draw Longcat's Cat Food Empire advertisement.
   * Dark/black background, Longcat image (500×500, square) on the right,
   * Comic Sans copy on the left. Longcat is scaled down just a touch.
   */
  function _drawLongcatAd(ctx, w, h, getScenes) {
    // ── Background: deep charcoal/black with subtle purple tint ──────────────
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0,   '#0A0A12');
    bg.addColorStop(0.5, '#12121E');
    bg.addColorStop(1,   '#060608');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle starfield — tiny white dots for a dramatic night-sky feel
    const starRng = (() => { let s = 0xCAFEF00D; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xFFFFFFFF; }; })();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 55; i++) {
      const sx = starRng() * w * 0.55; // only left portion — Longcat occupies the right
      const sy = starRng() * h;
      const sr = starRng() * 1.2 + 0.3;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Thin purple accent line top & bottom
    ctx.fillStyle = '#8833CC';
    ctx.fillRect(0, 0, w, Math.round(h * 0.025));
    ctx.fillRect(0, h - Math.round(h * 0.025), w, Math.round(h * 0.025));

    // ── Longcat image — right side, slightly smaller than 500×500 source ─────
    // 500×500 → square. We render at ~85% of canvas height, centred vertically.
    const catSize = Math.round(h * 0.85); // square — slightly smaller than full height
    const catX    = Math.round(w - catSize - w * 0.03); // right-aligned with small margin
    const catY    = Math.round((h - catSize) / 2);

    // ── Text column — left of Longcat ────────────────────────────────────────
    const textW  = catX - Math.round(w * 0.03);
    const textCX = textW / 2;

    function drawLine(text, y, size, color) {
      ctx.font = `bold ${size}px "Comic Sans MS","Comic Sans",cursive`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#000000';
      ctx.fillText(text, textCX + 2, y + 2);
      ctx.fillStyle = color;
      ctx.fillText(text, textCX, y);
    }

    // Brand name
    drawLine('LONGCAT\'S', Math.round(h * 0.14), Math.round(h * 0.105), '#DDDDDD');
    drawLine('CAT FOOD', Math.round(h * 0.26), Math.round(h * 0.105), '#DDDDDD');
    drawLine('EMPIRE', Math.round(h * 0.38), Math.round(h * 0.105), '#DDDDDD');

    // Purple divider
    ctx.strokeStyle = '#8833CC';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.round(w * 0.04), Math.round(h * 0.46));
    ctx.lineTo(textW - Math.round(w * 0.04), Math.round(h * 0.46));
    ctx.stroke();

    // Slogan
    drawLine('Longcat is long.', Math.round(h * 0.56), Math.round(h * 0.082), '#CC99FF');
    drawLine('So is our menu.', Math.round(h * 0.67), Math.round(h * 0.082), '#CC99FF');

    // Fine print
    ctx.font = `${Math.round(h * 0.058)}px "Comic Sans MS","Comic Sans",cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#888899';
    ctx.fillText('★ ENDLESS VARIETY ★', textCX, Math.round(h * 0.855));

    // ── Load Longcat image async ──────────────────────────────────────────────
    const longcat = new Image();
    longcat.src = '../meme-claw-machine/memes/Longcat.png';
    longcat.onload = () => {
      ctx.drawImage(longcat, catX, catY, catSize, catSize);
      const parentCanvas = ctx.canvas;
      getScenes().forEach(sc => {
        sc.traverse(obj => {
          if (!obj.isMesh) return;
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => {
            if (m && m.map && m.map.isCanvasTexture && m.map.image === parentCanvas) {
              m.map.needsUpdate = true;
            }
          });
        });
      });
    };
  }

  /**
   * Place all 4 advertisement billboards.
   * Positions chosen to be well outside the stadium (> 50 units from track)
   * and high enough (POST_H = 12) to be visible over the stands (STAND_H = 7).
   *
   * BILLBOARD DISPLAY COLOURS — change these 0x hex codes to repaint any panel:
   *   billboard 1 (Pingas Motors):  textured canvas — see _drawPingasMotorsAd()
   *   billboard 2 (blue):           displayColor: 0x003399
   *   billboard 3 (green):          displayColor: 0x005522
   *   billboard 4 (orange):         displayColor: 0xFF6600
   */
  function addBillboards(sceneObj, settings, getScenes) {
    // ── 1. Pingas Motors (NE straight, faces south-west toward the track) ─────
    makeBillboard(sceneObj, {
      x: 190, z: -20,
      rotY: Math.PI * 1.25,   // faces toward the long straight
      displayColor: 0xFF1111, // fallback if canvas fails (same red as the ad)
      drawFn: _drawPingasMotorsAd,
    }, settings, getScenes);

    // ── 2. Weegee's Racing Goggles (east turn, faces west) ────────────
    makeBillboard(sceneObj, {
      x: 210, z: 75,
      rotY: Math.PI,           // faces west toward the sweeping right-hander
      displayColor: 0x006600,  // green fallback if canvas hasn't loaded yet
      drawFn: _drawWeegeeGooglesAd,
    }, settings, getScenes);

    // ── 3. Longcat's Cat Food Empire (south straight, faces south toward the track) ──
    makeBillboard(sceneObj, {
      x: 40, z: 185,
      rotY: Math.PI,
      displayColor: 0x0A0A12,  // near-black fallback matching the ad background
      drawFn: _drawLongcatAd,
    }, settings, getScenes);

    // ── 4. King Harkinian's Dinner Catering (west hairpin, faces east) ─────────
    makeBillboard(sceneObj, {
      x: -130, z: 60,
      rotY: Math.PI * 0.5,    // faces east
      displayColor: 0xFF6600,  // warm orange fallback
      drawFn: _drawKingHarkinianAd,
    }, settings, getScenes);
  }

  function addDecorations(sceneObj, settings, stadiumWalls, getScenes) {
    scatterTrees(sceneObj, settings);
    addBillboards(sceneObj, settings, getScenes);

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
        if (stadiumWalls) {
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


  return {
    name: 'Forest Stadium',
    curve: TRACK_CURVE,
    samples: TRACK_SAMPLES,
    width: TRACK_WIDTH,
    waypoints: TRACK_WAYPOINTS,
    totalLaps: TOTAL_LAPS,
    checkpointCount: CHECKPOINT_COUNT,
    itemBoxOffsets: ITEM_BOX_T_OFFSETS,
    buildScene,
    isOnTrack,
  };
})();
