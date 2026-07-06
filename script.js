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