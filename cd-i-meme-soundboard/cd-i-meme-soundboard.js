// 1. DATA: List of characters and their associated sound files
const characterData = [
    {
        name: "Mario",
        img: "HotelMarioMario.png",
        imgClass: "img-mario",
        sounds: ["All-Toasters-Toast-Toast.mp3", "Luigi-Look-Its-From-Bowser.mp3", "Dear-Pesky-Plumbers.mp3", "Enclosed-Instructions-Book.mp3", "Picnic-Eh-Luigi.mp3", "That-Oughta-Do-It.mp3", "Where-Am-I.mp3"]
    },
    {
        name: "Luigi",
        img: "HotelMarioLuigi.png",
        imgClass: "img-luigi",
        sounds: ["I-Hope-She-Made-Lotsa-Spaghetti.mp3", "And-You-Gotta-Help-Us.mp3", "Over-There.mp3", "You-Bring-A-Light.mp3", "There-Is-Fire.mp3"]
    },
    {
        name: "Bowser",
        img: "HotelMarioBowser.png",
        imgClass: "img-bowser",
        sounds: ["Bowser-Laugh.mp3"]
    },
    {
        name: "Ganon",
        img: "Ganon-CD-i.png",
        imgClass: "img-ganon",
        sounds: ["Join-Me-Link.mp3", "You-Must-Die.mp3", "You-Dare-Bring-Light-To-My-Lair.mp3", "No-Not-Into-The-Pit-It-Burns.mp3"]
    },
    {
        name: "Gwonam",
        img: "Gwonam-CD-i.png",
        imgClass: "img-gwonam",
        sounds: ["Your-Majesty.mp3", "It-Is-Written-Only-Link-Can-Defeat-Ganon.mp3", "There-Is-No-Time-Your-Sword-Is-Enough.mp3", "Squadala-We-Are-Off.mp3", "At-Last-You-Have-The-Vision-To-Find-My-House.mp3"]
    },
    {
        name: "King Harkinian",
        img: "King-Harkinian-CD-i.png",
        imgClass: "img-king-harkinian",
        sounds: ["Dinner.mp3", "King-Harkinian-Laugh.mp3", "Mah-Boi.mp3", "This-Peace-Is-What-All-True-Warriors-Strive-For.mp3"]
    },
    {
        name: "Duke Onkled",
        img: "Duke-Onkled-CD-i.png",
        imgClass: "img-duke-onkled",
        sounds: ["Have-Mercy.mp3"]
    },
    {
        name: "Link",
        img: "Link-CD-i.png",
        imgClass: "img-link",
        sounds: ["Gee-It-Sure-Is-Boring-Around-Here.mp3", "Great-I-Will-Grab-My-Stuff.mp3", "How-About-A-Kiss.mp3", "I-Won.mp3", "Oh-Boy-Im-So-Hungry-I-Could-Eat-An-Octorock.mp3"]
    },
    {
        name: "Morshu",
        img: "Morshu-CD-i.png",
        imgClass: "img-morshu",
        sounds: ["Lamp-Oil.mp3", "Rope.mp3", "Bombs.mp3", "You-Want-It.mp3", "Its-Yours-My-Friend-As-Long-As-You-Have-Enough-Rupees.mp3", "Sorry-Link-I-Cant-Give-Credit.mp3", "MMMMMM.mp3", "Richer.mp3"]
    }
];

// Wait for the DOM to load so the slider exists
document.addEventListener('DOMContentLoaded', () => {
    
const randomBtn = document.getElementById('random-btn');

randomBtn.addEventListener('click', () => {
    // 1. Pick a random character from the array
    const randomChar = characterData[Math.floor(Math.random() * characterData.length)];
    
    // 2. Pick a random sound from that character's list
    const randomSound = randomChar.sounds[Math.floor(Math.random() * randomChar.sounds.length)];
    
    // 3. Create and play the audio (using your existing volume setup)
    const randomClip = new Audio(`assets/soundeffects/${randomSound}`);
    const source = audioCtx.createMediaElementSource(randomClip);
    source.connect(gainNode);

    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    randomClip.play();
});

    // --- VOLUME SYSTEM SETUP ---
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const audioCtx = new AudioContext();
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 1.0; 
    gainNode.connect(audioCtx.destination);

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
        group.className = 'character-group';

        const charTitle = document.createElement('h2');
        charTitle.innerText = character.name;
        group.appendChild(charTitle);

        const btnWrapper = document.createElement('div');
        btnWrapper.className = 'button-wrapper';

        character.sounds.forEach(soundFile => {
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
            label.innerText = soundFile.replace('.mp3', '').replace(/-/g, ' ');

            // AUDIO LOGIC
            const clip = new Audio(`assets/soundeffects/${soundFile}`);
            
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