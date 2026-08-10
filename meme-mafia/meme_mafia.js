/**
 * MEME MAFIA - Core Game Logic Engine
 */

// ==========================================
// 1. ASSET AND CHARACTER DATA DECLARATIONS
// ==========================================
const ASSETS_CONFIG = {
    // Easily scalable OG roster. Each has base HP and weapon allocations.
    memes: [
        { id: 'link', name: 'Underboss Link', img: 'assets/memes/OG-meme-family/link.png', hp: 120, maxHp: 120, weaponId: 'revolver' },
        { id: 'zelda', name: 'Mob Princess Zelda', img: 'assets/memes/OG-meme-family/zelda.png', hp: 115, maxHp: 115, weaponId: 'pistol' },
        { id: 'morshu', name: 'Consigliere Morshu', img: 'assets/memes/OG-meme-family/morshu.png', hp: 130, maxHp: 130, weaponId: 'shotgun' },
        { id: 'gwonam', name: 'Capo Gwonam', img: 'assets/memes/OG-meme-family/gwonam.png', hp: 105, maxHp: 105, weaponId: 'revolver' },
        { id: 'mario', name: 'Enforcer Mario', img: 'assets/memes/OG-meme-family/mario.png', hp: 110, maxHp: 110, weaponId: 'tommy' },
        { id: 'luigi', name: 'Street Muscle Luigi', img: 'assets/memes/OG-meme-family/luigi.png', hp: 110, maxHp: 110, weaponId: 'tommy' },
        { id: 'longcat', name: 'Racketeer Longcat', img: 'assets/memes/OG-meme-family/longcat.png', hp: 140, maxHp: 140, weaponId: 'tommy' },
        { id: 'trollface', name: 'Hitman Trollface', img: 'assets/memes/OG-meme-family/trollface.png', hp: 100, maxHp: 100, weaponId: 'rifle' },
        { id: 'weegee', name: 'Soul Collector Weegee', img: 'assets/memes/OG-meme-family/weegee.png', hp: 160, maxHp: 160, weaponId: 'shotgun' },
        { id: 'astley', name: 'Bagman Rick Astley', img: 'assets/memes/OG-meme-family/astley.png', hp: 115, maxHp: 115, weaponId: 'tommy' },
        { id: 'mudkip', name: 'Informant Mudkip', img: 'assets/memes/OG-meme-family/mudkip.png', hp: 105, maxHp: 105, weaponId: 'revolver' },
        { id: 'leeroy', name: 'Trigger-Happy Leeroy Jenkins', img: 'assets/memes/OG-meme-family/leeroy.png', hp: 175, maxHp: 175, weaponId: 'shotgun' },
        { id: 'shoop', name: 'Button Man Shoop Da Whoop', img: 'assets/memes/OG-meme-family/shoop.png', hp: 150, maxHp: 150, weaponId: 'rifle' },
        { id: 'chipmunk', name: 'Regulator Dramatic Chipmunk', img: 'assets/memes/OG-meme-family/chipmunk.png', hp: 120, maxHp: 120, weaponId: 'rifle' },
        { id: 'badluckbrian', name: 'Fall Guy Bad Luck Brian', img: 'assets/memes/OG-meme-family/brian.png', hp: 105, maxHp: 105, weaponId: 'pistol' }
    ],

    // Easily customizable Weapon metrics
    weapons: [
        { id: 'tommy', name: 'Tommy Gun', damage: 15, img: 'assets/guns/tommy.png' },
        { id: 'pistol', name: 'Colt M1911', damage: 21, img: 'assets/guns/pistol.png' },
        { id: 'revolver', name: 'Colt Detective Special', damage: 25, img: 'assets/guns/revolver.png' },
        { id: 'shotgun', name: 'Lupara Shotgun', damage: 45, img: 'assets/guns/shotgun.png' },
        { id: 'rifle', name: 'Winchester 1894', damage: 35, img: 'assets/guns/rifle.png' }
    ],

    // Target Gen Alpha opponents encountered in normal levels (1-10)
    genAlphaPool: [
        { name: 'Skibidi Toilet Henchman', img: 'assets/memes/Gen-Alpha-meme-family/skibidi_toilet.png' },
        { name: 'Baby Gronk', img: 'assets/memes/Gen-Alpha-meme-family/baby_gronk.png' },
        { name: 'Ohio Overlord', img: 'assets/memes/Gen-Alpha-meme-family/ohio.png' },
        { name: 'Sigma Grimace', img: 'assets/memes/Gen-Alpha-meme-family/sigma.png' },
        { name: 'Mewing Chad', img: 'assets/memes/Gen-Alpha-meme-family/mewing.png' },
        { name: 'hawk_tua', img: 'assets/memes/Gen-Alpha-meme-family/hawk_tuah.png' },
    ],

    boss: {
        name: 'Don Skibidi',
        img: 'assets/memes/Gen-Alpha-meme-family/don_skibidi.png',
        hp: 1500,
        weaponId: 'tommy'
    },

    backgrounds: [
        'assets/backgrounds/street.png',
        'assets/backgrounds/abandoned-warehouse.png',
        'assets/backgrounds/mafia-mansion.png',
        'assets/backgrounds/abandoned-nightclub.png'
    ],

    // Playback video targets
    cutscenes: {
        intro: 'assets/cutscene-videos/intro.mp4',
        introToFinale: 'assets/cutscene-videos/intro-to-finale.mp4',
        win: 'assets/cutscene-videos/win.mp4',
        victoryReactions: [
            'assets/cutscene-videos/victory-reaction-01.mp4',
            'assets/cutscene-videos/victory-reaction-02.mp4',
            'assets/cutscene-videos/victory-reaction-03.mp4'
        ]
    },

    loadingMessages: [
        "SQUASHING GEN ALPHA CRINGE...",
        "LOADING THE DON'S ILLEGAL DINNER RECIPES...",
        "POLISHING TOMMY GUN BASES...",
        "LOCATING WEEGEE'S SOUL-DEVOURING STARE...",
        "GENERATING RICKROLL PROOF ENCRYPTIONS...",
        "SHOOTING THE SKIBIDI OVERLORDS...",
        "COLLECTING TAXES FROM MORSHU'S RUBIES...",
        "ROASTING GEN ALPHA KIDS FOR FUN...",
    ]
};

// ==========================================
// 2. STATE MANAGER DATA OBJECTS
// ==========================================
let state = {
    currentLevel: 1, // 1 to 10 normal levels, Level 11 is Don Skibidi Showdown
    roster: [], // Cloned runtime list tracking survival/health metrics
    selectedParty: [], // Active 3 chosen OG Memes
    activeEnemies: [], // Current levels enemies
    isBattleActive: false,
    enemyAttackInterval: null,
    backgroundAudio: null,
    audioInitialized: false,
    audioEnabled: true,
    _finaleSkipOverride: false
};

const AGGRESSIVE_ROASTS = [
    "Your spacebar action looks incredibly weak. Don Harkinian was killed, all because of you.",
    "You were so bad, the Gen Alpha Meme Family is now laughing at your corpse. You have been utterly humiliated.",
    "The streets are laughing at you. Try mashing that spacebar like you actually want to live.",
    "Don Skibidi looked at your reaction time and laughed his head off. Try again, loser.",
    "The CD-i universe crumbled back into the shadows of history. All because you couldn't handle simple coordination."
];

// Web Audio API Synthesizer Context
let audioCtx = null;

// ==========================================
// 3. CORE SYSTEM BOOT & DOM EVENT HANDLERS
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    initDOMListeners();
    runPreloader();
});

function initDOMListeners() {
    // Menu System Hooks
    document.getElementById('btn-start').addEventListener('click', startIntroCutscene);
    document.getElementById('btn-how-to').addEventListener('click', toggleHowToModal);
    document.getElementById('btn-close-how-to').addEventListener('click', toggleHowToModal);
    document.getElementById('music-toggle').addEventListener('change', handleMusicToggle);

    // Skip Handlers
    document.addEventListener('keydown', handleGlobalKeyEvents);
    document.getElementById('screen-intro').addEventListener('click', skipIntroVideo);
    
    // Party Builder Grid Hook
    document.getElementById('btn-lock-party').addEventListener('click', launchSelectedBattle);

    // Pre-boss screen: launch the final battle with all survivors auto-deployed
    document.getElementById('btn-enter-boss-fight').addEventListener('click', launchBossBattle);
    
    // Recovery Restart Game Hooks
    document.getElementById('btn-restart-game').addEventListener('click', restartToMenu);
    document.getElementById('btn-win-menu').addEventListener('click', restartToMenu);
    
    // Handle global keyboard Spacebar press inside of battles
    document.addEventListener('keydown', handleSpacebarCombatPress);
}

function initAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        state.audioInitialized = true;
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// ==========================================
// 4. THE ROBUST SOUND SYNTHESIS ENGINE
// ==========================================
/**
 * Programmatically synthesizes highly customized procedural firearm gunshot sounds 
 * on command. This ensures there are zero external dependencies or latency gaps.
 */
function playSynthesizedGunfire() {
    if (!state.audioEnabled) return;
    initAudioContext();

    const bufferSize = audioCtx.sampleRate * 0.4; // 0.4-second audio window
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill the buffer with random White Noise
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = buffer;

    // Filter to add heavy distortion and low-end impact
    const filterNode = audioCtx.createBiquadFilter();
    filterNode.type = 'bandpass';
    filterNode.frequency.value = 1100;
    filterNode.Q.value = 1.8;

    // Envelope manipulation (super-fast attack, decay)
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.45, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.005, audioCtx.currentTime + 0.35);

    noiseNode.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    noiseNode.start();
    noiseNode.stop(audioCtx.currentTime + 0.4);
}

// ==========================================
// 5. THE PRELOADER ENGINE
// ==========================================
function runPreloader() {
    const bar = document.getElementById('loading-progress');
    const msg = document.getElementById('loading-message');
    let progress = 0;

    // Simulate custom preloading times for network checks
    const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 15) + 5;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            bar.style.width = '100%';
            msg.innerText = "ALL ASSETS PRE-LOADED. SYSTEM READY.";
            setTimeout(() => {
                initMenuScreen(false);
            }, 800);
        } else {
            bar.style.width = `${progress}%`;
            if (progress % 20 === 0 || Math.random() > 0.8) {
                const randomMsgIndex = Math.floor(Math.random() * ASSETS_CONFIG.loadingMessages.length);
                msg.innerText = ASSETS_CONFIG.loadingMessages[randomMsgIndex];
            }
        }
    }, 150);
}

// ==========================================
// 6. CAMPAIGN FLOW OPERATIONS
// ==========================================
function resetCampaignProgress() {
    // Perform deep copy clones to preserve original configs
    state.roster = ASSETS_CONFIG.memes.map(m => ({ ...m, alive: true, currentHp: m.hp }));
    state.currentLevel = 1;
    state.selectedParty = [];
    state.activeEnemies = [];
    state.isBattleActive = false;
    state._finaleSkipOverride = false;
    clearInterval(state.enemyAttackInterval);
    stopBackgroundMusic();
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');

    // Hide the credit and hub button during cutscene screens; show everywhere else
    const cutsceneScreens = ['screen-intro', 'screen-cutscene'];
    const credit = document.getElementById('made-by-credit');
    const hubBtn = document.getElementById('hub-btn');
    const hubBtnBattle = document.getElementById('hub-btn-battle');

    [credit, hubBtn].forEach(el => {
        if (!el) return;
        if (cutsceneScreens.includes(screenId)) {
            el.classList.add('hidden');
        } else {
            el.classList.remove('hidden');
        }
    });

    // During battle: hide the fixed hub button (it overlaps the HUD),
    // and show the one embedded inside the battle HUD instead.
    if (screenId === 'screen-battle') {
        if (hubBtn) hubBtn.classList.add('hidden');
        if (hubBtnBattle) hubBtnBattle.classList.remove('hidden');
    } else {
        if (hubBtnBattle) hubBtnBattle.classList.add('hidden');
    }
}

function startIntroCutscene() {
    initAudioContext();
    resetCampaignProgress();
    showScreen('screen-intro');
    
    const introVideo = document.getElementById('intro-video');
    introVideo.currentTime = 0;
    introVideo.play().catch(err => {
        console.warn("Autoplay block detected, click or interact to view cutscene", err);
    });

    introVideo.onended = () => {
        setupPartySelectionScreen();
    };
}

function skipIntroVideo() {
    const introVideo = document.getElementById('intro-video');
    introVideo.pause();
    setupPartySelectionScreen();
}

function handleGlobalKeyEvents(e) {
    if (e.key === 'Enter') {
        const activeIntro = !document.getElementById('screen-intro').classList.contains('hidden');
        const activeCutscene = !document.getElementById('screen-cutscene').classList.contains('hidden');
        if (activeIntro) {
            skipIntroVideo();
        } else if (activeCutscene) {
            // If this is the intro-to-finale cutscene, go to the pre-boss screen instead
            if (state._finaleSkipOverride) {
                showPreBossScreenAfterCutscene();
            } else {
                skipMidlevelCutscene();
            }
        }
    }
}

function toggleHowToModal() {
    const modal = document.getElementById('how-to-modal');
    modal.classList.toggle('hidden');
}

function handleMusicToggle() {
    state.audioEnabled = document.getElementById('music-toggle').checked;
    const hint     = document.getElementById('bgm-hint');
    const menuVisible = !document.getElementById('screen-menu').classList.contains('hidden');

    if (!state.audioEnabled) {
        stopBackgroundMusic();
        // Always hide hint when music is disabled
        if (hint) { hint.style.opacity = '0'; hint.style.animation = 'none'; }
        document.getElementById('screen-menu').removeEventListener('pointerdown', _onMenuClick);
    } else {
        // Re-start the correct track based on which screen is active
        const battleVisible  = !document.getElementById('screen-battle').classList.contains('hidden');
        const partyVisible   = !document.getElementById('screen-party').classList.contains('hidden');
        const preBossVisible = !document.getElementById('screen-preboss').classList.contains('hidden');
        if (battleVisible) {
            playBackgroundMusic('assets/music/battle.mp3');
        } else if (partyVisible || preBossVisible) {
            playBackgroundMusic('assets/music/party.mp3');
        } else if (menuVisible) {
            // Re-enable on menu: try to play directly (toggle itself is a user gesture)
            if (hint) { hint.style.opacity = '0'; hint.style.animation = 'none'; }
            playBackgroundMusic('assets/music/menu.mp3');
        }
    }
}

// ==========================================
// 7. SQUAD MANAGEMENT (PARTY SELECTION)
// ==========================================
function setupPartySelectionScreen() {
    showScreen('screen-party');
    playBackgroundMusic('assets/music/party.mp3');
    
    document.getElementById('party-level-num').innerText = state.currentLevel;
    state.selectedParty = [];
    renderPartySelectionGrid();
    updatePartySelectionLockState();
}

function renderPartySelectionGrid() {
    const grid = document.getElementById('roster-grid');
    grid.innerHTML = '';

    state.roster.forEach(character => {
        const weapon = ASSETS_CONFIG.weapons.find(w => w.id === character.weaponId);
        const card = document.createElement('div');
        card.className = `meme-card ${!character.alive ? 'dead' : ''}`;
        
        card.innerHTML = `
            <img src="${character.img}" class="meme-card-img" alt="${character.name}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22><rect width=%2280%22 height=%2280%22 fill=%22%23222%22/><text x=%2250%%22 y=%2250%%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23fff%22 font-size=%2210%22>${character.name}</text></svg>'">
            <div class="meme-card-name">${character.name}</div>
            <div class="meme-card-stats">HP: ${character.currentHp}/${character.maxHp}<br>${weapon ? weapon.name : 'Unarmed'}</div>
        `;

        if (character.alive) {
            card.addEventListener('click', () => {
                toggleCharacterSelection(character, card);
            });
        }

        grid.appendChild(card);
    });
}

function toggleCharacterSelection(character, cardElement) {
    const index = state.selectedParty.findIndex(m => m.id === character.id);
    if (index > -1) {
        state.selectedParty.splice(index, 1);
        cardElement.classList.remove('selected');
    } else {
        if (state.selectedParty.length < 3) {
            state.selectedParty.push(character);
            cardElement.classList.add('selected');
        }
    }
    updatePartySelectionLockState();
}

function updatePartySelectionLockState() {
    // Determine the number of surviving fighters in the roster
    const aliveCount = state.roster.filter(m => m.alive).length;
    // Determine the targets required (exactly 3, or all of them if fewer than 3 survive)
    const requiredSelected = Math.min(3, aliveCount);
    const lockBtn = document.getElementById('btn-lock-party');
    const counter = document.getElementById('selected-counter');

    counter.innerText = `Selected: ${state.selectedParty.length} / ${requiredSelected}`;

    if (state.selectedParty.length === requiredSelected && requiredSelected > 0) {
        lockBtn.classList.remove('disabled');
        lockBtn.removeAttribute('disabled');
    } else {
        lockBtn.classList.add('disabled');
        lockBtn.setAttribute('disabled', 'true');
    }
}

// ==========================================
// 8. BATTLE RUNTIME ENGINE
// ==========================================
function launchSelectedBattle() {
    // Position the battle HUB button before revealing the screen so it never visibly moves.
    // Keep it invisible until we've set the correct position.
    const btn = document.getElementById('hub-btn-battle');
    if (btn) btn.style.visibility = 'hidden';

    showScreen('screen-battle');
    playBackgroundMusic('assets/music/battle.mp3');

    // Now the screen is in the DOM and laid out — read real pixel positions synchronously.
    if (btn) {
        const hud = document.querySelector('.battle-hud');
        const arena = document.getElementById('battle-bg');
        if (hud && arena) {
            const arenaRect = arena.getBoundingClientRect();
            const hudRect = hud.getBoundingClientRect();
            btn.style.transition = 'none';
            btn.style.top  = (hudRect.bottom - arenaRect.top + 10) + 'px';
            btn.style.left = (hudRect.left - arenaRect.left) + 'px';
        }
        btn.style.visibility = 'visible';
    }
    
    // Choose backdrops dynamically
    const bgIndex = (state.currentLevel - 1) % ASSETS_CONFIG.backgrounds.length;
    document.getElementById('battle-bg').style.backgroundImage = `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url('${ASSETS_CONFIG.backgrounds[bgIndex]}')`;

    document.getElementById('battle-level-banner').innerText = state.currentLevel === 11 ? 'BOSS FIGHT - DON SKIBIDI' : `LEVEL ${state.currentLevel}`;
    document.getElementById('enemy-team-header').innerText = state.currentLevel === 11 ? 'DON SKIBIDI' : 'GEN ALPHA MEME FAMILY';
    document.getElementById('combat-log').innerText = "Stand-off initiated. Prepare to shoot!";

    // Spawn Enemies
    generateEnemies();

    // Reset battle active state tracking
    state.isBattleActive = true;
    renderBattleCombatants();
    updateBattleHPMeters();

    // Activate the autonomous automated firing intervals from enemies
    startEnemyAutomatedFire();
}

function generateEnemies() {
    state.activeEnemies = [];
    const difficultyMultiplier = 1 + (state.currentLevel - 1) * 0.25; // Increase difficulty scaling based on campaign progress

    if (state.currentLevel === 11) {
        // Ultimate boss battle setup
        state.activeEnemies.push({
            name: ASSETS_CONFIG.boss.name,
            img: ASSETS_CONFIG.boss.img,
            currentHp: Math.round(ASSETS_CONFIG.boss.hp),
            maxHp: Math.round(ASSETS_CONFIG.boss.hp),
            weapon: ASSETS_CONFIG.weapons.find(w => w.id === ASSETS_CONFIG.boss.weaponId),
            alive: true,
            isBoss: true
        });
    } else {
        // Normal random encounter level setups
        for (let i = 0; i < 3; i++) {
            const randomSource = ASSETS_CONFIG.genAlphaPool[Math.floor(Math.random() * ASSETS_CONFIG.genAlphaPool.length)];
            const baseHp = 90 + Math.floor(Math.random() * 30);
            const finalHp = Math.round(baseHp * difficultyMultiplier);
            const randomWeapon = ASSETS_CONFIG.weapons[Math.floor(Math.random() * ASSETS_CONFIG.weapons.length)];

            state.activeEnemies.push({
                name: `${randomSource.name} #${i + 1}`,
                img: randomSource.img,
                currentHp: finalHp,
                maxHp: finalHp,
                weapon: randomWeapon,
                alive: true,
                isBoss: false
            });
        }
    }
}

function renderBattleCombatants() {
    const playerLine = document.getElementById('player-combat-line');
    const enemyLine = document.getElementById('enemy-combat-line');

    playerLine.innerHTML = '';
    enemyLine.innerHTML = '';

    // Scale down fighter cards if the party is large (boss fight)
    const isBossFight = (state.currentLevel === 11);
    if (state.selectedParty.length > 3) {
        playerLine.classList.add('many-fighters');
    } else {
        playerLine.classList.remove('many-fighters');
    }
    state.selectedParty.forEach(meme => {
        const weapon = ASSETS_CONFIG.weapons.find(w => w.id === meme.weaponId);
        const hpPct = Math.max(0, Math.round((meme.currentHp / meme.maxHp) * 100));
        const fighterEl = document.createElement('div');
        fighterEl.id = `fighter-p-${meme.id}`;
        fighterEl.className = 'fighter-sprite-wrapper';
        fighterEl.innerHTML = `
            <img src="${meme.img}" class="fighter-avatar" id="avatar-p-${meme.id}" alt="${meme.name}">
            <img src="${weapon ? weapon.img : ''}" class="gun-overlay" alt="weapon">
            <div class="fighter-name">${meme.name}</div>
            ${isBossFight ? `
            <div class="fighter-hp-bar-outer">
                <div class="fighter-hp-bar-inner" id="hpbar-p-${meme.id}" style="width:${hpPct}%"></div>
            </div>` : ''}
        `;
        if (!meme.alive) {
            fighterEl.classList.add('kia-grey');
        }
        playerLine.appendChild(fighterEl);
    });

    // Render Enemies
    state.activeEnemies.forEach((enemy, idx) => {
        const fighterEl = document.createElement('div');
        fighterEl.id = `fighter-e-${idx}`;
        fighterEl.className = 'fighter-sprite-wrapper';
        fighterEl.innerHTML = `
            <img src="${enemy.img}" class="fighter-avatar" id="avatar-e-${idx}" alt="${enemy.name}">
            <img src="${enemy.weapon ? enemy.weapon.img : ''}" class="gun-overlay" alt="weapon">
            <div class="fighter-name">${enemy.name}</div>
        `;
        enemyLine.appendChild(fighterEl);
    });
}

function updateBattleHPMeters() {
    // Handle player party calculation
    const totalPlayerMax = state.selectedParty.reduce((acc, cur) => acc + cur.maxHp, 0);
    const totalPlayerCurrent = state.selectedParty.reduce((acc, cur) => acc + (cur.alive ? cur.currentHp : 0), 0);
    const playerPct = Math.max(0, Math.round((totalPlayerCurrent / totalPlayerMax) * 100));

    document.getElementById('player-team-hp-fill').style.width = `${playerPct}%`;
    document.getElementById('player-hp-text').innerText = `${playerPct}% HP`;

    // Handle enemy group calculations
    const totalEnemyMax = state.activeEnemies.reduce((acc, cur) => acc + cur.maxHp, 0);
    const totalEnemyCurrent = state.activeEnemies.reduce((acc, cur) => acc + (enemyAlive(cur) ? cur.currentHp : 0), 0);
    const enemyPct = Math.max(0, Math.round((totalEnemyCurrent / totalEnemyMax) * 100));

    document.getElementById('enemy-team-hp-fill').style.width = `${enemyPct}%`;
    document.getElementById('enemy-hp-text').innerText = `${enemyPct}% HP`;
}

function enemyAlive(enemy) {
    return enemy.currentHp > 0;
}

// ==========================================
// 9. REALTIME INPUT (SPACEBAR MASHING) AND ENEMY ACTION
// ==========================================
function handleSpacebarCombatPress(e) {
    if (e.code === 'Space') {
        e.preventDefault(); // Prevent page scrolling
        
        if (e.repeat) return; // Ignore held-down key repeats — one press, one shot!

        if (!state.isBattleActive) return;

        // Pick a dynamic alive player meme to execute the hit
        const activeShooters = state.selectedParty.filter(m => m.alive);
        if (activeShooters.length === 0) return;

        const shooter = activeShooters[Math.floor(Math.random() * activeShooters.length)];
        const weapon = ASSETS_CONFIG.weapons.find(w => w.id === shooter.weaponId);
        const damage = weapon ? weapon.damage : 10;

        // Target the first surviving enemy in their line
        const targetIdx = state.activeEnemies.findIndex(enemyAlive);
        if (targetIdx === -1) return;

        const target = state.activeEnemies[targetIdx];

        // Trigger Weapon Sound
        playSynthesizedGunfire();

        // Target damage logic implementation
        target.currentHp -= damage;
        triggerDamageBubble(document.getElementById(`fighter-e-${targetIdx}`), damage);
        triggerGunRecoilFeedback(`avatar-p-${shooter.id}`, 'recoil-active');

        document.getElementById('combat-log').innerText = `${shooter.name} shoots ${target.name} for ${damage} dmg!`;

        if (target.currentHp <= 0) {
            target.currentHp = 0;
            document.getElementById('combat-log').innerText = `${target.name} WAS FOLDED BY THE OG FAMILY!`;
            // Visual indicators for death
            document.getElementById(`fighter-e-${targetIdx}`).style.opacity = '0.3';
        }

        updateBattleHPMeters();
        checkBattleOverConditions();
    }
}

function startEnemyAutomatedFire() {
    // Enemy firing frequency gets progressively more intense as campaign level increases
    const delay = Math.max(400, 1500 - (state.currentLevel * 100));
    
    state.enemyAttackInterval = setInterval(() => {
        if (!state.isBattleActive) return;

        const activeEnemies = state.activeEnemies.filter(enemyAlive);
        if (activeEnemies.length === 0) return;

        // Choose random shooter from surviving enemies
        const enemyShooterIdx = state.activeEnemies.findIndex(enemyAlive); // Aiming simple mechanics
        const enemyShooter = state.activeEnemies[enemyShooterIdx];

        // Choose random target from alive party players
        const alivePlayers = state.selectedParty.filter(m => m.alive);
        if (alivePlayers.length === 0) return;

        const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];

        // Compute base damages
        let baseDmg = enemyShooter.weapon ? enemyShooter.weapon.damage : 12;
        // Boss does massive flat damage boosts
        if (enemyShooter.isBoss) {
            baseDmg = 45;
        }

        // Apply scaling difficulty multiplier on top of base damages
        const finalDmg = Math.round(baseDmg * (1 + (state.currentLevel - 1) * 0.08));

        // Fire sound and execution updates
        playSynthesizedGunfire();
        target.currentHp -= finalDmg;

        triggerDamageBubble(document.getElementById(`fighter-p-${target.id}`), finalDmg);
        triggerGunRecoilFeedback(`avatar-e-${enemyShooterIdx}`, 'enemy-recoil-active');

        document.getElementById('combat-log').innerText = `${enemyShooter.name} counters! ${target.name} takes ${finalDmg} dmg!`;

        if (target.currentHp <= 0) {
            target.currentHp = 0;
            target.alive = false;
            // Reflect structural death state on the local roster list as well
            const rosterMatch = state.roster.find(m => m.id === target.id);
            if (rosterMatch) rosterMatch.alive = false;

            document.getElementById(`fighter-p-${target.id}`).style.opacity = '0.3';
            document.getElementById('combat-log').innerText = `${target.name} has been taken out of action!`;
        }

        // Refresh individual HP bar during boss fight
        const hpBarEl = document.getElementById(`hpbar-p-${target.id}`);
        if (hpBarEl) {
            const pct = Math.max(0, Math.round((target.currentHp / target.maxHp) * 100));
            hpBarEl.style.width = `${pct}%`;
        }

        updateBattleHPMeters();
        checkBattleOverConditions();
    }, delay);
}

function triggerGunRecoilFeedback(elementId, className) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), 80);
}

function triggerDamageBubble(parentElement, value) {
    if (!parentElement) return;
    const bubble = document.createElement('div');
    bubble.className = 'damage-bubble';
    bubble.innerText = `-${value}`;
    bubble.style.left = `${Math.floor(Math.random() * 40) + 20}px`;
    bubble.style.top = `${Math.floor(Math.random() * 20) + 10}px`;
    parentElement.appendChild(bubble);
    setTimeout(() => bubble.remove(), 600);
}

// ==========================================
// 10. EVALUATE RESOLUTION CONDITIONS
// ==========================================
function checkBattleOverConditions() {
    const activePlayerCount = state.selectedParty.filter(m => m.alive).length;
    const activeEnemyCount = state.activeEnemies.filter(enemyAlive).length;

    if (activeEnemyCount === 0) {
        // Victory state triggers
        endCurrentBattle(true);
    } else if (activePlayerCount === 0) {
        // Defeat state triggers
        endCurrentBattle(false);
    }
}

function endCurrentBattle(isVictory) {
    state.isBattleActive = false;
    clearInterval(state.enemyAttackInterval);
    stopBackgroundMusic();

    if (isVictory) {
        if (state.currentLevel === 11) {
            // Player has beaten the final boss
            triggerFinalCampaignWin();
        } else {
            // Play post-level meeting video
            playMidlevelCutscene();
        }
    } else {
        // Entire dispatched hit squad perished. Game over.
        triggerGameOverScreen();
    }
}

// ==========================================
// 11. DYNAMIC TYPEWRITER & VIDEO TRANSITIONS
// ==========================================
function playMidlevelCutscene() {
    // Level 10 win → special intro-to-finale cutscene before the boss
    if (state.currentLevel === 10) {
        playIntroToFinaleCutscene();
        return;
    }

    showScreen('screen-cutscene');
    
    const video = document.getElementById('cutscene-video');
    // Pick a random victory reaction video from the pool
    const reactions = ASSETS_CONFIG.cutscenes.victoryReactions;
    const targetVideoUrl = reactions[Math.floor(Math.random() * reactions.length)];
    video.src = targetVideoUrl;
    video.currentTime = 0;
    
    video.play().catch(err => {
        console.warn("Cutscene autoplay blocked, awaiting interaction", err);
    });

    video.onended = () => {
        skipMidlevelCutscene();
    };
}

function skipMidlevelCutscene() {
    const video = document.getElementById('cutscene-video');
    video.pause();
    
    // Check if player has any surviving party members. If none exist in the whole roster, game over!
    const survivorsRemaining = state.roster.filter(m => m.alive).length;
    if (survivorsRemaining === 0) {
        triggerGameOverScreen();
        return;
    }

    state.currentLevel += 1;
    setupPartySelectionScreen();
}

// Plays the intro-to-finale cutscene, then lands on the pre-boss screen
function playIntroToFinaleCutscene() {
    // Advance to level 11 NOW so generateEnemies() spawns Don Skibidi when the battle launches
    state.currentLevel = 11;

    showScreen('screen-cutscene');
    stopBackgroundMusic();

    const video = document.getElementById('cutscene-video');
    const source = video.querySelector('source');
    const url = ASSETS_CONFIG.cutscenes.introToFinale;

    if (source) source.src = url;
    video.load();
    video.src = url;
    video.currentTime = 0;

    video.play().catch(err => {
        console.warn("intro-to-finale autoplay blocked, awaiting interaction", err);
    });

    // Override the shared cutscene skip handler: after this video → pre-boss screen
    video.onended = () => {
        showPreBossScreenAfterCutscene();
    };

    // Temporarily override the Enter-key skip so it also lands on the pre-boss screen
    state._finaleSkipOverride = true;
}

// Called by Enter-key handler or video.onended for the intro-to-finale cutscene
function showPreBossScreenAfterCutscene() {
    state._finaleSkipOverride = false;
    const video = document.getElementById('cutscene-video');
    video.pause();
    video.onended = null;
    setupPreBossScreen();
}

// Renders the pre-boss screen with all surviving troops previewed
function setupPreBossScreen() {
    showScreen('screen-preboss');
    playBackgroundMusic('assets/music/party.mp3');

    const survivors = state.roster.filter(m => m.alive);
    const preview = document.getElementById('preboss-troop-preview');
    preview.innerHTML = '';

    survivors.forEach(meme => {
        const hpPct = Math.max(0, Math.round((meme.currentHp / meme.maxHp) * 100));
        const card = document.createElement('div');
        card.className = 'preboss-troop-card';
        card.innerHTML = `
            <img src="${meme.img}" class="preboss-troop-img" alt="${meme.name}"
                 onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2280%22 height=%2280%22><rect width=%2280%22 height=%2280%22 fill=%22%23222%22/><text x=%2250%%22 y=%2250%%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23fff%22 font-size=%228%22>${meme.name}</text></svg>'">
            <div class="preboss-troop-name">${meme.name}</div>
            <div class="preboss-troop-hp">${meme.currentHp} / ${meme.maxHp} HP</div>
            <div class="preboss-troop-hp-bar-outer">
                <div class="preboss-troop-hp-bar-inner" style="width:${hpPct}%"></div>
            </div>
        `;
        preview.appendChild(card);
    });
}

// Launches the boss battle with ALL surviving troops auto-deployed
function launchBossBattle() {
    // Auto-select the entire living roster as the party — no cherry-picking allowed
    state.selectedParty = state.roster.filter(m => m.alive);
    launchSelectedBattle();
}

function triggerGameOverScreen() {
    showScreen('screen-gameover');
    // Display random roast sequence
    const roast = AGGRESSIVE_ROASTS[Math.floor(Math.random() * AGGRESSIVE_ROASTS.length)];
    document.getElementById('roast-text').innerText = `"${roast}"`;
    
    // Wipe actual campaign progress files completely
    resetCampaignProgress();
}

function triggerFinalCampaignWin() {
    showScreen('screen-win');
    const winVideo = document.getElementById('win-video');
    winVideo.currentTime = 0;
    winVideo.play().catch(e => console.warn(e));
}

function restartToMenu() {
    initMenuScreen(true);
}

/**
 * Central entry point for showing the main menu.
 * @param {boolean} returning  true  = coming back from gameplay (autoplay already unlocked,
 *                                     fire music immediately, hide the hint)
 *                             false = first arrival after preloader (autoplay may be blocked,
 *                                     show the hint and wait for a click)
 */
function initMenuScreen(returning = false) {
    showScreen('screen-menu');

    const hint      = document.getElementById('bgm-hint');
    const menuEl    = document.getElementById('screen-menu');

    // Clean up any stale once-listener from a previous visit
    menuEl.removeEventListener('pointerdown', _onMenuClick);

    if (!state.audioEnabled) {
        // Music toggle is off — never show the hint regardless
        if (hint) hint.style.opacity = '0';
        return;
    }

    if (returning) {
        // AudioContext is already unlocked; start music instantly, no hint needed
        if (hint) { hint.style.opacity = '0'; hint.style.animation = 'none'; }
        playBackgroundMusic('assets/music/menu.mp3');
    } else {
        // First visit — autoplay may be blocked; show hint and wait for any tap/click
        if (hint) hint.style.opacity = '';
        menuEl.addEventListener('pointerdown', _onMenuClick, { once: true });
    }
}

/** Internal handler — starts menu BGM on first user interaction and hides the hint. */
function _onMenuClick() {
    const hint = document.getElementById('bgm-hint');
    if (hint) { hint.style.opacity = '0'; hint.style.animation = 'none'; }
    if (state.audioEnabled) {
        playBackgroundMusic('assets/music/menu.mp3');
    }
}

// ==========================================
// 12. SYNTHESIZED MUSIC ENGINE
// ==========================================

/**
 * Tracks all active oscillator/gain nodes for the currently playing music
 * so they can be cleanly stopped on demand.
 */
let activeMusicNodes = [];
let musicLoopTimeout = null;
let currentMusicTrack = null;

function stopBackgroundMusic() {
    currentMusicTrack = null;
    // Stop MP3 Audio element if active
    if (state.backgroundAudio) {
        state.backgroundAudio.pause();
        state.backgroundAudio = null;
    }
    // Stop synthesizer nodes
    if (musicLoopTimeout) {
        clearTimeout(musicLoopTimeout);
        musicLoopTimeout = null;
    }
    activeMusicNodes.forEach(node => {
        try { node.stop(); } catch(e) {}
    });
    activeMusicNodes = [];
}

/**
 * Public entry point.
 * - 'assets/music/menu.mp3'   → real MP3 file via Audio element (main menu only)
 * - 'assets/music/party.mp3'  → synthesized mafia-prep track (party selection)
 * - 'assets/music/battle.mp3' → synthesized battle track (battle screen)
 */
function playBackgroundMusic(track) {
    stopBackgroundMusic();
    if (!state.audioEnabled) return;

    currentMusicTrack = track;

    if (track === 'assets/music/menu.mp3') {
        // Real MP3 playback for the main menu
        state.backgroundAudio = new Audio('assets/music/menu.mp3');
        state.backgroundAudio.loop = true;
        state.backgroundAudio.volume = 0.45;
        state.backgroundAudio.play().catch(err => {
            console.warn("Menu audio playback waiting on user gesture...", err);
        });
    } else if (track === 'assets/music/party.mp3') {
        initAudioContext();
        scheduleMenuLoop();
    } else if (track === 'assets/music/battle.mp3') {
        initAudioContext();
        scheduleBattleLoop();
    }
}

// ------------------------------------------
// UTILITY: Create and register a node so it
// can be stopped cleanly on demand.
// ------------------------------------------
function makeOsc(type, freq, startTime, duration, gainPeak, gainEnd) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(Math.max(gainEnd, 0.0001), startTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
    activeMusicNodes.push(osc);
    return osc;
}

function makeNoise(startTime, duration, filterFreq, filterQ, gainPeak) {
    if (!audioCtx) return;
    const bufferSize = Math.ceil(audioCtx.sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const src = audioCtx.createBufferSource();
    src.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = filterQ;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(gainPeak, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    src.start(startTime);
    activeMusicNodes.push(src);
}

// ------------------------------------------
// TRACK 1: MENU — "The Don Prepares"
// Slow 60 BPM minor-key mafia atmosphere.
// Walking bass + brass stabs + snare rolls.
// Loop duration: 8 bars × 4 beats @ 60 BPM = 32 seconds
// ------------------------------------------
function scheduleMenuLoop() {
    if (!state.audioEnabled || currentMusicTrack !== 'assets/music/party.mp3') return;

    const now = audioCtx.currentTime + 0.05;
    const bpm = 60;
    const beat = 60 / bpm;           // 1.0s per beat
    const bar = beat * 4;             // 4.0s per bar
    const loopDuration = bar * 8;     // 32s total loop

    // Minor scale root: A2 = 110 Hz
    // A minor: A(110) C(130.8) D(146.8) E(164.8) F(174.6) G(196)
    const notes = {
        A2: 110.0, C3: 130.8, D3: 146.8, E3: 164.8, F3: 174.6, G3: 196.0,
        A3: 220.0, C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392.0,
        A4: 440.0,
    };

    // --- DOUBLE BASS WALKING LINE (pizzicato feel) ---
    // Pattern repeats every 2 bars, 8 bars total = 4 repetitions
    const bassLine = [
        // Bar 1
        { n: notes.A2, b: 0 }, { n: notes.A2, b: 1 }, { n: notes.C3, b: 2 }, { n: notes.E3, b: 3 },
        // Bar 2
        { n: notes.D3, b: 4 }, { n: notes.D3, b: 5 }, { n: notes.F3, b: 6 }, { n: notes.A3, b: 7 },
        // Bar 3
        { n: notes.E3, b: 8 }, { n: notes.E3, b: 9 }, { n: notes.G3, b: 10 }, { n: notes.A3, b: 11 },
        // Bar 4
        { n: notes.A2, b: 12 }, { n: notes.C3, b: 13 }, { n: notes.E3, b: 14 }, { n: notes.A2, b: 15 },
        // Bars 5-8 mirror
        { n: notes.A2, b: 16 }, { n: notes.A2, b: 17 }, { n: notes.C3, b: 18 }, { n: notes.E3, b: 19 },
        { n: notes.D3, b: 20 }, { n: notes.F3, b: 21 }, { n: notes.A3, b: 22 }, { n: notes.G3, b: 23 },
        { n: notes.E3, b: 24 }, { n: notes.E3, b: 25 }, { n: notes.G3, b: 26 }, { n: notes.A3, b: 27 },
        { n: notes.A2, b: 28 }, { n: notes.C3, b: 29 }, { n: notes.D3, b: 30 }, { n: notes.A2, b: 31 },
    ];
    bassLine.forEach(({ n, b }) => {
        const t = now + b * beat;
        makeOsc('triangle', n, t, beat * 0.55, 0.28, 0.0001);
        // Sub harmonic for weight
        makeOsc('sine', n * 0.5, t, beat * 0.55, 0.12, 0.0001);
    });

    // --- BRASS STABS (sawtooth, slow attack) ---
    // On beats 1 and 3 of bars 1, 3, 5, 7 (every other bar)
    const brassHits = [
        { chord: [notes.A3, notes.C4, notes.E4], bar: 0, beat: 0 },
        { chord: [notes.A3, notes.C4, notes.E4], bar: 0, beat: 2 },
        { chord: [notes.D3, notes.F3, notes.A3], bar: 2, beat: 0 },
        { chord: [notes.E3, notes.G3, notes.A3], bar: 2, beat: 2 },
        { chord: [notes.A3, notes.C4, notes.E4], bar: 4, beat: 0 },
        { chord: [notes.A3, notes.C4, notes.E4], bar: 4, beat: 2 },
        { chord: [notes.D3, notes.F3, notes.A3], bar: 6, beat: 0 },
        { chord: [notes.E3, notes.G3, notes.A3], bar: 6, beat: 2 },
        { chord: [notes.A3, notes.C4, notes.E4], bar: 6, beat: 3.5 },
    ];
    brassHits.forEach(({ chord, bar: b, beat: bt }) => {
        const t = now + (b * bar) + (bt * beat);
        chord.forEach(freq => {
            makeOsc('sawtooth', freq, t, beat * 1.6, 0.07, 0.001);
        });
    });

    // --- BROODING MELODY (solo horn feel, square wave) ---
    // Slow phrases over the top
    const melodyLine = [
        { n: notes.E4, b: 1,  dur: 1.5 },
        { n: notes.D4, b: 2.5, dur: 1.0 },
        { n: notes.C4, b: 4,  dur: 2.0 },
        { n: notes.A3, b: 6,  dur: 1.8 },
        { n: notes.G3, b: 8,  dur: 1.2 },
        { n: notes.A3, b: 9.5, dur: 1.5 },
        { n: notes.E4, b: 12, dur: 2.0 },
        { n: notes.D4, b: 14.5, dur: 1.0 },
        { n: notes.C4, b: 16, dur: 2.0 },
        { n: notes.A3, b: 18.5, dur: 1.5 },
        { n: notes.G3, b: 20, dur: 1.0 },
        { n: notes.F3, b: 21.5, dur: 1.5 },
        { n: notes.E3, b: 24, dur: 2.0 },
        { n: notes.A3, b: 27, dur: 1.2 },
        { n: notes.G3, b: 28.5, dur: 1.0 },
        { n: notes.A3, b: 30, dur: 1.8 },
    ];
    melodyLine.forEach(({ n, b, dur }) => {
        const t = now + b * beat;
        makeOsc('square', n, t, dur * beat, 0.04, 0.001);
    });

    // --- SNARE ROLL (distant, sparse) ---
    // Light brush hits on beats 2 and 4
    for (let bar = 0; bar < 8; bar++) {
        [1, 3].forEach(bt => {
            const t = now + bar * 4 * beat + bt * beat;
            makeNoise(t, 0.12, 2800, 4.0, 0.06);
        });
        // Occasional accent on beat 4.5 in bars 3 and 7
        if (bar === 3 || bar === 7) {
            makeNoise(now + bar * 4 * beat + 3.5 * beat, 0.08, 2800, 5.0, 0.09);
        }
    }

    // --- SUBTLE KICK (low thud on beat 1) ---
    for (let bar = 0; bar < 8; bar++) {
        const t = now + bar * 4 * beat;
        makeOsc('sine', 60, t, 0.3, 0.4, 0.0001);
        makeNoise(t, 0.05, 120, 0.5, 0.15);
    }

    // Schedule next loop iteration
    musicLoopTimeout = setTimeout(() => {
        if (state.audioEnabled && currentMusicTrack === 'assets/music/party.mp3') {
            activeMusicNodes = [];
            scheduleMenuLoop();
        }
    }, (loopDuration - 0.1) * 1000);
}

// ------------------------------------------
// TRACK 2: BATTLE — "The Hit Goes Down"
// Fast 140 BPM frantic mafia action.
// Driving strings ostinato + brass + punchy drums.
// Loop duration: 8 bars × 4 beats @ 140 BPM ≈ 13.7 seconds
// ------------------------------------------
function scheduleBattleLoop() {
    if (!state.audioEnabled || currentMusicTrack !== 'assets/music/battle.mp3') return;

    const now = audioCtx.currentTime + 0.05;
    const bpm = 140;
    const beat = 60 / bpm;           // ~0.428s per beat
    const sixteenth = beat / 4;
    const bar = beat * 4;
    const loopDuration = bar * 8;    // ~13.7s

    // D minor: D(146.8) E(164.8) F(174.6) G(196) A(220) Bb(233.1) C(261.6)
    const notes = {
        D2: 73.4,  A2: 110.0, D3: 146.8, E3: 164.8, F3: 174.6,
        G3: 196.0, A3: 220.0, Bb3: 233.1, C4: 261.6, D4: 293.7,
        E4: 329.6, F4: 349.2, G4: 392.0, A4: 440.0, Bb4: 466.2,
    };

    // --- STRINGS OSTINATO (sixteenth-note pulse, tense) ---
    // Alternating D3 / F3 with chromatic tension hits
    const stringPattern = [
        notes.D3, notes.F3, notes.A3, notes.F3,
        notes.D3, notes.F3, notes.G3, notes.F3,
        notes.D3, notes.E3, notes.A3, notes.E3,
        notes.D3, notes.F3, notes.A3, notes.Bb3,
    ];
    for (let bar16 = 0; bar16 < 8; bar16++) {
        for (let step = 0; step < 16; step++) {
            const t = now + bar16 * bar + step * sixteenth;
            const freq = stringPattern[step % stringPattern.length];
            // Add a slight detuned second voice for richness
            makeOsc('sawtooth', freq, t, sixteenth * 0.8, 0.045, 0.001);
            makeOsc('sawtooth', freq * 1.008, t, sixteenth * 0.8, 0.03, 0.001);
        }
    }

    // --- BRASS PUNCHES (every beat, quarter notes) ---
    const brassPattern = [
        { chord: [notes.D3, notes.F3, notes.A3], bar: 0 },
        { chord: [notes.D3, notes.F3, notes.A3], bar: 1 },
        { chord: [notes.Bb3, notes.D4, notes.F4], bar: 2 },
        { chord: [notes.A3, notes.C4, notes.E4], bar: 3 },
        { chord: [notes.D3, notes.F3, notes.A3], bar: 4 },
        { chord: [notes.G3, notes.Bb3, notes.D4], bar: 5 },
        { chord: [notes.A3, notes.C4, notes.E4], bar: 6 },
        { chord: [notes.D3, notes.F3, notes.A3], bar: 7 },
    ];
    brassPattern.forEach(({ chord, bar: b }) => {
        // Hit every beat of that bar
        for (let bt = 0; bt < 4; bt++) {
            const t = now + b * bar + bt * beat;
            chord.forEach(freq => {
                makeOsc('sawtooth', freq, t, beat * 0.35, 0.055, 0.001);
            });
        }
    });

    // --- TENSION MELODY (high register, staccato) ---
    const melodyLine = [
        { n: notes.D4, b: 0 },   { n: notes.F4, b: 0.5 },
        { n: notes.A4, b: 1 },   { n: notes.G4, b: 1.5 },
        { n: notes.F4, b: 2 },   { n: notes.E4, b: 2.5 },
        { n: notes.D4, b: 3 },   { n: notes.Bb4, b: 3.5 },
        { n: notes.A4, b: 4 },   { n: notes.G4, b: 4.5 },
        { n: notes.F4, b: 5 },   { n: notes.E4, b: 5.5 },
        { n: notes.D4, b: 6 },   { n: notes.F4, b: 6.5 },
        { n: notes.A4, b: 7 },   { n: notes.D4, b: 7.75 },
    ];
    melodyLine.forEach(({ n, b }) => {
        const t = now + b * beat;
        makeOsc('square', n, t, beat * 0.4, 0.035, 0.001);
    });

    // --- DRIVING KICK DRUM (on every beat) ---
    for (let b = 0; b < 32; b++) {
        const t = now + b * beat;
        makeOsc('sine', 80, t, 0.18, 0.55, 0.0001);
        makeNoise(t, 0.04, 100, 0.4, 0.2);
    }

    // --- SNARE (beats 2 and 4 of every bar) ---
    for (let bar8 = 0; bar8 < 8; bar8++) {
        [1, 3].forEach(bt => {
            const t = now + bar8 * bar + bt * beat;
            makeNoise(t, 0.14, 3000, 3.5, 0.22);
            makeOsc('sine', 180, t, 0.06, 0.15, 0.0001);
        });
    }

    // --- HIHAT (every eighth note for relentless drive) ---
    for (let step = 0; step < 64; step++) {
        const t = now + step * (beat / 2);
        makeNoise(t, 0.05, 9000, 8.0, 0.04);
    }

    // --- WALKING BASS (eighth notes, urgent) ---
    const bassLine = [
        notes.D2, notes.D2, notes.F3, notes.A2,
        notes.D2, notes.D2, notes.G3, notes.A2,
        notes.D2, notes.E3, notes.F3, notes.E3,
        notes.D2, notes.D2, notes.A2, notes.Bb3,
        notes.D2, notes.D2, notes.F3, notes.A2,
        notes.D2, notes.G3, notes.A2, notes.G3,
        notes.A2, notes.A2, notes.C4, notes.A2,
        notes.D2, notes.F3, notes.A2, notes.D2,
    ];
    bassLine.forEach((freq, i) => {
        const t = now + i * (beat / 2);
        makeOsc('triangle', freq, t, beat * 0.45, 0.3, 0.0001);
        makeOsc('sine', freq * 0.5, t, beat * 0.45, 0.12, 0.0001);
    });

    // Schedule next loop
    musicLoopTimeout = setTimeout(() => {
        if (state.audioEnabled && currentMusicTrack === 'assets/music/battle.mp3') {
            activeMusicNodes = [];
            scheduleBattleLoop();
        }
    }, (loopDuration - 0.08) * 1000);
}