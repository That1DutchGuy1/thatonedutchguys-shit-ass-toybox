(function () {
    'use strict';

    const core = window.MemeMidiCore;
    const canvas = document.getElementById('visualizer');
    const context2d = canvas.getContext('2d');
    const midiSelect = document.getElementById('midi-select');
    const midiUpload = document.getElementById('midi-upload');
    const soundfontUpload = document.getElementById('sf2-upload');
    const playButton = document.getElementById('play-button');
    const stopButton = document.getElementById('stop-button');
    const seekBar = document.getElementById('seek-bar');
    const volumeSlider = document.getElementById('volume');
    const loopToggle = document.getElementById('loop-toggle');
    const masterTrim = document.getElementById('master-trim');
    const masterTrimValue = document.getElementById('master-trim-value');
    const polyphonySlider = document.getElementById('polyphony');
    const polyphonyValue = document.getElementById('polyphony-value');
    const interpolationSelect = document.getElementById('interpolation');
    const drumKitSelect = document.getElementById('drum-kit');
    const reverbSlider = document.getElementById('reverb-level');
    const reverbValue = document.getElementById('reverb-value');
    const chorusSlider = document.getElementById('chorus-level');
    const chorusValue = document.getElementById('chorus-value');
    const playerScreen = document.getElementById('player-screen');
    const settingsScreen = document.getElementById('settings-screen');
    const aboutScreen = document.getElementById('about-screen');
    const aboutContent = document.getElementById('about-content');
    const statusLine = document.getElementById('status');
    const songTitle = document.getElementById('song-title');
    const currentTimeLabel = document.getElementById('current-time');
    const totalTimeLabel = document.getElementById('total-time');
    const engineStatus = document.getElementById('engine-status');
    const soundfontName = document.getElementById('soundfont-name');
    const settingsStorageKey = 'meme-midi-player-settings-v1';
    const settingElements = [
        volumeSlider, masterTrim, polyphonySlider, interpolationSelect, drumKitSelect,
        reverbSlider, chorusSlider
    ];

    const colors = ['#ff4cbe', '#43edff', '#bdff3d', '#ffe64c', '#9d78ff', '#ff7854',
        '#64f29c', '#ff78e4', '#61a4ff', '#ffcc59', '#b9f1ff', '#d2a2ff',
        '#ff6969', '#77ffdc', '#f4ff79', '#ff9f4e'];
    const keyColors = ['#fff06a', '#ff9a4a', '#ff5bbd', '#bd75ff', '#648dff', '#3cecff',
        '#65ff89', '#d4ff47', '#fff06a', '#ff9a4a', '#ff5bbd', '#bd75ff'];
    const whitePitchClasses = new Set([0, 2, 4, 5, 7, 9, 11]);
    const channelDisplay = Array.from({ length: 16 }, (_, channel) => ({
        bank: channel === 9 ? 128 : 0,
        program: 0
    }));
    let activeMidiChannels = [];

    let soundfont = null;
    let soundfontVersion = 0;
    let soundfontLoadRequest = 0;
    let sentSoundfontVersion = -1;
    let savedDrumKit = 'auto';
    let activeSoundfontWorker = null;
    let rejectSoundfontParse = null;
    let midi = null;
    let midiName = '';
    let audioContext = null;
    let synth = null;
    let audioReadyPromise = null;
    let outputCompressor = null;
    let outputTrim = null;
    let reverbGain = null;
    let chorusGain = null;
    let position = 0;
    let playing = false;
    let startingPlayback = false;
    let playbackStartedAt = 0;
    let playbackStartPosition = 0;
    let eventIndex = 0;
    let displayEventIndex = 0;
    let scheduler = 0;
    let waveform = new Float32Array(16 * 64);
    let activeKeys = new Uint8Array(128);
    let voiceCount = 0;
    let keyboardTop = 0;
    let canvasWidth = 0;
    let canvasHeight = 0;
    let aboutLoaded = false;
    let isSeeking = false;
    let seekWasPlaying = false;
    let keyboardPointerId = null;
    let keyboardNote = -1;
    let desiredKeyboardNote = -1;
    let keyboardAuditionRequest = 0;

    function setStatus(message, isError) {
        statusLine.textContent = message;
        statusLine.classList.toggle('error', Boolean(isError));
    }

    function restoreSettings() {
        let saved;
        try {
            saved = JSON.parse(window.localStorage.getItem(settingsStorageKey) || '{}');
        } catch (error) {
            setStatus(`Saved settings could not be read: ${error.message}`, true);
            return;
        }
        if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return;
        for (const element of settingElements) {
            const value = saved[element.id];
            if (typeof value !== 'string') continue;
            if (element === drumKitSelect) {
                savedDrumKit = value;
            } else if (element instanceof HTMLInputElement && element.type === 'range') {
                const number = Number(value);
                if (Number.isFinite(number)
                    && number >= Number(element.min)
                    && number <= Number(element.max)) element.value = String(number);
            } else if (element instanceof HTMLSelectElement
                && [...element.options].some((option) => option.value === value)) {
                element.value = value;
            }
        }
        masterTrimValue.value = `${masterTrim.value}%`;
        masterTrimValue.textContent = `${masterTrim.value}%`;
        polyphonyValue.value = polyphonySlider.value;
        polyphonyValue.textContent = polyphonySlider.value;
        reverbValue.value = `${reverbSlider.value}%`;
        reverbValue.textContent = `${reverbSlider.value}%`;
        chorusValue.value = `${chorusSlider.value}%`;
        chorusValue.textContent = `${chorusSlider.value}%`;
    }

    function saveSettings() {
        const saved = {};
        for (const element of settingElements) saved[element.id] = element.value;
        if (drumKitSelect.value === 'auto' && savedDrumKit !== 'auto') {
            saved[drumKitSelect.id] = savedDrumKit;
        } else {
            savedDrumKit = drumKitSelect.value || 'auto';
        }
        try {
            window.localStorage.setItem(settingsStorageKey, JSON.stringify(saved));
        } catch (error) {
            setStatus(`Settings could not be saved in this browser: ${error.message}`, true);
        }
    }

    function parseSoundfontInWorker(buffer, request) {
        if (typeof Worker !== 'function') {
            return Promise.reject(new Error('This browser does not support background SoundFont parsing.'));
        }
        if (activeSoundfontWorker) {
            activeSoundfontWorker.terminate();
            activeSoundfontWorker = null;
            if (rejectSoundfontParse) rejectSoundfontParse(new Error('SoundFont parsing was replaced by a newer upload.'));
            rejectSoundfontParse = null;
        }
        return new Promise((resolve, reject) => {
            const worker = new Worker('meme-midi-loader.js');
            activeSoundfontWorker = worker;
            rejectSoundfontParse = reject;
            const finish = () => {
                worker.terminate();
                if (activeSoundfontWorker === worker) activeSoundfontWorker = null;
                if (rejectSoundfontParse === reject) rejectSoundfontParse = null;
            };
            worker.addEventListener('message', (event) => {
                finish();
                if (request !== soundfontLoadRequest) {
                    reject(new Error('SoundFont parsing was replaced by a newer upload.'));
                } else if (event.data.error) {
                    reject(new Error(event.data.error));
                } else {
                    resolve(event.data.soundfont);
                }
            }, { once: true });
            worker.addEventListener('error', (event) => {
                finish();
                reject(new Error(`Background SoundFont parsing failed: ${event.message}`));
            }, { once: true });
            try {
                worker.postMessage({ buffer }, [buffer]);
            } catch (error) {
                finish();
                reject(new Error(`Could not send SoundFont data to the background parser: ${error.message}`));
            }
        });
    }

    function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
        const whole = Math.floor(seconds);
        return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
    }

    function updateButtons() {
        playButton.disabled = startingPlayback || !midi || !soundfont;
        stopButton.disabled = startingPlayback || !midi;
        playButton.textContent = startingPlayback
            ? '… STARTING'
            : playing || (isSeeking && seekWasPlaying) ? 'Ⅱ PAUSE' : '▶ PLAY';
        seekBar.disabled = startingPlayback || !midi || midi.duration <= 0;
    }

    function sendSoundfontToSynth() {
        if (!synth || !soundfont || sentSoundfontVersion === soundfontVersion) return;
        const sampleBuffer = soundfont.sampleData.buffer;
        try {
            synth.port.postMessage({
                type: 'soundfont',
                name: soundfont.name,
                sampleBuffer,
                sampleByteOffset: soundfont.sampleData.byteOffset,
                sampleLength: soundfont.sampleData.length,
                sampleHeaders: soundfont.samples,
                presets: soundfont.presets,
                fallbackPreset: soundfont.fallbackPreset
            }, [sampleBuffer]);
        } catch (error) {
            setStatus(`SoundFont could not be sent to the audio engine: ${error.message}`, true);
            engineStatus.textContent = 'SYNTH: LOAD ERROR';
            throw error;
        }
        sentSoundfontVersion = soundfontVersion;
        engineStatus.textContent = 'SYNTH: PARSING SOUNDS...';
    }

    function settingsValue(slider) {
        return Number(slider.value) / 100;
    }

    function selectedDrumPreset() {
        const [bank, program] = drumKitSelect.value.split(':').map(Number);
        return drumKitSelect.value === 'auto' ? null : { bank, program };
    }

    function postSynthSettings() {
        if (!synth) return;
        synth.port.postMessage({ type: 'master', value: Number(volumeSlider.value) / 100 });
        synth.port.postMessage({ type: 'extraReverb', value: settingsValue(reverbSlider) });
        synth.port.postMessage({ type: 'polyphony', value: Number(polyphonySlider.value) });
        synth.port.postMessage({ type: 'interpolation', value: interpolationSelect.value });
        synth.port.postMessage({ type: 'drumPreset', value: selectedDrumPreset() });
    }

    function makeReverbImpulse(context) {
        const length = Math.floor(context.sampleRate * 2.4);
        const impulse = context.createBuffer(2, length, context.sampleRate);
        for (let channel = 0; channel < 2; channel++) {
            const samples = impulse.getChannelData(channel);
            let energy = 0;
            for (let i = 0; i < length; i++) {
                const decay = Math.pow(1 - i / length, 2.8);
                const noise = Math.random() * 2 - 1;
                samples[i] = noise * decay * 0.42;
                energy += samples[i] * samples[i];
            }
            const scale = 1 / Math.sqrt(energy);
            for (let i = 0; i < length; i++) samples[i] *= scale;
        }
        return impulse;
    }

    function createOutputGraph() {
        outputCompressor = audioContext.createDynamicsCompressor();
        outputCompressor.channelCount = 2;
        outputCompressor.channelCountMode = 'explicit';
        outputCompressor.channelInterpretation = 'speakers';
        outputCompressor.threshold.value = -6;
        outputCompressor.knee.value = 6;
        outputCompressor.ratio.value = 4;
        outputCompressor.attack.value = 0.004;
        outputCompressor.release.value = 0.18;
        outputTrim = audioContext.createGain();
        outputTrim.channelCount = 2;
        outputTrim.channelCountMode = 'explicit';
        outputTrim.channelInterpretation = 'speakers';
        outputTrim.gain.value = Number(masterTrim.value) / 100;
        outputTrim.connect(outputCompressor);
        outputCompressor.connect(audioContext.destination);

        const reverb = audioContext.createConvolver();
        reverb.normalize = false;
        reverb.buffer = makeReverbImpulse(audioContext);
        reverbGain = audioContext.createGain();
        reverbGain.channelCount = 2;
        reverbGain.channelCountMode = 'explicit';
        reverbGain.channelInterpretation = 'speakers';
        reverbGain.gain.value = 0.5;
        reverb.connect(reverbGain);
        reverbGain.connect(outputTrim);
        synth.connect(reverb, 1, 0);

        const chorusSplitter = audioContext.createChannelSplitter(2);
        const chorusMerger = audioContext.createChannelMerger(2);
        chorusGain = audioContext.createGain();
        chorusGain.channelCount = 2;
        chorusGain.channelCountMode = 'explicit';
        chorusGain.channelInterpretation = 'speakers';
        chorusGain.gain.value = settingsValue(chorusSlider) * 0.45;
        synth.connect(chorusSplitter, 2, 0);
        for (let channel = 0; channel < 2; channel++) {
            const delay = audioContext.createDelay(0.06);
            const oscillator = audioContext.createOscillator();
            const depth = audioContext.createGain();
            delay.delayTime.value = channel === 0 ? 0.018 : 0.026;
            oscillator.type = 'sine';
            oscillator.frequency.value = channel === 0 ? 0.23 : 0.31;
            depth.gain.value = 0.004;
            oscillator.connect(depth);
            depth.connect(delay.delayTime);
            chorusSplitter.connect(delay, channel);
            delay.connect(chorusMerger, 0, channel);
            oscillator.start();
        }
        chorusMerger.connect(chorusGain);
        chorusGain.connect(outputTrim);
        synth.connect(outputTrim, 0, 0);
    }

    function populateDrumKits() {
        const selected = savedDrumKit !== 'auto' ? savedDrumKit : drumKitSelect.value;
        drumKitSelect.replaceChildren(new Option('Auto / MIDI selects kit', 'auto'));
        if (!soundfont) return;
        const kits = soundfont.presets
            .filter((preset) => preset.bank >= 128)
            .sort((a, b) => a.bank - b.bank || a.program - b.program);
        for (const preset of kits) {
            const value = `${preset.bank}:${preset.program}`;
            drumKitSelect.add(new Option(
                `${preset.bank}:${String(preset.program).padStart(3, '0')} · ${preset.name}`,
                value
            ));
        }
        drumKitSelect.value = [...drumKitSelect.options].some((option) => option.value === selected)
            ? selected
            : 'auto';
        savedDrumKit = drumKitSelect.value;
    }

    function ensureAudio() {
        if (audioReadyPromise) return audioReadyPromise;
        const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextConstructor) {
            return Promise.reject(new Error('This browser does not support the Web Audio API required by the player.'));
        }
        audioContext = new AudioContextConstructor();
        audioReadyPromise = audioContext.audioWorklet.addModule('meme-midi-synth.js').then(() => {
            synth = new AudioWorkletNode(audioContext, 'meme-midi-synth', {
                numberOfInputs: 0,
                numberOfOutputs: 3,
                outputChannelCount: [2, 2, 2]
            });
            synth.addEventListener('processorerror', () => {
                if (scheduler) window.clearInterval(scheduler);
                scheduler = 0;
                playing = false;
                startingPlayback = false;
                engineStatus.textContent = 'SYNTH: PROCESSOR ERROR';
                setStatus('The audio processor stopped unexpectedly. Lower the voice limit or choose faster interpolation, then reload the MIDI.', true);
                updateButtons();
            });
            synth.port.onmessage = (message) => {
                const data = message.data;
                if (data.type === 'soundfont-ready') {
                    engineStatus.textContent = 'SYNTH: ONLINE';
                    if (!midi) setStatus(`SoundFont ready: ${data.name}. Load a MIDI and unleash the banger.`);
                } else if (data.type === 'meter') {
                    waveform = data.waveform;
                    activeKeys = data.activeKeys;
                    voiceCount = data.voices;
                }
            };
            createOutputGraph();
            sendSoundfontToSynth();
            postSynthSettings();
            engineStatus.textContent = 'SYNTH: ONLINE';
        }).catch((error) => {
            audioReadyPromise = null;
            throw new Error(`Could not start the custom audio engine: ${error.message}`);
        });
        return audioReadyPromise;
    }

    async function loadSoundfontFromBuffer(buffer, name, request) {
        if (request !== soundfontLoadRequest) return;
        setStatus(`Reading ${name} in the background...`);
        const parsed = await parseSoundfontInWorker(buffer, request);
        if (request !== soundfontLoadRequest) return;
        if (playing) stopPlayback(false);
        else if (synth) synth.port.postMessage({ type: 'allOff' });
        soundfont = parsed;
        populateDrumKits();
        soundfontVersion++;
        sentSoundfontVersion = -1;
        soundfontName.textContent = `SOUNDFONT: ${parsed.name}`;
        if (synth) {
            sendSoundfontToSynth();
            postSynthSettings();
        }
        updateButtons();
        setStatus(`SoundFont loaded: ${parsed.name} (${parsed.presets.length} presets).`);
    }

    async function loadDefaultSoundfont() {
        const request = ++soundfontLoadRequest;
        try {
            const response = await fetch('assets/soundfonts/classic-meme-soundfont-prototype.sf2');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const buffer = await response.arrayBuffer();
            if (request !== soundfontLoadRequest) return;
            await loadSoundfontFromBuffer(buffer, 'classic-meme-soundfont-prototype.sf2', request);
        } catch (error) {
            if (request !== soundfontLoadRequest) return;
            soundfontName.textContent = 'SOUNDFONT: NOT LOADED';
            setStatus(`Default SoundFont failed to load: ${error.message}. Choose an .sf2 file to continue.`, true);
        }
    }

    async function loadMidiFromBuffer(buffer, name) {
        const parsed = core.parseMidi(buffer);
        stopPlayback(false);
        midi = parsed;
        activeMidiChannels = [...new Set(parsed.events
            .filter((event) => event.type === 'noteOn' && event.velocity > 0)
            .map((event) => event.channel))]
            .sort((a, b) => a - b);
        midiName = name;
        position = 0;
        eventIndex = 0;
        rebuildChannelDisplay(0);
        songTitle.textContent = `${name} • ${parsed.format === 0 ? 'FORMAT 0' : 'FORMAT 1'} • ${parsed.trackNames.filter(Boolean).length} NAMED TRACKS`;
        totalTimeLabel.textContent = formatTime(parsed.duration);
        seekBar.value = '0';
        updateButtons();
        setStatus(`MIDI parsed: ${parsed.events.length.toLocaleString()} events, ${parsed.duration.toFixed(1)} seconds.`);
    }

    async function loadMidiUrl(url, name) {
        setStatus(`Fetching ${name}...`);
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            await loadMidiFromBuffer(await response.arrayBuffer(), name);
        } catch (error) {
            setStatus(`Could not load MIDI: ${error.message}`, true);
            midiSelect.value = '';
        }
    }

    function rebuildChannelDisplay(time) {
        for (let channel = 0; channel < 16; channel++) {
            channelDisplay[channel].bank = channel === 9 ? 128 : 0;
            channelDisplay[channel].program = 0;
        }
        displayEventIndex = 0;
        if (!midi) return;
        while (displayEventIndex < midi.events.length && midi.events[displayEventIndex].time <= time) {
            updateChannelDisplay(midi.events[displayEventIndex]);
            displayEventIndex++;
        }
    }

    function updateChannelDisplay(event) {
        if (event.type === 'program') channelDisplay[event.channel].program = event.program;
        if (event.type === 'control' && event.controller === 0) {
            const bankMsb = (event.channel === 9 || midi?.percussionChannels.includes(event.channel))
                && event.value === 0 ? 1 : event.value;
            channelDisplay[event.channel].bank = (bankMsb << 7) | (channelDisplay[event.channel].bank & 127);
        } else if (event.type === 'control' && event.controller === 32) {
            channelDisplay[event.channel].bank = (channelDisplay[event.channel].bank & 16256) | event.value;
        }
    }

    function displayPreset(channel) {
        const state = channelDisplay[channel];
        const override = channel === 9 ? selectedDrumPreset() : null;
        const isPercussion = channel === 9 || state.bank === 128
            || midi?.percussionChannels.includes(channel);
        if (!soundfont) return '';
        const bank = override ? override.bank : state.bank;
        const program = override ? override.program : state.program;
        const preset = core.resolvePreset(
            soundfont.presetLookup,
            bank,
            program,
            isPercussion,
            soundfont.fallbackPreset
        );
        return preset ? preset.name : 'No playable preset';
    }

    function sendEvent(event, time) {
        if (synth) synth.port.postMessage({ ...event, time });
    }

    function sendEvents(events) {
        if (synth && events.length) synth.port.postMessage({ type: 'events', events });
    }

    function restoreSynthState(startTime, atPosition) {
        synth.port.postMessage({ type: 'reset' });
        if (!midi) return;
        synth.port.postMessage({ type: 'percussionChannels', channels: midi.percussionChannels });
        const stateEvents = midi.events.filter((event) => event.time <= atPosition
            && (event.type === 'program'
                || event.type === 'pitchBend'
                || (event.type === 'control' && [0, 1, 6, 7, 10, 11, 32, 38, 64, 91, 93, 100, 101].includes(event.controller))));
        sendEvents(stateEvents.map((event) => ({ ...event, time: startTime })));
    }

    function currentPlaybackPosition() {
        if (!playing || !audioContext) return position;
        return Math.max(0, Math.min(midi.duration, playbackStartPosition + audioContext.currentTime - playbackStartedAt));
    }

    function scheduleAhead() {
        if (!playing || !midi || !audioContext || !synth) return;
        const now = audioContext.currentTime;
        const playPosition = playbackStartPosition + now - playbackStartedAt;
        const horizon = playPosition + 0.16;
        const scheduledEvents = [];
        while (eventIndex < midi.events.length && midi.events[eventIndex].time <= horizon) {
            const event = midi.events[eventIndex++];
            if (event.time >= playbackStartPosition) {
                scheduledEvents.push({
                    ...event,
                    time: playbackStartedAt + event.time - playbackStartPosition
                });
            }
        }
        sendEvents(scheduledEvents);
        while (displayEventIndex < midi.events.length && midi.events[displayEventIndex].time <= playPosition) {
            updateChannelDisplay(midi.events[displayEventIndex++]);
        }
        position = Math.max(0, Math.min(midi.duration, playPosition));
        updateTimeline();
        if (playPosition >= midi.duration && eventIndex >= midi.events.length) {
            stopPlayback(true);
            if (loopToggle.checked) startPlayback();
        }
    }

    function updateTimeline() {
        if (!midi) return;
        currentTimeLabel.textContent = formatTime(position);
        seekBar.value = String(midi.duration > 0 ? Math.round((position / midi.duration) * 1000) : 0);
    }

    async function startPlayback() {
        if (startingPlayback || !midi || !soundfont) return;
        startingPlayback = true;
        updateButtons();
        try {
            await ensureAudio();
            await audioContext.resume();
            if (position >= midi.duration) position = 0;
            synth.port.postMessage({ type: 'allOff' });
            playbackStartPosition = position;
            playbackStartedAt = audioContext.currentTime + 0.04;
            restoreSynthState(playbackStartedAt, playbackStartPosition);
            eventIndex = 0;
            while (eventIndex < midi.events.length && midi.events[eventIndex].time < playbackStartPosition) eventIndex++;
            rebuildChannelDisplay(playbackStartPosition);
            playing = true;
            updateButtons();
            scheduler = window.setInterval(scheduleAhead, 20);
            scheduleAhead();
            setStatus(`Now playing: ${midiName}`);
        } catch (error) {
            playing = false;
            setStatus(error.message, true);
        } finally {
            startingPlayback = false;
            updateButtons();
        }
    }

    function stopPlayback(resetPosition) {
        if (scheduler) window.clearInterval(scheduler);
        scheduler = 0;
        if (playing && audioContext) position = currentPlaybackPosition();
        playing = false;
        isSeeking = false;
        seekWasPlaying = false;
        if (synth) synth.port.postMessage({ type: 'allOff' });
        if (resetPosition) position = 0;
        eventIndex = 0;
        while (midi && eventIndex < midi.events.length && midi.events[eventIndex].time < position) eventIndex++;
        rebuildChannelDisplay(position);
        updateTimeline();
        updateButtons();
    }

    function beginSeeking() {
        if (isSeeking || !midi) return;
        seekWasPlaying = playing;
        if (playing && audioContext) position = currentPlaybackPosition();
        if (scheduler) window.clearInterval(scheduler);
        scheduler = 0;
        if (playing && synth) synth.port.postMessage({ type: 'allOff' });
        playing = false;
        isSeeking = true;
        updateButtons();
        updateTimeline();
    }

    function updateSeekPosition(value) {
        if (!midi) return;
        position = midi.duration * (value / 1000);
        rebuildChannelDisplay(position);
        eventIndex = 0;
        while (eventIndex < midi.events.length && midi.events[eventIndex].time < position) eventIndex++;
        updateTimeline();
        drawVisualizer();
    }

    function finishSeeking() {
        if (!isSeeking) return;
        const resumePlayback = seekWasPlaying;
        isSeeking = false;
        seekWasPlaying = false;
        updateButtons();
        if (resumePlayback) {
            startPlayback();
        } else {
            drawVisualizer();
        }
    }

    function keyboardGeometry() {
        const whiteCount = 75;
        const whiteWidth = canvasWidth / whiteCount;
        return { whiteCount, whiteWidth, height: canvasHeight - keyboardTop };
    }

    function whiteIndexBefore(note) {
        let count = 0;
        for (let current = 0; current < note; current++) {
            if (whitePitchClasses.has(current % 12)) count++;
        }
        return count;
    }

    function keyBounds(note, geometry) {
        const pitchClass = note % 12;
        const whiteBefore = whiteIndexBefore(note);
        if (whitePitchClasses.has(pitchClass)) {
            return { x: whiteBefore * geometry.whiteWidth, width: geometry.whiteWidth, black: false };
        }
        return {
            x: (whiteBefore - 0.36) * geometry.whiteWidth,
            width: geometry.whiteWidth * 0.72,
            black: true
        };
    }

    function drawVisualizer() {
        const width = canvasWidth;
        const height = canvasHeight;
        const keyboardHeight = Math.min(130, Math.max(100, height * 0.24));
        keyboardTop = height - keyboardHeight;
        context2d.clearRect(0, 0, width, height);
        context2d.fillStyle = '#050506';
        context2d.fillRect(0, 0, width, height);

        const trackTop = 8;
        const trackBottom = keyboardTop - 21;
        if (activeMidiChannels.length === 0) {
            context2d.fillStyle = '#fff06a';
            context2d.font = 'bold 24px "Comic Sans MS", "Comic Sans", cursive';
            context2d.textAlign = 'center';
            context2d.textBaseline = 'middle';
            context2d.fillText('LOAD A MIDI FILE TO UNLEASH THE CHANNELS!', width / 2, (trackTop + trackBottom) / 2);
            context2d.textAlign = 'start';
        }
        const rowHeight = activeMidiChannels.length
            ? (trackBottom - trackTop) / activeMidiChannels.length
            : 0;
        for (let row = 0; row < activeMidiChannels.length; row++) {
            const channel = activeMidiChannels[row];
            const y = trackTop + row * rowHeight;
            const color = colors[channel];
            context2d.fillStyle = `hsla(${(channel * 31 + 255) % 360}, 76%, ${channel % 2 ? 22 : 27}%, 0.96)`;
            context2d.fillRect(0, y, width, rowHeight - 1);
            context2d.fillStyle = color;
            context2d.fillRect(0, y + rowHeight - 2, width, 2);
            context2d.font = 'bold 11px "Comic Sans MS", "Comic Sans", cursive';
            context2d.textBaseline = 'middle';
            context2d.fillText(String(channel + 1).padStart(2, '0'), 8, y + rowHeight * 0.5);
            const isPercussion = channel === 9 || channelDisplay[channel].bank === 128
                || midi?.percussionChannels.includes(channel);
            context2d.fillStyle = isPercussion ? '#fff06a' : '#fff4d3';
            context2d.fillText(
                isPercussion
                    ? `CH ${String(channel + 1).padStart(2, '0')} / DRUMS`
                    : `CH ${String(channel + 1).padStart(2, '0')}`,
                37,
                y + rowHeight * 0.5
            );
            context2d.fillStyle = color;
            const waveX = Math.min(335, width * 0.27);
            context2d.fillText(displayPreset(channel), 138, y + rowHeight * 0.5, waveX - 148);
            const waveWidth = width - waveX - 18;
            context2d.strokeStyle = 'rgba(255,255,255,0.3)';
            context2d.lineWidth = 1;
            context2d.beginPath();
            context2d.moveTo(waveX, y + rowHeight * 0.5);
            context2d.lineTo(waveX + waveWidth, y + rowHeight * 0.5);
            context2d.stroke();

            const start = channel * 64;
            let peak = 0;
            for (let i = 0; i < 64; i++) peak = Math.max(peak, Math.abs(waveform[start + i]));
            const gain = Math.min(30, 0.9 / Math.max(peak, 0.025));
            context2d.strokeStyle = color;
            context2d.lineWidth = 1.7;
            context2d.beginPath();
            for (let i = 0; i < 64; i++) {
                const x = waveX + (i / 63) * waveWidth;
                const sample = waveform[start + i] * gain;
                const pointY = y + rowHeight * (0.5 - sample * 0.42);
                if (i === 0) context2d.moveTo(x, pointY);
                else context2d.lineTo(x, pointY);
            }
            context2d.stroke();
        }

        const geometry = keyboardGeometry();
        context2d.fillStyle = '#5521a9';
        context2d.fillRect(0, keyboardTop, width, keyboardHeight);
        for (let note = 0; note < 128; note++) {
            if (!whitePitchClasses.has(note % 12)) continue;
            const bounds = keyBounds(note, geometry);
            context2d.fillStyle = activeKeys[note] ? '#8dff45' : keyColors[note % 12];
            context2d.fillRect(bounds.x, keyboardTop, bounds.width, keyboardHeight);
            context2d.strokeStyle = '#6624b5';
            context2d.lineWidth = 1.5;
            context2d.strokeRect(bounds.x, keyboardTop, bounds.width, keyboardHeight);
            if (note % 12 === 0) {
                context2d.fillStyle = '#4d218d';
                context2d.font = 'bold 9px "Comic Sans MS", "Comic Sans", cursive';
                context2d.textBaseline = 'bottom';
                context2d.fillText(`C${Math.floor(note / 12) - 1}`, bounds.x + 2, keyboardTop + keyboardHeight - 4);
            }
        }
        for (let note = 0; note < 128; note++) {
            if (whitePitchClasses.has(note % 12)) continue;
            const bounds = keyBounds(note, geometry);
            context2d.fillStyle = activeKeys[note] ? '#fff14b' : '#6326ba';
            context2d.fillRect(bounds.x, keyboardTop, bounds.width, keyboardHeight * 0.63);
            context2d.strokeStyle = '#ff56cd';
            context2d.lineWidth = 1.5;
            context2d.strokeRect(bounds.x, keyboardTop, bounds.width, keyboardHeight * 0.63);
        }
        context2d.fillStyle = '#a22ca5';
        context2d.fillRect(0, keyboardTop - 20, width, 19);
        context2d.fillStyle = '#fff06a';
        context2d.font = 'bold 10px "Comic Sans MS", "Comic Sans", cursive';
        context2d.textBaseline = 'middle';
        context2d.fillText(`128 KEYS • ${voiceCount} ACTIVE VOICES • STANDARD MIDI NOTE INDEXING: 0–127`, 8, keyboardTop - 10);
    }

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        canvasWidth = rect.width;
        canvasHeight = rect.height;
        canvas.width = Math.round(rect.width * ratio);
        canvas.height = Math.round(rect.height * ratio);
        context2d.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    let lastVisualizerFrame = 0;
    function frame(timestamp) {
        if (settingsScreen.hidden) {
            if (timestamp - lastVisualizerFrame >= 1000 / 30) {
                drawVisualizer();
                lastVisualizerFrame = timestamp;
            }
        }
        window.requestAnimationFrame(frame);
    }

    function noteAtCanvasPoint(x, y) {
        if (y < keyboardTop) return -1;
        const geometry = keyboardGeometry();
        for (let note = 127; note >= 0; note--) {
            if (whitePitchClasses.has(note % 12)) continue;
            const bounds = keyBounds(note, geometry);
            if (x >= bounds.x && x <= bounds.x + bounds.width && y <= keyboardTop + geometry.height * 0.63) return note;
        }
        const index = Math.floor(x / geometry.whiteWidth);
        for (let note = 0; note < 128; note++) {
            if (!whitePitchClasses.has(note % 12)) continue;
            if (whiteIndexBefore(note) === index) return note;
        }
        return -1;
    }

    async function updateKeyboardAudition(note) {
        desiredKeyboardNote = note;
        const request = ++keyboardAuditionRequest;
        if (keyboardNote === note) return;
        if (keyboardNote >= 0 && synth && audioContext) {
            sendEvent({ type: 'noteOff', channel: 0, note: keyboardNote, velocity: 0 }, audioContext.currentTime + 0.01);
            keyboardNote = -1;
        }
        if (note < 0) return;
        try {
            await ensureAudio();
            await audioContext.resume();
            if (request !== keyboardAuditionRequest || desiredKeyboardNote !== note) return;
            keyboardNote = note;
            sendEvent({ type: 'noteOn', channel: 0, note, velocity: 100 }, audioContext.currentTime + 0.01);
        } catch (error) {
            setStatus(error.message, true);
        }
    }

    function keyboardPoint(event) {
        const rect = canvas.getBoundingClientRect();
        return noteAtCanvasPoint(event.clientX - rect.left, event.clientY - rect.top);
    }

    canvas.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || keyboardPoint(event) < 0) return;
        event.preventDefault();
        keyboardPointerId = event.pointerId;
        canvas.setPointerCapture(event.pointerId);
        updateKeyboardAudition(keyboardPoint(event));
    });
    canvas.addEventListener('pointermove', (event) => {
        if (event.pointerId !== keyboardPointerId) return;
        updateKeyboardAudition(keyboardPoint(event));
    });
    function endKeyboardGesture(event) {
        if (event.pointerId !== keyboardPointerId) return;
        keyboardPointerId = null;
        updateKeyboardAudition(-1);
    }
    canvas.addEventListener('pointerup', endKeyboardGesture);
    canvas.addEventListener('pointercancel', endKeyboardGesture);
    canvas.addEventListener('lostpointercapture', endKeyboardGesture);

    midiSelect.addEventListener('change', () => {
        const option = midiSelect.selectedOptions[0];
        if (!option || !option.value) return;
        loadMidiUrl(option.value, option.textContent);
    });

    midiUpload.addEventListener('change', async () => {
        const file = midiUpload.files && midiUpload.files[0];
        if (!file) return;
        try {
            await loadMidiFromBuffer(await file.arrayBuffer(), file.name);
            midiSelect.value = '';
        } catch (error) {
            setStatus(`MIDI could not be parsed: ${error.message}`, true);
        }
    });

    soundfontUpload.addEventListener('change', async () => {
        const file = soundfontUpload.files && soundfontUpload.files[0];
        if (!file) return;
        const request = ++soundfontLoadRequest;
        try {
            const buffer = await file.arrayBuffer();
            await loadSoundfontFromBuffer(buffer, file.name, request);
            if (audioContext) sendSoundfontToSynth();
        } catch (error) {
            if (request === soundfontLoadRequest) setStatus(`SoundFont could not be loaded: ${error.message}`, true);
        }
    });

    playButton.addEventListener('click', () => {
        if (isSeeking) {
            finishSeeking();
            return;
        }
        if (playing) stopPlayback(false);
        else startPlayback();
    });
    stopButton.addEventListener('click', () => stopPlayback(true));
    seekBar.addEventListener('pointerdown', beginSeeking);
    seekBar.addEventListener('keydown', (event) => {
        if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
            beginSeeking();
        }
    });
    seekBar.addEventListener('input', () => {
        const value = Number(seekBar.value);
        if (!isSeeking) beginSeeking();
        updateSeekPosition(value);
    });
    seekBar.addEventListener('change', finishSeeking);
    seekBar.addEventListener('keyup', finishSeeking);
    seekBar.addEventListener('pointercancel', finishSeeking);
    volumeSlider.addEventListener('input', () => {
        if (synth) synth.port.postMessage({ type: 'master', value: Number(volumeSlider.value) / 100 });
        saveSettings();
    });
    masterTrim.addEventListener('input', () => {
        const value = Number(masterTrim.value);
        masterTrimValue.value = `${value}%`;
        masterTrimValue.textContent = `${value}%`;
        if (outputTrim) outputTrim.gain.setTargetAtTime(value / 100, audioContext.currentTime, 0.02);
        saveSettings();
    });
    polyphonySlider.addEventListener('input', () => {
        polyphonyValue.value = polyphonySlider.value;
        polyphonyValue.textContent = polyphonySlider.value;
        postSynthSettings();
        saveSettings();
    });
    interpolationSelect.addEventListener('change', () => {
        postSynthSettings();
        saveSettings();
    });
    drumKitSelect.addEventListener('change', () => {
        postSynthSettings();
        drawVisualizer();
        saveSettings();
    });
    reverbSlider.addEventListener('input', () => {
        reverbValue.value = `${reverbSlider.value}%`;
        reverbValue.textContent = `${reverbSlider.value}%`;
        if (synth) synth.port.postMessage({ type: 'extraReverb', value: settingsValue(reverbSlider) });
        saveSettings();
    });
    chorusSlider.addEventListener('input', () => {
        chorusValue.value = `${chorusSlider.value}%`;
        chorusValue.textContent = `${chorusSlider.value}%`;
        if (chorusGain) chorusGain.gain.setTargetAtTime(settingsValue(chorusSlider) * 0.45, audioContext.currentTime, 0.025);
        saveSettings();
    });
    document.getElementById('open-settings').addEventListener('click', () => {
        playerScreen.hidden = true;
        settingsScreen.hidden = false;
        window.scrollTo(0, 0);
    });
    document.getElementById('close-settings').addEventListener('click', () => {
        settingsScreen.hidden = true;
        playerScreen.hidden = false;
        window.scrollTo(0, 0);
        resizeCanvas();
    });
    document.getElementById('open-about').addEventListener('click', async () => {
        playerScreen.hidden = true;
        aboutScreen.hidden = false;
        window.scrollTo(0, 0);
        if (aboutLoaded) return;
        aboutContent.textContent = 'Loading the about page...';
        try {
            const response = await fetch('about.md');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            if (!window.marked || typeof window.marked.parse !== 'function') {
                throw new Error('The Markdown renderer could not be loaded.');
            }
            aboutContent.innerHTML = window.marked.parse(await response.text());
            aboutLoaded = true;
        } catch (error) {
            aboutContent.textContent = `The about page could not be loaded: ${error.message}`;
        }
    });
    document.getElementById('close-about').addEventListener('click', () => {
        aboutScreen.hidden = true;
        playerScreen.hidden = false;
        window.scrollTo(0, 0);
        resizeCanvas();
    });
    window.addEventListener('resize', resizeCanvas);

    restoreSettings();
    resizeCanvas();
    updateButtons();
    window.requestAnimationFrame(frame);
    loadDefaultSoundfont();
})();
