/* =============================================================
   KING HARKINIAN'S PERSONAL CHEF SIMULATOR
   king-harkinians-personal-chef-simulator.js
   ============================================================= */

"use strict";

/* ─────────────────────────────────────────────
   SETTINGS  — persisted to localStorage
───────────────────────────────────────────── */
const SETTINGS_KEY = "khpcs_settings";

const DEFAULT_SETTINGS = {
    sfxVolume:   100,
    musicVolume: 100,
    units:       "metric",   // "metric" | "imperial"
};

let settings = loadSettings();

function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw));
    } catch (e) { /* storage unavailable */ }
    return Object.assign({}, DEFAULT_SETTINGS);
}

function saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {}
}

function resetSettings() {
    settings = Object.assign({}, DEFAULT_SETTINGS);
    saveSettings();
    applySettingsToUI();
    applyVolumeToAllAudio();
}

/* Volume helpers — all audio goes through these */
function getSfxVolume()   { return settings.sfxVolume   / 100; }
function getMusicVolume() { return settings.musicVolume / 100; }

/* Apply music volume to currently-playing BGM elements */
function applyVolumeToAllAudio() {
    const menuBgm = document.getElementById("audio-menu-bgm");
    if (menuBgm) menuBgm.volume = getMusicVolume();
    if (gameBgm)  gameBgm.volume = getMusicVolume();
    if (typeof scrubSoundAudio !== "undefined" && scrubSoundAudio) {
        scrubSoundAudio.volume = getSfxVolume();
    }
    if (state && state.scrubBgm)  state.scrubBgm.volume = getMusicVolume();
    if (state && state.fireAudio) state.fireAudio.volume = getSfxVolume();
}

/* Convert °F to °C and format */
function formatTemp(fahrenheit) {
    if (settings.units === "metric") {
        const c = Math.round((fahrenheit - 32) * 5 / 9);
        return `${c}°C`;
    }
    return `${fahrenheit}°F`;
}

/* Re-label all temp buttons on the kitchen screen to match current unit setting */
function updateTempButtonLabels() {
    document.querySelectorAll(".temp-btn").forEach(btn => {
        const f = parseInt(btn.dataset.temp);
        btn.textContent = formatTemp(f);
    });
}

/* Sync the settings UI controls to current settings values */
function applySettingsToUI() {
    const sfxSlider   = document.getElementById("sfx-volume-slider");
    const musicSlider = document.getElementById("music-volume-slider");
    const sfxVal      = document.getElementById("sfx-volume-value");
    const musicVal    = document.getElementById("music-volume-value");
    const btnMetric   = document.getElementById("btn-unit-metric");
    const btnImperial = document.getElementById("btn-unit-imperial");

    if (sfxSlider)   sfxSlider.value   = settings.sfxVolume;
    if (musicSlider) musicSlider.value = settings.musicVolume;
    if (sfxVal)      sfxVal.textContent   = settings.sfxVolume;
    if (musicVal)    musicVal.textContent = settings.musicVolume;

    if (btnMetric && btnImperial) {
        btnMetric.classList.toggle("active",   settings.units === "metric");
        btnImperial.classList.toggle("active", settings.units === "imperial");
    }
}

function initSettingsScreen() {
    applySettingsToUI();

    const sfxSlider   = document.getElementById("sfx-volume-slider");
    const musicSlider = document.getElementById("music-volume-slider");
    const sfxVal      = document.getElementById("sfx-volume-value");
    const musicVal    = document.getElementById("music-volume-value");

    sfxSlider.oninput = () => {
        settings.sfxVolume = parseInt(sfxSlider.value);
        sfxVal.textContent = settings.sfxVolume;
        saveSettings();
        applyVolumeToAllAudio();
    };

    musicSlider.oninput = () => {
        settings.musicVolume = parseInt(musicSlider.value);
        musicVal.textContent = settings.musicVolume;
        saveSettings();
        applyVolumeToAllAudio();
    };

    document.getElementById("btn-unit-metric").onclick = () => {
        settings.units = "metric";
        saveSettings();
        applySettingsToUI();
        updateTempButtonLabels();
    };

    document.getElementById("btn-unit-imperial").onclick = () => {
        settings.units = "imperial";
        saveSettings();
        applySettingsToUI();
        updateTempButtonLabels();
    };

    document.getElementById("btn-settings-back").onclick = () => {
        initMainMenu(true);
    };

    document.getElementById("btn-settings-reset").onclick = () => {
        resetSettings();
        updateTempButtonLabels();
    };
}

/* ─────────────────────────────────────────────
   GAME STATE
───────────────────────────────────────────── */
const state = {
    chosenMeal:        null,   // 'spaghetti' | 'pizza' | 'chicken' | 'seafood' | 'burger' | 'steakfrites' | 'pancakes' | 'lobsterbisque'
    rupees:            200,
    cart:              [],     // array of ingredient ids purchased
    cookingMethod:     null,   // 'pot' | 'pan' | 'both' | 'oven'
    ovenTemp:          null,   // e.g. 350
    addedIngredients:  [],     // ingredient ids added to the vessel
    platingChoice:     null,   // 'plate' | 'platter' | 'bowl'
    finalScore:        0,
    scrubProgress:     0,
    scrubTimer:        null,
    scrubBgm:          null,
    bgmStarted:        false,
    fireAudio:         null,
    morshuSpeaking:    false,  // true while Morshu's greeting/can't-afford audio is playing — locks the kitchen button
    usedMeals:         new Set(), // tracks meals the King has already requested this session
};

/* ─────────────────────────────────────────────
   MORSHU VOICE LINE DURATIONS
   Exact clip lengths, used to time the kitchen-button
   lock and the can't-afford GIF/audio restart.
───────────────────────────────────────────── */
const MORSHU_GREETING_DURATION_MS      = 7600; // 7s 600ms
const MORSHU_CANT_AFFORD_DURATION_MS   = 7100; // 7s 100ms

/* Dialogue lines tied to the two Morshu GIFs. Each stays on screen for the
   full duration of its matching audio clip — see playMorshuGreeting() and
   playMorshuCantAfford() below. */
const MORSHU_DEFAULT_SPEECH     = "Fish? Cheese? Pasta! You want it? It's yours my friend, as long as you have enough rupees!";
const MORSHU_CANT_AFFORD_SPEECH = "Sorry, I can't give credit! Come back when you're a little... MMMMMM... richer!";

function setMorshuSpeech(text) {
    document.getElementById("morshu-speech").textContent = text;
}

/* ─────────────────────────────────────────────
   LETHAL INGREDIENTS
   If any of these end up cooked into the meal
   (i.e. added to the vessel), the King dies.
───────────────────────────────────────────── */
const DEADLY_INGREDIENT_IDS = [
  "toxin", 
  "poison", 
  "venom", 
  "nuclear", 
  "motoroil", 
  "lipstick", 
  "soap", 
  "bomb", 
  "scorpion", 
  "unicorn", 
  "human", 
  "pufferfish",
  "cyanide",
  "diesel",
  "uranium",
  "lampoil"
];


function containsDeadlyIngredient() {
    return state.addedIngredients.some(id => DEADLY_INGREDIENT_IDS.includes(id));
}

/* ─────────────────────────────────────────────
   MEAL DEFINITIONS
   ideal* values = what the King actually wants
───────────────────────────────────────────── */
const MEALS = {
    spaghetti: {
        label: "Spaghetti",
        announceAudio: "./assets/sounds/king-wants-spaghetti.mp3",
        idealMethod:   "pot",
        idealPlating:  "plate",
        idealTemp:     null,
        ingredients: [
            { id: "pasta",      name: "Pasta",         price: 15, icon: "🍝", essential: true,  bad: false },
            { id: "tomato",     name: "Tomato Sauce",  price: 20, icon: "🍅", essential: true,  bad: false },
            { id: "beef",       name: "Ground Beef",   price: 35, icon: "🥩", essential: true,  bad: false },
            { id: "garlic",     name: "Garlic",        price: 10, icon: "🧄", essential: false, bad: false },
            { id: "parmesan",   name: "Parmesan",      price: 25, icon: "🧀", essential: true,  bad: false },
            { id: "basil",      name: "Fresh Basil",   price: 15, icon: "🌿", essential: false, bad: false },
            { id: 'worms',      name: "Worms",         price: 7,  icon: "🪱", essential: false, bad: true  },
            { id: "pickles",    name: "Pickles",       price: 10, icon: "🥒", essential: false, bad: true  },
            { id: "toxin",      name: "Shiga Toxin",   price: 57, icon: "☣️", essential: false, bad: true  },
            { id: "motoroil",   name: "Motor Oil",     price: 27, icon: "🛢️", essential: false, bad: true  },
        ],
    },
    pizza: {
        label: "Pizza",
        announceAudio: "./assets/sounds/king-wants-pizza.mp3",
        idealMethod:   "oven",
        idealPlating:  "platter",
        idealTemp:     425,
        ingredients: [
            { id: "dough",      name: "Pizza Dough",   price: 30, icon: "🫓", essential: true,  bad: false },
            { id: "sauce",      name: "Pizza Sauce",   price: 15, icon: "🍅", essential: true,  bad: false },
            { id: "mozzarella", name: "Mozzarella",    price: 30, icon: "🧀", essential: true,  bad: false },
            { id: "pepperoni",  name: "Pepperoni",     price: 30, icon: "🍖", essential: true,  bad: false },
            { id: "mushrooms",  name: "Mushrooms",     price: 20, icon: "🍄", essential: false, bad: false },
            { id: "olives",     name: "Olives",        price: 18, icon: "🫒", essential: false, bad: false },
            { id: "anchovies",  name: "Anchovies",     price: 13,  icon: "🐠", essential: false, bad: true  },
            { id: "bubblegum",  name: "Bubblegum",     price: 9,  icon: "🫧", essential: false, bad: true  },
            { id: "poison",     name: "Deadly Poison", price: 40, icon: "☠️", essential: false, bad: true  },
            { id: "lipstick",   name: "Zelda's Lipstick", price: 12, icon: "💄", essential: false, bad: true  },
        ],
    },
    chicken: {
        label: "Chicken Dinner",
        announceAudio: "./assets/sounds/king-wants-chicken.mp3",
        idealMethod:   "oven",
        idealPlating:  "platter",
        idealTemp:     375,
        ingredients: [
            { id: "chicken",    name: "Whole Chicken", price: 50, icon: "🍗", essential: true,  bad: false },
            { id: "herbs",      name: "Herb Mix",      price: 15, icon: "🌿", essential: true,  bad: false },
            { id: "butter",     name: "Butter",        price: 20, icon: "🧈", essential: false, bad: false },
            { id: "lemon",      name: "Lemon",         price: 10, icon: "🍋", essential: false, bad: false },
            { id: "potato",     name: "Potatoes",      price: 25, icon: "🥔", essential: true, bad: false },
            { id: "carrot",     name: "Carrots",       price: 10, icon: "🥕", essential: false, bad: false },
            { id: "hotpepper",  name: "Ghost Pepper",  price: 12, icon: "🌶️", essential: false, bad: true  },
            { id: "rawonion",   name: "Raw Onions",    price: 7,  icon: "🧅", essential: false, bad: true  },
            { id: "venom",      name: "Snake Venom",   price: 32, icon: "🐍", essential: false, bad: true  },
            { id: "bomb",       name: "Bomb",          price: 71, icon: "💣️", essential: false, bad: true },
        ],
    },

    burger: {
        label: "Burger Dinner",
        announceAudio: "./assets/sounds/king-wants-burger.mp3",
        idealMethod:   "pan",
        idealPlating:  "platter",
        idealTemp:     null,
        ingredients: [
            { id: "bun",        name: "Burger Bun",    price: 15, icon: "🍔", essential: true,  bad: false },
            { id: "patty",      name: "Burger Patty",  price: 35, icon: "🥩", essential: true,  bad: false },
            { id: "cheese",     name: "Cheddar Cheese", price: 20, icon: "🧀", essential: true,  bad: false },
            { id: "lettuce",    name: "Lettuce",       price: 10, icon: "🥬", essential: false, bad: false },
            { id: "tomato",     name: "Tomato",        price: 10, icon: "🍅", essential: false, bad: false },
            { id: "onion",      name: "Onion",         price: 8,  icon: "🧅", essential: false, bad: false },
            { id: "beans",      name: "Black Beans",   price: 6,  icon: "🫘", essential: false, bad: true },
            { id: "lollipop",   name: "Lollipop",      price: 5,  icon: "🍭", essential: false, bad: true },
            { id: "scorpion",   name: "Scorpion Venom", price: 15, icon: "🦂", essential: false, bad: true },
            { id: "unicorn",    name: "Unicorn Piss",   price: 100, icon: "🦄", essential: false, bad: true },
        ],
    },

seafood: {
        label: "Seafood Dinner",
        announceAudio: "./assets/sounds/king-wants-seafood.mp3",
        idealMethod:   "pan",
        idealPlating:  "platter",
        idealTemp:     null,
        ingredients: [
            { id: "shrimp",     name: "Shrimp",        price: 45, icon: "🦐", essential: true,  bad: false },
            { id: "fish",       name: "Fish Fillet",   price: 40, icon: "🐟", essential: true,  bad: false },
            { id: "clams",      name: "Clams",         price: 30, icon: "🦪", essential: true,  bad: false },
            { id: "butter",     name: "Butter",        price: 20, icon: "🧈", essential: false, bad: false },
            { id: "lemon",      name: "Lemon",         price: 10, icon: "🍋", essential: false, bad: false },
            { id: "whitewine",  name: "White Wine",    price: 25, icon: "🥂", essential: true, bad: false },
            { id: "ketchup",    name: "Ketchup",       price: 7,  icon: "🍅", essential: false, bad: true  },
            { id: "candybar",   name: "Candy Bar",     price: 4,  icon: "🍫", essential: false, bad: true  },
            { id: "nuclear",    name: "Nuclear Waste", price: 83, icon: "☢️", essential: false, bad: true  },
            { id: "soap",       name: "Soap",          price: 6,  icon: "🧼", essential: false, bad: true  },
        ],
    },

    steakfrites: {
        label: "Steak Frites",
        announceAudio: "./assets/sounds/king-wants-steak-frites.mp3",
        idealMethod:   "both",
        idealPlating:  "plate",
        idealTemp:     null,
        ingredients: [
            { id: "steak",      name: "Steak",         price: 60, icon: "🥩", essential: true,  bad: false },
            { id: "fries",      name: "French Fries",  price: 23, icon: "🍟", essential: true,  bad: false },
            { id: "butter",     name: "Butter",        price: 20, icon: "🧈", essential: false, bad: false },
            { id: "garlic",     name: "Garlic",        price: 13, icon: "🧄", essential: false, bad: false },
            { id: "thyme",      name: "Thyme",         price: 9, icon: "🌿",  essential: false, bad: false },
            { id: "seasalt",    name: "Sea Salt",      price: 6,  icon: "🧂", essential: false, bad: false },
            { id: "kiwi",       name: "Kiwi",          price: 8,  icon: "🥝", essential: false, bad: true  },
            { id: "spacecake",  name: "Space Cake",    price: 12, icon: "🧁", essential: false, bad: true  },
            { id: "human",      name: "Human Flesh",   price: 100, icon: "🫀", essential: false, bad: true },
            { id: "pufferfish",    name: "Pufferfish",    price: 50, icon: "🐡", essential: false, bad: true  },
        ],
    },

    pancakes: {
        label: "Pancakes",
        announceAudio: "./assets/sounds/king-wants-pancakes.mp3",
        idealMethod:   "pan",
        idealPlating:  "plate",
        idealTemp:     null,
        ingredients: [
            { id: "pancakebatter", name: "Pancake Batter", price: 22, icon: "🥞", essential: true,  bad: false },
            { id: "maplesyrup",    name: "Maple Syrup",    price: 14, icon: "🍁", essential: true,  bad: false },
            { id: "butter",        name: "Butter",         price: 20, icon: "🧈", essential: true, bad: false },
            { id: "blueberries",   name: "Blueberries",    price: 18, icon: "🫐", essential: false, bad: false },
            { id: "bananas",       name: "Bananas",        price: 13, icon: "🍌", essential: false, bad: false },
            { id: "vanilla",       name: "Vanilla Extract", price:19, icon: "🫙", essential: false, bad: false },
            { id: "horse" ,        name: "Horse Meat",     price: 45, icon: "🐴", essential: false, bad: true  },
            { id: "LSD",          name: "LSD",            price: 30, icon: "💊", essential: false, bad: true  },
            { id: "cyanide",      name: "Cyanide",        price: 69, icon: "☠️", essential: false, bad: true  },
            { id: "diesel",        name: "Diesel Fuel",    price: 25, icon: "⛽", essential: false, bad: true  },
        ],
    },

    lobsterbisque: {
        label: "Lobster Bisque",
        announceAudio: "./assets/sounds/king-wants-lobster-bisque.mp3",
        idealMethod:   "pot",
        idealPlating:  "bowl",
        idealTemp:     null,
        ingredients: [
            { id: "lobster",      name: "Lobster",        price: 53, icon: "🦞", essential: true,  bad: false },
            { id: "cream",        name: "Heavy Cream",    price: 24, icon: "🥛", essential: true,  bad: false },
            { id: "butter",       name: "Butter",         price: 20, icon: "🧈", essential: true,  bad: false },
            { id: "garlic",       name: "Garlic",         price: 13, icon: "🧄", essential: false, bad: false },
            { id: "tomato",       name: "Tomato Paste",   price: 15, icon: "🍅", essential: false, bad: false },
            { id: "whitewine",    name: "White Wine",     price: 25, icon: "🥂", essential: false, bad: false },
            { id: "turtle",        name: "Turtle Meat",   price: 61, icon: "🐢", essential: false, bad: true },
            { id: "pretzel",       name: "Pretzel",       price: 11, icon: "🥨", essential: false, bad: true },
            { id: "uranium",       name: "Uranium",       price: 86, icon: "☢️", essential: false, bad: true },
            { id: "lampoil",       name: "Lamp Oil",      price: 19, icon: "🪔", essential: false, bad: true },

        ],
    },
};

/* ─────────────────────────────────────────────
   AUDIO HELPERS
───────────────────────────────────────────── */
function playAudio(src, options = {}) {
    const a = new Audio(src);
    if (options.loop) a.loop = true;
    // Music tracks use music volume; everything else uses SFX volume
    const isMusic = options.music === true;
    a.volume = options.volume ?? (isMusic ? getMusicVolume() : getSfxVolume());
    a.play().catch(() => {});
    return a;
}

function stopAudio(audioObj) {
    if (audioObj) { audioObj.pause(); audioObj.currentTime = 0; }
}

/* ─────────────────────────────────────────────
   MENU BGM  — uses the <audio id="audio-menu-bgm"> element already in the HTML
   so the browser can decode & buffer it ahead of time.
───────────────────────────────────────────── */
function getMenuBgmEl() {
    return document.getElementById("audio-menu-bgm");
}

function startMenuBgm() {
    if (state.bgmStarted) return;
    state.bgmStarted = true;

    const bgm = getMenuBgmEl();
    bgm.currentTime = 0;
    bgm.volume = getMusicVolume();
    bgm.play().catch(() => {
        // Autoplay blocked — not a problem, interaction already happened
    });

    // Hide the click-hint once music starts
    const hint = document.getElementById("bgm-hint");
    if (hint) { hint.style.opacity = "0"; hint.style.animation = "none"; }
}

function stopMenuBgm() {
    const bgm = getMenuBgmEl();
    bgm.pause();
    bgm.currentTime = 0;
    state.bgmStarted = false;
}

/* ─────────────────────────────────────────────
   GAME BGM  (prep-theme.wav)
   Plays from shop through to score reveal.
───────────────────────────────────────────── */
let gameBgm = null;

function startGameBgm() {
    if (gameBgm) {
        gameBgm.pause();
        gameBgm.currentTime = 0;
    }
    gameBgm = new Audio("./assets/music/prep-theme.wav");
    gameBgm.loop = true;
    gameBgm.volume = getMusicVolume();
    gameBgm.play().catch(() => {});
}

function stopGameBgmAndPlayStinger() {
    if (gameBgm) {
        gameBgm.pause();
        gameBgm.currentTime = 0;
        gameBgm = null;
    }

    new Audio("./assets/sounds/king-oh.mp3").play().catch(() => {});
}

function stopGameBgm() {
    if (gameBgm) {
        gameBgm.pause();
        gameBgm.currentTime = 0;
        gameBgm = null;
    }
}

/* ─────────────────────────────────────────────
   SCREEN NAVIGATION & UTILS
───────────────────────────────────────────── */
function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

function replayGifsInContainer(container) {
    if (!container) return;
    container.querySelectorAll('img').forEach(img => {
        // Appending a timestamp tricks the browser into reloading 1-loop GIFs
        const currentSrc = img.src.split('?')[0]; 
        img.src = currentSrc + '?t=' + new Date().getTime();
    });
}

/* ─────────────────────────────────────────────
   MAIN MENU
───────────────────────────────────────────── */
function initMainMenu(returning = false) {
    showScreen("screen-mainmenu");

    const hint = document.getElementById("bgm-hint");
    const menuScreen = document.getElementById("screen-mainmenu");

    if (returning) {
        // Coming back via a button — autoplay is already unblocked, start BGM immediately
        // and hide the click hint since it's no longer needed.
        // If the BGM is already playing (e.g. returning from settings), leave it running
        // so it doesn't restart from the beginning.
        if (hint) { hint.style.opacity = "0"; hint.style.animation = "none"; }
        menuScreen.removeEventListener("pointerdown", startMenuBgm);
        const bgm = getMenuBgmEl();
        if (bgm.paused) {
            state.bgmStarted = false;
            startMenuBgm();
        }
    } else {
        // First load — autoplay may be blocked, wait for user interaction
        state.bgmStarted = false;
        if (hint) hint.style.opacity = "";
        menuScreen.removeEventListener("pointerdown", startMenuBgm);
        menuScreen.addEventListener("pointerdown", startMenuBgm, { once: true });
    }

    document.getElementById("btn-start").onclick = () => {
        stopMenuBgm();
        startIntro();
    };

    document.getElementById("btn-settings").onclick = () => {
        showScreen("screen-settings");
        initSettingsScreen();
    };

    document.getElementById("btn-hub").onclick = () => {
        // ASSET: update href to your hub page URL
        window.location.href = "../index.html";
    };
}

/* ─────────────────────────────────────────────
   INTRO CUTSCENE
───────────────────────────────────────────── */
function startIntro() {
    showScreen("screen-intro");

    const walkAnim    = document.getElementById("king-walkin-anim");
    const thinkAnim   = document.getElementById("king-thinking-anim");
    const announceAnim= document.getElementById("king-announce-anim");
    const bubble      = document.getElementById("intro-speech-bubble");

    // Reset
    walkAnim.classList.remove("hidden");
    thinkAnim.classList.add("hidden");
    announceAnim.classList.add("hidden");
    bubble.classList.add("hidden");
    bubble.textContent = "";

    // Reset walk-in GIF so it plays correctly
    replayGifsInContainer(walkAnim);

    // Delay (ms) before "mah boi" voice line fires — adjust to sync with the walk-in GIF
    const MAH_BOI_DELAY_MS = 1000;
    setTimeout(() => playAudio("./assets/sounds/Mah-Boi.mp3"), MAH_BOI_DELAY_MS);

    // 1. Walk-in animation plays (~2.5s)
    setTimeout(() => {
        walkAnim.classList.add("hidden");
        thinkAnim.classList.remove("hidden");
        
        // Reset thinking GIF so it plays
        replayGifsInContainer(thinkAnim);

        // Play thinking audio
        playAudio("./assets/sounds/king-think.mp3");

        bubble.textContent = "Hmm... what shall I have for dinner tonight...?";
        bubble.classList.remove("hidden");

    }, 2500);

    // 2. Thinking phase (~3s)
    setTimeout(() => {
        // Pick a random meal the King hasn't requested yet this session.
        // If all meals have been seen, wipe the memory and start fresh.
        const allMeals = Object.keys(MEALS);
        const availableMeals = allMeals.filter(m => !state.usedMeals.has(m));
        if (availableMeals.length === 0) {
            // Every dish has been cooked — reset the King's memory for a new cycle
            state.usedMeals.clear();
            availableMeals.push(...allMeals);
        }
        const chosen = availableMeals[Math.floor(Math.random() * availableMeals.length)];
        state.usedMeals.add(chosen);
        state.chosenMeal = chosen;
        const meal = MEALS[chosen];

        thinkAnim.classList.add("hidden");
        announceAnim.classList.remove("hidden");
        
        // Reset announce GIF so it plays
        replayGifsInContainer(announceAnim);

        bubble.textContent = `I want ${meal.label} for dinner! Now go and make it!`;

        // Play per-meal announcement audio
        const announceAudioObj = playAudio(meal.announceAudio);

        // 3. Go to shop once the announce audio finishes (+ small buffer)
        const TRANSITION_DELAY_MS = 500;
        announceAudioObj.addEventListener("ended", () => {
            setTimeout(initShop, TRANSITION_DELAY_MS);
        });

    }, 5500);
}

/* ─────────────────────────────────────────────
   SHOP
───────────────────────────────────────────── */
function initShop() {
    showScreen("screen-shop");
    state.cart = [];
    state.rupees = 200;

    startGameBgm();

    // Make sure we're showing the idle GIF (not a leftover can't-afford overlay)
    document.getElementById("morshu-cant-afford-img").classList.add("hidden");
    document.getElementById("morshu-idle-img").classList.remove("hidden");

    // Reset Morshu's GIF and play his greeting (locks the kitchen button until he's done)
    replayGifsInContainer(document.getElementById("screen-shop"));
    playMorshuGreeting();

    updateShopHUD();
    renderIngredientShelf();

    const btnKitchen = document.getElementById("btn-to-kitchen");

    btnKitchen.onclick = () => {
        if (state.cart.length === 0 || state.morshuSpeaking) return;
        initKitchen();
    };
}

function updateShopHUD() {
    document.getElementById("rupee-count").textContent = state.rupees;
    document.getElementById("cart-count").textContent  = state.cart.length;

    const btnKitchen = document.getElementById("btn-to-kitchen");
    // Locked while cart is empty OR while Morshu is mid-line (greeting / can't-afford).
    if (btnKitchen) btnKitchen.disabled = state.cart.length === 0 || state.morshuSpeaking;
}

/* ─────────────────────────────────────────────
   MORSHU VOICE LINES
   Handles the greeting (on shop entry) and the
   can't-afford GIF+audio (on failed purchase),
   both of which lock the "To The Kitchen" button
   until Morshu finishes speaking.
───────────────────────────────────────────── */
function playMorshuGreeting() {
    state.morshuSpeaking = true;
    updateShopHUD();

    // Dialogue box is locked to the greeting line for the full length of the
    // greeting audio — nothing else is allowed to overwrite it until then
    // (see the state.morshuSpeaking guards in buyIngredient()).
    setMorshuSpeech(MORSHU_DEFAULT_SPEECH);

    playAudio("./assets/sounds/morshu-greeting.mp3");

    setTimeout(() => {
        state.morshuSpeaking = false;
        updateShopHUD();
    }, MORSHU_GREETING_DURATION_MS);
}

function playMorshuCantAfford() {
    state.morshuSpeaking = true;
    updateShopHUD();

    const idleImg       = document.getElementById("morshu-idle-img");
    const cantAffordImg = document.getElementById("morshu-cant-afford-img");

    // Force the GIF to restart from its first frame every time it's triggered
    // (cache-busting query string tricks the browser into reloading it).
    cantAffordImg.src = "./assets/GIFs/morshu-cant-afford.gif?t=" + Date.now();

    // Swap the idle GIF out for the can't-afford GIF.
    idleImg.classList.add("hidden");
    cantAffordImg.classList.remove("hidden");

    // Dialogue box is locked to the can't-afford line for the full length of
    // the can't-afford audio — it used to snap back after a fixed 2 seconds
    // while the audio (and GIF) kept playing for 7.1s, so the bubble was
    // "unlocking" well before Morshu actually stopped talking.
    setMorshuSpeech(MORSHU_CANT_AFFORD_SPEECH);

    // Audio starts the instant the GIF begins.
    playAudio("./assets/sounds/morshu-cant-afford.mp3");

    setTimeout(() => {
        // Swap back to morshu-idle.gif. Since the idle <img> was never reloaded
        // while hidden, it settles back exactly where it left off — its last frame.
        cantAffordImg.classList.add("hidden");
        idleImg.classList.remove("hidden");

        // Only unlock the dialogue right as the audio finishes.
        setMorshuSpeech(MORSHU_DEFAULT_SPEECH);
        state.morshuSpeaking = false;
        updateShopHUD();
    }, MORSHU_CANT_AFFORD_DURATION_MS);
}

function renderIngredientShelf() {
    const shelf = document.getElementById("ingredient-shelf");
    shelf.innerHTML = "";
    const meal = MEALS[state.chosenMeal];

    meal.ingredients.forEach(ing => {
        const card = document.createElement("div");
        card.className = "ingredient-card";
        card.dataset.id = ing.id;

        const alreadyOwned = state.cart.includes(ing.id);
        if (alreadyOwned) card.classList.add("purchased");

        card.innerHTML = `
            <div class="ing-icon">${ing.icon}</div>
            <div class="ing-name">${ing.name}</div>
            <div class="ing-price">💎 ${ing.price}</div>
        `;

        if (!alreadyOwned) {
            card.onclick = () => buyIngredient(ing, card);
        }

        shelf.appendChild(card);
    });
}

function buyIngredient(ing, card) {
    if (state.cart.includes(ing.id)) return;

    if (state.rupees < ing.price) {
        // ASSET: morshu-cant-afford.gif (resets to frame 1 + plays morshu-cant-afford.mp3 in sync)
        // playMorshuCantAfford() owns the dialogue box itself now — it locks the
        // can't-afford line for the exact length of its audio, then restores
        // the default line. Restarting it here (e.g. a second failed buy while
        // Morshu is already mid-line) simply re-locks for a fresh full duration.
        playMorshuCantAfford();
        return;
    }

    state.rupees -= ing.price;
    state.cart.push(ing.id);
    card.classList.add("purchased");
    updateShopHUD();

    // Don't step on a locked dialogue line (greeting or can't-afford) that's
    // still playing out its audio — skip the transient "added to your bag"
    // message rather than cutting the locked line short.
    if (!state.morshuSpeaking) {
        setMorshuSpeech(`${ing.name} added to your bag!`);
        setTimeout(() => {
            if (!state.morshuSpeaking) {
                setMorshuSpeech("Anything else you wanna buy?");
            }
        }, 1500);
    }
}

/* ─────────────────────────────────────────────
   KITCHEN
───────────────────────────────────────────── */
function initKitchen() {
    showScreen("screen-kitchen");
    state.cookingMethod     = null;
    state.ovenTemp          = null;
    state.addedIngredients  = [];
    state.cookingInProgress = false;
    state.cookingDone       = false;

    document.getElementById("panel-cooking").classList.add("hidden");
    document.getElementById("oven-temp-panel").classList.add("hidden");
    document.getElementById("oven-timer-display").classList.add("hidden");
    document.getElementById("vessel-contents").textContent = "";
    document.getElementById("cooking-status-label").textContent = "Cooking...";

    // Reset appliance button states
    document.querySelectorAll(".appliance-btn").forEach(b => {
        b.classList.remove("selected");
        b.disabled = false;
    });
    document.querySelectorAll(".temp-btn").forEach(b => {
        b.classList.remove("selected");
        b.disabled = false;
    });

    // Reset action buttons — Start needs ingredients, Done needs a finished cook
    const startBtn = document.getElementById("btn-start-cooking");
    const doneBtn  = document.getElementById("btn-done-cooking");
    startBtn.disabled = true;
    doneBtn.disabled  = true;

    // Appliance selection
    document.querySelectorAll(".appliance-btn").forEach(btn => {
        btn.onclick = () => selectAppliance(btn.dataset.appliance);
    });

    // Temp selection — update labels to current unit setting first
    updateTempButtonLabels();
    document.querySelectorAll(".temp-btn").forEach(btn => {
        btn.onclick = () => selectOvenTemp(parseInt(btn.dataset.temp), btn);
    });

    // Cooking action buttons
    startBtn.onclick = startCooking;
    doneBtn.onclick  = doneCooking;
}

function selectAppliance(method) {
    state.cookingMethod = method;
    document.querySelectorAll(".appliance-btn").forEach(b => {
        b.classList.toggle("selected", b.dataset.appliance === method);
    });

    const ovenPanel = document.getElementById("oven-temp-panel");
    if (method === "oven") {
        ovenPanel.classList.remove("hidden");
    } else {
        ovenPanel.classList.add("hidden");
        state.ovenTemp = null;
        showCookingPanel();
    }
}

function selectOvenTemp(temp, btn) {
    state.ovenTemp = temp;
    document.querySelectorAll(".temp-btn").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    showCookingPanel();
}

function showCookingPanel() {
    const panel = document.getElementById("panel-cooking");
    panel.classList.remove("hidden");

    // Fresh cooking round each time the panel is (re)shown
    state.addedIngredients  = [];
    state.cookingInProgress = false;
    state.cookingDone       = false;
    document.getElementById("vessel-contents").innerHTML = "";
    document.getElementById("oven-timer-display").classList.add("hidden");

    const startBtn = document.getElementById("btn-start-cooking");
    const doneBtn  = document.getElementById("btn-done-cooking");
    startBtn.disabled = true;
    doneBtn.disabled  = true;

    // Populate ingredient tray with purchased items
    const tray = document.getElementById("ingredients-in-hand");
    tray.innerHTML = "<p><em>Your ingredients — click to add:</em></p>";

    const meal = MEALS[state.chosenMeal];
    state.cart.forEach(ingId => {
        const ing = meal.ingredients.find(i => i.id === ingId);
        if (!ing) return;
        const chip = document.createElement("div");
        chip.className = "tray-item";
        chip.dataset.id = ingId;
        chip.textContent = `${ing.icon} ${ing.name}`;
        chip.onclick = () => addIngredientToVessel(ingId, ing, chip);
        tray.appendChild(chip);
    });

    // Appliance visual image
    const applianceImgMap = {
        pot:  "./assets/sprites/cooking-pot.png",
        pan:  "./assets/sprites/pan.png",
        both: "./assets/sprites/pot-and-pan.png",
        oven: "./assets/sprites/oven.png",
    };
    const applianceVisual = document.getElementById("appliance-visual");
    applianceVisual.innerHTML = `<img src="${applianceImgMap[state.cookingMethod]}" alt="${state.cookingMethod}" class="appliance-visual-img">`;
    document.getElementById("cooking-status-label").textContent =
        state.cookingMethod === "oven"
            ? `Oven set to ${formatTemp(state.ovenTemp)} — put your ingredients in!`
            : "Add your ingredients to the vessel!";
}

function addIngredientToVessel(id, ing, chip) {
    if (state.cookingInProgress || state.cookingDone) return; // locked once cooking starts
    if (state.addedIngredients.includes(id)) return;
    state.addedIngredients.push(id);
    chip.classList.add("added");

    const vessel = document.getElementById("vessel-contents");
    vessel.innerHTML += `<span>${ing.icon} ${ing.name}  </span>`;

    // At least one ingredient in the vessel unlocks Start Cooking
    document.getElementById("btn-start-cooking").disabled = state.addedIngredients.length === 0;
}

function startCooking() {
    if (state.addedIngredients.length === 0) return; // guard, button should already be disabled
    if (state.cookingInProgress || state.cookingDone) return; // can't restart/skip an active or finished cook

    state.cookingInProgress = true;
    document.getElementById("btn-start-cooking").disabled = true;

    // Lock the ingredient tray so nothing more can be added mid-cook
    document.querySelectorAll("#ingredients-in-hand .tray-item").forEach(chip => {
        chip.style.pointerEvents = "none";
    });

    // Lock the appliance/temp choice so nothing can be switched mid-cook
    document.querySelectorAll(".appliance-btn").forEach(b => b.disabled = true);
    document.querySelectorAll(".temp-btn").forEach(b => b.disabled = true);

    document.getElementById("cooking-status-label").textContent =
        state.cookingMethod === "oven"
            ? `Cooking at ${formatTemp(state.ovenTemp)}...`
            : "Cooking...";

    startCookingTimer();
}

function startCookingTimer() {
    const timerDisplay = document.getElementById("oven-timer-display");
    const timerBar     = document.getElementById("oven-timer-bar");
    const timerLabel   = document.getElementById("oven-timer-label");

    timerDisplay.classList.remove("hidden");
    timerBar.style.width = "100%";
    timerLabel.textContent = "10s";

    // A plain setInterval countdown with no click handlers on the bar/label —
    // there's no way for the player to fast-forward or skip this 10s cook.
    let remaining = 10;
    const interval = setInterval(() => {
        remaining--;
        timerBar.style.width = (remaining / 10 * 100) + "%";
        timerLabel.textContent = remaining + "s";

        if (remaining <= 0) {
            clearInterval(interval);
            timerLabel.textContent = "Done!";
            state.cookingInProgress = false;
            state.cookingDone = true;
            document.getElementById("cooking-status-label").textContent = "✅ Done! Plate it up.";
            document.getElementById("btn-done-cooking").disabled = false;
        }
    }, 1000);
}

function doneCooking() {
    if (!state.cookingDone) return; // guard, button should already be disabled
    initPlating();
}

/* ─────────────────────────────────────────────
   PLATING
───────────────────────────────────────────── */
function initPlating() {
    showScreen("screen-plating");
    state.platingChoice = null;

    document.querySelectorAll(".plate-btn").forEach(b => b.classList.remove("selected"));
    document.getElementById("plating-preview").classList.add("hidden");
    document.getElementById("btn-serve").classList.add("hidden");
    document.getElementById("plating-choice-label").textContent = "—";

    document.querySelectorAll(".plate-btn").forEach(btn => {
        btn.onclick = () => {
            state.platingChoice = btn.dataset.vessel;
            document.querySelectorAll(".plate-btn").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");

            document.getElementById("plating-choice-label").textContent = btn.dataset.vessel;
            document.getElementById("plating-preview").classList.remove("hidden");
            document.getElementById("btn-serve").classList.remove("hidden");
        };
    });

    document.getElementById("btn-serve").onclick = initJudgement;
}

/* ─────────────────────────────────────────────
   SCORING ENGINE
   10 pts total:
     4 pts — all essential ingredients bought & added
     2 pts — non-essential (good) ingredients added (up to 2)
     3 pts — cooking method correct (1 partial credit if wrong)
     1 pt  — plating choice correct
     -2 pts per bad ingredient added (min score 0)
   Perfect play (all essentials + 2 extras + right method + right plating) = 10/10
───────────────────────────────────────────── */
function calculateScore() {
    const meal = MEALS[state.chosenMeal];
    let score = 0;

    // Essential ingredients (up to 4 pts)
    const essentials = meal.ingredients.filter(i => i.essential);
    const boughtEssentials = essentials.filter(i => state.cart.includes(i.id)).length;
    score += Math.round((boughtEssentials / essentials.length) * 4);

    // Good non-essential ingredients added to vessel (up to 2 pts)
    const goodExtras = meal.ingredients.filter(i => !i.essential && !i.bad);
    const addedGoodExtras = goodExtras.filter(i => state.addedIngredients.includes(i.id)).length;
    score += Math.min(addedGoodExtras, 2);

    // Cooking method (3 pts)
    if (state.cookingMethod === meal.idealMethod) {
        score += 3;
    } else {
        score += 1; // partial credit for at least cooking something
    }

    // Oven temp (replaces the 2-pt extra-ingredient slot for oven meals)
    // The 2 pts above already handle oven meals if method is correct,
    // but oven meals have no goodExtras bonus — instead temp earns those 2 pts.
    if (meal.idealTemp) {
        // Undo the goodExtras bonus (not applicable for oven meals) and use temp instead
        score -= Math.min(addedGoodExtras, 2);
        if (state.ovenTemp === meal.idealTemp) {
            score += 2;
        } else if (state.ovenTemp && Math.abs(state.ovenTemp - meal.idealTemp) <= 25) {
            score += 1;
        }
    }

    // Plating (1 pt)
    if (state.platingChoice === meal.idealPlating) score += 1;

    // Bad ingredient penalty (-2 per bad item added to vessel)
    const badIngredients = meal.ingredients.filter(i => i.bad);
    const addedBadCount = badIngredients.filter(i => state.addedIngredients.includes(i.id)).length;
    score -= addedBadCount * 2;

    return Math.min(Math.max(score, 0), 10);
}

/* ─────────────────────────────────────────────
   JUDGEMENT
───────────────────────────────────────────── */
function initJudgement() {
    showScreen("screen-judgement");

    const eatingAnim  = document.getElementById("king-eating-anim");
    const judgingAnim = document.getElementById("king-judging-anim");
    const scoreReveal = document.getElementById("score-reveal");
    const deathReveal = document.getElementById("death-reveal");
    const outcomeGreat= document.getElementById("outcome-great");
    const outcomeMeh  = document.getElementById("outcome-meh");
    const outcomeBad  = document.getElementById("outcome-bad");
    const outcomeDeath= document.getElementById("outcome-death");
    const btnAfter    = document.getElementById("btn-after-judgement");

    // Was a lethal ingredient cooked into this meal?
    const isDeath = containsDeadlyIngredient();

    // Reset
    [eatingAnim, judgingAnim, scoreReveal, deathReveal, outcomeGreat, outcomeMeh, outcomeBad, outcomeDeath, btnAfter].forEach(el => {
        el.classList.add("hidden");
    });

    eatingAnim.classList.remove("hidden");
    replayGifsInContainer(eatingAnim); // Reset GIF
    
    playAudio("./assets/sounds/king-eating.mp3");

    // Eating phase duration matches the king-eating.gif's actual length
    // (00:00:04.56) so the GIF finishes its single loop before we swap it out.
    const EATING_ANIM_DURATION_MS = 4560;
    const THINKING_ANIM_DURATION_MS = 2500;
    const SCORE_REVEAL_DURATION_MS = 2000;

    // 1. Eating phase
    setTimeout(() => {
        eatingAnim.classList.add("hidden");
        judgingAnim.classList.remove("hidden");
        replayGifsInContainer(judgingAnim); // Reset GIF
        playAudio("./assets/sounds/king-think.mp3");
    }, EATING_ANIM_DURATION_MS);

    // 2. Score reveal
    setTimeout(() => {
        judgingAnim.classList.add("hidden");
        state.finalScore = calculateScore();

        if (isDeath) {
            // No score for a dead King — just the grim headline, a stopped BGM, and a gasping crowd
            deathReveal.classList.remove("hidden");
            stopGameBgm();
            playAudio("./assets/sounds/crowd-gasp.mp3");
        } else {
            document.getElementById("score-number").textContent = state.finalScore;
            scoreReveal.classList.remove("hidden");
            stopGameBgmAndPlayStinger();
        }
    }, EATING_ANIM_DURATION_MS + THINKING_ANIM_DURATION_MS);

    // 3. Outcome
    setTimeout(() => {
        const s = state.finalScore;
        btnAfter.classList.remove("hidden");

        if (isDeath) {
            outcomeDeath.classList.remove("hidden");
            replayGifsInContainer(outcomeDeath); // Reset image (harmless no-op for a static PNG)

            const deathSpeeches = [
                "Guards! Sound the alarm — the royal food taster has failed us all!",
                "Zelda screams. Link faints. Somewhere, Morshu shrugs and says 'that'll be 40 rupees for the funeral.'",
                "The last thing King Harkinian ever said was 'Mah boi, this needs more sal— *gurgle*'",
                "Well. That's certainly one way to end a dinner service.",
            ];
            document.getElementById("death-speech").textContent =
                deathSpeeches[Math.floor(Math.random() * deathSpeeches.length)];

            btnAfter.textContent = "😱 Begin Punishment";
            btnAfter.onclick = initDeathPunishment;

        } else if (s >= 8) {
            outcomeGreat.classList.remove("hidden");
            replayGifsInContainer(outcomeGreat); // Reset GIF
            const speechMap = {
                10: "Extraordinary! This is the finest meal in all of Hyrule!",
                9:  "Magnificent! You've outdone yourself!",
                8:  "Well done! The King is pleased!",
            };
            document.getElementById("great-speech").textContent = speechMap[s] || speechMap[8];
            // ASSET: playAudio("king-compliment.mp3")
            btnAfter.textContent = "🏆 Victory!";
            btnAfter.onclick = initVictory;

        } else if (s >= 6) {
            outcomeMeh.classList.remove("hidden");
            replayGifsInContainer(outcomeMeh); // Reset GIF
            
            
            document.getElementById("meh-speech").textContent = "Hmm. I suppose this is edible... but it could have been better!";
            
            
            btnAfter.textContent = "...Play Again";
            btnAfter.onclick = () => initMainMenu(true);

        } else {
            outcomeBad.classList.remove("hidden");
            replayGifsInContainer(outcomeBad); // Reset GIF
            const punishmentAudio = playAudio("./assets/sounds/scrub-all-the-floors-in-hyrule.mp3");
            
            // Re-added dialogue for the Bad outcome
            document.getElementById("bad-speech").textContent = "This is disgusting! You must scrub all the floors in Hyrule!";
            
            btnAfter.textContent = "😱 Begin Punishment";
            btnAfter.disabled = true;
            btnAfter.onclick = initScrubMinigame;

            // Enable the button once the voice line finishes playing
            punishmentAudio.addEventListener("ended", () => {
                btnAfter.disabled = false;
            });
            // Fallback: enable after 7 seconds in case the audio event doesn't fire
            setTimeout(() => { btnAfter.disabled = false; }, 7000);
        }
    }, EATING_ANIM_DURATION_MS + THINKING_ANIM_DURATION_MS + SCORE_REVEAL_DURATION_MS);
}

/* ─────────────────────────────────────────────
   SCRUB MINIGAME — Canvas-based, sponge cursor,
   sweep-to-clean litter, alpha-tested sprites
───────────────────────────────────────────── */
const TOTAL_DIRT = 17; // 17 pieces spread all over — no more easy wins!

const LITTER_SPRITES = [
    "assets/litter/shit.png",
    "assets/litter/wine-stain.png",
    "assets/litter/dirt-stain.png",
    "assets/litter/milk-spill.png",
    "assets/litter/crumbs.png",
];

// Each litter piece on the canvas
let litterPieces = [];
// Loaded Image objects keyed by src
const litterImageCache = {};
let spongeImage = null;
let scrubCanvas = null;
let scrubCtx = null;
let scrubAnimFrame = null;
let spongePos = { x: -200, y: -200 }; // off-screen until mouse enters
let scrubTimerInterval = null;

// Scrub sound state
let scrubSoundAudio = null;
let scrubSoundTimeout = null;
const SCRUB_SOUND_SRC = "./assets/sounds/sponge-scrub.mp3";
const SCRUB_STOP_DELAY_MS = 180; // brief grace period so it doesn't cut on every tiny gap

function startScrubSound() {
    if (scrubSoundTimeout) { clearTimeout(scrubSoundTimeout); scrubSoundTimeout = null; }
    if (!scrubSoundAudio) {
        scrubSoundAudio = new Audio(SCRUB_SOUND_SRC);
        scrubSoundAudio.loop = true;
        scrubSoundAudio.volume = getSfxVolume();
        scrubSoundAudio.play().catch(() => {});
    }
}

function scheduleScrubSoundStop() {
    if (scrubSoundTimeout) clearTimeout(scrubSoundTimeout);
    scrubSoundTimeout = setTimeout(stopScrubSound, SCRUB_STOP_DELAY_MS);
}

function stopScrubSound() {
    if (scrubSoundTimeout) { clearTimeout(scrubSoundTimeout); scrubSoundTimeout = null; }
    if (scrubSoundAudio) {
        scrubSoundAudio.pause();
        scrubSoundAudio.currentTime = 0;
        scrubSoundAudio = null;
    }
}

// Per-piece sweep tracking
// A "sweep" = cursor enters one side of the bounding box and exits the other
const SWEEPS_REQUIRED = 4;
const LITTER_DRAW_SIZE = 90; // display size in canvas pixels (source is 512x512)

function initScrubMinigame() {
    showScreen("screen-scrub");
    state.scrubProgress = 0;
    litterPieces = [];

    let timeLeft = 30;
    let cleaned  = 0;

    document.getElementById("scrub-timer").textContent    = timeLeft;
    document.getElementById("scrub-progress").textContent = "0";
    document.getElementById("scrub-complete-msg").classList.add("hidden");

    // ── Build / size the canvas ──────────────────────────────
    const floorEl = document.getElementById("scrub-floor");
    floorEl.innerHTML = "";
    floorEl.style.cursor = "none"; // hide native cursor — sponge replaces it

    scrubCanvas = document.createElement("canvas");
    scrubCanvas.id = "scrub-canvas";
    // Canvas fills the floor container
    scrubCanvas.style.display  = "block";
    scrubCanvas.style.width    = "100%";
    scrubCanvas.style.height   = "100%";
    floorEl.appendChild(scrubCanvas);

    // Size canvas to actual pixel dimensions of the container
    function resizeCanvas() {
        scrubCanvas.width  = floorEl.offsetWidth;
        scrubCanvas.height = floorEl.offsetHeight;
    }
    resizeCanvas();

    scrubCtx = scrubCanvas.getContext("2d");

    // ── Load sponge cursor image ─────────────────────────────
    if (!spongeImage) {
        spongeImage = new Image();
        spongeImage.src = "assets/cursors/Sponge.png";
    }

    // ── Preload all litter images ────────────────────────────
    let imagesLoaded = 0;
    const allSrcs = [...new Set(LITTER_SPRITES)];
    allSrcs.forEach(src => {
        if (!litterImageCache[src]) {
            const img = new Image();
            img.onload = () => { litterImageCache[src] = img; imagesLoaded++; if (imagesLoaded >= allSrcs.length) placeLitter(); };
            img.onerror = () => { litterImageCache[src] = null; imagesLoaded++; if (imagesLoaded >= allSrcs.length) placeLitter(); };
            img.src = src;
        } else {
            imagesLoaded++;
            if (imagesLoaded >= allSrcs.length) placeLitter();
        }
    });

    // ── Place litter randomly, no overlaps ──────────────────
    function placeLitter() {
        const W = scrubCanvas.width;
        const H = scrubCanvas.height;
        const pad = 10;
        const sz  = LITTER_DRAW_SIZE;
        const maxAttempts = 60;

        for (let i = 0; i < TOTAL_DIRT; i++) {
            const spriteSrc = LITTER_SPRITES[Math.floor(Math.random() * LITTER_SPRITES.length)];
            // random size variation: 70–110px so it feels organic
            const drawSize = sz * (0.78 + Math.random() * 0.44);

            let x, y, attempts = 0, ok;
            do {
                x = pad + Math.random() * (W - drawSize - pad * 2);
                y = pad + Math.random() * (H - drawSize - pad * 2);
                ok = litterPieces.every(p => {
                    const dx = x - p.x, dy = y - p.y;
                    return Math.sqrt(dx*dx + dy*dy) > (drawSize + p.size) * 0.65;
                });
                attempts++;
            } while (!ok && attempts < maxAttempts);

            litterPieces.push({
                x, y,
                size: drawSize,
                spriteSrc,
                rotation: Math.random() * Math.PI * 2, // random rotation 0–360°
                alpha: 1,             // fades 0→1 cleaned
                sweeps: 0,            // completed sweeps
                // Sweep state machine: track entry side
                sweepState: "idle",   // 'idle' | 'entered'
                entryX: null,
                entryY: null,
            });
        }

        startScrubLoop();
    }

    // ── Mouse / pointer tracking ─────────────────────────────
    function getCanvasPos(e) {
        const rect = scrubCanvas.getBoundingClientRect();
        const scaleX = scrubCanvas.width  / rect.width;
        const scaleY = scrubCanvas.height / rect.height;
        const cx = e.clientX ?? (e.touches && e.touches[0].clientX);
        const cy = e.clientY ?? (e.touches && e.touches[0].clientY);
        return {
            x: (cx - rect.left) * scaleX,
            y: (cy - rect.top)  * scaleY,
        };
    }

    function onMove(e) {
        e.preventDefault();
        const pos = getCanvasPos(e);
        const prevX = spongePos.x;
        const prevY = spongePos.y;
        spongePos = pos;

        let isOverAnyStain = false;

        // Check sweeps for each unfinished litter piece
        litterPieces.forEach(p => {
            if (p.alpha <= 0) return; // already cleaned

            const inBounds = (px, py) =>
                px >= p.x && px <= p.x + p.size &&
                py >= p.y && py <= p.y + p.size;

            const wasIn = inBounds(prevX, prevY);
            const nowIn = inBounds(pos.x,  pos.y);

            if (nowIn) isOverAnyStain = true;

            if (p.sweepState === "idle" && nowIn && !wasIn) {
                // Entered the bounding box — record entry side
                p.sweepState = "entered";
                p.entryX = pos.x;
                p.entryY = pos.y;
            } else if (p.sweepState === "entered" && wasIn && !nowIn) {
                // Exited the bounding box — check if we truly crossed it
                const dx = pos.x - p.entryX;
                const dy = pos.y - p.entryY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                // Only count if traversal distance >= 40% of the sprite size
                if (dist >= p.size * 0.4) {
                    p.sweeps++;
                    // Fade proportionally
                    p.alpha = Math.max(0, 1 - p.sweeps / SWEEPS_REQUIRED);
                    if (p.sweeps >= SWEEPS_REQUIRED) {
                        p.alpha = 0;
                        cleaned++;
                        const pct = Math.round(cleaned / TOTAL_DIRT * 100);
                        document.getElementById("scrub-progress").textContent = pct;

                        // Stain fully cleaned — cut the sound immediately
                        stopScrubSound();

                        if (cleaned >= TOTAL_DIRT) {
                            endScrubSuccess();
                        }
                    }
                }
                p.sweepState = "idle";
            } else if (p.sweepState === "entered" && !nowIn && !wasIn) {
                // Lost track (fast movement) — reset
                p.sweepState = "idle";
            }
        });

        // Drive the scrub sound: play while the sponge is over a live stain,
        // schedule a short stop if it moves off (so slow back-and-forth loops cleanly).
        if (isOverAnyStain) {
            startScrubSound();
        } else {
            scheduleScrubSoundStop();
        }
    }

    scrubCanvas.addEventListener("mousemove",  onMove, { passive: false });
    scrubCanvas.addEventListener("touchmove",  onMove, { passive: false });
    scrubCanvas.addEventListener("mouseleave", () => { spongePos = { x: -300, y: -300 }; stopScrubSound(); });
    scrubCanvas.addEventListener("touchend",   () => { stopScrubSound(); });

    // ── Render loop ─────────────────────────────────────────
    function startScrubLoop() {
        if (scrubAnimFrame) cancelAnimationFrame(scrubAnimFrame);

        function draw() {
            const W = scrubCanvas.width;
            const H = scrubCanvas.height;
            scrubCtx.clearRect(0, 0, W, H);

            // Draw litter pieces (alpha-tested via globalAlpha, rotated around their centre)
            litterPieces.forEach(p => {
                if (p.alpha <= 0) return;
                const img = litterImageCache[p.spriteSrc];
                if (!img) return;

                const cx = p.x + p.size / 2;
                const cy = p.y + p.size / 2;
                scrubCtx.save();
                scrubCtx.globalAlpha = p.alpha;
                scrubCtx.translate(cx, cy);
                scrubCtx.rotate(p.rotation);
                scrubCtx.drawImage(img, -p.size / 2, -p.size / 2, p.size, p.size);
                scrubCtx.restore();
            });

            // Draw sponge cursor (alpha-tested — it's a PNG with transparent bg)
            if (spongeImage && spongeImage.complete) {
                const SW = 64; // display size of the 128x128 sponge at 1:1 feel
                const SH = 64;
                scrubCtx.save();
                scrubCtx.globalAlpha = 1;
                scrubCtx.drawImage(spongeImage, spongePos.x - SW / 2, spongePos.y - SH / 2, SW, SH);
                scrubCtx.restore();
            }

            scrubAnimFrame = requestAnimationFrame(draw);
        }
        draw();
    }

    // ── Countdown timer ──────────────────────────────────────
    if (scrubTimerInterval) clearInterval(scrubTimerInterval);
    scrubTimerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById("scrub-timer").textContent = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(scrubTimerInterval);
            scrubTimerInterval = null;
            if (cleaned < TOTAL_DIRT) {
                stopScrubSound();
                cleanupScrubCanvas();
                initJumpscare();
            }
        }
    }, 1000);

    state.scrubBgm = playAudio("./assets/music/scrubbing-bg-music.wav", { loop: true, music: true });

    function endScrubSuccess() {
        clearInterval(scrubTimerInterval);
        scrubTimerInterval = null;
        stopScrubSound();
        stopScrubBgm();
        cleanupScrubCanvas();
        document.getElementById("scrub-complete-msg").classList.remove("hidden");
        setTimeout(initDefeat, 2000);
    }
}

function cleanupScrubCanvas() {
    if (scrubAnimFrame) {
        cancelAnimationFrame(scrubAnimFrame);
        scrubAnimFrame = null;
    }
    // Restore normal cursor on the floor element
    const floorEl = document.getElementById("scrub-floor");
    if (floorEl) floorEl.style.cursor = "";
}

function stopScrubBgm() {
    stopAudio(state.scrubBgm);
    state.scrubBgm = null;
}

/* ─────────────────────────────────────────────
   JUMPSCARE
───────────────────────────────────────────── */
function initJumpscare() {
    showScreen("screen-jumpscare");
    stopScrubBgm();
    playAudio("./assets/sounds/jumpscare.mp3");

    // After ~2 seconds the jumpscare animation is done and the king angry image is at full size —
    // play the insult voice line at exactly that moment.
    const JUMPSCARE_ANIM_DURATION_MS = 2000;
    setTimeout(() => {
        playAudio("./assets/sounds/king-jumpscare-insult.mp3");
    }, JUMPSCARE_ANIM_DURATION_MS);

    // Go to scrub-fail screen after the voice line has had time to play (~1.5 extra seconds)
    setTimeout(initScrubFail, JUMPSCARE_ANIM_DURATION_MS + 1500);
}

/* ─────────────────────────────────────────────
   SCRUB FAIL  (ran out of time scrubbing)
───────────────────────────────────────────── */
function initScrubFail() {
    showScreen("screen-scrub-fail");

    // Reset Mayor Cravendish's GIF to first frame
    replayGifsInContainer(document.getElementById("screen-scrub-fail"));

    // Play his voice line as soon as he appears
    playAudio("./assets/sounds/mayor-cravendish-this-is-illegal.mp3");

    document.getElementById("btn-scrub-fail-again").onclick = () => initMainMenu(true);
    document.getElementById("btn-scrub-fail-hub").onclick   = () => { window.location.href = "../index.html"; };
}

/* ─────────────────────────────────────────────
   DEFEAT
───────────────────────────────────────────── */
function initDefeat() {
    showScreen("screen-defeat");

    const meal = MEALS[state.chosenMeal];
    const defeatMessages = [
        `The King is furious. Your ${meal.label} was an insult to Hyrule, and you couldn't even clean up every single floor in Hyrule!`,
        `You have shamed the Royal Kitchen! Not even Ganon would eat that ${meal.label}!`,
        `The King has fired you on the spot for the blunder that was your ${meal.label}!\nEven Link wouldn't eat that!`,
        `The floors remain filthy! The King demands you to never set foot in the kitchen again!`,
        `The King is so disappointed in your ${meal.label} that he has revoked your chef's license!`,
        `The King says you were supposed to scrub ALL THE FLOORS IN HYRULE! Not just the ones in the kitchen!`,
    ];
    document.getElementById("defeat-text").textContent =
        defeatMessages[Math.floor(Math.random() * defeatMessages.length)];

    playAudio("./assets/sounds/defeat-sting.mp3");

    document.getElementById("btn-defeat-again").onclick = () => initMainMenu(true);
    document.getElementById("btn-defeat-hub").onclick   = () => { window.location.href = "../index.html"; };
}

/* ─────────────────────────────────────────────
   VICTORY
───────────────────────────────────────────── */
function initVictory() {
    showScreen("screen-victory");

    const meal = MEALS[state.chosenMeal];
    const victoryMessages = {
        10: `A perfect score! The King has never tasted a ${meal.label} this fine in all the land!`,
        9:  `Almost flawless! Your ${meal.label} made the King very happy.`,
        8:  `Well done! The King thoroughly enjoyed your ${meal.label}. Hyrule is grateful.`,
    };
    document.getElementById("victory-text").textContent =
        victoryMessages[state.finalScore] || `The King was satisfied with your ${meal.label}!`;

    playAudio("./assets/sounds/victory-fanfare.mp3");

    document.getElementById("btn-victory-again").onclick = () => initMainMenu(true);
    document.getElementById("btn-victory-hub").onclick   = () => { window.location.href = "../index.html"; };
}

/* ─────────────────────────────────────────────
   DEATH PUNISHMENT  (you killed the King)
───────────────────────────────────────────── */
function initDeathPunishment() {
    showScreen("screen-death-punishment");

    const meal = MEALS[state.chosenMeal];
    const deathPunishmentMessages = [
        `Turns out royal food-tasting laws exist for a reason. Your ${meal.label} has earned you a permanent reservation in Hyrule's eternal fire pits!`,
        `Congratulations — you've unlocked the rare "Regicide by Dinner" ending! The Royal Guard did NOT appreciate your ${meal.label}.`,
        `The King choked out his last "Mah Boi" thanks to your ${meal.label}. Now it's your turn to feel the heat. Literally.`,
        `The royal kitchen is now a crime scene. Your ${meal.label} has made you the most infamous chef in Hyrule's history.`,
        `Somewhere, Ganon is taking notes. Nobody has ever ended a royal dinner service quite like this before.`,
        `Duke Onkled would be proud of that epic betrayal. At least you don't have to scrub all the floors in Hyrule anymore — you're too busy being roasted alive.`,
        `Well, now that the King is dead, Princess Zelda took over the reins and ordered your immediate execution. She is not happy with the death of her father.`,
        `SQUEAL! The royal food taster has failed. The King is dead, and the royal family members are not happy with your ${meal.label}.`,
        `Zelda is now queen. Her first royal decree was to have your portrait painted and hung in the palace — as a warning to all future chefs. You are now famous for all the wrong reasons.`,
    ];
    document.getElementById("death-punishment-text").textContent =
        deathPunishmentMessages[Math.floor(Math.random() * deathPunishmentMessages.length)];

    replayGifsInContainer(document.getElementById("screen-death-punishment"));

    playAudio("./assets/sounds/player-death-scream.mp3");
    state.fireAudio = playAudio("./assets/sounds/fire.mp3", { loop: true, music: false });

    document.getElementById("btn-death-punishment-again").onclick = () => {
        stopAudio(state.fireAudio);
        state.fireAudio = null;
        state.usedMeals.clear(); // King is dead — wipe the royal dinner menu memory
        initMainMenu(true);
    };
    document.getElementById("btn-death-punishment-hub").onclick = () => {
        stopAudio(state.fireAudio);
        state.fireAudio = null;
        window.location.href = "../index.html";
    };
}

/* ─────────────────────────────────────────────
   PRELOADER
   Loads every image, GIF, audio clip, and font
   before handing off to initMainMenu(), so the
   game never stalls waiting for assets mid-play.
───────────────────────────────────────────── */

const PRELOAD_IMAGES = [
    // Backdrops
    "./assets/backdrops/menu-background.png",
    "./assets/backdrops/CD-i-castle-bg.png",
    "./assets/backdrops/morshu-shop.png",
    "./assets/backdrops/kitchen-bg.png",
    "./assets/backdrops/dirty-floor-bg.png",
    "./assets/backdrops/dungeon.png",
    "./assets/backdrops/death-punishment-bg.png",
    // GIFs
    "./assets/GIFs/king-walk-in.gif",
    "./assets/GIFs/thinking.gif",
    "./assets/GIFs/decision.gif",
    "./assets/GIFs/morshu-idle.gif",
    "./assets/GIFs/morshu-cant-afford.gif",
    "./assets/GIFs/king-eating.gif",
    "./assets/GIFs/scrub-all-the-floors-in-hyrule.gif",
    "./assets/GIFs/mayor-cravendish.gif",
    "./assets/GIFs/player-burning.gif",
    // Sprites
    // Litter sprites (scrub minigame)
    "./assets/litter/shit.png",
    "./assets/litter/wine-stain.png",
    "./assets/litter/dirt-stain.png",
    "./assets/litter/milk-spill.png",
    "./assets/litter/crumbs.png",
    // Sponge cursor
    "./assets/cursors/Sponge.png",
    // Sprites
    "./assets/sprites/Zelda-CD-i.png",
    "./assets/sprites/Link-CD-i.png",
    "./assets/sprites/plate.png",
    "./assets/sprites/platter.png",
    "./assets/sprites/bowl.png",
    "./assets/sprites/king-happy.png",
    "./assets/sprites/king-meh.png",
    "./assets/sprites/king-dead.png",
    "./assets/sprites/king-very-happy.png",
    "./assets/sprites/king-angry-jumpscare.png",
    "./assets/sprites/cooking-pot.png",
    "./assets/sprites/pan.png",
    "./assets/sprites/pot-and-pan.png",
    "./assets/sprites/oven.png",
];

const PRELOAD_AUDIO = [
    // Music
    "./assets/music/main-menu-theme.wav",
    "./assets/music/prep-theme.wav",
    "./assets/music/scrubbing-bg-music.wav",
    // Sounds
    "./assets/sounds/Mah-Boi.mp3",
    "./assets/sounds/king-think.mp3",
    "./assets/sounds/king-oh.mp3",
    "./assets/sounds/king-eating.mp3",
    "./assets/sounds/king-wants-spaghetti.mp3",
    "./assets/sounds/king-wants-pizza.mp3",
    "./assets/sounds/king-wants-chicken.mp3",
    "./assets/sounds/king-wants-burger.mp3",
    "./assets/sounds/king-wants-seafood.mp3",
    "./assets/sounds/king-wants-steak-frites.mp3",
    "./assets/sounds/king-wants-pancakes.mp3",
    "./assets/sounds/king-wants-lobster-bisque.mp3",
    "./assets/sounds/morshu-greeting.mp3",
    "./assets/sounds/morshu-cant-afford.mp3",
    "./assets/sounds/crowd-gasp.mp3",
    "./assets/sounds/scrub-all-the-floors-in-hyrule.mp3",
    "./assets/sounds/jumpscare.mp3",
    "./assets/sounds/king-jumpscare-insult.mp3",
    "./assets/sounds/mayor-cravendish-this-is-illegal.mp3",
    "./assets/sounds/defeat-sting.mp3",
    "./assets/sounds/victory-fanfare.mp3",
    "./assets/sounds/player-death-scream.mp3",
    "./assets/sounds/fire.mp3",
    "./assets/sounds/sponge-scrub.mp3",
];

const PRELOAD_FONTS = [
    { family: "Charlemagne Std Bold", url: "./assets/fonts/Charlemagne Std Bold.ttf" },
    { family: "Comic Sans MS",        url: "../Comic-Sans-MS.ttf" },
];

function preloadAssets() {
    const bar        = document.getElementById("preloader-bar");
    const label      = document.getElementById("preloader-label");

    const totalImages = PRELOAD_IMAGES.length;
    const totalAudio  = PRELOAD_AUDIO.length;
    const totalFonts  = PRELOAD_FONTS.length;
    const total       = totalImages + totalAudio + totalFonts;
    let   loaded      = 0;

    const funnyLabels = [
        "Bribing Morshu for faster loading...",
        "Polishing the King's dinner plate...",
        "Convincing Link to actually help...",
        "Heating the royal oven to 425°F...",
        "Counting the King's rupees...",
        "Scrubbing the preloader floors...",
        "Mah boi, this loading screen is everything I wish for!",
        "Ganon stole the assets, retrieving them...",
        "Zelda is thinking about cooking tips...",
        "Morshu checking inventory...",
    ];
    let labelCycle = 0;
    const labelInterval = setInterval(() => {
        label.textContent = funnyLabels[labelCycle % funnyLabels.length];
        labelCycle++;
    }, 1400);

    function onLoad() {
        loaded++;
        const pct = Math.round((loaded / total) * 100);
        bar.style.width = pct + "%";
        if (loaded >= total) {
            clearInterval(labelInterval);
            label.textContent = "Ready! The King awaits... 👑";
            // Small delay so the player can see 100% before we switch screens
            setTimeout(() => initMainMenu(false), 600);
        }
    }

    // --- Images & GIFs ---
    PRELOAD_IMAGES.forEach(src => {
        const img = new Image();
        img.onload  = onLoad;
        img.onerror = onLoad; // count failures too so we never get stuck
        img.src     = src;
    });

    // --- Audio (load enough to play, not the whole file) ---
    PRELOAD_AUDIO.forEach(src => {
        const audio       = new Audio();
        audio.preload     = "auto";
        // canplaythrough = enough buffered to play without interruption
        audio.oncanplaythrough = onLoad;
        audio.onerror          = onLoad;
        audio.src              = src;
        audio.load();
    });

    // --- Fonts ---
    PRELOAD_FONTS.forEach(({ family, url }) => {
        const font = new FontFace(family, `url("${url}")`);
        font.load()
            .then(loaded => { document.fonts.add(loaded); onLoad(); })
            .catch(() => onLoad()); // non-fatal if the font file is missing
    });
}

/* ─────────────────────────────────────────────
   BOOT
───────────────────────────────────────────── */
preloadAssets();