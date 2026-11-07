// 1. DATA: List of characters and their associated sound files
// Each sound is an object with a `file` (supports relative paths) and a `name` (displayed label).
const characterData = [
    {
        name: "Mario",
        img: "HotelMarioMario.png",
        imgClass: "img-mario",
        cssClass: "char-mario",
        sounds: [
            { file: "./assets/soundeffects/All-Toasters-Toast-Toast.mp3",           name: "All toasters toast toast" },
            { file: "./assets/soundeffects/Luigi-Look-Its-From-Bowser.mp3",          name: "Luigi, look! It's from Bowser" },
            { file: "./assets/soundeffects/Dear-Pesky-Plumbers.mp3",                 name: "Dear pesky plumbers" },
            { file: "./assets/soundeffects/Enclosed-Instructions-Book.mp3",          name: "Enclosed instructions book" },
            { file: "./assets/soundeffects/Picnic-Eh-Luigi.mp3",                     name: "Nice of the princess to invite us over for a picnic, eh Luigi?" },
            { file: "./assets/soundeffects/That-Oughta-Do-It.mp3",                   name: "That oughta do it" },
            { file: "./assets/soundeffects/Where-Am-I.mp3",                          name: "Where am I?" },
            { file: "./assets/soundeffects/Hey-You-Get-Off-Of-My-Cloud.mp3",         name: "Hey you! Get off of my cloud!" },
        ]
    },
    {
        name: "Luigi",
        img: "HotelMarioLuigi.png",
        imgClass: "img-luigi",
        cssClass: "char-luigi",
        sounds: [
            { file: "./assets/soundeffects/I-Hope-She-Made-Lotsa-Spaghetti.mp3",    name: "I hope she made lotsa spaghetti!" },
            { file: "./assets/soundeffects/And-You-Gotta-Help-Us.mp3",               name: "And you gotta help us!" },
            { file: "./assets/soundeffects/Over-There.mp3",                          name: "Over there!" },
            { file: "./assets/soundeffects/You-Bring-A-Light.mp3",                   name: "You bring a light?" },
            { file: "./assets/soundeffects/There-Is-Fire.mp3",                       name: "There is fire!" },
        ]
    },
    {
        name: "Bowser",
        img: "HotelMarioBowser.png",
        imgClass: "img-bowser",
        cssClass: "char-bowser",
        sounds: [
            { file: "./assets/soundeffects/Bowser-Laugh.mp3",                        name: "Laugh" },
        ]
    },
    {
        name: "Ganon",
        img: "Ganon-CD-i.png",
        imgClass: "img-ganon",
        cssClass: "char-ganon",
        sounds: [
            { file: "./assets/soundeffects/Join-Me-Link.mp3",                        name: "Join me, Link!" },
            { file: "./assets/soundeffects/You-Must-Die.mp3",                        name: "You must die!" },
            { file: "./assets/soundeffects/You-Dare-Bring-Light-To-My-Lair.mp3",    name: "You dare bring light to my lair?!" },
            { file: "./assets/soundeffects/No-Not-Into-The-Pit-It-Burns.mp3",        name: "No! Not into the pit! It burns!" },
        ]
    },
    {
        name: "Gwonam",
        img: "Gwonam-CD-i.png",
        imgClass: "img-gwonam",
        cssClass: "char-gwonam",
        sounds: [
            { file: "./assets/soundeffects/Your-Majesty.mp3",                                    name: "Your majesty" },
            { file: "./assets/soundeffects/It-Is-Written-Only-Link-Can-Defeat-Ganon.mp3",        name: "It is written: Only Link can defeat Ganon" },
            { file: "./assets/soundeffects/There-Is-No-Time-Your-Sword-Is-Enough.mp3",           name: "There is no time! Your sword is enough" },
            { file: "./assets/soundeffects/Squadala-We-Are-Off.mp3",                             name: "Squadala! We're off!" },
            { file: "./assets/soundeffects/At-Last-You-Have-The-Vision-To-Find-My-House.mp3",    name: "At last you have the vision to find my house" },
        ]
    },
    {
        name: "King Harkinian",
        img: "King-Harkinian-CD-i.png",
        imgClass: "img-king-harkinian",
        cssClass: "char-king-harkinian",
        sounds: [
            { file: "./assets/soundeffects/Dinner.mp3",                                          name: "Dinner!" },
            { file: "./assets/soundeffects/King-Harkinian-Laugh.mp3",                            name: "Laugh" },
            { file: "./assets/soundeffects/Mah-Boi.mp3",                                         name: "Mah boi" },
            { file: "./assets/soundeffects/This-Peace-Is-What-All-True-Warriors-Strive-For.mp3", name: "This peace is what all true warriors strive for" },
            { file: "../king-harkinian-desktop-pet/assets/audio/voice-lines/duke-onkled-under-attack.mp3", name: "Duke Onkled is under attack by the evil forces of Ganon!" },
            { file: "../king-harkinian-desktop-pet/assets/audio/voice-lines/scrub-all-the-floors-in-hyrule.mp3", name: "After you've scrubbed all the floors in Hyrule" },
            { file: "../king-harkinian-desktop-pet/assets/audio/voice-lines/ship-sails.mp3", name: "My ship sails in the morning!" },
            { file: "../king-harkinian-desktop-pet/assets/audio/voice-lines/im-going-to-gamelon.mp3", name: "I'm going to Gamelon!" },
        ]
    },
    {
        name: "Duke Onkled",
        img: "Duke-Onkled-CD-i.png",
        imgClass: "img-duke-onkled",
        cssClass: "char-duke-onkled",
        sounds: [
            { file: "./assets/soundeffects/Have-Mercy.mp3",                          name: "Please, your omnipotence! Have mercy!" },
            { file: "../grand-meme-prix/assets/voicelines/duke-onkled-hit.mp3",       name: "Don't hurt me!" },
        ]
    },
    {
        name: "Link",
        img: "Link-CD-i.png",
        imgClass: "img-link",
        cssClass: "char-link",
        sounds: [
            { file: "./assets/soundeffects/Gee-It-Sure-Is-Boring-Around-Here.mp3",              name: "Gee, it sure is boring around here" },
            { file: "./assets/soundeffects/Great-I-Will-Grab-My-Stuff.mp3",                     name: "Great! I'll grab my stuff" },
            { file: "./assets/soundeffects/How-About-A-Kiss.mp3",                               name: "How about a kiss?" },
            { file: "./assets/soundeffects/I-Won.mp3",                                          name: "I won!" },
            { file: "./assets/soundeffects/Oh-Boy-Im-So-Hungry-I-Could-Eat-An-Octorock.mp3",   name: "Oh boy! I'm so hungry, I could eat an Octorock!" },
            { file: "../grand-meme-prix/assets/voicelines/link-hit.mp3", name: "Golly!" },
        ]
    },
    {
        name: "Morshu",
        img: "Morshu-CD-i.png",
        imgClass: "img-morshu",
        cssClass: "char-morshu",
        sounds: [
            { file: "./assets/soundeffects/Lamp-Oil.mp3",                                                name: "Lamp Oil?" },
            { file: "./assets/soundeffects/Rope.mp3",                                                    name: "Rope?" },
            { file: "./assets/soundeffects/Bombs.mp3",                                                   name: "Bombs?" },
            { file: "./assets/soundeffects/You-Want-It.mp3",                                             name: "You want it?" },
            { file: "./assets/soundeffects/Its-Yours-My-Friend-As-Long-As-You-Have-Enough-Rupees.mp3",   name: "It's yours my friend, as long as you have enough rubies!" },
            { file: "./assets/soundeffects/Sorry-Link-I-Cant-Give-Credit.mp3",                           name: "Sorry Link, I can't give credit. Come back when you're a little..." },
            { file: "./assets/soundeffects/MMMMMM.mp3",                                                  name: "MMMMMM..." },
            { file: "./assets/soundeffects/Richer.mp3",                                                  name: "Richer!" },
        ]
    },
    {
        name: "Zelda",
        img: "Zelda-CD-i.png",
        imgClass: "img-zelda",
        cssClass: "char-zelda",
        sounds: [
            { file: "./assets/soundeffects/You-Have-Got-To-Be-Kidding.mp3", name: "You've got to be kidding!" },
            { file: "../grand-meme-prix/assets/voicelines/zelda-win.mp3", name: "Good!" },
            { file: "../grand-meme-prix/assets/voicelines/zelda-lose.mp3", name: "Father!" },
        ]
    },
    {
        name: "Mayor Cravendish",
        img: "Mayor-Cravendish.png",
        imgClass: "img-mayor-cravendish",
        cssClass: "char-mayor-cravendish",
        sounds: [
            { file: "../grand-meme-prix/assets/voicelines/mayor-cravendish-win.mp3", name: "This is illegal, you know?" },
            { file: "../grand-meme-prix/assets/voicelines/mayor-cravendish-hit.mp3", name: "Ouch!" },
            { file: "../grand-meme-prix/assets/voicelines/mayor-cravendish-lose.mp3", name: "Oh the indignity!" },
        ]
    },
];

// Wait for the DOM to load so the slider exists
document.addEventListener('DOMContentLoaded', () => {
    
    // --- VOLUME SYSTEM SETUP ---
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 1.0;
    gainNode.connect(audioCtx.destination);

const randomBtn = document.getElementById('random-btn');

randomBtn.addEventListener('click', () => {
    // 1. Pick a random character that actually has sounds
    const charsWithSounds = characterData.filter(c => c.sounds.length > 0);
    const randomChar = charsWithSounds[Math.floor(Math.random() * charsWithSounds.length)];
    
    // 2. Pick a random sound from that character's list
    const randomSound = randomChar.sounds[Math.floor(Math.random() * randomChar.sounds.length)];
    
    // 3. Create and play the audio — sound.file supports relative paths
    const randomClip = new Audio(randomSound.file);
    const source = audioCtx.createMediaElementSource(randomClip);
    source.connect(gainNode);

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    randomClip.play();
});

    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');

    // Update function to ensure both sound and text change
    volumeSlider.addEventListener('input', () => {
        const val = volumeSlider.value;
        volumeValue.innerText = `${val}%`; // Update the text
        gainNode.gain.value = val / 100;    // Update the actual volume
    });

    const container = document.getElementById('soundboard-container');

    // --- GENERATE GROUPS AND BUTTONS ---
    characterData.forEach(character => {
        const group = document.createElement('div');
        group.className = `character-group ${character.cssClass || ''}`;

        const charTitle = document.createElement('h2');
        charTitle.innerText = character.name;
        group.appendChild(charTitle);

        const btnWrapper = document.createElement('div');
        btnWrapper.className = 'button-wrapper';

        character.sounds.forEach(sound => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'sound-item';

            const btn = document.createElement('button');
            btn.className = 'sound-btn';
            
            const img = document.createElement('img');
            img.src = `assets/images/${character.img}`; 
            img.alt = character.name;
            img.className = character.imgClass;
            
            btn.appendChild(img);

            const label = document.createElement('p');
            label.className = 'sound-label';
            label.innerText = sound.name;

            // AUDIO LOGIC — sound.file supports relative paths
            const clip = new Audio(sound.file);
            
            // Link the clip to our volume controller (GainNode)
            const source = audioCtx.createMediaElementSource(clip);
            source.connect(gainNode);

            btn.addEventListener('click', () => {
                if (audioCtx.state === 'suspended') {
                    audioCtx.resume();
                }
                clip.currentTime = 0;
                clip.play();
            });

            itemDiv.appendChild(btn);
            itemDiv.appendChild(label);
            btnWrapper.appendChild(itemDiv);
        });

        group.appendChild(btnWrapper);
        container.appendChild(group);
    });
});