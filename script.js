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
        [1032, 1376],  // iPad Pro 13" (M4)
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

const _uaDeviceType    = getDeviceType();
const _spoofDeviceType = _uaDeviceType === null ? getSpoofedDeviceType() : null;
// Also honour the ?spoof=1 flag passed by device-guard.js when it
// bounces a spoofed visitor from a game page back to the hub.
const _spoofParam      = new URLSearchParams(window.location.search).get('spoof') === '1';
const deviceType       = _uaDeviceType || _spoofDeviceType || (_spoofParam ? 'phone' : null);
const isSpoofed        = (_uaDeviceType === null && _spoofDeviceType !== null) || _spoofParam;
const isPhone          = deviceType !== null;

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
    // Upper bound raised to 1376 to catch iPad Pro 13" (1032×1376).
    if (shortEdge > 1032 || longEdge > 1376) return null;

    const IPAD_VIEWPORT_SIZES = [
        [768, 1024], [810, 1080], [820, 1180],
        [834, 1194], [834, 1112], [1024, 1366],
        [1032, 1376],  // iPad Pro 13" (M4)
    ];
    const isIpadSized = IPAD_VIEWPORT_SIZES.some(
        ([a, b]) => (shortEdge === a && longEdge === b) || (shortEdge === b && longEdge === a)
    );
    if (isIpadSized) return 'ipad';

    return shortEdge <= 480 ? 'phone' : 'tablet';
}

// =========================================
// Helper: wire up the tap-bounce + sound on any ban-screen image
// =========================================
function wireBanScreenImage(imgEl, soundSrc) {
    if (!imgEl) return;
    soundSrc = soundSrc || './hub-assets/splash-sound.mp3';
    const hitTestCanvas = document.createElement('canvas');
    const hitTestCtx = hitTestCanvas.getContext('2d', { willReadFrequently: true });
    let hitTestReady = false;

    function primeHitTestCanvas() {
        hitTestCanvas.width = imgEl.naturalWidth;
        hitTestCanvas.height = imgEl.naturalHeight;
        hitTestCtx.drawImage(imgEl, 0, 0);
        hitTestReady = true;
    }

    if (imgEl.complete && imgEl.naturalWidth > 0) {
        primeHitTestCanvas();
    } else {
        imgEl.addEventListener('load', primeHitTestCanvas);
    }

    imgEl.addEventListener('click', (e) => {
        if (!hitTestReady) return;
        const rect = imgEl.getBoundingClientRect();
        const scaleX = hitTestCanvas.width / rect.width;
        const scaleY = hitTestCanvas.height / rect.height;
        const px = Math.floor((e.clientX - rect.left) * scaleX);
        const py = Math.floor((e.clientY - rect.top) * scaleY);
        if (px < 0 || py < 0 || px >= hitTestCanvas.width || py >= hitTestCanvas.height) return;
        const alpha = hitTestCtx.getImageData(px, py, 1, 1).data[3];
        if (alpha === 0) return;
        new Audio(soundSrc).play().catch(() => {});
        imgEl.classList.remove('tap-bounce');
        void imgEl.offsetWidth;
        imgEl.classList.add('tap-bounce');
    });
}

if (isPhone) {
    // Phone/tablet/iPad detected — lock the page down to just the block screen.
    // Nothing else in this file (splash, toys, about, music, logo spin)
    // gets wired up.
    const pageContentEl = document.getElementById('page-content');
    if (pageContentEl) pageContentEl.inert = true;

    if (isSpoofed) {
        // =============================================
        // SPOOF DETECTED — "Request Desktop Site" mode
        // Show the unique Pingas ban screen instead of
        // the regular mobile block screen.
        // =============================================
        document.body.classList.add('spoof-blocked');

        // Populate the dynamic device name in the ban text
        const spoofDeviceWordEl = document.getElementById('spoof-device-word');
        if (spoofDeviceWordEl) {
            spoofDeviceWordEl.textContent = deviceType === 'ipad'   ? 'IPAD'
                                          : deviceType === 'tablet' ? 'TABLET'
                                          : 'PHONE';
        }

        wireBanScreenImage(document.getElementById('spoof-block-img'), './hub-assets/pingas.mp3');

    } else {
        // =============================================
        // Regular mobile / tablet / fridge detection
        // =============================================
        document.body.classList.add('mobile-blocked');

        wireBanScreenImage(document.getElementById('mobile-block-img'));

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
        shuffleGameCards();
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
                shuffleGameCards();
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

    hubTheme = new Audio('./hub-assets/hub-theme.wav');
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
        img:      './hub-assets/MLG-Airhorn.png',
        sounds:   ['./hub-assets/mlg-airhorn.mp3'],
        overlap:  true,
        cssClass: 'toy-airhorn',
    },
    {
        id:       'pingas',
        label:    'PINGAS',
        img:      './hub-assets/PingasToy.png',
        sounds:   ['./hub-assets/pingas.mp3'],
        overlap:  true,
        cssClass: 'toy-pingas',
    },
    {
        id:       'harkinian',
        label:    'KING HARKINIAN',
        img:      './hub-assets/KingHarkinian.png',
        sounds:   ['./hub-assets/Mah-Boi.mp3'],
        overlap:  true,
        cssClass: 'toy-cd-i-king-harkinian',
    },
    {
        id:       'mama-luigi',
        label:    'MAMA LUIGI',
        img:      './hub-assets/Mama-Luigi.png',
        sounds:   ['./hub-assets/Mama-luigi.mp3'],
        overlap:  true,
        cssClass: 'toy-mama-luigi',
    },
    {
        id:       'mario-toast',
        label:    'MARIO TOAST',
        img:      './hub-assets/Mario-Toast.png',
        sounds:   ['./hub-assets/toast.mp3'],
        overlap:  true,
        cssClass: 'toy-mario-toast',
    }
];

// =========================================
// BEEG TOYBOX TOYS
// Same toys as MINI TOYBOX by default, PLUS any future exclusives!
// 👇 Add BEEG TOYBOX exclusive toys below the spread of TOYS!
// =========================================
const BEEG_TOYS = [
    ...TOYS,
    // 👇 BEEG TOYBOX exclusives go here — e.g.:
    { id: 'weegee', label: 'WEEGEE', img: './hub-assets/Weegee-Head.png', sounds: ['./weegees-mansion/Audio/Weegee/weegee-isolated.mp3'], overlap: true, cssClass: 'toy-weegee' },
    { id: 'spaghetti', label: 'SPAGHETTI', img: './hub-assets/Spaghetti.png', sounds: ['./hub-assets/spaghetti.mp3'], overlap: true, cssClass: 'toy-spaghetti' },
    { id: 'michael-rosen', label: 'MICHAEL ROSEN', img: './big-meme-quiz/assets/memes/michael-rosen.png', sounds: ['./whack-a-meme/assets/sounds/nice-score.mp3'], overlap: true, cssClass: 'toy-michael-rosen' },
    { id: 'morshu', label: 'MORSHU', img: './cd-i-meme-soundboard/assets/images/Morshu-CD-i.png', sounds: ['./cd-i-meme-soundboard/assets/soundeffects/Lamp-Oil.mp3'], overlap: true, cssClass: 'toy-morshu' },
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
// BEEG TOYBOX
// =========================================
function buildBeegToybox() {
    const container = document.getElementById('beeg-toys-container');
    if (!container) return;

    BEEG_TOYS.forEach(toy => {
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

        container.appendChild(btn);
    });
}

let beegToyboxIsOpen  = false;
let beegToyboxBuilt   = false;

function setBeegToyboxOpen(open) {
    beegToyboxIsOpen = open;
    document.body.classList.toggle('beeg-toybox-active', open);

    const btn = document.getElementById('beeg-toybox-toggle');
    if (btn) {
        btn.textContent = open ? '🎮 SHIT ASS TOYBOX' : '🧸 BEEG TOYBOX';
    }

    // Close About and Meme Art views if open
    if (open && aboutIsOpen) setAboutOpen(false);
    if (open && memeArtIsOpen) setMemeArtOpen(false);

    // Build the toybox contents on first open (lazy)
    if (open && !beegToyboxBuilt) {
        buildBeegToybox();
        beegToyboxBuilt = true;
    }
}

const beegToyboxToggleBtn = document.getElementById('beeg-toybox-toggle');
if (beegToyboxToggleBtn && !isPhone) {
    beegToyboxToggleBtn.addEventListener('click', () => setBeegToyboxOpen(!beegToyboxIsOpen));
}

// =========================================
// ABOUT / README + WIKI VIEW
// =========================================

// =========================================
// EXTERNAL DOCS
// These are hosted externally on my other GitHub repos, and are loaded dynamically into the About viewer!
// They'll show up as extra pages after README and Wiki in the About viewer,
// navigated with the same left/right arrows. Easy peasy! 🎉
// =========================================
const EXTERNAL_DOCS = [
    // 👇 Drop your external Markdown doc URLs here!
{ label: '📀 DVD-R ISO Hangar', url: 'https://raw.githubusercontent.com/That1DutchGuy1/That-One-Dutch-Guys-DVD-R-ISO-Hangar/refs/heads/main/README.md' },
{ label: '👑 King Harkinian Desktop Pet', url: 'https://raw.githubusercontent.com/That1DutchGuy1/King-Harkinian-Desktop-Pet/refs/heads/main/README.md' },
{ label: '🦠 Weegee Virus Prank App', url: 'https://raw.githubusercontent.com/That1DutchGuy1/The-Weegee-Virus-Prank/refs/heads/main/README.md' },
{ label: '🤪 CD-i WhatsApp Sticker Pack', url: 'https://raw.githubusercontent.com/That1DutchGuy1/Funny-CD-i-Themed-WhatsApp-Sticker-Pack/refs/heads/main/README.md' },
{ label: '🖼️ My Fucking Artwork', url: 'https://raw.githubusercontent.com/That1DutchGuy1/My-Fucking-Artwork/refs/heads/main/README.md' },
{ label: '🔊 Soundbuttons', url: 'https://raw.githubusercontent.com/That1DutchGuy1/That-One-Dutch-Guys-Soundbuttons/refs/heads/main/README.md' },
{ label: '📼 My YTP Videos', url: 'https://raw.githubusercontent.com/That1DutchGuy1/My-YTP-videos/refs/heads/main/README.md' }
];

// =========================================
// DOC SYSTEM — README (index 0) + Wiki (index 1) are hardcoded local files.
// Any entries in EXTERNAL_DOCS get appended after them as indices 2, 3, 4...
// The left/right arrows navigate through ALL of them in order.
// =========================================
const aboutToggleBtn   = document.getElementById('about-toggle');
const readmeContentEl  = document.getElementById('readme-content');
const wikiContentEl    = document.getElementById('wiki-content');
const docTitleLabel    = document.getElementById('doc-title-label');
const arrowLeft        = document.getElementById('doc-arrow-left');
const arrowRight       = document.getElementById('doc-arrow-right');

// Build the full doc list: README (0), Wiki (1), then external docs (2+)
const DOC_LIST = [
    { id: 'readme', label: '📖 README.md',  local: true  },
    { id: 'wiki',   label: '📚 Wiki.md',    local: true  },
    ...EXTERNAL_DOCS.map((d, i) => ({
        id:    'ext-' + i,
        label: d.label,
        url:   d.url,
        local: false,
    })),
];

let aboutIsOpen  = false;
let currentDocIndex = 0;

// Per-doc load state: null = not loaded, 'loading', 'done', 'error'
const docLoadState = {};
// Cache for fetched external markdown HTML (keyed by doc id)
const docContentCache = {};

function setAboutOpen(open) {
    aboutIsOpen = open;
    document.body.classList.toggle('about-active', open);

    if (aboutToggleBtn) {
        aboutToggleBtn.textContent = open ? '✖️ CLOSE' : '📖 ABOUT';
        aboutToggleBtn.setAttribute('aria-pressed', open ? 'true' : 'false');
    }

    if (open) {
        // Close BEEG TOYBOX if it's open
        if (beegToyboxIsOpen) setBeegToyboxOpen(false);
        // Always land on README when opening About
        navigateToDoc(0);
    }
}

function navigateToDoc(index) {
    if (index < 0 || index >= DOC_LIST.length) return;
    currentDocIndex = index;
    const doc = DOC_LIST[index];

    // Update title bar
    if (docTitleLabel) docTitleLabel.textContent = doc.label;

    // Arrow states — dim at the ends
    if (arrowLeft)  arrowLeft.classList.toggle('arrow-inactive',  index === 0);
    if (arrowRight) arrowRight.classList.toggle('arrow-inactive', index === DOC_LIST.length - 1);

    // Update arrows' tooltip titles so hovering shows what's next/prev
    if (arrowLeft)  arrowLeft.title  = index > 0                      ? DOC_LIST[index - 1].label : '';
    if (arrowRight) arrowRight.title = index < DOC_LIST.length - 1    ? DOC_LIST[index + 1].label : '';

    // Show/hide the right content container and load if needed
    if (doc.id === 'readme') {
        readmeContentEl.style.display = '';
        wikiContentEl.style.display   = 'none';
        hideAllExternalDocEls();
        if (!docLoadState['readme']) loadLocalDoc('readme');
    } else if (doc.id === 'wiki') {
        readmeContentEl.style.display = 'none';
        wikiContentEl.style.display   = '';
        hideAllExternalDocEls();
        if (!docLoadState['wiki']) loadLocalDoc('wiki');
    } else {
        // External doc
        readmeContentEl.style.display = 'none';
        wikiContentEl.style.display   = 'none';
        showExternalDoc(doc);
    }
}

// Hide all dynamically created external doc elements
function hideAllExternalDocEls() {
    document.querySelectorAll('.ext-doc-content').forEach(el => el.style.display = 'none');
}

// ── Local doc loader (README + Wiki stay exactly as before) ──────────────────

function loadLocalDoc(which) {
    docLoadState[which] = 'loading';
    const el       = which === 'readme' ? readmeContentEl : wikiContentEl;
    const filename = which === 'readme' ? 'README.md' : 'Wiki.md';

    fetch(filename)
        .then(res => {
            if (!res.ok) throw new Error('status ' + res.status);
            return res.text();
        })
        .then(markdown => {
            el.innerHTML = marked.parse(markdown);
            docLoadState[which] = 'done';
        })
        .catch(err => {
            el.innerHTML =
                '<p>Could not load ' + filename + ' (' + err.message + '). ' +
                'Make sure ' + filename + ' sits in the same folder as index.html, ' +
                'and that you\'re viewing this over a local/real server rather ' +
                'than opening the file directly.</p>';
            docLoadState[which] = 'error';
        });
}

// ── External doc loader ───────────────────────────────────────────────────────

// Rewrites relative URLs in a rendered external doc so that repo-relative
// image paths (e.g. ./king-pet/King.png or ../assets/foo.png) resolve correctly
// against the raw.githubusercontent.com base URL of the doc, instead of
// trying to load from the Toybox domain and 404ing. Also fixes relative
// anchor hrefs so in-repo links open on GitHub rather than going nowhere.
function rewriteRelativeUrls(containerEl, docUrl) {
    // Build a base URL from the doc's raw URL.
    // e.g. https://raw.githubusercontent.com/User/Repo/refs/heads/main/README.md
    //   →  https://raw.githubusercontent.com/User/Repo/refs/heads/main/
    const base = docUrl.substring(0, docUrl.lastIndexOf('/') + 1);

    // For anchor hrefs pointing to other .md files or relative paths,
    // we'll link to the GitHub HTML view instead of raw so it's readable.
    // e.g. raw.githubusercontent.com/User/Repo/refs/heads/main/
    //   →  github.com/User/Repo/blob/main/
    const githubBase = base
        .replace('https://raw.githubusercontent.com/', 'https://github.com/')
        .replace('/refs/heads/', '/blob/');

    // Fix <img src="..."> — load images from raw.githubusercontent.com
    containerEl.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src');
        if (src && !src.match(/^(https?:|data:|\/\/)/)) {
            img.src = new URL(src, base).href;
        }
    });

    // Fix <a href="..."> — open relative links on GitHub in a new tab
    containerEl.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href');
        if (href && !href.match(/^(https?:|mailto:|#|\/\/)/)) {
            a.href   = new URL(href, githubBase).href;
            a.target = '_blank';
            a.rel    = 'noopener noreferrer';
        }
    });
}

function showExternalDoc(doc) {
    hideAllExternalDocEls();

    // Get or create a content div for this external doc
    let el = document.getElementById('ext-doc-' + doc.id);
    if (!el) {
        el = document.createElement('div');
        el.id        = 'ext-doc-' + doc.id;
        el.className = 'ext-doc-content';
        // Insert it after wiki-content inside readme-panel
        const panel = document.getElementById('readme-panel');
        if (panel) panel.appendChild(el);
    }

    el.style.display = '';

    // Already loaded — nothing to do!
    if (docLoadState[doc.id] === 'done' || docLoadState[doc.id] === 'loading') return;

    // Kick off the fetch
    docLoadState[doc.id] = 'loading';
    el.innerHTML = '<p class="readme-loading">loading ' + doc.label + ' ...</p>';

    fetch(doc.url)
        .then(res => {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
        })
        .then(markdown => {
            el.innerHTML = marked.parse(markdown);
            rewriteRelativeUrls(el, doc.url);
            docLoadState[doc.id] = 'done';
        })
        .catch(err => {
            el.innerHTML =
                '<p>Could not load <strong>' + doc.label + '</strong> (' + err.message + '). ' +
                'Make sure the URL is a raw Markdown URL (raw.githubusercontent.com) ' +
                'and not a regular GitHub page URL.</p>';
            docLoadState[doc.id] = 'error';
        });
}

if (aboutToggleBtn && !isPhone) {
    aboutToggleBtn.addEventListener('click', () => setAboutOpen(!aboutIsOpen));
}

if (arrowRight && !isPhone) {
    arrowRight.addEventListener('click', () => {
        if (currentDocIndex < DOC_LIST.length - 1) navigateToDoc(currentDocIndex + 1);
    });
}

if (arrowLeft && !isPhone) {
    arrowLeft.addEventListener('click', () => {
        if (currentDocIndex > 0) navigateToDoc(currentDocIndex - 1);
    });
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
        if (document.body.classList.contains('splash-active'))       return 'splash';
        if (document.body.classList.contains('about-active'))        return 'about';
        if (document.body.classList.contains('beeg-toybox-active'))  return 'beeg';
        return 'hub';
    }

    function getNavigableElements() {
        const ctx = getContext();
        const about = document.getElementById('about-toggle');
        const music = document.getElementById('music-toggle');
        const beeg  = document.getElementById('beeg-toybox-toggle');

        if (ctx === 'splash') {
            return [document.getElementById('splash-enter'), document.getElementById('splash-leave')]
                .filter(Boolean);
        }
        if (ctx === 'about') {
            return [about, music].filter(Boolean);
        }
        if (ctx === 'beeg') {
            const els = [beeg, music].filter(Boolean);
            document.querySelectorAll('#beeg-toys-container .toy-btn').forEach(el => els.push(el));
            return els;
        }
        const els = [];
        if (about) els.push(about);
        if (beeg)  els.push(beeg);
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
        } else if (getContext() === 'beeg') {
            const btn = document.getElementById('beeg-toybox-toggle');
            if (btn) btn.click();
        }
    }

    // L1 in About context = previous doc (left arrow)
    function docNavLeft() {
        enterGamepadMode();
        if (getContext() !== 'about') return;
        if (currentDocIndex > 0) {
            navigateToDoc(currentDocIndex - 1);
            showToast(DOC_LIST[currentDocIndex].label);
        }
    }

    // R1 in About context = next doc (right arrow)
    function docNavRight() {
        enterGamepadMode();
        if (getContext() !== 'about') return;
        if (currentDocIndex < DOC_LIST.length - 1) {
            navigateToDoc(currentDocIndex + 1);
            showToast(DOC_LIST[currentDocIndex].label);
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
                // L1 = buttons[4], R1 = buttons[5] in the standard mapping
                l1:       () => isButtonPressed(gp, 4),
                r1:       () => isButtonPressed(gp, 5),
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
        // Raw DS4: L1 = buttons[4], R1 = buttons[5] -- same indices as standard, nice!
        return {
            confirm:  () => isButtonPressed(gp, 1),   // Cross
            back:     () => isButtonPressed(gp, 2),   // Circle
            l1:       () => isButtonPressed(gp, 4),   // L1
            r1:       () => isButtonPressed(gp, 5),   // R1
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
                    showToast('🎮 Controller connected — D-Pad to move, ✕ to select, L1/R1 to flip docs');
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

        // Shoulder buttons — L1/R1 flip between README and Wiki in the About view
        handleVirtualButton('l1', map.l1(), docNavLeft,  false);
        handleVirtualButton('r1', map.r1(), docNavRight, false);

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

// =========================================
// GAME CARD SHUFFLE
// Randomises the order of .game-card elements inside .game-container
// every time the page is revealed (first visit & return visits).
// Each card keeps its own class/styles — only DOM order changes.
// =========================================
function shuffleGameCards() {
    const container = document.querySelector('.game-container');
    if (!container) return;

    const cards = Array.from(container.querySelectorAll('.game-card'));
    // Fisher-Yates shuffle
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        container.insertBefore(cards[j], cards[i]);
        // Swap in our local array to keep indices accurate
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
}

// =========================================
// MEME ART GALLERY
// Artwork array — swap in your real URLs here!
// aspect: 'landscape' = 16:9 (4K/2K/1080p), 'weird' = anything else
// =========================================
const MEME_ARTWORKS = [
    {
        title: "4K Bliss With Weegee",
        url: "https://raw.githubusercontent.com/That1DutchGuy1/My-Fucking-Artwork/main/4K_Bliss_With_Weegee.png",
        aspect: "landscape"
    },
    {
        title: "4K Bliss With Memes",
        url: "https://raw.githubusercontent.com/That1DutchGuy1/My-Fucking-Artwork/main/Bliss-With-Memes.png",
        aspect: "landscape"
    },
    {
        title: "CD-i Zelda Phone Wallpaper",
        url: "https://raw.githubusercontent.com/That1DutchGuy1/My-Fucking-Artwork/main/CD-i-Zelda-Phone-Wallpaper.png",
        aspect: "weird"
    },
    {
        title: "2K Bliss With Weegee - Invasion Edition",
        url: "https://raw.githubusercontent.com/That1DutchGuy1/My-Fucking-Artwork/main/2K-Bliss-Weegee-Invasion.png",
        aspect: "landscape"
    },
    {
        title: "Hotel Mario & King Harkinian Splitscreen",
        url: "https://raw.githubusercontent.com/That1DutchGuy1/My-Fucking-Artwork/main/Hotel-Mario-King-Harkinian-Splitscreen.jpg",
        aspect: "landscape"
    },
    {
        title: "King Harkinian's Grand Dinner",
        url: "https://raw.githubusercontent.com/That1DutchGuy1/My-Fucking-Artwork/main/King%20Harkinian's%20GRAND%20DINNER.png",
        aspect: "landscape"
    },
    {
        title: "King Harkinian's Big Ass Dinner",
        url: "https://raw.githubusercontent.com/That1DutchGuy1/My-Fucking-Artwork/main/King-Harkinians-Big-Ass-Dinner.png",
        aspect: "landscape"
    },
    {
        title: "CD-i Pileup",
        url: "https://raw.githubusercontent.com/That1DutchGuy1/My-Fucking-Artwork/main/Cd-i-Pileup.png",
        aspect: "landscape"
    },
    {
        title: "Bliss With Weegee - Phone Edition",
        url: "https://raw.githubusercontent.com/That1DutchGuy1/My-Fucking-Artwork/main/Bliss-With-Weegee-Phone-Edition.png",
        aspect: "weird"
    },
    {
        title: "Shit Ass Toybox Social Preview",
        url: "./hub-assets/social-preview.png",
        aspect: "weird"
    },
    {
        title: "2K Meme Mafia Desktop Wallpaper",
        url: "https://raw.githubusercontent.com/That1DutchGuy1/My-Fucking-Artwork/main/meme-mafia-desktop-wallpaper.png",
        aspect: "landscape"
    },
    {
        title: "PAL DVD Menu Background",
        url: "https://raw.githubusercontent.com/That1DutchGuy1/My-Fucking-Artwork/main/DVD-menu-background.png",
        aspect: "weird"
    },
    {
        title: "King Harkinian's Personal Chef Simulator Main Menu Background",
        url: "./king-harkinians-personal-chef-simulator/assets/backdrops/menu-background.png",
        aspect: "landscape"
    },
    {
        title: "2K Hotel Mario Desktop Wallpaper",
        url: "https://raw.githubusercontent.com/That1DutchGuy1/My-Fucking-Artwork/main/hotel-mario-wallpaper.png",
        aspect: "landscape"
    },
];

let memeArtIsOpen  = false;
let memeArtIndex   = 0;

const memeArtToggleBtn  = document.getElementById('meme-art-toggle');
const memeArtView       = document.getElementById('meme-art-view');
const memeArtImg        = document.getElementById('meme-art-img');
const memeArtTitleLabel = document.getElementById('meme-art-title-label');
const memeArtDownload   = document.getElementById('meme-art-download');
const memeArtArrowLeft  = document.getElementById('meme-art-arrow-left');
const memeArtArrowRight = document.getElementById('meme-art-arrow-right');

function setMemeArtOpen(open) {
    memeArtIsOpen = open;
    document.body.classList.toggle('meme-art-active', open);

    if (memeArtToggleBtn) {
        memeArtToggleBtn.textContent = open ? '✖️ BACK TO TOYBOX' : '🎨 MEME ART';
    }

    // Close other panels if open
    if (open) {
        if (aboutIsOpen) setAboutOpen(false);
        if (beegToyboxIsOpen) setBeegToyboxOpen(false);
        renderMemeArt(memeArtIndex);
    }
}

function renderMemeArt(idx) {
    const art = MEME_ARTWORKS[idx];
    if (!art) return;

    // Set image src and aspect class
    memeArtImg.src = art.url;
    memeArtImg.alt = art.title;
    memeArtImg.className = 'art-' + art.aspect;

    // Title + counter
    memeArtTitleLabel.textContent =
        art.title + '  (' + (idx + 1) + ' / ' + MEME_ARTWORKS.length + ')';

    // Download button — raw.githubusercontent.com has open CORS (access-control-allow-origin: *)
    // so we can fetch it directly as a blob and trigger a real download. No proxy needed!
    const filename = art.title.replace(/\s+/g, '_') + '.' + (art.url.split('.').pop() || 'png');
    memeArtDownload.removeAttribute('href');
    memeArtDownload.removeAttribute('download');
    memeArtDownload.onclick = function(e) {
        e.preventDefault();
        const btn = memeArtDownload;
        btn.textContent = '⏳ DOWNLOADING...';
        fetch(art.url)
            .then(res => {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.blob();
            })
            .then(blob => {
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                btn.textContent = '⬇️ DOWNLOAD';
            })
            .catch(err => {
                console.error('Meme art download failed:', err);
                btn.textContent = '⬇️ DOWNLOAD';
                // Last resort: open raw URL so they can right-click → Save As
                window.open(art.url, '_blank', 'noopener,noreferrer');
            });
    };

    // Dim arrows at the ends
    memeArtArrowLeft.classList.toggle('arrow-inactive', idx === 0);
    memeArtArrowRight.classList.toggle('arrow-inactive', idx === MEME_ARTWORKS.length - 1);
}

function memeArtPrev() {
    if (memeArtIndex > 0) {
        memeArtIndex--;
        renderMemeArt(memeArtIndex);
    }
}

function memeArtNext() {
    if (memeArtIndex < MEME_ARTWORKS.length - 1) {
        memeArtIndex++;
        renderMemeArt(memeArtIndex);
    }
}

if (memeArtToggleBtn && !isPhone) {
    memeArtToggleBtn.addEventListener('click', () => setMemeArtOpen(!memeArtIsOpen));
}

if (memeArtArrowLeft)  memeArtArrowLeft.addEventListener('click',  memeArtPrev);
if (memeArtArrowRight) memeArtArrowRight.addEventListener('click', memeArtNext);

// Keyboard navigation while Meme Art is open
document.addEventListener('keydown', e => {
    if (!memeArtIsOpen) return;
    if (e.key === 'ArrowLeft')  { e.preventDefault(); memeArtPrev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); memeArtNext(); }
    if (e.key === 'Escape')     { setMemeArtOpen(false); }
});

// =========================================
// YTP TV
// =========================================

// ---- VIDEO LIBRARY — drop your GitHub-hosted MP4 URLs in here! ----
const YTP_VIDEOS = [
    {
        title: "The King Hates Bad Shrek Toys",
        url: "https://that1dutchguy1.github.io/My-YTP-videos/cd-i-zelda-youtube-poop.mp4",
        thumbnail: "https://that1dutchguy1.github.io/My-YTP-videos/cd-i-zelda-youtube-poop-thumbnail.png"
    },
    {
        title: "Rick Astley Doesn't Give A Fuck",
        url: "https://that1dutchguy1.github.io/My-YTP-videos/rick-astley-ytp.mp4",
        thumbnail: "https://that1dutchguy1.github.io/My-YTP-videos/rick-astley-ytp-thumbnail.png"
    },
    {
        title: "Hotel Mario Insanity",
        url: "https://that1dutchguy1.github.io/My-YTP-videos/hotel-mario-insanity.mp4",
        thumbnail: "https://that1dutchguy1.github.io/My-YTP-videos/hotel-mario-insanity-thumbnail.png"
    },
    // Add more entries here whenever you want, no other changes needed!
];

let ytpTvIsOpen = false;
let ytpTvIndex  = 0;

// ---- DOM refs ----
const ytpTvToggleBtn  = document.getElementById('ytp-tv-toggle');
const ytpTvView       = document.getElementById('ytp-tv-view');
const ytpTvTitleLabel = document.getElementById('ytp-tv-title-label');
const ytpTvArrowLeft  = document.getElementById('ytp-tv-arrow-left');
const ytpTvArrowRight = document.getElementById('ytp-tv-arrow-right');
const ytpTvPlayerWrap = document.getElementById('ytp-tv-player-wrap');

// Video element
const ytpVideo        = document.getElementById('ytp-tv-video');

// Custom controls
const ytpPlayBtn      = document.getElementById('ytp-tv-play-btn');
const ytpRestartBtn   = document.getElementById('ytp-tv-restart-btn');
const ytpMuteBtn      = document.getElementById('ytp-tv-mute-btn');
const ytpVolSlider    = document.getElementById('ytp-tv-vol-slider');
const ytpScrubber     = document.getElementById('ytp-tv-scrubber');
const ytpFill         = document.getElementById('ytp-tv-progress-bar-fill');
const ytpTimeDisplay  = document.getElementById('ytp-tv-time-display');
const ytpFullscreenBtn = document.getElementById('ytp-tv-fullscreen-btn');
const ytpThumbnail     = document.getElementById('ytp-tv-thumbnail');

// ---- Helper: format seconds as m:ss ----
function ytpFormatTime(secs) {
    if (!isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
}

// ---- Load a video by index ----
function ytpLoadVideo(idx) {
    const vid = YTP_VIDEOS[idx];
    if (!vid) return;

    // Title + counter
    ytpTvTitleLabel.textContent = vid.title + '  (' + (idx + 1) + ' / ' + YTP_VIDEOS.length + ')';

    // Swap src
    ytpVideo.pause();
    ytpVideo.src = vid.url;
    ytpVideo.load();

    // Reset controls
    ytpFill.style.width        = '0%';
    ytpScrubber.value          = 0;
    ytpTimeDisplay.textContent = '0:00 / 0:00';
    ytpPlayBtn.textContent     = '▶';
    ytpTvPlayerWrap.classList.add('is-paused');
    ytpTvPlayerWrap.classList.remove('is-playing');

    // Show thumbnail if available
    ytpThumbnail.src = vid.thumbnail || '';

    // Dim arrows at ends
    ytpTvArrowLeft.classList.toggle('arrow-inactive',  idx === 0);
    ytpTvArrowRight.classList.toggle('arrow-inactive', idx === YTP_VIDEOS.length - 1);
}

// ---- Open / close the panel ----
function setYtpTvOpen(open) {
    ytpTvIsOpen = open;
    document.body.classList.toggle('ytp-tv-active', open);

    if (ytpTvToggleBtn) {
        ytpTvToggleBtn.textContent = open ? '✖️ BACK TO TOYBOX' : '📺 YTP TV';
    }

    if (open) {
        // Close every other panel
        if (typeof setAboutOpen      === 'function' && aboutIsOpen)      setAboutOpen(false);
        if (typeof setBeegToyboxOpen === 'function' && beegToyboxIsOpen) setBeegToyboxOpen(false);
        if (typeof setMemeArtOpen    === 'function' && memeArtIsOpen)    setMemeArtOpen(false);
        ytpLoadVideo(ytpTvIndex);
    } else {
        // Pause when closing
        ytpVideo.pause();
        ytpPlayBtn.textContent = '▶';
        ytpTvPlayerWrap.classList.add('is-paused');
    }
}

// ---- Navigation ----
function ytpPrev() {
    if (ytpTvIndex > 0) {
        ytpTvIndex--;
        ytpLoadVideo(ytpTvIndex);
    }
}

function ytpNext() {
    if (ytpTvIndex < YTP_VIDEOS.length - 1) {
        ytpTvIndex++;
        ytpLoadVideo(ytpTvIndex);
    }
}

// ---- Play / Pause ----
function ytpTogglePlay() {
    if (ytpVideo.paused) {
        ytpVideo.play().catch(() => {});
    } else {
        ytpVideo.pause();
    }
}

// Sync play button & paused class with actual video state
ytpVideo.addEventListener('play', () => {
    ytpPlayBtn.textContent = '⏸';
    ytpTvPlayerWrap.classList.remove('is-paused');
    ytpTvPlayerWrap.classList.add('is-playing');

    // Pause the hub music when a video starts playing
    if (isMusicPlaying && hubTheme) {
        hubTheme.pause();
        isMusicPlaying = false;
        updateMusicToggleBtn();
    }
});
ytpVideo.addEventListener('pause', () => {
    ytpPlayBtn.textContent = '▶';
    ytpTvPlayerWrap.classList.add('is-paused');
});

// ---- Progress bar ----
ytpVideo.addEventListener('timeupdate', () => {
    if (!ytpVideo.duration) return;
    const pct = (ytpVideo.currentTime / ytpVideo.duration) * 100;
    ytpFill.style.width        = pct + '%';
    ytpScrubber.value          = Math.round((ytpVideo.currentTime / ytpVideo.duration) * 1000);
    ytpTimeDisplay.textContent = ytpFormatTime(ytpVideo.currentTime) + ' / ' + ytpFormatTime(ytpVideo.duration);
});

// ---- Scrub ----
ytpScrubber.addEventListener('input', () => {
    if (!ytpVideo.duration) return;
    ytpVideo.currentTime = (ytpScrubber.value / 1000) * ytpVideo.duration;
});

// ---- Volume ----
ytpVolSlider.addEventListener('input', () => {
    ytpVideo.volume = ytpVolSlider.value / 100;
    ytpVideo.muted  = ytpVideo.volume === 0;
    ytpMuteBtn.textContent = ytpVideo.muted ? '🔇' : '🔊';
});

// ---- Mute toggle ----
ytpMuteBtn.addEventListener('click', () => {
    ytpVideo.muted = !ytpVideo.muted;
    ytpMuteBtn.textContent = ytpVideo.muted ? '🔇' : '🔊';
    if (!ytpVideo.muted && ytpVideo.volume === 0) {
        ytpVideo.volume = 0.5;
        ytpVolSlider.value = 50;
    }
});

// ---- Restart ----
ytpRestartBtn.addEventListener('click', () => {
    ytpVideo.currentTime = 0;
    ytpVideo.play().catch(() => {});
});

// ---- Fullscreen ----
ytpFullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        ytpTvPlayerWrap.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen().catch(() => {});
    }
});

document.addEventListener('fullscreenchange', () => {
    ytpFullscreenBtn.textContent = document.fullscreenElement ? '⛶✖' : '⛶';
});

// ---- Click on video area to toggle play ----
ytpTvPlayerWrap.addEventListener('click', (e) => {
    // Ignore clicks on actual control buttons
    if (e.target.closest('#ytp-tv-controls')) return;
    ytpTogglePlay();
});

// ---- Play button ----
ytpPlayBtn.addEventListener('click', ytpTogglePlay);

// ---- Auto-advance to next video when done ----
ytpVideo.addEventListener('ended', () => {
    if (ytpTvIndex < YTP_VIDEOS.length - 1) {
        ytpNext();
        // Small delay so the video element has time to swap src
        setTimeout(() => ytpVideo.play().catch(() => {}), 150);
    }
});

// ---- Wire up toggle button ----
if (ytpTvToggleBtn && !isPhone) {
    ytpTvToggleBtn.addEventListener('click', () => setYtpTvOpen(!ytpTvIsOpen));
}

// ---- Wire up nav arrows ----
if (ytpTvArrowLeft)  ytpTvArrowLeft.addEventListener('click',  ytpPrev);
if (ytpTvArrowRight) ytpTvArrowRight.addEventListener('click', ytpNext);

// ---- Keyboard navigation while YTP TV is open ----
document.addEventListener('keydown', e => {
    if (!ytpTvIsOpen) return;
    if (e.key === 'ArrowLeft')  { e.preventDefault(); ytpPrev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); ytpNext(); }
    if (e.key === ' ')          { e.preventDefault(); ytpTogglePlay(); }
    if (e.key === 'Escape')     { setYtpTvOpen(false); }
});