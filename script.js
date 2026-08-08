let isAudioInitialized = false;
let hubTheme = null;
let isMusicPlaying = false;

// Opt out of bfcache entirely. This forces a real fresh page load on back/forward
// navigation, so sessionStorage handles the splash skip cleanly every time.
// beforeunload is used instead of unload — unload is blocked by Permissions Policy
// in some browsers/environments. Both bust bfcache equally well.
window.addEventListener('beforeunload', () => {});

// =========================================
// MOBILE / TABLET DEVICE DETECTION
// Phones, tablets, and iPads all get the black "GET OUT" screen
// instead of the normal warning splash / site. Detection is based on
// the browser's own UA string (plus a touch-point check for modern
// iPads, which disguise themselves as Macs) rather than viewport
// width, so it can't be bypassed just by resizing a desktop window.
// =========================================
function getDeviceType() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';

    // Smart fridges (Samsung Family Hub, LG InstaView ThinQ, etc.) run
    // embedded Tizen/webOS browsers. There's no single standardized UA
    // token for "this is a fridge" the way there is for phones, so this
    // is a best-effort match against the strings these panels are known
    // to expose in the wild, rather than a guaranteed catch-all.
    const isFridgeUA = /family\s*hub|smartfridge|smart\s*fridge|instaview|refrigerator/i.test(ua)
        || (/Tizen/i.test(ua) && /fridge|refrigerator|kitchen/i.test(ua));
    if (isFridgeUA) return 'fridge';

    // Modern iPadOS (13+) reports itself as "Macintosh" in the UA string,
    // so a real Mac has to be told apart from an iPad using touch support.
    // maxTouchPoints isn't always reliably populated by browser device-emulation
    // tools though (e.g. Chrome's Device Toolbar can leave it at 0 even when
    // simulating an iPad Air/Pro), so as a second, independent signal we also
    // check the screen dimensions against the known fixed CSS viewport sizes
    // Apple uses for each iPad model (checked in both orientations).
    const IPAD_VIEWPORT_SIZES = [
        [768, 1024],   // iPad Mini / older 9.7"-10.2" iPads
        [810, 1080],   // iPad (10.9", 10th gen)
        [820, 1180],   // iPad Air (10.9")
        [834, 1194],   // iPad Pro 11"
        [834, 1112],   // iPad Air (10.5")
        [1024, 1366],  // iPad Pro 12.9"
    ];
    const matchesIpadViewport = () => {
        const w = window.screen.width, h = window.screen.height;
        return IPAD_VIEWPORT_SIZES.some(([a, b]) => (w === a && h === b) || (w === b && h === a));
    };

    const isIpad = /iPad/i.test(ua)
        || (/Macintosh/i.test(ua) && (navigator.maxTouchPoints > 1 || matchesIpadViewport()));
    if (isIpad) return 'ipad';

    const isPhoneUA = /iPhone|iPod|BlackBerry|BB10|IEMobile|Opera Mini|Windows Phone|Mobile.*Firefox/i.test(ua)
        || (/Android/i.test(ua) && /Mobile/i.test(ua));
    if (isPhoneUA) return 'phone';

    const isTabletUA = /Tablet|PlayBook|Kindle|Silk|KFAPWI/i.test(ua)
        || (/Android/i.test(ua) && !/Mobile/i.test(ua));
    if (isTabletUA) return 'tablet';

    return null;
}

const deviceType = getDeviceType() || getSpoofedDeviceType();
const isPhone = deviceType !== null;

// =========================================
// "REQUEST DESKTOP SITE" SPOOF DETECTION
// Desktop-mode swaps navigator.userAgent for a desktop string, so the
// regex checks above can miss it entirely. But it can't fake how the
// primary input actually behaves, or the device's real physical panel
// resolution:
//   - pointer:coarse + hover:none means the primary input is a touch
//     finger, not a mouse/trackpad — true regardless of what the UA
//     string claims.
//   - window.screen.width/height is the device's real screen panel
//     size. This is deliberately NOT window.innerWidth/innerHeight,
//     since desktop-mode DOES distort the reported viewport — but it
//     can't shrink the physical monitor/panel itself.
// Both signals have to agree before this fires, so a touchscreen
// laptop (mouse/trackpad as primary input, desktop-sized panel) won't
// get caught by mistake.
// =========================================
function getSpoofedDeviceType() {
    const touchPrimary = window.matchMedia
        && window.matchMedia('(pointer: coarse)').matches
        && window.matchMedia('(hover: none)').matches;
    if (!touchPrimary) return null;

    const hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    if (!hasTouch) return null;

    const shortEdge = Math.min(window.screen.width, window.screen.height);
    const longEdge = Math.max(window.screen.width, window.screen.height);

    // Real phone/tablet panels max out well under typical monitor
    // resolutions on at least one axis.
    if (shortEdge > 1024 || longEdge > 1366) return null;

    const IPAD_VIEWPORT_SIZES = [
        [768, 1024], [810, 1080], [820, 1180],
        [834, 1194], [834, 1112], [1024, 1366],
    ];
    const isIpadSized = IPAD_VIEWPORT_SIZES.some(
        ([a, b]) => (shortEdge === a && longEdge === b) || (shortEdge === b && longEdge === a)
    );
    if (isIpadSized) return 'ipad';

    return shortEdge <= 480 ? 'phone' : 'tablet';
}

if (isPhone) {
    // Phone/tablet/iPad detected — lock the page down to just the block screen.
    // Nothing else in this file (splash, toys, about, music, logo spin)
    // gets wired up.
    document.body.classList.add('mobile-blocked');
    const pageContentEl = document.getElementById('page-content');
    if (pageContentEl) pageContentEl.inert = true;

    // Tapping/clicking the ban screen image plays splash-sound.mp3 —
    // but only when the tap actually lands on a non-transparent pixel
    // of splash-img.png. A hidden canvas holds the image's real pixel
    // data so a click's on-screen position can be mapped back to a
    // source-image pixel and its alpha value checked before playing.
    // A brand new Audio instance is created on every qualifying tap so
    // repeated taps overlap/stack instead of restarting a shared clip.
    const mobileBlockImgEl = document.getElementById('mobile-block-img');
    if (mobileBlockImgEl) {
        const hitTestCanvas = document.createElement('canvas');
        const hitTestCtx = hitTestCanvas.getContext('2d', { willReadFrequently: true });
        let hitTestReady = false;

        function primeHitTestCanvas() {
            hitTestCanvas.width = mobileBlockImgEl.naturalWidth;
            hitTestCanvas.height = mobileBlockImgEl.naturalHeight;
            hitTestCtx.drawImage(mobileBlockImgEl, 0, 0);
            hitTestReady = true;
        }

        if (mobileBlockImgEl.complete && mobileBlockImgEl.naturalWidth > 0) {
            primeHitTestCanvas();
        } else {
            mobileBlockImgEl.addEventListener('load', primeHitTestCanvas);
        }

        mobileBlockImgEl.addEventListener('click', (e) => {
            if (!hitTestReady) return;

            const rect = mobileBlockImgEl.getBoundingClientRect();
            // Map the click's on-screen position to a pixel coordinate
            // in the image's native resolution, accounting for any
            // CSS scaling between the rendered size and natural size.
            const scaleX = hitTestCanvas.width / rect.width;
            const scaleY = hitTestCanvas.height / rect.height;
            const px = Math.floor((e.clientX - rect.left) * scaleX);
            const py = Math.floor((e.clientY - rect.top) * scaleY);

            if (px < 0 || py < 0 || px >= hitTestCanvas.width || py >= hitTestCanvas.height) return;

            const alpha = hitTestCtx.getImageData(px, py, 1, 1).data[3];
            if (alpha === 0) return; // fully transparent — ignore the tap

            new Audio('splash-sound.mp3').play().catch(() => {});

            // Quick scale-up-and-back bounce on every qualifying tap.
            // Restart the animation even on rapid repeat taps by
            // removing the class, forcing a reflow, then re-adding it.
            mobileBlockImgEl.classList.remove('tap-bounce');
            void mobileBlockImgEl.offsetWidth;
            mobileBlockImgEl.classList.add('tap-bounce');
        });
    }

    if (deviceType === 'fridge') {
        // Fridges get a fully custom line instead of the "PUT THAT DAMN
        // ___ AWAY!" template — swap the whole line's content rather
        // than just the device-word span.
        const deviceMessageLineEl = document.getElementById('device-message-line');
        if (deviceMessageLineEl) {
            deviceMessageLineEl.textContent = 'SERIOUSLY? A\u00A0GODDAMN SMARTFRIDGE?!';
        }
    } else {
        const deviceWordEl = document.getElementById('device-word');
        if (deviceWordEl) {
            deviceWordEl.textContent = deviceType === 'ipad' ? 'IPAD'
                : deviceType === 'tablet' ? 'TABLET'
                : 'PHONE';
        }
    }
} else {
    // --- WARNING SPLASH SCREEN ---
    const splashScreen = document.getElementById('warning-splash');
    const splashEnterBtn = document.getElementById('splash-enter');
    const splashLeaveBtn = document.getElementById('splash-leave');
    const pageContent = document.getElementById('page-content');

    const splashAlreadyAccepted = sessionStorage.getItem('splashAccepted') === 'true';

    if (splashAlreadyAccepted) {
        // Returning player — skip splash, show page immediately
        splashScreen.classList.add('splash-hidden');
        document.body.classList.remove('splash-active');
        if (pageContent) pageContent.inert = false;
        // Kick off music (user gesture already happened earlier this session)
        startMusic();
    } else {
        // First visit — show splash as normal
        document.body.classList.add('splash-active');
        if (pageContent) pageContent.inert = true;

        if (splashEnterBtn) {
            splashEnterBtn.addEventListener('click', () => {
                sessionStorage.setItem('splashAccepted', 'true');
                splashScreen.classList.add('splash-hidden');
                document.body.classList.remove('splash-active');
                if (pageContent) pageContent.inert = false;
                startMusic();
            });
        }

        if (splashLeaveBtn) {
            splashLeaveBtn.addEventListener('click', () => {
                window.location.href = 'https://github.com/That1DutchGuy1/thatonedutchguys-shit-ass-toybox.github.io';
            });
        }
    }
}

function startMusic() {
    if (isAudioInitialized) return;
    isAudioInitialized = true;

    hubTheme = new Audio('hub-theme.wav');
    hubTheme.loop = true;
    hubTheme.play().catch(() => {});
    isMusicPlaying = true;

    updateMusicToggleBtn();

    const btn = document.getElementById('music-toggle');
    if (btn) {
        btn.addEventListener('click', () => {
            if (!hubTheme) return;
            if (isMusicPlaying) {
                hubTheme.pause();
                isMusicPlaying = false;
            } else {
                hubTheme.play().catch(() => {});
                isMusicPlaying = true;
            }
            updateMusicToggleBtn();
        });
    }
}

function updateMusicToggleBtn() {
    const btn = document.getElementById('music-toggle');
    if (!btn) return;
    if (isMusicPlaying) {
        btn.textContent = '🔊 MUSIC ON';
        btn.classList.remove('music-off');
        btn.setAttribute('aria-label', 'Music is on — click to turn off');
    } else {
        btn.textContent = '🔇 MUSIC OFF';
        btn.classList.add('music-off');
        btn.setAttribute('aria-label', 'Music is off — click to turn on');
    }
}

// =========================================
// TOYS PANEL
// =========================================
const TOYS = [
    {
        id:       'airhorn',
        label:    'MLG AIRHORN',
        img:      'MLG-Airhorn.png',
        sounds:   ['mlg-airhorn.mp3'],
        overlap:  true,
        cssClass: 'toy-airhorn',
    },
    {
        id:       'pingas',
        label:    'PINGAS',
        img:      'PingasToy.png',
        sounds:   ['pingas.mp3'],
        overlap:  true,
        cssClass: 'toy-pingas',
    },
    {
        id:       'harkinian',
        label:    'KING HARKINIAN',
        img:      'KingHarkinian.png',
        sounds:   ['dinner.mp3'],
        overlap:  true,
        cssClass: 'toy-cd-i-king-harkinian',
    },
    {
        id:       'mama-luigi',
        label:    'MAMA LUIGI',
        img:      'Mama-Luigi.png',
        sounds:   ['Mama-luigi.mp3'],
        overlap:  true,
        cssClass: 'toy-mama-luigi',
    }
    // 👇 Add future toys here — no other changes needed!
];

function buildToysPanel() {
    const panel = document.getElementById('toys-panel');
    if (!panel) return;

    const label = document.createElement('div');
    label.id          = 'toys-panel-label';
    label.textContent = 'MINI TOYBOX';
    panel.appendChild(label);

    TOYS.forEach(toy => {
        const btn = document.createElement('div');
        btn.className = `toy-btn ${toy.cssClass}`;
        btn.title     = toy.label;
        btn.setAttribute('aria-label', toy.label);
        btn.setAttribute('role', 'button');
        btn.setAttribute('tabindex', '0');

        const img = document.createElement('img');
        img.src = toy.img;
        img.alt = toy.label;
        btn.appendChild(img);

        btn.addEventListener('click', () => playToy(toy));
        btn.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') playToy(toy);
        });

        panel.appendChild(btn);
    });
}

function playToy(toy) {
    const src = toy.sounds[Math.floor(Math.random() * toy.sounds.length)];
    if (toy.overlap) {
        const audio = new Audio(src);
        audio.play().catch(() => {});
    } else {
        if (!toy._audio) toy._audio = new Audio(src);
        toy._audio.currentTime = 0;
        toy._audio.play().catch(() => {});
    }
}

if (!isPhone) buildToysPanel();

// =========================================
// ABOUT / README VIEW
// =========================================
const aboutToggleBtn = document.getElementById('about-toggle');
const readmeContentEl = document.getElementById('readme-content');
let aboutIsOpen = false;
let readmeHasLoaded = false;

function setAboutOpen(open) {
    aboutIsOpen = open;
    document.body.classList.toggle('about-active', open);

    if (aboutToggleBtn) {
        aboutToggleBtn.textContent = open ? '✖️ CLOSE' : '📖 ABOUT';
        aboutToggleBtn.setAttribute('aria-pressed', open ? 'true' : 'false');
    }

    if (open && !readmeHasLoaded) {
        loadReadme();
    }
}

function loadReadme() {
    fetch('README.md')
        .then(res => {
            if (!res.ok) throw new Error('status ' + res.status);
            return res.text();
        })
        .then(markdown => {
            // marked.parse() converts the markdown to HTML and leaves any
            // raw HTML tags already in README.md completely untouched.
            readmeContentEl.innerHTML = marked.parse(markdown);
            readmeHasLoaded = true;
        })
        .catch(err => {
            readmeContentEl.innerHTML =
                '<p>Could not load README.md (' + err.message + '). ' +
                'Make sure README.md sits in the same folder as index.html, ' +
                'and that you\'re viewing this over a local/real server rather ' +
                'than opening the file directly.</p>';
        });
}

if (aboutToggleBtn && !isPhone) {
    aboutToggleBtn.addEventListener('click', () => setAboutOpen(!aboutIsOpen));
}

// --- LOGO SMOOTH SPIN ANIMATION ---
const logo = document.querySelector('.main-logo');
let animationFrameId;
let currentRotation = 0;
let isHovered = false;

if (logo && !isPhone) {
    const logoParent = logo.closest('a');

    function spin() {
        if (!isHovered) return;
        currentRotation += 3;
        logo.style.transform = `rotate(${currentRotation}deg)`;
        animationFrameId = requestAnimationFrame(spin);
    }

    logoParent.addEventListener('mouseenter', () => {
        isHovered = true;
        logo.style.transition = 'none';
        animationFrameId = requestAnimationFrame(spin);
    });

    logoParent.addEventListener('mouseleave', () => {
        isHovered = false;
        cancelAnimationFrame(animationFrameId);
        logo.style.transition = 'transform 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
        const remainder = currentRotation % 360;
        currentRotation = currentRotation + (360 - remainder);
        logo.style.transform = `rotate(${currentRotation}deg)`;
    });
}
// =========================================
// GAMEPAD / CONTROLLER NAVIGATION
// D-Pad = move between buttons/toys/game-cards, Right Stick = scroll,
// Cross (X) = select/activate, Circle (O) = back/close.
//
// Button/axis indices below follow the Gamepad API's "standard" layout,
// which is POSITION-based rather than label-based, so this works the
// same way on a DualShock 4, Xbox controller, Switch Pro controller,
// or most other modern gamepads — it's just tuned to feel right for a
// PS4 pad since that's what it's named after.
// =========================================
if (!isPhone) {
    initGamepadNav();
}

function initGamepadNav() {
    const STICK_DEADZONE    = 0.2;
    const SCROLL_SPEED      = 18;  // px per frame at full stick deflection
    const DPAD_REPEAT_DELAY = 380; // ms held before repeat kicks in
    const DPAD_REPEAT_RATE  = 130; // ms between repeats while held

    let activeGamepadIndex = null;
    let rafId = null;
    let selectedEl = null;
    const btnState = {};

    // ---- Input mode tracking ----
    // 'gamepad' = controller is driving; show the selection ring.
    // 'pointer' = mouse/keyboard is driving; hide the ring.
    //
    // Critical invariant: refreshSelection() runs inside pollGamepad() at 60 fps.
    // Without this flag it would re-add the ring immediately after clearSelection()
    // removes it, making the ring impossible to dismiss via mouse/keyboard.
    let inputMode = 'pointer';

    function enterGamepadMode() {
        inputMode = 'gamepad';
        refreshSelection(); // always run — establishes selection on first button press
    }

    function enterPointerMode() {
        inputMode = 'pointer';
        clearSelection();
    }

    // Mousemove: skip the very first event (browsers often fire a synthetic one on
    // load before the user has moved the cursor), then require a 4px delta.
    // Use pointermove (not mousemove) and pointerdown to detect real mouse/touch input.
    // Reasons we avoid the alternatives:
    //   - 'mousemove' fires synthetically when the page scrolls under a stationary
    //     cursor, including when scrollIntoView() runs — that was clearing the
    //     selection immediately after it was set.
    //   - 'keydown' is synthesized by some browsers from gamepad button presses,
    //     which killed the selection the instant a button was pressed.
    // 'pointermove' with pointerType 'mouse' is only fired by real hardware movement.
    let lastPX = -1, lastPY = -1;
    window.addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse') return;
        if (lastPX === -1) { lastPX = e.clientX; lastPY = e.clientY; return; }
        if (Math.abs(e.clientX - lastPX) < 4 && Math.abs(e.clientY - lastPY) < 4) return;
        lastPX = e.clientX; lastPY = e.clientY;
        enterPointerMode();
    }, { passive: true });

    window.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' || e.pointerType === 'touch') enterPointerMode();
    }, { passive: true });

    // ---- Toast ----
    const toast = document.createElement('div');
    toast.className = 'gamepad-toast';
    document.body.appendChild(toast);
    let toastTimeout;

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('gamepad-toast-visible');
        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => toast.classList.remove('gamepad-toast-visible'), 3500);
    }

    // ---- Gamepad connect / disconnect ----
    // We do NOT rely on the 'gamepadconnected' event at all.
    // On Chrome/Linux, that event only fires after a user gesture on the
    // exact document — and the splash screen's inert overlay means the
    // gesture often happens before the page is live, so the event is
    // missed and activeGamepadIndex stays null forever.
    //
    // Instead: the rAF poll loop itself scans getGamepads() every frame.
    // The moment a pad shows up it latches in. No event required.
    //
    // Disconnect is still handled via the event because getGamepads()
    // returns null slots for disconnected pads anyway, so the poll loop
    // already handles it gracefully — the event just gives us the toast.
    window.addEventListener('gamepaddisconnected', e => {
        if (e.gamepad.index !== activeGamepadIndex) return;
        activeGamepadIndex = null;
        enterPointerMode();
        showToast('🎮 Controller disconnected');
    });

    // Kick off the rAF loop immediately — it will find the pad itself.
    rafId = requestAnimationFrame(pollGamepad);

    // ---- Context ----
    function getContext() {
        if (document.body.classList.contains('splash-active')) return 'splash';
        if (document.body.classList.contains('about-active')) return 'about';
        return 'hub';
    }

    function getNavigableElements() {
        const ctx = getContext();
        const about = document.getElementById('about-toggle');
        const music = document.getElementById('music-toggle');

        if (ctx === 'splash') {
            return [document.getElementById('splash-enter'), document.getElementById('splash-leave')]
                .filter(Boolean);
        }
        if (ctx === 'about') {
            return [about, music].filter(Boolean);
        }
        const els = [];
        if (about) els.push(about);
        if (music) els.push(music);
        document.querySelectorAll('.toy-btn').forEach(el => els.push(el));
        document.querySelectorAll('.game-card').forEach(el => els.push(el));
        return els;
    }

    function getScrollTarget() {
        const ctx = getContext();
        if (ctx === 'about')  return document.getElementById('readme-view');
        if (ctx === 'splash') return document.getElementById('warning-splash');
        return null;
    }

    // ---- Selection handling ----
    function clearSelection() {
        if (selectedEl) selectedEl.classList.remove('gamepad-selected');
        selectedEl = null;
    }

    // Only auto-picks list[0] when we are actively in gamepad mode.
    function refreshSelection() {
        if (inputMode !== 'gamepad') return;
        const list = getNavigableElements();
        if (!list.length) { clearSelection(); return; }
        if (!selectedEl || !list.includes(selectedEl)) select(list[0]);
    }

    function select(el) {
        if (!el || selectedEl === el) return;
        if (selectedEl) selectedEl.classList.remove('gamepad-selected');
        selectedEl = el;
        selectedEl.classList.add('gamepad-selected');
        // Manual scroll — scrollIntoView() triggers scroll events that some browsers
        // convert into synthetic pointermove, immediately flipping back to pointer mode.
        const r = selectedEl.getBoundingClientRect();
        const margin = 20;
        if (r.bottom > window.innerHeight - margin)
            window.scrollBy({ top: r.bottom - window.innerHeight + margin, behavior: 'smooth' });
        else if (r.top < margin)
            window.scrollBy({ top: r.top - margin, behavior: 'smooth' });
    }

    // ---- Spatial navigation ----
    function moveSelection(direction) {
        enterGamepadMode();
        const list = getNavigableElements();
        if (!list.length) return;
        if (!selectedEl || !list.includes(selectedEl)) { select(list[0]); return; }

        const curRect = selectedEl.getBoundingClientRect();
        const cx = curRect.left + curRect.width  / 2;
        const cy = curRect.top  + curRect.height / 2;

        let best = null, bestScore = Infinity;
        list.forEach(el => {
            if (el === selectedEl) return;
            const r  = el.getBoundingClientRect();
            const ex = r.left + r.width  / 2;
            const ey = r.top  + r.height / 2;
            const dx = ex - cx, dy = ey - cy;

            let inDir = false, score = 0;
            if (direction === 'up')    { inDir = dy < -1; score = Math.abs(dy) + Math.abs(dx) * 1.5; }
            if (direction === 'down')  { inDir = dy >  1; score = Math.abs(dy) + Math.abs(dx) * 1.5; }
            if (direction === 'left')  { inDir = dx < -1; score = Math.abs(dx) + Math.abs(dy) * 1.5; }
            if (direction === 'right') { inDir = dx >  1; score = Math.abs(dx) + Math.abs(dy) * 1.5; }

            if (inDir && score < bestScore) { bestScore = score; best = el; }
        });
        if (best) select(best);
    }

    function activateSelection() {
        enterGamepadMode();
        if (!selectedEl) return; // enterGamepadMode → refreshSelection already picked one; bail cleanly
        if (selectedEl.classList.contains('game-card')) {
            const link = selectedEl.querySelector('.play-button');
            if (link) { link.click(); return; }
        }
        selectedEl.click();
    }

    function goBack() {
        enterGamepadMode();
        if (getContext() === 'about') {
            const btn = document.getElementById('about-toggle');
            if (btn) btn.click();
        }
    }

    // ---- Non-standard mapping detection & remapping ----
    //
    // On Linux (including Linux Mint), Chrome/Chromium frequently exposes the
    // DualShock 4 with gp.mapping === "" (empty string) instead of "standard".
    // In that raw layout, button and axis indices are completely different:
    //
    //  RAW DS4 layout (Linux, non-standard):
    //   buttons[0]  = Square        buttons[1]  = Cross (✕)
    //   buttons[2]  = Circle (O)    buttons[3]  = Triangle
    //   buttons[4]  = L1            buttons[5]  = R1
    //   buttons[6]  = L2 (analog)   buttons[7]  = R2 (analog)
    //   buttons[8]  = Share         buttons[9]  = Options
    //   buttons[10] = L3            buttons[11] = R3
    //   buttons[12] = PS button     buttons[13] = Touchpad click
    //   axes[0]=LX  axes[1]=LY  axes[2]=RX  axes[3]=RY
    //   axes[4]=L2  axes[5]=R2  (analog triggers as axes, NOT buttons[6/7]!)
    //   D-pad: axes[6] and axes[7]  (-1/0/+1 hat switch axes)
    //
    //  STANDARD mapping (Windows, some Linux setups):
    //   buttons[0]=Cross  buttons[1]=Circle
    //   buttons[12]=DUp   buttons[13]=DDown
    //   buttons[14]=DLeft buttons[15]=DRight
    //   axes[2]=RX  axes[3]=RY (triggers are on buttons, not axes)

    function buildInputMap(gp) {
        const isStandard = gp.mapping === 'standard';
        if (isStandard) {
            return {
                confirm:  () => isButtonPressed(gp, 0),
                back:     () => isButtonPressed(gp, 1),
                dUp:      () => isButtonPressed(gp, 12),
                dDown:    () => isButtonPressed(gp, 13),
                dLeft:    () => isButtonPressed(gp, 14),
                dRight:   () => isButtonPressed(gp, 15),
                // Standard: RX=axes[2], RY=axes[3]
                rsX: () => gp.axes[2] ?? 0,
                rsY: () => gp.axes[3] ?? 0,
                isDpad: index => index >= 12 && index <= 15,
            };
        }

        // Non-standard (raw) DS4 on Linux.
        // D-pad comes in as axes[6] (left/right: -1/0/+1) and axes[7] (up/down: -1/0/+1).
        // We expose the d-pad as virtual "button" slots 100-103 so handleButton can
        // treat them identically — the isDpad check covers these virtual indices.
        return {
            confirm:  () => isButtonPressed(gp, 1),   // Cross
            back:     () => isButtonPressed(gp, 2),   // Circle
            dUp:      () => (gp.axes[7] ?? 0) < -0.5,
            dDown:    () => (gp.axes[7] ?? 0) >  0.5,
            dLeft:    () => (gp.axes[6] ?? 0) < -0.5,
            dRight:   () => (gp.axes[6] ?? 0) >  0.5,
            // Raw DS4: RX=axes[2], RY=axes[3]
            rsX: () => gp.axes[2] ?? 0,
            rsY: () => gp.axes[3] ?? 0,
            isDpad: () => false, // handled separately below via dpad booleans
        };
    }

    function isButtonPressed(gp, index) {
        const btn = gp.buttons[index];
        if (!btn) return false;
        return btn.pressed || btn.value > 0.5;
    }

    // ---- Per-button edge detection + D-pad auto-repeat ----
    // key is a string ID for the virtual input (e.g. 'confirm', 'dUp') so both
    // real button indices and axis-based d-pad use the same state tracking.
    function handleVirtualButton(key, isPressed, onPress, isDpadKey) {
        const now = performance.now();
        const state = btnState[key] || (btnState[key] = { down: false, downSince: 0, lastRepeat: 0 });

        if (isPressed && !state.down) {
            state.down = true;
            state.downSince = now;
            state.lastRepeat = now;
            onPress();
        } else if (isPressed && state.down) {
            if (isDpadKey) {
                const heldFor = now - state.downSince;
                if (heldFor > DPAD_REPEAT_DELAY && now - state.lastRepeat > DPAD_REPEAT_RATE) {
                    state.lastRepeat = now;
                    onPress();
                }
            }
        } else if (!isPressed && state.down) {
            state.down = false;
        }
    }

    // ---- Main polling loop ----
    function pollGamepad() {
        rafId = requestAnimationFrame(pollGamepad);

        const pads = navigator.getGamepads ? navigator.getGamepads() : [];

        // Auto-discover: if we don't have a pad yet, grab the first live one.
        // IMPORTANT: skip non-gamepad HID devices that Chrome exposes as gamepads
        // (e.g. motherboard RGB controllers, LED strips). A real gamepad has at
        // least 10 buttons and 4 axes. Fake HID pads typically have lots of axes
        // but very few buttons (e.g. ASRock LED: 8 buttons, 12 axes).
        if (activeGamepadIndex === null) {
            for (const gp of pads) {
                if (gp && gp.buttons.length >= 10 && gp.axes.length >= 4) {
                    activeGamepadIndex = gp.index;
                    showToast('🎮 Controller connected — D-Pad to move, ✕ to select');
                    enterGamepadMode();
                    break;
                }
            }
            if (activeGamepadIndex === null) return; // still nothing, wait
        }

        const gp = pads[activeGamepadIndex];
        // Pad slot went null (disconnected) — reset and wait for rediscovery.
        if (!gp) { activeGamepadIndex = null; enterPointerMode(); return; }

        // refreshSelection is safe to call every frame — it self-guards via inputMode.
        refreshSelection();

        const map = buildInputMap(gp);

        // Face buttons
        handleVirtualButton('confirm', map.confirm(), activateSelection, false);
        handleVirtualButton('back',    map.back(),    goBack,            false);

        // D-pad (auto-repeat enabled)
        handleVirtualButton('dUp',    map.dUp(),    () => moveSelection('up'),    true);
        handleVirtualButton('dDown',  map.dDown(),  () => moveSelection('down'),  true);
        handleVirtualButton('dLeft',  map.dLeft(),  () => moveSelection('left'),  true);
        handleVirtualButton('dRight', map.dRight(), () => moveSelection('right'), true);

        // Right stick scroll (works for both standard and raw mapping)
        const stickX = map.rsX();
        const stickY = map.rsY();

        const anyStickActive = Math.abs(stickX) > STICK_DEADZONE || Math.abs(stickY) > STICK_DEADZONE;
        if (anyStickActive) {
            if (inputMode !== 'gamepad') enterGamepadMode();
            const dx = 0; // horizontal scroll disabled
            const dy = Math.abs(stickY) > STICK_DEADZONE ? stickY * SCROLL_SPEED : 0;
            const target = getScrollTarget();
            if (target) target.scrollBy(dx, dy);
            else        window.scrollBy(dx, dy);
        }
    }
}