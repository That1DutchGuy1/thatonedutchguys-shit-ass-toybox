// Beach Getaway is a rolling island circuit surrounded by open ocean.
const BeachGetaway = (() => {
  const TRACK_CONTROL_COUNT = 48;
  const TRACK_CONTROL_PTS = Array.from({ length: TRACK_CONTROL_COUNT }, (_, index) => {
    const angle = (index / TRACK_CONTROL_COUNT) * Math.PI * 2;
    const radius = 205 + 35 * Math.cos(angle * 5) + 16 * Math.cos(angle * 9);
    const height = 1.8 + 1.05 * Math.cos(angle * 6) + 0.35 * Math.cos(angle * 13);
    return new THREE.Vector3(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
  });

  const TRACK_CURVE = new THREE.CatmullRomCurve3(TRACK_CONTROL_PTS, true, 'catmullrom', 0.5);
  const TRACK_SAMPLES = 400;
  const TRACK_WIDTH = 14;
  const TRACK_WAYPOINTS = TRACK_CURVE.getPoints(TRACK_SAMPLES);
  const TOTAL_LAPS = 3;
  const CHECKPOINT_COUNT = 24;
  const ITEM_BOX_T_OFFSETS = Array.from({ length: 18 }, (_, index) => (index + 0.5) / 18);
  const ISLAND_RADIUS = 350;
  const ISLAND_BASE_HEIGHT = -0.18;
  const TERRAIN_BLEND_DISTANCE = 58;
  const TRACK_TERRAIN_CLEARANCE = 0.14;
  let islandGeometryCache = null;

  function buildScene(sceneObj, settings, stadiumWalls) {
    sceneObj.background = new THREE.Color(0x38bdf8);
    sceneObj.fog = new THREE.Fog(0x38bdf8, 500, 1050);
    sceneObj.add(new THREE.AmbientLight(0xffffff, 0.78));

    const sun = new THREE.DirectionalLight(0xfff4d6, 1.15);
    sun.position.set(-70, 100, 45);
    sun.castShadow = settings.shadows;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 800;
    sun.shadow.camera.left = -410;
    sun.shadow.camera.right = 410;
    sun.shadow.camera.top = 410;
    sun.shadow.camera.bottom = -410;
    sun.shadow.bias = -0.001;
    sceneObj.add(sun);

    buildOcean(sceneObj);
    buildIsland(sceneObj, settings);
    buildTrack(sceneObj, settings);
    buildSandcastle(sceneObj, settings, stadiumWalls);
    scatterPalms(sceneObj, settings);
    buildCloudHorizon(sceneObj);
    return sceneObj;
  }

  function buildOcean(sceneObj) {
    const waterTexture = new THREE.TextureLoader().load('./assets/water.png');
    waterTexture.wrapS = THREE.RepeatWrapping;
    waterTexture.wrapT = THREE.RepeatWrapping;
    waterTexture.repeat.set(180, 180);
    waterTexture.anisotropy = 8;

    const ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(2400, 2400),
      new THREE.MeshLambertMaterial({ map: waterTexture })
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.42;
    ocean.receiveShadow = false;
    sceneObj.add(ocean);
  }

  function buildIsland(sceneObj, settings) {
    if (!islandGeometryCache) islandGeometryCache = buildIslandGeometry();

    const sandTexture = new THREE.TextureLoader().load('./assets/sand.png');
    sandTexture.wrapS = THREE.RepeatWrapping;
    sandTexture.wrapT = THREE.RepeatWrapping;
    sandTexture.repeat.set(54, 54);
    sandTexture.anisotropy = 8;

    const island = new THREE.Mesh(
      islandGeometryCache,
      new THREE.MeshLambertMaterial({ map: sandTexture, side: THREE.DoubleSide })
    );
    island.receiveShadow = settings.shadows;
    island.userData.islandSurface = true;
    sceneObj.add(island);
  }

  function buildIslandGeometry() {
    const angularSegments = 640;
    const radialSegments = 128;
    const vertices = [0, terrainHeightAt(0, 0), 0];
    const uvs = [0.5, 0.5];
    const indices = [];

    for (let ring = 1; ring <= radialSegments; ring++) {
      const ringFraction = ring / radialSegments;
      for (let segment = 0; segment < angularSegments; segment++) {
        const angle = (segment / angularSegments) * Math.PI * 2;
        const shoreline = 1 + 0.025 * Math.sin(angle * 5 + 0.4) + 0.018 * Math.sin(angle * 9 - 1.2);
        const radius = ISLAND_RADIUS * ringFraction * (ring === radialSegments ? shoreline : 1);
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        vertices.push(x, terrainHeightAt(x, z), z);
        uvs.push(0.5 + x / ISLAND_RADIUS, 0.5 + z / ISLAND_RADIUS);
      }
    }

    for (let segment = 0; segment < angularSegments; segment++) {
      const current = 1 + segment;
      const next = 1 + ((segment + 1) % angularSegments);
      indices.push(0, next, current);
    }

    for (let ring = 1; ring < radialSegments; ring++) {
      const innerStart = 1 + (ring - 1) * angularSegments;
      const outerStart = innerStart + angularSegments;
      for (let segment = 0; segment < angularSegments; segment++) {
        const next = (segment + 1) % angularSegments;
        const inner = innerStart + segment;
        const innerNext = innerStart + next;
        const outer = outerStart + segment;
        const outerNext = outerStart + next;
        indices.push(inner, innerNext, outer, innerNext, outerNext, outer);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  function closestTrackSurface(x, z) {
    let nearestDistanceSq = Infinity;
    let nearestHeight = ISLAND_BASE_HEIGHT;

    for (let i = 0; i < TRACK_WAYPOINTS.length - 1; i++) {
      const start = TRACK_WAYPOINTS[i];
      const end = TRACK_WAYPOINTS[i + 1];
      const segmentX = end.x - start.x;
      const segmentZ = end.z - start.z;
      const segmentLengthSq = segmentX * segmentX + segmentZ * segmentZ;
      const amount = Math.max(0, Math.min(1,
        ((x - start.x) * segmentX + (z - start.z) * segmentZ) / segmentLengthSq
      ));
      const dx = x - (start.x + segmentX * amount);
      const dz = z - (start.z + segmentZ * amount);
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq < nearestDistanceSq) {
        nearestDistanceSq = distanceSq;
        nearestHeight = start.y + (end.y - start.y) * amount;
      }
    }

    return { distance: Math.sqrt(nearestDistanceSq), height: nearestHeight };
  }

  function terrainHeightAt(x, z) {
    const nearest = closestTrackSurface(x, z);
    const blendStart = TRACK_WIDTH / 2 + 0.5;
    const blendAmount = Math.max(0, Math.min(
      1,
      (TERRAIN_BLEND_DISTANCE - nearest.distance) / (TERRAIN_BLEND_DISTANCE - blendStart)
    ));
    const smoothBlend = blendAmount * blendAmount * (3 - 2 * blendAmount);
    const trackClearance = TRACK_TERRAIN_CLEARANCE * smoothBlend;
    return ISLAND_BASE_HEIGHT + (nearest.height - ISLAND_BASE_HEIGHT) * smoothBlend - trackClearance;
  }

  function buildTrack(sceneObj, settings) {
    const count = TRACK_SAMPLES;
    const halfWidth = TRACK_WIDTH / 2;
    const roadVertices = [];
    const roadColors = [];
    const roadIndices = [];

    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const point = TRACK_CURVE.getPoint(t);
      const tangent = TRACK_CURVE.getTangent(t).normalize();
      const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x);
      const left = point.clone().addScaledVector(perpendicular, -halfWidth);
      const right = point.clone().addScaledVector(perpendicular, halfWidth);
      roadVertices.push(left.x, left.y + 0.01, left.z, right.x, right.y + 0.01, right.z);

      const asphalt = i % 20 < 2 ? [0.23, 0.23, 0.25] : [0.17, 0.17, 0.19];
      roadColors.push(...asphalt, ...asphalt);
      if (i < count) {
        const base = i * 2;
        roadIndices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }

    const roadGeometry = new THREE.BufferGeometry();
    roadGeometry.setAttribute('position', new THREE.Float32BufferAttribute(roadVertices, 3));
    roadGeometry.setAttribute('color', new THREE.Float32BufferAttribute(roadColors, 3));
    roadGeometry.setIndex(roadIndices);
    roadGeometry.computeVertexNormals();

    const road = new THREE.Mesh(
      roadGeometry,
      new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })
    );
    road.receiveShadow = settings.shadows;
    sceneObj.add(road);

    buildKerbs(sceneObj, settings, count, halfWidth);
    buildYellowRoadStripes(sceneObj, count);
    buildFinishLine(sceneObj);
  }

  function buildKerbs(sceneObj, settings, count, halfWidth) {
    for (const side of [-1, 1]) {
      const vertices = [];
      const colors = [];
      const indices = [];
      const rings = [];

      for (let i = 0; i < count; i++) {
        const t = i / count;
        const point = TRACK_CURVE.getPoint(t);
        const tangent = TRACK_CURVE.getTangent(t).normalize();
        const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x);
        rings.push({
          inner: point.clone().addScaledVector(perpendicular, side * halfWidth),
          outer: point.clone().addScaledVector(perpendicular, side * (halfWidth + 2.8)),
        });
      }

      for (let i = 0; i <= count; i++) {
        const { inner, outer } = rings[i % count];
        vertices.push(inner.x, inner.y + 0.02, inner.z, outer.x, outer.y + 0.02, outer.z);
        const color = Math.floor(i / 3) % 2 === 0 ? [1, 0.1, 0.1] : [1, 1, 1];
        colors.push(...color, ...color);
        if (i < count) {
          const base = i * 2;
          const next = base + 2;
          if (side === 1) {
            indices.push(base, base + 1, next, base + 1, next + 1, next);
          } else {
            indices.push(next, base + 1, base, next, next + 1, base + 1);
          }
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const kerbs = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }));
      kerbs.renderOrder = 1;
      kerbs.receiveShadow = settings.shadows;
      sceneObj.add(kerbs);
    }
  }

  function buildYellowRoadStripes(sceneObj, count) {
    for (let i = 0; i < count; i += 4) {
      const start = TRACK_CURVE.getPoint(i / count);
      const end = TRACK_CURVE.getPoint((i + 2) / count);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([
        start.x, start.y + 0.035, start.z, end.x, end.y + 0.035, end.z,
      ], 3));
      sceneObj.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xffdd00 })));
    }
  }

  function buildFinishLine(sceneObj) {
    const tangent = TRACK_CURVE.getTangent(0).normalize();
    const origin = TRACK_CURVE.getPoint(0);
    const horizontalTangent = new THREE.Vector3(tangent.x, 0, tangent.z).normalize();
    const perpendicular = new THREE.Vector3(-horizontalTangent.z, 0, horizontalTangent.x);
    const halfWidth = TRACK_WIDTH / 2;
    const halfDepth = 2.25;
    const slope = tangent.y / Math.hypot(tangent.x, tangent.z);
    const corners = [
      origin.clone().addScaledVector(perpendicular, -halfWidth).addScaledVector(horizontalTangent, -halfDepth),
      origin.clone().addScaledVector(perpendicular, halfWidth).addScaledVector(horizontalTangent, -halfDepth),
      origin.clone().addScaledVector(perpendicular, -halfWidth).addScaledVector(horizontalTangent, halfDepth),
      origin.clone().addScaledVector(perpendicular, halfWidth).addScaledVector(horizontalTangent, halfDepth),
    ];
    corners.forEach(corner => {
      corner.y = origin.y + (corner.clone().sub(origin).dot(horizontalTangent) * slope) + 0.045;
    });
    const columns = 12;
    const rows = 4;
    const canvas = document.createElement('canvas');
    canvas.width = columns * 32;
    canvas.height = rows * 32;
    const context = canvas.getContext('2d');

    for (let column = 0; column < columns; column++) {
      for (let row = 0; row < rows; row++) {
        context.fillStyle = (column + row) % 2 === 0 ? '#ffffff' : '#000000';
        context.fillRect(column * 32, row * 32, 32, 32);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(
      corners.flatMap(corner => [corner.x, corner.y, corner.z]), 3
    ));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
      0, 1, 1, 1, 0, 0, 1, 0,
    ], 2));
    geometry.setIndex([0, 1, 2, 1, 3, 2]);
    geometry.computeVertexNormals();
    const finish = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        map: texture,
        depthWrite: true,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -6,
      })
    );
    finish.renderOrder = 2;
    sceneObj.add(finish);
  }

  function buildSandcastle(sceneObj, settings, stadiumWalls) {
    const baseHeight = terrainHeightAt(0, 0);
    const sand = new THREE.MeshLambertMaterial({ color: 0xd8aa67 });
    const lightSand = new THREE.MeshLambertMaterial({ color: 0xe8bf7b });
    const darkSand = new THREE.MeshLambertMaterial({ color: 0xc39150 });
    const trimSand = new THREE.MeshLambertMaterial({ color: 0xf0d095 });
    const castle = new THREE.Group();
    const addBlock = (width, height, depth, x, y, z, material, detail = 0) => {
      const block = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
      block.position.set(x, baseHeight + y, z);
      block.castShadow = settings.shadows;
      block.receiveShadow = settings.shadows;
      castle.add(block);
      if (detail > 0) {
        const ridge = new THREE.Mesh(
          new THREE.BoxGeometry(width + detail, detail, depth + detail),
          trimSand
        );
        ridge.position.set(x, baseHeight + y + height / 2 + detail / 2, z);
        ridge.castShadow = settings.shadows;
        castle.add(ridge);
      }
    };
    const addTower = (x, z, height, radius) => {
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.86, radius, height, 7, 1),
        lightSand
      );
      shaft.position.set(x, baseHeight + height / 2, z);
      shaft.castShadow = settings.shadows;
      shaft.receiveShadow = settings.shadows;
      castle.add(shaft);

      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 1.08, radius * 1.08, 0.65, 7),
        darkSand
      );
      crown.position.set(x, baseHeight + height + 0.25, z);
      crown.castShadow = settings.shadows;
      castle.add(crown);

      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(radius * 1.13, 2.1, 7),
        sand
      );
      cone.position.set(x, baseHeight + height + 1.62, z);
      cone.castShadow = settings.shadows;
      castle.add(cone);
    };

    addBlock(27, 2.2, 24, 0, 1.1, 0, darkSand);
    addBlock(24, 7.5, 21, 0, 5.95, 0, sand);
    addBlock(25, 0.9, 22, 0, 10.15, 0, trimSand);
    addBlock(13, 11, 13, 0, 15.1, -0.5, lightSand, 0.55);
    addBlock(10.5, 0.8, 11, 0, 20.95, -0.5, darkSand);

    addTower(-10.5, -9, 12.5, 3.3);
    addTower(10.5, -9, 12.5, 3.3);
    addTower(-10.5, 9, 12.5, 3.3);
    addTower(10.5, 9, 12.5, 3.3);

    for (const x of [-3.9, -1.95, 0, 1.95, 3.9]) {
      addBlock(1.5, 2, 1.5, x, 22.2, -5.25, lightSand);
      addBlock(1.5, 2, 1.5, x, 22.2, 4.25, lightSand);
    }
    for (const z of [-3.5, -1.5, 0.5, 2.5]) {
      addBlock(1.5, 2, 1.5, -4.5, 22.2, z, lightSand);
      addBlock(1.5, 2, 1.5, 4.5, 22.2, z, lightSand);
    }

    const gate = new THREE.Mesh(
      new THREE.BoxGeometry(4.8, 5.5, 0.8),
      darkSand
    );
    gate.position.set(0, baseHeight + 3.1, 10.95);
    castle.add(gate);
    const gateLintel = new THREE.Mesh(
      new THREE.BoxGeometry(7, 1.3, 2.2),
      lightSand
    );
    gateLintel.position.set(0, baseHeight + 6.4, 10.7);
    gateLintel.castShadow = settings.shadows;
    castle.add(gateLintel);

    castle.traverse(object => {
      if (!object.isMesh) return;
      object.castShadow = settings.shadows;
      object.receiveShadow = settings.shadows;
    });
    sceneObj.add(castle);

    if (stadiumWalls) {
      stadiumWalls.push({
        cx: 0,
        cz: 0,
        cosA: 1,
        sinA: 0,
        halfW: 15,
        halfD: 14,
      });
    }
  }

  function makePalmTree(height, settings) {
    const palm = new THREE.Group();
    const trunkHeight = height;
    const trunkSegments = 6;
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x9a6838 });

    for (let segment = 0; segment < trunkSegments; segment++) {
      const fraction = segment / trunkSegments;
      const nextFraction = (segment + 1) / trunkSegments;
      const start = new THREE.Vector3(
        Math.sin(fraction * 0.7) * height * 0.11,
        fraction * trunkHeight,
        0
      );
      const end = new THREE.Vector3(
        Math.sin(nextFraction * 0.7) * height * 0.11,
        nextFraction * trunkHeight,
        0
      );
      const length = start.distanceTo(end);
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48 - fraction * 0.23, 0.58 - fraction * 0.2, length, 6, 1),
        trunkMaterial
      );
      trunk.position.copy(start).add(end).multiplyScalar(0.5);
      trunk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
      trunk.castShadow = settings.shadows;
      trunk.receiveShadow = settings.shadows;
      palm.add(trunk);
    }

    const crownX = Math.sin(0.7) * height * 0.11;
    const crown = new THREE.Vector3(crownX, trunkHeight, 0);
    const leafMaterials = [
      new THREE.MeshLambertMaterial({ color: 0x167b3a, side: THREE.DoubleSide }),
      new THREE.MeshLambertMaterial({ color: 0x249447, side: THREE.DoubleSide }),
      new THREE.MeshLambertMaterial({ color: 0x38a852, side: THREE.DoubleSide }),
    ];

    for (let leaf = 0; leaf < 8; leaf++) {
      const angle = (leaf / 8) * Math.PI * 2;
      const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const across = new THREE.Vector3(-direction.z, 0, direction.x);
      const vertices = [];
      const indices = [];
      const segments = 5;

      for (let segment = 0; segment <= segments; segment++) {
        const t = segment / segments;
        const distance = t * height * 0.62;
        const width = Math.sin(t * Math.PI) * height * 0.075;
        const center = crown.clone()
          .addScaledVector(direction, distance)
          .add(new THREE.Vector3(0, -height * (0.06 * t + 0.18 * t * t), 0));
        const left = center.clone().addScaledVector(across, -width);
        const right = center.clone().addScaledVector(across, width);
        vertices.push(left.x, left.y, left.z, center.x, center.y, center.z, right.x, right.y, right.z);
        if (segment < segments) {
          const base = segment * 3;
          indices.push(base, base + 3, base + 1, base + 1, base + 3, base + 4);
          indices.push(base + 1, base + 4, base + 2, base + 2, base + 4, base + 5);
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      const frond = new THREE.Mesh(geometry, leafMaterials[leaf % leafMaterials.length]);
      frond.castShadow = settings.shadows;
      palm.add(frond);
    }

    return palm;
  }

  function distanceToTrack(x, z) {
    let nearest = Infinity;
    for (let i = 0; i < TRACK_WAYPOINTS.length; i += 2) {
      const point = TRACK_WAYPOINTS[i];
      nearest = Math.min(nearest, Math.hypot(x - point.x, z - point.z));
    }
    return nearest;
  }

  function scatterPalms(sceneObj, settings) {
    const placed = [];
    let seed = 0xB34C4A7;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };

    for (let i = 0; i < 84; i++) {
      for (let attempt = 0; attempt < 100; attempt++) {
        const angle = random() * Math.PI * 2;
        const radius = 35 + random() * 285;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        if (Math.hypot(x, z) < 34) continue;
        if (radius > ISLAND_RADIUS - 25 || distanceToTrack(x, z) < 30) continue;
        if (placed.some(([px, pz]) => Math.hypot(x - px, z - pz) < 14)) continue;

        const tree = makePalmTree(8 + random() * 4, settings);
        tree.position.set(x, terrainHeightAt(x, z), z);
        tree.rotation.y = random() * Math.PI * 2;
        sceneObj.add(tree);
        placed.push([x, z]);
        break;
      }
    }
  }

  function buildCloudHorizon(sceneObj) {
    const cloudMaterial = new THREE.MeshLambertMaterial({ color: 0xf5fcff });
    const cloudCount = 32;
    const ringRadius = 415;

    for (let i = 0; i < cloudCount; i++) {
      const angle = (i / cloudCount) * Math.PI * 2;
      const radius = ringRadius + Math.sin(i * 8.7) * 16;
      const cloud = new THREE.Group();
      const width = 12 + (i % 5) * 3;
      const puffs = 4 + (i % 3);

      for (let puff = 0; puff < puffs; puff++) {
        const size = 8 + ((i + puff * 3) % 5) * 2;
        const sphere = new THREE.Mesh(
          new THREE.IcosahedronGeometry(size, 1),
          cloudMaterial
        );
        sphere.position.set(
          (puff - (puffs - 1) / 2) * width * 0.48,
          (puff % 2) * 3,
          Math.sin(puff * 2.1) * 4
        );
        cloud.add(sphere);
      }

      cloud.position.set(Math.cos(angle) * radius, 19 + (i % 4) * 2, Math.sin(angle) * radius);
      cloud.rotation.y = -angle;
      sceneObj.add(cloud);
    }
  }

  function isOnTrack(position) {
    return closestTrackSurface(position.x, position.z).distance < TRACK_WIDTH / 2 + 3;
  }

  return {
    name: 'Beach Getaway',
    curve: TRACK_CURVE,
    samples: TRACK_SAMPLES,
    width: TRACK_WIDTH,
    surfaceHeight: -0.18,
    getSurfaceHeightAt: position => terrainHeightAt(position.x, position.z),
    waypoints: TRACK_WAYPOINTS,
    totalLaps: TOTAL_LAPS,
    checkpointCount: CHECKPOINT_COUNT,
    itemBoxOffsets: ITEM_BOX_T_OFFSETS,
    buildScene,
    isOnTrack,
  };
})();
