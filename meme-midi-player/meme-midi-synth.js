const DEFAULT_REVERB_DEPTH = 40 / 127;
const DEFAULT_SF2_REVERB_MODULATOR = 0.2;

class MemeMidiSynthProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.soundfont = null;
        this.channels = Array.from({ length: 16 }, () => ({
            bank: 0,
            program: 0,
            volume: 100,
            expression: 127,
            pan: 64,
            reverbSend: DEFAULT_REVERB_DEPTH,
            chorusSend: 0,
            bend: 8192,
            bendRange: 2,
            bendCents: 0,
            rpnMsb: 127,
            rpnLsb: 127,
            modWheel: 0,
            sustain: false
        }));
        this.channels[9].bank = 128;
        this.voices = [];
        this.hasFinishedVoice = false;
        this.heldNotes = [];
        this.noteSerial = 0;
        this.events = [];
        this.eventHead = 0;
        this.masterVolume = 0.72;
        this.extraReverbSend = 0;
        this.maxVoices = 128;
        this.interpolation = 'cubic';
        this.drumPreset = null;
        this.percussionChannels = new Set([9]);
        this.meterFrames = 0;
        this.waveform = new Float32Array(16 * 64);
        this.activeKeys = new Uint8Array(128);
        this.channelSamples = new Float32Array(16);
        this.port.onmessage = (message) => this.receive(message.data);
    }

    refreshChannelMix(channel) {
        for (const voice of this.voices) {
            if (voice.channel === channel) this.refreshVoiceMix(voice);
        }
    }

    receive(message) {
        if (message.type === 'soundfont') {
            this.soundfont = {
                name: message.name,
                samples: new Int16Array(
                    message.sampleBuffer,
                    message.sampleByteOffset,
                    message.sampleLength
                ),
                sampleHeaders: message.sampleHeaders,
                presets: message.presets,
                presetLookup: new Map(message.presets.map((preset) => [
                    `${preset.bank}:${preset.program}`,
                    preset
                ])),
                fallbackPreset: message.fallbackPreset
            };
            this.port.postMessage({ type: 'soundfont-ready', name: this.soundfont.name });
            return;
        }
        if (message.type === 'master') {
            this.masterVolume = Math.max(0, Math.min(1, message.value));
            this.refreshAllVoiceMix();
            return;
        }
        if (message.type === 'extraReverb') {
            this.extraReverbSend = Math.max(0, Math.min(1, message.value));
            this.refreshAllVoiceMix();
            return;
        }
        if (message.type === 'polyphony') {
            this.maxVoices = Math.max(16, Math.min(4096, Math.round(message.value)));
            return;
        }
        if (message.type === 'interpolation') {
            this.interpolation = ['nearest', 'linear', 'cubic'].includes(message.value)
                ? message.value
                : 'cubic';
            return;
        }
        if (message.type === 'drumPreset') {
            this.drumPreset = message.value;
            return;
        }
        if (message.type === 'percussionChannels') {
            this.percussionChannels = new Set([9, ...message.channels]);
            return;
        }
        if (message.type === 'events') {
            for (const event of message.events) this.enqueueEvent(event);
            return;
        }
        if (message.type === 'allOff') {
            this.voices.length = 0;
            this.heldNotes.length = 0;
            this.events.length = 0;
            this.eventHead = 0;
            return;
        }
        if (message.type === 'reset') {
            this.voices.length = 0;
            this.heldNotes.length = 0;
            this.events.length = 0;
            this.eventHead = 0;
            this.channels = Array.from({ length: 16 }, () => ({
                bank: 0,
                program: 0,
                volume: 100,
                expression: 127,
                pan: 64,
                reverbSend: DEFAULT_REVERB_DEPTH,
                chorusSend: 0,
                bend: 8192,
                bendRange: 2,
                bendCents: 0,
                rpnMsb: 127,
                rpnLsb: 127,
                modWheel: 0,
                sustain: false
            }));
            this.channels[9].bank = 128;
            this.percussionChannels = new Set([9]);
            return;
        }

        this.enqueueEvent(message);
    }

    enqueueEvent(message) {
        const event = { ...message, frame: Math.max(currentFrame, Math.round(message.time * sampleRate)) };
        const last = this.events[this.events.length - 1];
        if (this.eventHead === this.events.length || !last || last.frame <= event.frame) {
            this.events.push(event);
            return;
        }
        let low = this.eventHead;
        let high = this.events.length;
        while (low < high) {
            const middle = (low + high) >>> 1;
            if (this.events[middle].frame <= event.frame) low = middle + 1;
            else high = middle;
        }
        this.events.splice(low, 0, event);
    }

    presetFor(channel) {
        if (!this.soundfont) return null;
        const state = this.channels[channel];
        const percussion = this.percussionChannels.has(channel) || state.bank === 128;
        const find = (bank, program) => {
            const preset = this.soundfont.presetLookup.get(`${bank}:${program}`);
            return preset && preset.regions.length > 0 ? preset : null;
        };
        const fallback = this.soundfont.fallbackPreset
            || find(0, 0)
            || this.soundfont.presets.find((preset) => preset.regions.length > 0)
            || null;
        if (channel === 9 && this.drumPreset) {
            return (find(this.drumPreset.bank, this.drumPreset.program)
                || find(128, 0)
                || fallback);
        }
        if (percussion) {
            return (state.bank >= 128 && find(state.bank, state.program))
                || find(128, state.program)
                || find(128, 0)
                || fallback;
        }
        return find(state.bank, state.program)
            || find(0, state.program)
            || find(0, 0)
            || fallback;
    }

    timecents(value) {
        return Math.max(0.001, Math.min(20, Math.pow(2, value / 1200)));
    }

    refreshVoiceMix(voice) {
        const state = this.channels[voice.channel];
        const pan = Math.max(-1, Math.min(1, (state.pan - 64) / 63 + voice.pan));
        const left = voice.stereo
            ? (pan > 0 ? 1 - pan : 1) * this.masterVolume
            : Math.cos((pan + 1) * Math.PI / 4) * this.masterVolume;
        const right = voice.stereo
            ? (pan < 0 ? 1 + pan : 1) * this.masterVolume
            : Math.sin((pan + 1) * Math.PI / 4) * this.masterVolume;
        const reverb = Math.min(
            1,
            (voice.reverbSend + DEFAULT_SF2_REVERB_MODULATOR * state.reverbSend)
                * state.reverbSend
                + this.extraReverbSend
        );
        const chorus = Math.max(voice.chorusSend, state.chorusSend, 0.3);
        voice.mixGain = voice.velocity * voice.velocity * voice.attenuation
            * (state.volume / 127) * (state.expression / 127);
        voice.dryLeftGain = left;
        voice.dryRightGain = right;
        voice.reverbLeftGain = left * reverb;
        voice.reverbRightGain = right * reverb;
        voice.chorusLeftGain = left * chorus;
        voice.chorusRightGain = right * chorus;
    }

    refreshAllVoiceMix() {
        for (const voice of this.voices) this.refreshVoiceMix(voice);
    }

    envelopeAt(voice, frame) {
        const elapsed = Math.max(0, (frame - voice.startFrame) / sampleRate);
        if (elapsed < voice.attack) return elapsed / voice.attack;
        if (elapsed < voice.attack + voice.decay) {
            return 1 + (voice.sustain - 1) * ((elapsed - voice.attack) / voice.decay);
        }
        return voice.sustain;
    }

    releaseVoice(voice, frame) {
        if (voice.releaseFrame !== null) return;
        voice.releaseLevel = this.envelopeAt(voice, frame);
        voice.releaseFrame = frame;
        voice.sustainHeld = false;
        if (voice.loopMode === 3) voice.loop = false;
    }

    refreshPitch(channel) {
        const state = this.channels[channel];
        const bend = ((state.bend - 8192) / 8192) * (state.bendRange + state.bendCents / 100);
        for (const voice of this.voices) {
            if (voice.channel === channel) voice.step = this.sampleStep(voice, bend);
        }
    }

    sampleStep(voice, bend) {
        const pitch = ((voice.playKey - voice.rootKey) * voice.scaleTuning / 100)
            + voice.coarseTune
            + ((voice.fineTune - voice.pitchCorrection) / 100)
            + bend;
        return (voice.sampleRate / sampleRate) * Math.pow(2, pitch / 12);
    }

    releaseNote(channel, note, frame) {
        const heldIndex = this.heldNotes.findIndex((held) => held.channel === channel
            && held.note === note && !held.released);
        if (heldIndex === -1) return;
        const held = this.heldNotes[heldIndex];
        held.released = true;
        if (this.channels[channel].sustain) {
            held.sustainHeld = true;
            return;
        }
        for (const voice of this.voices) {
            if (voice.noteId === held.id) this.releaseVoice(voice, frame);
        }
        this.heldNotes.splice(heldIndex, 1);
    }

    releaseSustained(channel, frame) {
        for (let index = this.heldNotes.length - 1; index >= 0; index--) {
            const held = this.heldNotes[index];
            if (held.channel !== channel || !held.sustainHeld) continue;
            for (const voice of this.voices) {
                if (voice.noteId === held.id) this.releaseVoice(voice, frame);
            }
            this.heldNotes.splice(index, 1);
        }
    }

    apply(event, frame) {
        const channel = event.channel;
        if (event.type === 'program') {
            this.channels[channel].program = event.program;
        } else if (event.type === 'control') {
            const state = this.channels[channel];
            if (event.controller === 0) {
                const bankMsb = this.percussionChannels.has(channel) && event.value === 0 ? 1 : event.value;
                state.bank = (bankMsb << 7) | (state.bank & 127);
            } else if (event.controller === 32) state.bank = (state.bank & 16256) | event.value;
            else if (event.controller === 7) state.volume = event.value;
            else if (event.controller === 11) state.expression = event.value;
            else if (event.controller === 10) state.pan = event.value;
            else if (event.controller === 1) state.modWheel = event.value;
            else if (event.controller === 91) state.reverbSend = event.value / 127;
            else if (event.controller === 93) state.chorusSend = event.value / 127;
            else if (event.controller === 101) state.rpnMsb = event.value;
            else if (event.controller === 100) state.rpnLsb = event.value;
            else if (event.controller === 64) {
                const down = event.value >= 64;
                if (state.sustain && !down) this.releaseSustained(channel, frame);
                state.sustain = down;
            } else if (event.controller === 120) {
                this.voices = this.voices.filter((voice) => voice.channel !== channel);
                this.heldNotes = this.heldNotes.filter((held) => held.channel !== channel);
            } else if (event.controller === 123) {
                for (const voice of this.voices) {
                    if (voice.channel === channel) this.releaseVoice(voice, frame);
                }
                this.heldNotes = this.heldNotes.filter((held) => held.channel !== channel);
            } else if (event.controller === 121) {
                this.releaseSustained(channel, frame);
                state.volume = 100;
                state.expression = 127;
                state.pan = 64;
                state.reverbSend = DEFAULT_REVERB_DEPTH;
                state.chorusSend = 0;
                state.modWheel = 0;
                state.rpnMsb = 127;
                state.rpnLsb = 127;
                state.bendRange = 2;
                state.bendCents = 0;
                state.sustain = false;
            } else if (event.controller === 6) {
                if (state.rpnMsb === 0 && state.rpnLsb === 0) {
                    state.bendRange = Math.max(0, Math.min(24, event.value));
                    this.refreshPitch(channel);
                }
            } else if (event.controller === 38 && state.rpnMsb === 0 && state.rpnLsb === 0) {
                state.bendCents = Math.max(0, Math.min(99, event.value));
                this.refreshPitch(channel);
            }
            this.refreshChannelMix(channel);
        } else if (event.type === 'pitchBend') {
            if (channel !== 9) {
                this.channels[channel].bend = event.value;
                this.refreshPitch(channel);
            }
        } else if (event.type === 'noteOff') {
            this.releaseNote(channel, event.note, frame);
        } else if (event.type === 'noteOn' && this.soundfont) {
            this.startNote(event, frame);
        }
    }

    startNote(event, frame) {
        const preset = this.presetFor(event.channel);
        if (!preset) return;
        const state = this.channels[event.channel];
        const bend = ((state.bend - 8192) / 8192) * (state.bendRange + state.bendCents / 100);
        const noteId = ++this.noteSerial;
        this.heldNotes.push({
            id: noteId,
            channel: event.channel,
            note: event.note,
            released: false,
            sustainHeld: false
        });
        for (const region of preset.regions) {
            if (event.note < region.keyLow || event.note > region.keyHigh
                || event.velocity < region.velocityLow || event.velocity > region.velocityHigh) continue;
            const sample = this.soundfont.sampleHeaders[region.sample];
            if (!sample) continue;
            const sampleType = sample.type & 0x7fff;
            const linkedSample = this.soundfont.sampleHeaders[sample.link];
            const stereoPair = (sampleType === 2 || sampleType === 4)
                && linkedSample
                && (linkedSample.type & 0x7fff) === (sampleType === 2 ? 4 : 2)
                && linkedSample.link === region.sample;
            if (stereoPair && sampleType === 2) continue;
            const start = sample.start + region.startOffset;
            const end = sample.end + region.endOffset;
            const loopStart = sample.startLoop + region.loopStartOffset;
            const loopEnd = sample.endLoop + region.loopEndOffset;
            if (start < 0 || end > this.soundfont.samples.length || start >= end) continue;
            const leftSample = stereoPair && sampleType === 2 ? linkedSample : sample;
            const rightSample = stereoPair && sampleType === 4 ? linkedSample : sample;
            const leftStart = leftSample.start + region.startOffset;
            const rightStart = rightSample.start + region.startOffset;
            const leftEnd = leftSample.end + region.endOffset;
            const rightEnd = rightSample.end + region.endOffset;
            const leftLoopStart = leftSample.startLoop + region.loopStartOffset;
            const rightLoopStart = rightSample.startLoop + region.loopStartOffset;
            const leftLoopEnd = leftSample.endLoop + region.loopEndOffset;
            const rightLoopEnd = rightSample.endLoop + region.loopEndOffset;
            if (leftStart < 0 || rightStart < 0
                || leftEnd > this.soundfont.samples.length || rightEnd > this.soundfont.samples.length
                || leftStart >= leftEnd || rightStart >= rightEnd) continue;
            const playKey = region.keyNumber >= 0 && region.keyNumber <= 127
                ? region.keyNumber
                : event.note;
            const rootKey = region.rootKey >= 0 && region.rootKey <= 127
                ? region.rootKey
                : sample.originalPitch <= 127 ? sample.originalPitch : playKey;
            const playVelocity = region.velocityOverride >= 0 && region.velocityOverride <= 127
                ? region.velocityOverride
                : event.velocity;
            const velocity = playVelocity / 127;
            const sustain = Math.pow(10, -Math.max(0, region.sustain) / 200);
            const loopMode = region.sampleModes & 3;
            const stereoPan = stereoPair && Math.abs(region.pan) === 500 ? 0 : region.pan / 500;
            const looping = (loopMode === 1 || loopMode === 3)
                && loopStart >= start && loopEnd <= end && loopStart < loopEnd
                && leftLoopStart >= leftStart && leftLoopEnd <= leftEnd && leftLoopStart < leftLoopEnd
                && rightLoopStart >= rightStart && rightLoopEnd <= rightEnd && rightLoopStart < rightLoopEnd;
            const filterCutoff = Math.min(20000, Math.pow(2, region.filterCutoff / 1200));
            const voice = {
                channel: event.channel,
                note: event.note,
                noteId,
                playKey,
                velocity,
                sampleIndex: start,
                sampleStart: start,
                sampleEnd: end,
                leftStart,
                rightStart,
                leftEnd,
                rightEnd,
                leftLoopStart,
                rightLoopStart,
                leftLoopEnd,
                rightLoopEnd,
                stereo: Boolean(stereoPair),
                loopStart,
                loopEnd,
                loopMode,
                loop: looping,
                sampleRate: sample.sampleRate,
                pitchCorrection: sample.pitchCorrection,
                rootKey,
                coarseTune: region.coarseTune,
                fineTune: region.fineTune,
                scaleTuning: region.scaleTuning,
                attack: this.timecents(region.attack),
                decay: this.timecents(region.decay),
                release: this.timecents(region.release),
                sustain,
                attenuation: Math.pow(10, -Math.max(0, region.attenuation) / 200),
                pan: stereoPan,
                reverbSend: Math.max(0, Math.min(1, region.reverbSend / 1000)),
                chorusSend: Math.max(0, Math.min(1, region.chorusSend / 1000)),
                filterCutoff,
                filterCoefficient: 1 - Math.exp((-2 * Math.PI * filterCutoff) / sampleRate),
                filterStateLeft: 0,
                filterStateRight: 0,
                vibratoPhase: 0,
                startFrame: frame,
                releaseFrame: null,
                releaseLevel: 0,
                sustainHeld: false,
                finished: false,
                step: 0
            };
            voice.step = this.sampleStep(voice, bend + state.bendCents / 100);
            this.refreshVoiceMix(voice);
            this.voices.push(voice);
        }
        if (this.voices.length > this.maxVoices) {
            this.voices.splice(0, this.voices.length - this.maxVoices);
        }
    }

    interpolate(position, start, end, loopStart, loopEnd, looping) {
        const samples = this.soundfont.samples;
        const index = Math.floor(position);
        const current = samples[index];
        if (this.interpolation === 'nearest') return current / 32768;
        const fraction = position - index;
        const next = looping && index + 1 >= loopEnd
            ? loopStart
            : index + 1 < end ? index + 1 : index;
        const after = samples[next];
        if (this.interpolation === 'linear') return (current + (after - current) * fraction) / 32768;
        const previousIndex = looping && index <= loopStart
            ? loopEnd - 1
            : index > start ? index - 1 : index;
        const afterNextIndex = looping && next + 1 >= loopEnd
            ? loopStart
            : next + 1 < end ? next + 1 : next;
        const previous = samples[previousIndex];
        const afterNext = samples[afterNextIndex];
        const a = -0.5 * previous + 1.5 * current - 1.5 * after + 0.5 * afterNext;
        const b = previous - 2.5 * current + 2 * after - 0.5 * afterNext;
        const c = -0.5 * previous + 0.5 * after;
        return (((a * fraction + b) * fraction + c) * fraction + current) / 32768;
    }

    renderFrame(frame, dry, reverb, chorus, outputIndex) {
        this.channelSamples.fill(0);
        for (let i = this.voices.length - 1; i >= 0; i--) {
            const voice = this.voices[i];
            if (voice.releaseFrame !== null
                && (frame - voice.releaseFrame) / sampleRate >= voice.release) {
                voice.finished = true;
                this.hasFinishedVoice = true;
                continue;
            }
            if (voice.sampleIndex >= voice.sampleEnd && !voice.loop) {
                voice.finished = true;
                this.hasFinishedVoice = true;
                continue;
            }
            if (voice.finished) continue;
            if (voice.loop && voice.sampleIndex >= voice.loopEnd) {
                voice.sampleIndex = voice.loopStart + ((voice.sampleIndex - voice.loopStart) % (voice.loopEnd - voice.loopStart));
            }
            let sampleLeft = this.interpolate(
                voice.sampleIndex,
                voice.sampleStart,
                voice.sampleEnd,
                voice.loopStart,
                voice.loopEnd,
                voice.loop
            );
            let sampleRight = sampleLeft;
            if (voice.stereo) {
                const relativePosition = voice.sampleIndex - voice.sampleStart;
                const leftPosition = voice.leftStart + relativePosition;
                const rightPosition = voice.rightStart + relativePosition;
                sampleLeft = this.interpolate(
                    leftPosition,
                    voice.leftStart,
                    voice.leftEnd,
                    voice.leftLoopStart,
                    voice.leftLoopEnd,
                    voice.loop
                );
                sampleRight = this.interpolate(
                    rightPosition,
                    voice.rightStart,
                    voice.rightEnd,
                    voice.rightLoopStart,
                    voice.rightLoopEnd,
                    voice.loop
                );
            }
            let envelope = this.envelopeAt(voice, frame);
            if (voice.releaseFrame !== null) {
                envelope = voice.releaseLevel
                    * Math.max(0, 1 - (frame - voice.releaseFrame) / (sampleRate * voice.release));
            }
            const state = this.channels[voice.channel];
            const gain = voice.mixGain * envelope;
            sampleLeft *= gain;
            sampleRight *= gain;
            if (voice.filterCutoff < sampleRate * 0.45) {
                voice.filterStateLeft += voice.filterCoefficient * (sampleLeft - voice.filterStateLeft);
                voice.filterStateRight += voice.filterCoefficient * (sampleRight - voice.filterStateRight);
                sampleLeft = voice.filterStateLeft;
                sampleRight = voice.filterStateRight;
            }
            const value = (sampleLeft + sampleRight) * 0.5;
            this.channelSamples[voice.channel] += value;
            dry[0][outputIndex] += sampleLeft * voice.dryLeftGain;
            dry[1][outputIndex] += sampleRight * voice.dryRightGain;
            reverb[0][outputIndex] += sampleLeft * voice.reverbLeftGain;
            reverb[1][outputIndex] += sampleRight * voice.reverbRightGain;
            chorus[0][outputIndex] += sampleLeft * voice.chorusLeftGain;
            chorus[1][outputIndex] += sampleRight * voice.chorusRightGain;
            if (state.modWheel) {
                const vibrato = (state.modWheel / 127) * 0.35
                    * Math.sin(voice.vibratoPhase);
                voice.vibratoPhase += (2 * Math.PI * 5.2) / sampleRate;
                voice.sampleIndex += voice.step * Math.pow(2, vibrato / 12);
            } else {
                voice.sampleIndex += voice.step;
            }
        }
    }

    process(_inputs, outputs) {
        const dry = outputs[0];
        const reverb = outputs[1];
        const chorus = outputs[2];
        if (!dry || dry.length < 2) return true;
        for (const output of [dry, reverb, chorus]) {
            if (!output) continue;
            for (const channel of output) channel.fill(0);
        }
        for (let i = 0; i < dry[0].length; i++) {
            const frame = currentFrame + i;
            while (this.eventHead < this.events.length && this.events[this.eventHead].frame <= frame) {
                this.apply(this.events[this.eventHead++], frame);
            }
            if (this.eventHead > 256 && this.eventHead * 2 >= this.events.length) {
                this.events.splice(0, this.eventHead);
                this.eventHead = 0;
            }
            this.renderFrame(frame, dry, reverb, chorus, i);
            const meterIndex = Math.floor(this.meterFrames / 32);
            for (let channel = 0; channel < 16; channel++) {
                this.waveform[channel * 64 + meterIndex] = this.channelSamples[channel];
            }
            this.meterFrames++;
            if (this.meterFrames === 2048) {
                this.meterFrames = 0;
                this.activeKeys.fill(0);
                for (const voice of this.voices) this.activeKeys[voice.note] = 1;
                this.port.postMessage({
                    type: 'meter',
                    waveform: this.waveform.slice(),
                    activeKeys: this.activeKeys.slice(),
                    voices: this.voices.length
                });
            }
        }
        if (this.hasFinishedVoice) {
            let writeIndex = 0;
            for (let readIndex = 0; readIndex < this.voices.length; readIndex++) {
                const voice = this.voices[readIndex];
                if (!voice.finished) this.voices[writeIndex++] = voice;
            }
            this.voices.length = writeIndex;
            this.hasFinishedVoice = false;
        }
        return true;
    }
}

registerProcessor('meme-midi-synth', MemeMidiSynthProcessor);
