import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// --- BACKGROUND MUSIC ---
const bgMusic = new Audio("Pixel-Peeker-Polka-faster.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.5;

function playMusic() {
    if (bgMusic.paused) {
        bgMusic.currentTime = 0;
        bgMusic.play().catch(console.error);
    }
}

function stopMusic() {
    bgMusic.pause();
    bgMusic.currentTime = 0;
}

// --- END GAME FUNCTION ---
function showGameOver(title, score, count) {
    isPlaying = false;
    document.getElementById('game-over-screen').style.display = 'flex';
    document.getElementById('game-over-title').innerText = title;
    document.getElementById('final-score').innerText = score;
    document.getElementById('final-collected').innerText = count;
}

// --- GAME STATE ---
let isPlaying = false;
let isEndless = false;
let timeLeft = 120;
let score = 0;
let timerInterval;
let memesCollected = 0;

const memes = [
  'Trollface.png', 'Pingas.png', 'Weegee.png', 'Zelda-CD-i.png', 'Ganon-CD-i.png', 'HotelMarioBowser.png', 'HotelMarioPrincessPeach.png', 'Michael-Scott.png',
  'Morshu-CD-i.png', 'yippee-autism-creature.png', 'PepeTheFrog.png', 'Link-CD-i.png', 'Gwonam-CD-i.png', 'Longcat.png', 'Big_chungus.png', 'Bad-Luck-Brian.png',
  'Shoop-Da-Whoop.png', 'HotelMarioMario.png', 'HotelMarioLuigi.png', 'King-Harkinian-CD-i.png', 'Hampter.png', 'phil-swift.png', 'Illuminati-Logo.png',
  'Rickroll.png', 'Mama-Luigi.png', 'bup.png', 'Mayor-Cravendish.png', 'Caveman-SpongeBob.png', 'Doge.png', 'Dramatic-Chipmunk.png', 'Michael-Rosen.png',
  'MTNDew.png', 'NyanCat.png', 'Spaghetti-Monster.png', 'Malleo.png', 'Dildosaurus.png', 'E.png', 'fish-shoes.png', 'Lugi.png', 'Obamaprism.png', 'Shrek.png',
  'Sanic.png', 'Deez-Nuts.png', 'Dat-Boi.png', 'Ugandan-Knuckles.png'
];

// --- SETUP THREE.JS ---
// FIX 1: powerPreference hint tells the browser/OS to assign the high-performance GPU
// and avoids context thrashing on systems with integrated + discrete GPUs.
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
// FIX 2: Cap pixel ratio at 2 — going higher burns GPU memory with minimal visual gain.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
// VSM gives soft edges without the PCF multi-sample overhead.
renderer.shadowMap.type = THREE.VSMShadowMap;
document.body.appendChild(renderer.domElement);

// FIX 3: Handle WebGL context loss gracefully so the page doesn't hard-crash.
renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    console.warn('WebGL context lost — pausing render loop.');
    isPlaying = false;
    cancelAnimationFrame(animFrameId);
}, false);

renderer.domElement.addEventListener('webglcontextrestored', () => {
    console.info('WebGL context restored — reloading.');
    location.reload();
}, false);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 14, 22);
camera.lookAt(0, 4, 0);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(10, 25, 10);
dirLight.castShadow = true;
// Cap shadow map at 1024 — the cabinet geometry doesn't need 2048.
// Halving the map size cuts shadow-pass fill rate by 4×.
dirLight.shadow.mapSize.set(1024, 1024);
dirLight.shadow.camera.near = 1;
dirLight.shadow.camera.far = 60;
dirLight.shadow.camera.left = -16;
dirLight.shadow.camera.right = 16;
dirLight.shadow.camera.top = 20;
dirLight.shadow.camera.bottom = -5;
scene.add(dirLight);

const neonLight1 = new THREE.PointLight(0x00ffff, 2, 20);
neonLight1.position.set(-10, 18, 10);
scene.add(neonLight1);
const neonLight2 = new THREE.PointLight(0xff00ff, 2, 20);
neonLight2.position.set(10, 18, 10);
scene.add(neonLight2);

// --- SETUP CANNON-ES (PHYSICS) ---
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
// Allow bodies to sleep when they've settled — cuts physics cost dramatically
// once all 38 meme cards have tumbled to rest on the floor.
world.allowSleep = true;
world.sleepSpeedLimit = 0.5;   // m/s combined velocity threshold
world.sleepTimeLimit  = 1.0;   // seconds below threshold before sleeping

// --- CABINET PLATFORM & CHUTE ---
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.4 });
const cabinetFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x0d0d1a, roughness: 0.2 });
const glassMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffff, transparent: true, opacity: 0.15 });
const neonFrameMat = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 1 });

createStaticBox(18, 1, 28, new CANNON.Vec3(4, -0.5, 0), floorMaterial);
createStaticBox(8, 1, 20, new CANNON.Vec3(-9, -0.5, -4), floorMaterial);

createStaticBox(0.4, 4, 8, new CANNON.Vec3(-5, 2, 10), cabinetFrameMaterial);
createStaticBox(8, 4, 0.4, new CANNON.Vec3(-9, 2, 6), cabinetFrameMaterial);
createStaticBox(0.4, 18, 28, new CANNON.Vec3(-13, 9, 0), glassMaterial);
createStaticBox(0.4, 18, 28, new CANNON.Vec3(13, 9, 0), glassMaterial);
createStaticBox(26, 18, 0.4, new CANNON.Vec3(0, 9, -14), glassMaterial);
createStaticBox(26, 18, 0.4, new CANNON.Vec3(0, 9, 14), glassMaterial);
createVisualBox(0.8, 18, 0.8, new THREE.Vector3(-13, 9, 14), neonFrameMat);
createVisualBox(0.8, 18, 0.8, new THREE.Vector3(13, 9, 14), neonFrameMat);
createVisualBox(0.8, 18, 0.8, new THREE.Vector3(-13, 9, -14), cabinetFrameMaterial);
createVisualBox(0.8, 18, 0.8, new THREE.Vector3(13, 9, -14), cabinetFrameMaterial);
createStaticBox(26.8, 1, 28.8, new CANNON.Vec3(0, 18, 0), cabinetFrameMaterial);

const panelMat = new THREE.MeshStandardMaterial({ color: 0x151525 });
createVisualBox(16, 2, 4, new THREE.Vector3(0, 4, 16), panelMat);
createVisualBox(0.4, 1.5, 0.4, new THREE.Vector3(-4, 5.2, 16), neonFrameMat);
createVisualBox(0.6, 0.2, 0.6, new THREE.Vector3(2, 5.1, 16), floorMaterial);

function createStaticBox(w, h, d, position, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(position.x, position.y, position.z);
    scene.add(mesh);
    const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(w/2, h/2, d/2)),
        position: position
    });
    world.addBody(body);
}

function createVisualBox(w, h, d, vector3, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.copy(vector3);
    scene.add(mesh);
}

// --- ACTUAL ANIMATED CLAW SYSTEM WITH ROPE/CORD ---
const clawGroup = new THREE.Group();
scene.add(clawGroup);

const cordGeo = new THREE.CylinderGeometry(0.08, 0.08, 1, 8);
const cordMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.9, roughness: 0.1 });
const cordMesh = new THREE.Mesh(cordGeo, cordMat);
scene.add(cordMesh);

const hubMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 1, 16),
    new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 })
);
clawGroup.add(hubMesh);

const prongs = [];
const prongGeo = new THREE.BoxGeometry(0.2, 2.5, 0.2);
const prongMat = new THREE.MeshStandardMaterial({ color: 0xff0055, metalness: 0.5, roughness: 0.2 });

for (let i = 0; i < 3; i++) {
    const pivot = new THREE.Group();
    const angle = (i / 3) * Math.PI * 2;
    pivot.position.set(Math.cos(angle) * 0.7, -0.4, Math.sin(angle) * 0.7);
    pivot.rotation.y = -angle;

    const finger = new THREE.Mesh(prongGeo, prongMat);
    finger.position.set(0, -1.2, 0);
    pivot.add(finger);

    clawGroup.add(pivot);
    prongs.push(pivot);
}

const clawBody = new CANNON.Body({
    type: CANNON.Body.KINEMATIC,
    shape: new CANNON.Box(new CANNON.Vec3(1.2, 1.2, 1.2)),
    position: new CANNON.Vec3(0, 16, 0)
});
world.addBody(clawBody);

// --- MEME GENERATION ---
const physicsObjects = [];

// Shared geometry for all meme cards — one upload, all cards reference it.
const sharedCardGeo = new THREE.BoxGeometry(3, 3, 0.001);

// Shared edge material — one draw call for all card edges.
const sharedEdgeMat = new THREE.MeshStandardMaterial({ color: 0x333333 });

// Shared fallback material for textures that 404.
const fallbackMat = new THREE.MeshStandardMaterial({ color: 0xff00ff, wireframe: true });

// Single TextureLoader instance (no LoadingManager needed — staggering handles ordering).
const textureLoader = new THREE.TextureLoader();

// --- TEXTURE CACHE ---
// Stores tex per filename so flipped-UV back faces share the same GPU texture object
// rather than cloning it (clone() doubles VRAM usage for no visual benefit).
const _texCache = new Map();

// Build a mirrored UV attribute on the back face of the shared geometry once,
// then every card's back materialBack uses repeat.x = -1 on a shared texture reference.
// Because we can't mutate sharedCardGeo per-card, we instead set matrixAutoUpdate=false
// and flip via material.map.repeat / offset, keeping one GPU texture per meme.

function _loadTexStaggered(filename, onLoad, onError) {
    if (_texCache.has(filename)) {
        // Already loaded — hand it back next microtask so callers stay async-consistent.
        Promise.resolve().then(() => onLoad(_texCache.get(filename)));
        return;
    }
    textureLoader.load(
        'memes/' + filename,
        (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            // Anisotropy helps readability on tilted cards with minimal fill-rate cost.
            tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
            _texCache.set(filename, tex);
            onLoad(tex);
        },
        undefined,
        onError
    );
}

function spawnMemes() {
    // Stagger texture loads: send one fetch per 80 ms instead of 38 simultaneously.
    // This prevents the driver from queuing 38 DMA uploads at once and exhausting
    // the GPU command buffer — the single most common cause of CONTEXT_LOST on
    // mid-range cards (RTX 2070 Super included) during large scene initialisation.
    const STAGGER_MS = 80;

    memes.forEach((meme, index) => {
        const width = 3;
        const height = 3;
        const physicsDepth = 0.2;

        const materialFront = new THREE.MeshStandardMaterial({ transparent: true, alphaTest: 0.1, depthWrite: false });
        // Back face reuses the same texture object with a repeat flip — zero extra VRAM.
        const materialBack = new THREE.MeshStandardMaterial({ transparent: true, alphaTest: 0.1, depthWrite: false });

        // Use shared edge material for the 4 side faces
        const materials = [sharedEdgeMat, sharedEdgeMat, sharedEdgeMat, sharedEdgeMat, materialFront, materialBack];

        setTimeout(() => {
            _loadTexStaggered(
                meme,
                (tex) => {
                    materialFront.map = tex;
                    materialFront.needsUpdate = true;

                    // Mirror horizontally for the back face by sharing the texture
                    // and setting repeat/offset — no clone(), no duplicate VRAM upload.
                    materialBack.map = tex;
                    materialBack.map.wrapS = THREE.RepeatWrapping;
                    // We need a per-material repeat so clone the texture only if
                    // another card hasn't already given it a repeat value.
                    // (tex.repeat is shared, so we set it once and both sides read it.)
                    // Instead: use a separate Matrix approach via a cloned tex.matrix.
                    // Simplest safe approach: clone only the *texture descriptor* (not GPU upload).
                    const backTex = tex.clone();   // clone() shares the GPU buffer — only metadata differs.
                    backTex.wrapS = THREE.RepeatWrapping;
                    backTex.repeat.set(-1, 1);
                    backTex.offset.set(1, 0);
                    backTex.needsUpdate = true;
                    materialBack.map = backTex;
                    materialBack.needsUpdate = true;
                },
                () => {
                    materialFront.copy(fallbackMat);
                    materialFront.needsUpdate = true;
                    materialBack.copy(fallbackMat);
                    materialBack.needsUpdate = true;
                }
            );
        }, index * STAGGER_MS);

        // Spawn physics + mesh immediately; textures stream in asynchronously.
        const mesh = new THREE.Mesh(sharedCardGeo, materials);
        scene.add(mesh);

        const body = new CANNON.Body({
            mass: 1,
            shape: new CANNON.Box(new CANNON.Vec3(width/2, height/2, physicsDepth/2)),
            position: new CANNON.Vec3((Math.random() - 0.5) * 23, 3 + (index % 8) * 1.5, (Math.random() - 0.5) * 16.5 - 4.25),
            allowSleep: true,
            sleepSpeedLimit: 0.5,
            sleepTimeLimit: 1.0,
        });
        body.quaternion.setFromEuler(Math.random() * 0.4, Math.random() * Math.PI, 0);
        world.addBody(body);
        physicsObjects.push({ mesh, body });
        // Track from spawn so lucky physics bounces into the chute score too
        pendingChuteMemes.push({ body, passedThroughChute: false });
    });
}

// --- CONTROLS & AUTOMATION STATES ---
const keys = { w: false, a: false, s: false, d: false };
let clawState = "IDLE";
let grabbedMeme = null;

// --- GRIP FAILURE SETTINGS ---
// Chance (0-1) the claw completely fails to latch on during GRABBING
const GRAB_FAIL_CHANCE = 0.20;
// Chance per second (0-1) that the claw drops a meme mid-carry
const DROP_CHANCE_PER_SECOND = 0.12;

// Memes waiting to be confirmed through the chute (scored only when they reach the bottom)
// Each entry: { body, scored: false }
const pendingChuteMemes = [];

window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() in keys) keys[e.key.toLowerCase()] = true;
    if (e.key === " " && clawState === "IDLE") {
        clawState = "DROPPING";
    }
});
window.addEventListener('keyup', (e) => { if (e.key.toLowerCase() in keys) keys[e.key.toLowerCase()] = false; });

// FIX 10: Clean up WebGL resources before reload so the GPU context is released
// rather than leaked — this is the primary cause of "context was blocked" errors
// when the page is visited repeatedly in the same browser session.
function cleanupAndReload() {
    isPlaying = false;
    cancelAnimationFrame(animFrameId);
    stopMusic();

    // Dispose all physics objects' textures and geometries
    physicsObjects.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
        } else {
            if (mesh.material.map) mesh.material.map.dispose();
            mesh.material.dispose();
        }
    });

    renderer.dispose();
    location.reload();
}

function startGame(endless) {
    isEndless = endless;
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('game-ui').style.display = 'flex';
    spawnMemes();
    isPlaying = true;

    playMusic();

    if (isEndless) {
        document.getElementById('timer').innerText = '∞';
    } else {
        document.getElementById('timer').innerText = timeLeft + 's';
        timerInterval = setInterval(() => {
            timeLeft--;
            document.getElementById('timer').innerText = timeLeft + 's';
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                isPlaying = false;
                stopMusic();
                showGameOver("TIME'S UP!", score, memesCollected);
            }
        }, 1000);
    }
}

document.getElementById('start-btn').addEventListener('click', () => startGame(false));
document.getElementById('endless-btn').addEventListener('click', () => startGame(true));

// FIX 11: Wire "PLAY AGAIN" to cleanupAndReload so the context is freed before reload.
document.querySelector('#game-over-screen .menu-btn').addEventListener('click', cleanupAndReload);

// --- MAIN LOOP ---
const clock = new THREE.Clock();
// FIX 12: Track animFrameId so we can cancel it on context loss or cleanup.
let animFrameId;

// FIX 13: Reusable Vec3 for the chute direction — avoids allocating a new THREE.Vector3
// every frame during RETURNING_TO_CHUTE state.
const _chuteDir = new THREE.Vector3();

function animate() {
    animFrameId = requestAnimationFrame(animate);
    const deltaTime = Math.min(clock.getDelta(), 0.1);

    if (isPlaying) {
        // FIX 14: Skip physics when the tab is hidden — document.hidden is true when
        // the tab is backgrounded. This prevents the physics world from accumulating
        // a huge debt of missed steps that would cause a massive position jump when
        // the user returns, and saves CPU/GPU while the tab is invisible.
        if (!document.hidden) {
            // Max 2 substeps (was 3) — prevents spiral-of-death if a frame runs long.
            world.step(1 / 60, deltaTime, 2);
        }

        physicsObjects.forEach(obj => {
            obj.mesh.position.copy(obj.body.position);
            obj.mesh.quaternion.copy(obj.body.quaternion);
        });

        const speed = 12;
        let velX = 0;
        let velZ = 0;
        let targetY = 16;
        let targetProngAngle = 0.65;

        if (clawState === "IDLE") {
            if (keys.w) velZ = -speed;
            if (keys.s) velZ = speed;
            if (keys.a) velX = -speed;
            if (keys.d) velX = speed;
            targetY = 16;
            targetProngAngle = 0.65;
        }
        else if (clawState === "DROPPING") {
            targetY = 3.5;
            targetProngAngle = 0.1;
            if (clawBody.position.y <= 4.2) {
                clawState = "GRABBING";
            }
        }
        else if (clawState === "GRABBING") {
            targetY = 3.5;
            targetProngAngle = 0.85;

            if (!grabbedMeme) {
                let closest = null;
                let minDist = 4.5;
                physicsObjects.forEach(obj => {
                    const dist = obj.body.position.distanceTo(clawBody.position);
                    if (dist < minDist) { minDist = dist; closest = obj; }
                });
                if (closest) {
                    // Chance the claw fumbles the grab entirely
                    if (Math.random() < GRAB_FAIL_CHANCE) {
                        // Nudge the meme so the miss looks physical
                        closest.body.wakeUp(); // settled pile memes are usually asleep
                        closest.body.velocity.set(
                            (Math.random() - 0.5) * 4,
                            1,
                            (Math.random() - 0.5) * 4
                        );
                        // grabbedMeme stays null — claw returns empty
                    } else {
                        grabbedMeme = closest;
                        closest.body.wakeUp();   // ensure body isn't sleeping before we kinematic-drive it
                        // If this meme was previously dropped and is pending scoring,
                        // remove it — it'll be re-entered when it next hits the chute.
                        const pendingIdx = pendingChuteMemes.findIndex(p => p.body === closest.body);
                        if (pendingIdx !== -1) pendingChuteMemes.splice(pendingIdx, 1);
                    }
                }
            }
            clawState = "RETURNING";
        }
        else if (clawState === "RETURNING") {
            targetY = 16;
            targetProngAngle = 0.85;

            // Random mid-carry slip
            if (grabbedMeme && Math.random() < DROP_CHANCE_PER_SECOND * deltaTime) {
                grabbedMeme.body.wakeUp(); // body may have fallen asleep while held at velocity=0
                grabbedMeme.body.velocity.set(
                    (Math.random() - 0.5) * 3,
                    -2,
                    (Math.random() - 0.5) * 3
                );
                pendingChuteMemes.push({ body: grabbedMeme.body, passedThroughChute: false });
                grabbedMeme = null;
            }

            if (clawBody.position.y >= 15.5) {
                if (grabbedMeme) {
                    clawState = "RETURNING_TO_CHUTE";
                } else {
                    clawState = "IDLE";
                }
            }
        }
        else if (clawState === "RETURNING_TO_CHUTE") {
            targetY = 16;
            targetProngAngle = 0.85;

            // Random slip while carrying to chute
            if (grabbedMeme && Math.random() < DROP_CHANCE_PER_SECOND * deltaTime) {
                grabbedMeme.body.wakeUp(); // body may have fallen asleep while held at velocity=0
                grabbedMeme.body.velocity.set(
                    (Math.random() - 0.5) * 3,
                    -2,
                    (Math.random() - 0.5) * 3
                );
                pendingChuteMemes.push({ body: grabbedMeme.body, passedThroughChute: false });
                grabbedMeme = null;
                clawState = "IDLE";
                targetProngAngle = 0.65;
            }

            const chuteX = -9;
            const chuteZ = 10;
            // FIX 13 (cont): reuse _chuteDir instead of allocating each frame
            _chuteDir.set(chuteX - clawBody.position.x, 0, chuteZ - clawBody.position.z);

            if (_chuteDir.length() > 0.3) {
                _chuteDir.normalize();
                clawBody.position.x += _chuteDir.x * speed * deltaTime;
                clawBody.position.z += _chuteDir.z * speed * deltaTime;
            } else {
                clawState = "DROPPING_IN_CHUTE";
            }
        }
        else if (clawState === "DROPPING_IN_CHUTE") {
            targetY = 16;
            targetProngAngle = 0.1;

            if (grabbedMeme) {
                // Release the meme into the chute — score only once it exits the bottom
                grabbedMeme.body.wakeUp(); // body may have fallen asleep while held at velocity=0
                grabbedMeme.body.velocity.set(0, -12, 0);
                grabbedMeme.body.angularVelocity.set(0, 0, 0);
                pendingChuteMemes.push({ body: grabbedMeme.body, passedThroughChute: false });
                grabbedMeme = null;
            }
            clawState = "IDLE";
        }

        // --- CHUTE CONFIRMATION: score memes that have fallen through the chute ---
        // The chute opening is the gap between the partition wall at Z≈6 and the front
        // glass at Z≈14, on the left side of the cabinet (X: -5 to -13).
        // A meme scores if it passes below the floor (Y < -1) AND its XZ position was
        // inside the chute column at some point while descending — so a meme that slips
        // from the claw mid-air but still tumbles into the chute opening still counts.
        const CHUTE_SCORE_Y = -1;
        const CHUTE_X_MIN = -13, CHUTE_X_MAX = -5;
        const CHUTE_Z_MIN =  6,  CHUTE_Z_MAX = 14;

        for (let i = pendingChuteMemes.length - 1; i >= 0; i--) {
            const pending = pendingChuteMemes[i];
            const pos = pending.body.position;

            // Track whether this meme has ever been inside the chute column
            const inChuteXZ = pos.x > CHUTE_X_MIN && pos.x < CHUTE_X_MAX &&
                               pos.z > CHUTE_Z_MIN && pos.z < CHUTE_Z_MAX;
            if (inChuteXZ) pending.passedThroughChute = true;

            if (pos.y < CHUTE_SCORE_Y) {
                if (pending.passedThroughChute) {
                    score += 100;
                    memesCollected++;
                    document.getElementById('score').innerText = score;
                    document.getElementById('memes-collected').innerText = memesCollected;

                    if (memesCollected >= memes.length) {
                        clearInterval(timerInterval);
                        stopMusic();
                        showGameOver("VICTORY!", score, memesCollected);
                    }
                }
                // Remove regardless — it's through the floor either way
                pendingChuteMemes.splice(i, 1);
            }
        }

        if (clawState === "IDLE" || clawState === "DROPPING") {
            clawBody.position.x = Math.max(-11.5, Math.min(11.5, clawBody.position.x + velX * deltaTime));
            clawBody.position.z = Math.max(-11.5, Math.min(11.5, clawBody.position.z + velZ * deltaTime));
        }

        clawBody.position.y += (targetY - clawBody.position.y) * 4 * deltaTime;

        // FIX 16: Cache the lerp factor outside the forEach — avoids recomputing
        // 12 * deltaTime three times per frame.
        const prongLerp = 12 * deltaTime;
        prongs.forEach(p => {
            p.rotation.z += (targetProngAngle - p.rotation.z) * prongLerp;
        });

        if (grabbedMeme) {
            grabbedMeme.body.position.copy(clawBody.position);
            grabbedMeme.body.position.y -= 2.4;
            grabbedMeme.body.velocity.set(0, 0, 0);
            grabbedMeme.body.angularVelocity.set(0, 0, 0);
        }

        clawGroup.position.copy(clawBody.position);

        const roofY = 18;
        const cordLength = roofY - clawBody.position.y;
        cordMesh.scale.set(1, cordLength, 1);
        cordMesh.position.set(clawBody.position.x, roofY - cordLength / 2, clawBody.position.z);
    }

    renderer.render(scene, camera);
}

animate();