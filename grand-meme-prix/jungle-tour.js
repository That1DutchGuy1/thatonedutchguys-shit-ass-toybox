const JungleTour = (() => {
  const CONTROL_COUNT = 32;
  const TRACK_WIDTH = 14;
  const TRACK_SAMPLES = 400;
  const BRIDGE_CENTERS = [0.375, 0.875];
  const BRIDGE_PLANK_COUNT = 33;
  const BRIDGE_PLANK_SPACING = 1.35;
  const BRIDGE_HALF_LENGTH = (BRIDGE_PLANK_COUNT - 1) * BRIDGE_PLANK_SPACING / 2;
  const ROAD_CUT_HALF_LENGTH = BRIDGE_HALF_LENGTH + 0.75;
  const ROAD_SAMPLES = 1200;
  const TRACK_CONTROL_POINTS = Array.from({ length: CONTROL_COUNT }, (_, index) => {
    const angle = (index / CONTROL_COUNT) * Math.PI * 2 + Math.PI / 4;
    const radius = 180 + 27 * Math.cos(angle * 3 + 0.35) + 14 * Math.sin(angle * 5);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const bridgeLift = 0.9 * Math.exp(-((z / 23) ** 2));
    return new THREE.Vector3(x, terrainHeightBase(x, z) + 0.14 + bridgeLift, z);
  });
  const TRACK_CURVE = new THREE.CatmullRomCurve3(TRACK_CONTROL_POINTS, true, 'catmullrom', 0.5);
  const TRACK_LENGTH = TRACK_CURVE.getLength();
  const BRIDGE_CENTER_ARC_U = BRIDGE_CENTERS.map(parameter => arcFractionAtParameter(parameter));
  const TRACK_WAYPOINTS = TRACK_CURVE.getPoints(TRACK_SAMPLES);
  const BRIDGE_APPROACH_SEGMENTS = BRIDGE_CENTERS.flatMap(bridgeT => {
    const segments = [];
    const bridgeU = arcFractionAtParameter(bridgeT);
    let previous = TRACK_CURVE.getPointAt((bridgeU - 30 / TRACK_LENGTH + 1) % 1);
    for (let distance = -28; distance <= 30; distance += 2) {
      const current = TRACK_CURVE.getPointAt((bridgeU + distance / TRACK_LENGTH + 1) % 1);
      segments.push({ start: previous, end: current });
      previous = current;
    }
    return segments;
  });
  const ITEM_BOX_T_OFFSETS = Array.from({ length: 16 }, (_, index) => (index + 0.5) / 16);
  const TERRAIN_SIZE = 1000;
  const RIVER_WIDTH = 16;
  const RIVER_WATER_LEVEL = -0.2;
  const RIVER_BED_DEPTH = 0.65;
  const CLIFF_SEGMENTS = 320;
  const CLIFF_BASE_RADIUS = 445;
  const CLIFF_HEIGHT = 105;
  const CLIFF_COLLISION_SEGMENTS = 160;
  let riverTexture = null;

  function arcFractionAtParameter(parameter) {
    const lengths = TRACK_CURVE.getLengths();
    const scaledIndex = parameter * (lengths.length - 1);
    const index = Math.floor(scaledIndex);
    const fraction = scaledIndex - index;
    const startLength = lengths[index];
    const endLength = lengths[(index + 1) % lengths.length];
    const arcLength = startLength + (endLength - startLength) * fraction;
    return arcLength / TRACK_LENGTH;
  }

  function terrainHeightBase(x, z) {
    return 0.34
      + 0.24 * Math.sin(x * 0.008) * Math.cos(z * 0.008)
      + 0.1 * Math.sin((x + z) * 0.012);
  }

  function terrainHeightAt(x, z) {
    const riverCenterZ = 3 * Math.sin(x * 0.009);
    const distanceFromRiver = Math.abs(z - riverCenterZ);
    const bedHeight = RIVER_WATER_LEVEL - RIVER_BED_DEPTH;
    const edgeHeight = RIVER_WATER_LEVEL - 0.04;
    const channelBlend = Math.max(0, Math.min(1, distanceFromRiver / (RIVER_WIDTH / 2)));
    const smoothChannel = channelBlend * channelBlend * (3 - 2 * channelBlend);
    const channelHeight = bedHeight + (edgeHeight - bedHeight) * smoothChannel;
    const bankBlend = Math.max(0, Math.min(1,
      (distanceFromRiver - RIVER_WIDTH / 2) / 18
    ));
    const smoothBank = bankBlend * bankBlend * (3 - 2 * bankBlend);
    const bankHeight = edgeHeight + (terrainHeightBase(x, z) - edgeHeight) * smoothBank;
    let height = distanceFromRiver <= RIVER_WIDTH / 2 ? channelHeight : bankHeight;
    if (distanceFromRiver <= RIVER_WIDTH / 2 + 0.5) return height;

    const bridgeSurface = getBridgeRoadHeightAt(x, z);
    if (bridgeSurface) {
      const blend = Math.max(0, Math.min(1,
        (TRACK_WIDTH / 2 + 8 - bridgeSurface.distance) / 8
      ));
      const smoothBlend = blend * blend * (3 - 2 * blend);
      const roadBedHeight = bridgeSurface.height - 0.14;
      height += (roadBedHeight - height) * smoothBlend;
    }
    return height;
  }

  function getBridgeRoadHeightAt(x, z) {
    let nearestDistanceSq = Infinity;
    let nearestHeight = null;
    for (const segment of BRIDGE_APPROACH_SEGMENTS) {
      const dx = segment.end.x - segment.start.x;
      const dz = segment.end.z - segment.start.z;
      const lengthSq = dx * dx + dz * dz;
      const amount = Math.max(0, Math.min(1,
        ((x - segment.start.x) * dx + (z - segment.start.z) * dz) / lengthSq
      ));
      const nearestX = segment.start.x + dx * amount;
      const nearestZ = segment.start.z + dz * amount;
      const distanceSq = (x - nearestX) ** 2 + (z - nearestZ) ** 2;
      if (distanceSq < nearestDistanceSq) {
        nearestDistanceSq = distanceSq;
        nearestHeight = segment.start.y + (segment.end.y - segment.start.y) * amount;
      }
    }
    if (nearestHeight === null) return null;
    return { distance: Math.sqrt(nearestDistanceSq), height: nearestHeight };
  }

  function loadTiledTexture(path, repeatX, repeatY) {
    const texture = new THREE.TextureLoader().load(path);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.anisotropy = 8;
    return texture;
  }

  function buildScene(sceneObj, settings, stadiumWalls) {
    const sky = new THREE.Color(0x55b9f2);
    sceneObj.background = sky;
    sceneObj.fog = new THREE.Fog(sky, 520, 1100);
    sceneObj.add(new THREE.AmbientLight(0xd8f2d5, 0.72));

    const sunlight = new THREE.DirectionalLight(0xffefc4, 1.15);
    sunlight.position.set(-140, 190, 80);
    sunlight.castShadow = settings.shadows;
    sunlight.shadow.mapSize.set(2048, 2048);
    sunlight.shadow.camera.near = 1;
    sunlight.shadow.camera.far = 850;
    sunlight.shadow.camera.left = -440;
    sunlight.shadow.camera.right = 440;
    sunlight.shadow.camera.top = 440;
    sunlight.shadow.camera.bottom = -440;
    sunlight.shadow.bias = -0.001;
    sceneObj.add(sunlight);

    buildTerrain(sceneObj, settings);
    buildCliffs(sceneObj, settings, stadiumWalls);
    buildRiver(sceneObj);
    buildRoad(sceneObj, settings);
    for (const bridgeT of BRIDGE_CENTERS) buildBridge(sceneObj, settings, bridgeT, stadiumWalls);
    scatterJungleTrees(sceneObj, settings, stadiumWalls);
    buildFinishLine(sceneObj, settings);
    return sceneObj;
  }

  function buildTerrain(sceneObj, settings) {
    const xSegments = 320;
    const halfSize = TERRAIN_SIZE / 2;
    const riverOffsets = [];
    for (let offset = -halfSize; offset <= halfSize; offset += 4) riverOffsets.push(offset);
    for (const offset of [
      -28, -24, -20, -18, -16, -14, -12, -10, -8, -6, -4, -2,
      2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28,
    ]) {
      riverOffsets.push(offset);
    }
    riverOffsets.sort((a, b) => a - b);
    const rows = riverOffsets.filter((offset, index) =>
      index === 0 || offset - riverOffsets[index - 1] > 0.5
    );
    const vertices = [];
    const uvs = [];
    const indices = [];

    for (let row = 0; row < rows.length; row++) {
      const lateralOffset = rows[row];
      for (let column = 0; column <= xSegments; column++) {
        const x = -halfSize + (column / xSegments) * TERRAIN_SIZE;
        const z = 3 * Math.sin(x * 0.009) + lateralOffset;
        vertices.push(x, terrainHeightAt(x, z), z);
        uvs.push((x + halfSize) / 16, (z + halfSize) / 16);
        if (row < rows.length - 1 && column < xSegments) {
          const index = row * (xSegments + 1) + column;
          indices.push(index, index + xSegments + 1, index + 1);
          indices.push(index + 1, index + xSegments + 1, index + xSegments + 2);
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const ground = new THREE.Mesh(
      geometry,
      new THREE.MeshLambertMaterial({
        map: loadTiledTexture('./assets/textures/jungle-ground.png', 1, 1),
        side: THREE.DoubleSide,
      })
    );
    ground.receiveShadow = settings.shadows;
    sceneObj.add(ground);
  }

  function buildCliffs(sceneObj, settings, stadiumWalls) {
    const verticalSegments = 16;
    const positions = [];
    const uvs = [];
    const indices = [];
    const circumference = Math.PI * 2 * CLIFF_BASE_RADIUS;

    for (let vertical = 0; vertical <= verticalSegments; vertical++) {
      const heightFraction = vertical / verticalSegments;
      for (let segment = 0; segment <= CLIFF_SEGMENTS; segment++) {
        const angle = (segment / CLIFF_SEGMENTS) * Math.PI * 2;
        const broadBump = Math.sin(angle * 7 + 0.8) * 12
          + Math.sin(angle * 13 - 1.4) * 6
          + Math.sin(angle * 29 + 0.5) * 2.5;
        const rockyFace = Math.sin(angle * 19 + heightFraction * 8) * 3
          + Math.sin(angle * 37 - heightFraction * 13) * 1.4;
        const radius = CLIFF_BASE_RADIUS + heightFraction * 19
          + broadBump * (0.7 + heightFraction * 0.3)
          + rockyFace * Math.sin(heightFraction * Math.PI);
        const height = heightFraction * (
          CLIFF_HEIGHT
          + Math.sin(angle * 5 + 0.6) * 13
          + Math.sin(angle * 11 - 0.9) * 7
          + Math.sin(angle * 23) * 3
        );
        positions.push(Math.cos(angle) * radius, height - 4, Math.sin(angle) * radius);
        uvs.push(
          segment / CLIFF_SEGMENTS * circumference / 12,
          heightFraction * CLIFF_HEIGHT / 10
        );
        if (vertical < verticalSegments && segment < CLIFF_SEGMENTS) {
          const index = vertical * (CLIFF_SEGMENTS + 1) + segment;
          indices.push(
            index, index + CLIFF_SEGMENTS + 1, index + 1,
            index + 1, index + CLIFF_SEGMENTS + 1, index + CLIFF_SEGMENTS + 2
          );
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const cliff = new THREE.Mesh(
      geometry,
      new THREE.MeshLambertMaterial({
        map: loadTiledTexture('./assets/textures/rock-cliff.png', 1, 1),
        side: THREE.DoubleSide,
      })
    );
    cliff.receiveShadow = settings.shadows;
    cliff.castShadow = settings.shadows;
    sceneObj.add(cliff);
    if (stadiumWalls) addCliffCollisions(stadiumWalls);
  }

  function addCliffCollisions(stadiumWalls) {
    const collisionRadius = CLIFF_BASE_RADIUS - 17;
    const halfLength = (2 * Math.PI * collisionRadius / CLIFF_COLLISION_SEGMENTS) / 2 + 0.4;
    for (let segment = 0; segment < CLIFF_COLLISION_SEGMENTS; segment++) {
      const angle = (segment + 0.5) / CLIFF_COLLISION_SEGMENTS * Math.PI * 2;
      stadiumWalls.push({
        cx: Math.cos(angle) * collisionRadius,
        cz: Math.sin(angle) * collisionRadius,
        cosA: -Math.sin(angle),
        sinA: Math.cos(angle),
        halfW: halfLength,
        halfD: 8,
      });
    }
  }

  function buildRiver(sceneObj) {
    const segments = 320;
    const vertices = [];
    const uvs = [];
    const indices = [];
    for (let index = 0; index <= segments; index++) {
      const x = -TERRAIN_SIZE / 2 + (index / segments) * TERRAIN_SIZE;
      const centerZ = 3 * Math.sin(x * 0.009);
      const leftZ = centerZ - RIVER_WIDTH / 2;
      const rightZ = centerZ + RIVER_WIDTH / 2;
      vertices.push(x, RIVER_WATER_LEVEL, leftZ, x, RIVER_WATER_LEVEL, rightZ);
      const distance = (index / segments) * TERRAIN_SIZE;
      uvs.push(distance / 8, 0, distance / 8, RIVER_WIDTH / 8);
      if (index < segments) {
        const base = index * 2;
        indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    if (!riverTexture) riverTexture = loadTiledTexture('./assets/textures/water.png', 1, 1);
    const water = new THREE.Mesh(
      geometry,
      new THREE.MeshLambertMaterial({
        map: riverTexture,
        side: THREE.DoubleSide,
      })
    );
    water.receiveShadow = false;
    sceneObj.add(water);
  }

  function buildRoad(sceneObj, settings) {
    const positions = [];
    const uvs = [];
    const indices = [];
    const halfWidth = TRACK_WIDTH / 2;
    const trackLength = TRACK_LENGTH;

    for (let index = 0; index <= ROAD_SAMPLES; index++) {
      const t = index / ROAD_SAMPLES;
      const point = TRACK_CURVE.getPointAt(t);
      const tangent = TRACK_CURVE.getTangentAt(t).normalize();
      const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x);
      const left = point.clone().addScaledVector(perpendicular, -halfWidth);
      const right = point.clone().addScaledVector(perpendicular, halfWidth);
      positions.push(left.x, left.y + 0.045, left.z, right.x, right.y + 0.045, right.z);
      const distance = t * trackLength;
      uvs.push(0, distance / 6, TRACK_WIDTH / 6, distance / 6);
      if (index < ROAD_SAMPLES) {
        const midpointT = (index + 0.5) / ROAD_SAMPLES;
        const underBridge = BRIDGE_CENTER_ARC_U.some(bridgeU => {
          const progress = (midpointT - bridgeU + 1) % 1;
          const distanceFromBridge = Math.min(progress, 1 - progress) * trackLength;
          return distanceFromBridge < ROAD_CUT_HALF_LENGTH;
        });
        if (underBridge) continue;
        const base = index * 2;
        indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const road = new THREE.Mesh(
      geometry,
      new THREE.MeshLambertMaterial({
        map: loadTiledTexture('./assets/textures/dirt-road.png', 1, 1),
        side: THREE.DoubleSide,
      })
    );
    road.receiveShadow = settings.shadows;
    sceneObj.add(road);
  }

  function buildBridge(sceneObj, settings, t, stadiumWalls) {
    const wood = new THREE.MeshLambertMaterial({ color: 0x80552f });
    const railWood = new THREE.MeshLambertMaterial({ color: 0x59391f });
    const bridge = new THREE.Group();
    const plankCount = BRIDGE_PLANK_COUNT;
    const plankSpacing = BRIDGE_PLANK_SPACING;
    const trackLength = TRACK_LENGTH;
    const bridgeU = arcFractionAtParameter(t);
    const sideVectorAt = tangent => new THREE.Vector3(-tangent.z, 0, tangent.x);
    const trackPointAtOffset = distance =>
      TRACK_CURVE.getPointAt((bridgeU + distance / trackLength + 1) % 1);
    const trackTangentAtOffset = distance =>
      TRACK_CURVE.getTangentAt((bridgeU + distance / trackLength + 1) % 1).normalize();

    for (let index = 0; index < plankCount; index++) {
      const distance = (index - (plankCount - 1) / 2) * plankSpacing;
      const point = trackPointAtOffset(distance);
      const tangent = trackTangentAtOffset(distance);
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(TRACK_WIDTH, 0.22, plankSpacing + 0.8),
        wood
      );
      plank.position.set(point.x, point.y - 0.06, point.z);
      plank.rotation.set(
        -Math.asin(Math.max(-1, Math.min(1, tangent.y))),
        Math.atan2(tangent.x, tangent.z),
        0
      );
      plank.castShadow = settings.shadows;
      plank.receiveShadow = settings.shadows;
      bridge.add(plank);
    }

    for (const side of [-1, 1]) {
      const railOffset = side * (TRACK_WIDTH / 2 - 0.3);
      for (let index = 0; index < plankCount; index += 3) {
        const distance = (index - (plankCount - 1) / 2) * plankSpacing;
        const point = trackPointAtOffset(distance);
        const tangent = trackTangentAtOffset(distance);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.2, 0.32), railWood);
        post.position.copy(point).addScaledVector(sideVectorAt(tangent), railOffset);
        post.position.y += 0.65;
        post.rotation.y = Math.atan2(tangent.x, tangent.z);
        post.castShadow = settings.shadows;
        bridge.add(post);
      }

      for (let index = 0; index < plankCount; index++) {
        const distance = (index - (plankCount - 1) / 2) * plankSpacing;
        const point = trackPointAtOffset(distance);
        const tangent = trackTangentAtOffset(distance);
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.34, 0.32, plankSpacing + 0.08),
          railWood
        );
        rail.position.copy(point).addScaledVector(sideVectorAt(tangent), railOffset);
        rail.position.y += 1.34;
        rail.rotation.set(
          -Math.asin(Math.max(-1, Math.min(1, tangent.y))),
          Math.atan2(tangent.x, tangent.z),
          0
        );
        rail.castShadow = settings.shadows;
        bridge.add(rail);

        if (stadiumWalls) {
          const railCenter = point.clone().addScaledVector(sideVectorAt(tangent), railOffset);
          stadiumWalls.push({
            cx: railCenter.x,
            cz: railCenter.z,
            cosA: tangent.x,
            sinA: tangent.z,
            halfW: (plankSpacing + 0.08) / 2,
            halfD: 0.42,
          });
        }
      }
    }
    sceneObj.add(bridge);
  }

  function makeJungleTree(settings, height, leafMaterials, trunkMaterial) {
    const tree = new THREE.Group();
    const trunkHeight = height * 0.62;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.7, trunkHeight, 7),
      trunkMaterial
    );
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = settings.shadows;
    tree.add(trunk);

    const crownY = trunkHeight + height * 0.02;
    for (let cluster = 0; cluster < 4; cluster++) {
      const canopy = new THREE.Mesh(
        new THREE.IcosahedronGeometry(height * (cluster === 0 ? 0.24 : 0.21), 1),
        leafMaterials[cluster % leafMaterials.length]
      );
      const angle = cluster * Math.PI / 2 + 0.3;
      canopy.position.set(
        Math.cos(angle) * height * 0.14,
        crownY + (cluster === 0 ? height * 0.13 : 0),
        Math.sin(angle) * height * 0.14
      );
      canopy.castShadow = settings.shadows;
      tree.add(canopy);
    }
    return tree;
  }

  function distanceToTrack(x, z) {
    let nearest = Infinity;
    for (let index = 0; index < TRACK_WAYPOINTS.length; index += 2) {
      const point = TRACK_WAYPOINTS[index];
      nearest = Math.min(nearest, Math.hypot(x - point.x, z - point.z));
    }
    return nearest;
  }

  function scatterJungleTrees(sceneObj, settings, stadiumWalls) {
    const placed = [];
    const leafMaterials = [
      new THREE.MeshLambertMaterial({ color: 0x176b36 }),
      new THREE.MeshLambertMaterial({ color: 0x248a3d }),
      new THREE.MeshLambertMaterial({ color: 0x3c9e45 }),
    ];
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x60452d });
    let seed = 0x71A6E3;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 0x100000000;
    };

    const boulders = scatterBoulders(sceneObj, settings, random, stadiumWalls);
    for (let treeIndex = 0; treeIndex < 250; treeIndex++) {
      for (let attempt = 0; attempt < 180; attempt++) {
        const x = (random() - 0.5) * 850;
        const z = (random() - 0.5) * 850;
        const trackDistance = distanceToTrack(x, z);
        if (trackDistance < 17 || trackDistance > 115 || Math.abs(z) < 18) continue;
        if (placed.some(([placedX, placedZ]) => Math.hypot(x - placedX, z - placedZ) < 12)) continue;
        if (boulders.some(({ x: rockX, z: rockZ, radius }) =>
          Math.hypot(x - rockX, z - rockZ) < radius + 7
        )) continue;

        const tree = makeJungleTree(settings, 10 + random() * 9, leafMaterials, trunkMaterial);
        tree.position.set(x, terrainHeightAt(x, z), z);
        tree.rotation.y = random() * Math.PI * 2;
        const scale = 0.8 + random() * 0.55;
        tree.scale.setScalar(scale);
        sceneObj.add(tree);
        placed.push([x, z]);
        break;
      }
    }
  }

  function scatterBoulders(sceneObj, settings, random, stadiumWalls) {
    const placed = [];
    const boulderTexture = loadTiledTexture('./assets/textures/boulder.png', 2, 2);
    const boulderMaterial = new THREE.MeshLambertMaterial({ map: boulderTexture });
    const geometry = new THREE.IcosahedronGeometry(1, 1);

    for (let index = 0; index < 68; index++) {
      for (let attempt = 0; attempt < 140; attempt++) {
        const x = (random() - 0.5) * 820;
        const z = (random() - 0.5) * 820;
        const trackDistance = distanceToTrack(x, z);
        if (trackDistance < 15 || trackDistance > 68 || Math.abs(z) < 18) continue;

        const scaleX = 2.4 + random() * 5.2;
        const scaleY = 1.8 + random() * 3.8;
        const scaleZ = 2.2 + random() * 4.8;
        const radius = Math.max(scaleX, scaleZ) * 0.9;
        if (placed.some(rock =>
          Math.hypot(x - rock.x, z - rock.z) < radius + rock.radius + 3
        )) continue;

        const rock = new THREE.Mesh(geometry, boulderMaterial);
        rock.position.set(x, terrainHeightAt(x, z) + scaleY * 0.36, z);
        rock.scale.set(scaleX, scaleY, scaleZ);
        rock.rotation.set(
          (random() - 0.5) * 0.3,
          random() * Math.PI * 2,
          (random() - 0.5) * 0.3
        );
        rock.castShadow = settings.shadows;
        rock.receiveShadow = settings.shadows;
        sceneObj.add(rock);
        placed.push({ x, z, radius });
        if (stadiumWalls) {
          stadiumWalls.push({
            cx: x,
            cz: z,
            cosA: Math.cos(rock.rotation.y),
            sinA: Math.sin(rock.rotation.y),
            halfW: scaleX * 0.82,
            halfD: scaleZ * 0.82,
          });
        }
        break;
      }
    }

    return placed;
  }

  function buildFinishLine(sceneObj, settings) {
    const origin = TRACK_CURVE.getPoint(0);
    const tangent = TRACK_CURVE.getTangent(0).normalize();
    const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x);
    const tileWidth = TRACK_WIDTH / 12;
    const materials = [
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
      new THREE.MeshLambertMaterial({ color: 0x161616 }),
    ];
    for (let column = 0; column < 12; column++) {
      for (let row = 0; row < 2; row++) {
        const side = -TRACK_WIDTH / 2 + (column + 0.5) * tileWidth;
        const forward = (row - 0.5) * 1.2;
        const tile = new THREE.Mesh(
          new THREE.BoxGeometry(tileWidth, 0.045, 1.2),
          materials[(column + row) % 2]
        );
        const position = origin.clone()
          .addScaledVector(perpendicular, side)
          .addScaledVector(tangent, forward);
        tile.position.set(position.x, position.y + 0.09, position.z);
        tile.rotation.y = Math.atan2(tangent.x, tangent.z);
        tile.receiveShadow = settings.shadows;
        sceneObj.add(tile);
      }
    }
  }

  function isOnTrack(position) {
    let nearestDistanceSq = Infinity;
    for (const point of TRACK_WAYPOINTS) {
      const dx = position.x - point.x;
      const dz = position.z - point.z;
      nearestDistanceSq = Math.min(nearestDistanceSq, dx * dx + dz * dz);
    }
    return nearestDistanceSq < (TRACK_WIDTH / 2 + 3) ** 2;
  }

  function update(delta) {
    if (riverTexture) riverTexture.offset.x = (riverTexture.offset.x + delta * 0.035) % 1;
  }

  return {
    name: 'Jungle Tour',
    curve: TRACK_CURVE,
    samples: TRACK_SAMPLES,
    width: TRACK_WIDTH,
    surfaceHeight: 0,
    itemBoxHeightOffset: 1.05,
    waypoints: TRACK_WAYPOINTS,
    totalLaps: 3,
    checkpointCount: 28,
    itemBoxOffsets: ITEM_BOX_T_OFFSETS,
    buildScene,
    update,
    isOnTrack,
  };
})();
