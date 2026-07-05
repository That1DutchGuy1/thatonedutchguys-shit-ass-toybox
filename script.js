let isAudioInitialized = false;
let hubTheme = null;
let isMusicPlaying = false;

// Opt out of bfcache entirely. This forces a real fresh page load on back/forward
// navigation, so sessionStorage handles the splash skip cleanly every time.
// beforeunload is used instead of unload — unload is blocked by Permissions Policy
// in some browsers/environments. Both bust bfcache equally well.
window.addEventListener('beforeunload', () => {});

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
            window.location.href = 'https://github.com/That1DutchGuy1/thatonedutchguysminigamehub.github.io';
        });
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

buildToysPanel();

// --- LOGO SMOOTH SPIN ANIMATION ---
const logo = document.querySelector('.main-logo');
let animationFrameId;
let currentRotation = 0;
let isHovered = false;

if (logo) {
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