const TwistyTunnels = (() => {
  const CONTROL_COUNT = 24;
  const CONTROL_POINTS = Array.from({ length: CONTROL_COUNT }, (_, index) => {
    const angle = (index / CONTROL_COUNT) * Math.PI * 2;
    const radius = 155 + 22 * Math.cos(angle * 3 + 0.2) + 10 * Math.sin(angle * 5);
    const height = 0.45 * Math.sin(angle * 2) + 0.18 * Math.sin(angle * 7);
    return new THREE.Vector3(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
  });

  const TRACK_CURVE = new THREE.CatmullRomCurve3(CONTROL_POINTS, true, 'catmullrom', 0.5);
  const TRACK_SAMPLES = 320;
  const TRACK_WIDTH = 14;
  const TUNNEL_HALF_WIDTH = 14;
  const TRACK_WAYPOINTS = TRACK_CURVE.getPoints(TRACK_SAMPLES);
  const TOTAL_LAPS = 3;
  const CHECKPOINT_COUNT = 28;
  const ITEM_BOX_T_OFFSETS = Array.from({ length: 12 }, (_, index) => (index + 0.5) / 12);

  function buildScene(sceneObj, settings, stadiumWalls) {
    const tunnelDark = new THREE.Color(0x211b15);
    sceneObj.background = tunnelDark;
    sceneObj.fog = new THREE.Fog(tunnelDark, 300, 620);
    sceneObj.add(new THREE.AmbientLight(0xffd49a, 0.45));
    buildTunnelShell(sceneObj, settings);
    buildTrack(sceneObj, settings);
    buildTunnelLights(sceneObj, settings);
    buildFinishLine(sceneObj, settings);
    if (stadiumWalls) addTunnelCollisions(stadiumWalls);
    return sceneObj;
  }

  function loadTiledTexture(path) {
    const texture = new THREE.TextureLoader().load(path);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    return texture;
  }

  function buildTunnelShell(sceneObj, settings) {
    const section = [
      [-TUNNEL_HALF_WIDTH, 0],
      [-TUNNEL_HALF_WIDTH, 10],
      [-12, 12.5],
      [-8, 14.2],
      [-4, 15],
      [0, 15.2],
      [4, 15],
      [8, 14.2],
      [12, 12.5],
      [TUNNEL_HALF_WIDTH, 10],
      [TUNNEL_HALF_WIDTH, 0],
    ];
    const vertices = [];
    const uvs = [];
    const indices = [];
    const crossSectionDistances = [0];
    for (let j = 1; j < section.length; j++) {
      const [previousSide, previousHeight] = section[j - 1];
      const [side, height] = section[j];
      crossSectionDistances.push(
        crossSectionDistances[j - 1] + Math.hypot(side - previousSide, height - previousHeight)
      );
    }
    const tunnelTexture = loadTiledTexture('./assets/tunnel-concrete.png');

    for (let i = 0; i <= TRACK_SAMPLES; i++) {
      const t = i / TRACK_SAMPLES;
      const point = TRACK_CURVE.getPoint(t);
      const tangent = TRACK_CURVE.getTangent(t).normalize();
      const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x);
      for (let j = 0; j < section.length; j++) {
        const [side, height] = section[j];
        const vertex = point.clone().addScaledVector(perpendicular, side);
        vertices.push(vertex.x, point.y + height, vertex.z);
        uvs.push(
          crossSectionDistances[j] / 8,
          t * TRACK_CURVE.getLength() / 8
        );
      }
      if (i < TRACK_SAMPLES) {
        const ring = section.length;
        for (let j = 0; j < ring - 1; j++) {
          const a = i * ring + j;
          const b = a + ring;
          indices.push(a, a + 1, b, a + 1, b + 1, b);
        }
      }
    }

    const shellGeometry = new THREE.BufferGeometry();
    shellGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    shellGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    shellGeometry.setIndex(indices);
    shellGeometry.computeVertexNormals();
    const shell = new THREE.Mesh(shellGeometry, new THREE.MeshLambertMaterial({
      map: tunnelTexture,
      side: THREE.DoubleSide,
    }));
    shell.receiveShadow = settings.shadows;
    sceneObj.add(shell);

    sceneObj.add(buildSweptStrip(-TUNNEL_HALF_WIDTH, TUNNEL_HALF_WIDTH, -0.08, 0x39352e));
    const sidewalkTexture = loadTiledTexture('./assets/sidewalk.png');
    const sidewalkMaterial = new THREE.MeshLambertMaterial({
      map: sidewalkTexture,
      side: THREE.DoubleSide,
    });
    sceneObj.add(buildSweptStrip(
      -TUNNEL_HALF_WIDTH, -TRACK_WIDTH / 2, -0.025, sidewalkMaterial
    ));
    sceneObj.add(buildSweptStrip(
      TRACK_WIDTH / 2, TUNNEL_HALF_WIDTH, -0.025, sidewalkMaterial
    ));
  }

  function buildSweptStrip(leftOffset, rightOffset, heightOffset, materialOrColor) {
    const positions = [];
    const uvs = [];
    const indices = [];
    const stripWidth = Math.abs(rightOffset - leftOffset);
    const length = TRACK_CURVE.getLength();
    for (let i = 0; i <= TRACK_SAMPLES; i++) {
      const t = i / TRACK_SAMPLES;
      const point = TRACK_CURVE.getPoint(t);
      const tangent = TRACK_CURVE.getTangent(t).normalize();
      const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x);
      const left = point.clone().addScaledVector(perpendicular, leftOffset);
      const right = point.clone().addScaledVector(perpendicular, rightOffset);
      positions.push(left.x, point.y + heightOffset, left.z, right.x, point.y + heightOffset, right.z);
      uvs.push(0, t * length / 3, stripWidth / 3, t * length / 3);
      if (i < TRACK_SAMPLES) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const material = typeof materialOrColor === 'number'
      ? new THREE.MeshLambertMaterial({ color: materialOrColor, side: THREE.DoubleSide })
      : materialOrColor;
    return new THREE.Mesh(geometry, material);
  }

  function buildTrack(sceneObj, settings) {
    const road = buildSweptStrip(-TRACK_WIDTH / 2, TRACK_WIDTH / 2, 0.025, 0x343638);
    road.receiveShadow = settings.shadows;
    sceneObj.add(road);

    for (const side of [-1, 1]) {
      sceneObj.add(buildSweptStrip(
        side * (TRACK_WIDTH / 2 - 0.45),
        side * (TRACK_WIDTH / 2 - 0.1),
        0.045,
        0xe4bd52
      ));
    }

    const dashMaterial = new THREE.MeshLambertMaterial({ color: 0xf4d45c, emissive: 0x4c390a });
    for (let i = 0; i < TRACK_SAMPLES; i += 9) {
      const t = (i + 1) / TRACK_SAMPLES;
      const point = TRACK_CURVE.getPoint(t);
      const tangent = TRACK_CURVE.getTangent(t).normalize();
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 3.2), dashMaterial);
      dash.position.set(point.x, point.y + 0.07, point.z);
      dash.rotation.y = Math.atan2(tangent.x, tangent.z);
      sceneObj.add(dash);
    }
  }

  function buildTunnelLights(sceneObj, settings) {
    const fixtureMaterial = new THREE.MeshLambertMaterial({
      color: 0xffd77a,
      emissive: 0xffb93d,
      emissiveIntensity: 1.2,
    });
    const lightCount = 18;
    for (let i = 0; i < lightCount; i++) {
      const t = i / lightCount;
      const point = TRACK_CURVE.getPoint(t);
      const fixture = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 0.65), fixtureMaterial);
      fixture.position.set(point.x, point.y + 13.9, point.z);
      fixture.rotation.y = Math.atan2(
        TRACK_CURVE.getTangent(t).x,
        TRACK_CURVE.getTangent(t).z
      );
      sceneObj.add(fixture);

      const light = new THREE.PointLight(0xffca72, 2.1, 72, 2);
      light.position.set(point.x, point.y + 13.2, point.z);
      light.castShadow = settings.shadows && i % 6 === 0;
      if (light.castShadow) {
        light.shadow.mapSize.set(512, 512);
        light.shadow.camera.near = 1;
        light.shadow.camera.far = 72;
      }
      sceneObj.add(light);
    }
  }

  function buildFinishLine(sceneObj, settings) {
    const point = TRACK_CURVE.getPoint(0);
    const tangent = TRACK_CURVE.getTangent(0).normalize();
    const perpendicular = new THREE.Vector3(-tangent.z, 0, tangent.x);
    const tileCount = 14;
    const tileWidth = TRACK_WIDTH / tileCount;
    const materials = [
      new THREE.MeshLambertMaterial({ color: 0xf5f2e9 }),
      new THREE.MeshLambertMaterial({ color: 0x171717 }),
    ];
    for (let x = 0; x < tileCount; x++) {
      for (let z = 0; z < 2; z++) {
        const side = -TRACK_WIDTH / 2 + (x + 0.5) * tileWidth;
        const forward = (z - 0.5) * 1.3;
        const tile = new THREE.Mesh(
          new THREE.BoxGeometry(tileWidth, 0.045, 1.3),
          materials[(x + z) % 2]
        );
        const position = point.clone()
          .addScaledVector(perpendicular, side)
          .addScaledVector(tangent, forward);
        tile.position.set(position.x, position.y + 0.07, position.z);
        tile.rotation.y = Math.atan2(tangent.x, tangent.z);
        tile.receiveShadow = settings.shadows;
        sceneObj.add(tile);
      }
    }
  }

  function addTunnelCollisions(stadiumWalls) {
    const wallOffset = TUNNEL_HALF_WIDTH - 0.35;
    for (let i = 0; i < TRACK_SAMPLES; i += 2) {
      const t = i / TRACK_SAMPLES;
      const point = TRACK_CURVE.getPoint(t);
      const tangent = TRACK_CURVE.getTangent(t).normalize();
      const nextPoint = TRACK_CURVE.getPoint(Math.min(i + 2, TRACK_SAMPLES) / TRACK_SAMPLES);
      const halfLength = point.distanceTo(nextPoint) / 2 + 0.5;
      for (const side of [-1, 1]) {
        const center = point.clone().add(new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(side * wallOffset));
        stadiumWalls.push({
          cx: center.x,
          cz: center.z,
          cosA: tangent.x,
          sinA: tangent.z,
          halfW: halfLength,
          halfD: 0.65,
        });
      }
    }
  }

  function driveCinematic(player, state, delta, speedTarget, acceleration, friction) {
    if (typeof state.trackT !== 'number') state.trackT = closestTrackTRefined(player.kart.position);
    player.speed = Math.min(speedTarget, player.speed + acceleration * 0.7 * delta);
    player.speed *= Math.pow(1 - friction, delta);
    const lookaheadT = advanceTrackTByDistance(TRACK_CURVE, state.trackT, Math.max(8, player.speed * 0.65));
    const targetPoint = TRACK_CURVE.getPoint(lookaheadT);
    const targetAngle = Math.atan2(
      targetPoint.x - player.kart.position.x,
      targetPoint.z - player.kart.position.z
    );
    const angleError = Math.atan2(
      Math.sin(targetAngle - player.angle),
      Math.cos(targetAngle - player.angle)
    );
    const maxTurn = 2.6 * delta;
    player.angle += Math.max(-maxTurn, Math.min(maxTurn, angleError));
    player.kart.position.x += Math.sin(player.angle) * player.speed * delta;
    player.kart.position.z += Math.cos(player.angle) * player.speed * delta;

    state.trackT = closestTrackTRefined(player.kart.position);
    state.postFinishTrackT = state.trackT;

    const surfaceT = closestTrackTRefined(player.kart.position);
    const point = TRACK_CURVE.getPoint(surfaceT);
    const surfaceTangent = TRACK_CURVE.getTangent(surfaceT).normalize();
    player.kart.position.y = point.y + 0.85;
    player.kart.rotation.set(
      -Math.asin(Math.max(-1, Math.min(1, surfaceTangent.y))),
      player.angle,
      0
    );
    player.verticalVelocity = 0;
  }

  function getCinematicCamera(trackT) {
    const cameraT = advanceTrackTByDistance(TRACK_CURVE, trackT, -18);
    const targetT = advanceTrackTByDistance(TRACK_CURVE, trackT, 7);
    const cameraPoint = TRACK_CURVE.getPoint(cameraT);
    const targetPoint = TRACK_CURVE.getPoint(targetT);
    return {
      position: new THREE.Vector3(cameraPoint.x, cameraPoint.y + 7, cameraPoint.z),
      lookAt: new THREE.Vector3(targetPoint.x, targetPoint.y + 1.4, targetPoint.z),
    };
  }

  function isOnTrack(position) {
    let nearestDistanceSq = Infinity;
    for (let i = 0; i < TRACK_WAYPOINTS.length; i++) {
      const point = TRACK_WAYPOINTS[i];
      const dx = position.x - point.x;
      const dz = position.z - point.z;
      nearestDistanceSq = Math.min(nearestDistanceSq, dx * dx + dz * dz);
    }
    return nearestDistanceSq < (TRACK_WIDTH / 2 + 3) ** 2;
  }

  return {
    name: 'Twisty Tunnels',
    curve: TRACK_CURVE,
    samples: TRACK_SAMPLES,
    width: TRACK_WIDTH,
    surfaceHeight: 0,
    waypoints: TRACK_WAYPOINTS,
    totalLaps: TOTAL_LAPS,
    checkpointCount: CHECKPOINT_COUNT,
    itemBoxOffsets: ITEM_BOX_T_OFFSETS,
    audioEcho: true,
    buildScene,
    isOnTrack,
    driveCinematic,
    getCinematicCamera,
  };
})();
