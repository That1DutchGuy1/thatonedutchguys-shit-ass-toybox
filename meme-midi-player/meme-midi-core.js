(function (root) {
    'use strict';

    const textDecoder = new TextDecoder('latin1');

    function ascii(bytes, start, length) {
        return textDecoder.decode(bytes.subarray(start, start + length)).replace(/\0.*$/s, '').trim();
    }

    function chooseFallbackPreset(presets) {
        const playable = presets.filter((preset) => preset.regions.length > 0);
        const programZero = playable.find((preset) => preset.bank === 0 && preset.program === 0);
        if (programZero) return programZero;
        const bankZero = playable.filter((preset) => preset.bank === 0);
        const melodic = playable.filter((preset) => preset.bank < 128);
        const candidates = bankZero.length ? bankZero : melodic.length ? melodic : playable;
        return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
    }

    function resolvePreset(presets, bank, program, percussion, fallbackPreset) {
        const find = (presetBank, presetProgram) => {
            const preset = presets.get
                ? presets.get(`${presetBank}:${presetProgram}`)
                : presets.find((entry) => entry.bank === presetBank && entry.program === presetProgram);
            return preset && preset.regions.length > 0 ? preset : null;
        };
        const getFallback = () => fallbackPreset || chooseFallbackPreset(
            presets.values ? [...presets.values()] : presets
        );
        if (percussion) {
            return (bank >= 128 && find(bank, program))
                || find(128, program)
                || find(128, 0)
                || getFallback();
        }
        return find(bank, program)
            || find(0, program)
            || find(0, 0)
            || getFallback();
    }

    function checkedEnd(offset, length, limit, label) {
        const end = offset + length;
        if (!Number.isSafeInteger(end) || length < 0 || end > limit) {
            throw new Error(`The ${label} chunk extends beyond the file.`);
        }
        return end;
    }

    function parseSoundFont(buffer) {
        const bytes = new Uint8Array(buffer);
        const view = new DataView(buffer);
        if (bytes.length < 12 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'sfbk') {
            throw new Error('This file is not a valid RIFF SoundFont 2 bank.');
        }

        const riffEnd = checkedEnd(8, view.getUint32(4, true), bytes.length, 'RIFF');
        const chunks = [];
        function walk(start, end) {
            let offset = start;
            while (offset + 8 <= end) {
                const id = ascii(bytes, offset, 4);
                const size = view.getUint32(offset + 4, true);
                const dataStart = offset + 8;
                const dataEnd = checkedEnd(dataStart, size, end, id);
                if (id === 'LIST') {
                    if (size < 4) throw new Error('A SoundFont LIST chunk is missing its list type.');
                    chunks.push({ id: ascii(bytes, dataStart, 4), start: dataStart + 4, end: dataEnd });
                    walk(dataStart + 4, dataEnd);
                } else {
                    chunks.push({ id, start: dataStart, end: dataEnd });
                }
                offset = dataEnd + (size & 1);
            }
            if (offset !== end) throw new Error('The SoundFont contains an incomplete RIFF chunk header.');
        }
        walk(12, riffEnd);

        function requiredChunk(id) {
            const chunk = chunks.find((entry) => entry.id === id);
            if (!chunk) throw new Error(`The SoundFont is missing its ${id} table.`);
            return chunk;
        }
        function records(chunk, recordSize, label) {
            if ((chunk.end - chunk.start) % recordSize !== 0) {
                throw new Error(`The SoundFont ${label} table has an invalid record size.`);
            }
            return Math.floor((chunk.end - chunk.start) / recordSize);
        }
        function readGenerators(chunk) {
            const count = records(chunk, 4, chunk.id);
            const output = [];
            for (let i = 0; i < count; i++) {
                const offset = chunk.start + i * 4;
                output.push({
                    op: view.getUint16(offset, true),
                    amount: view.getInt16(offset + 2, true),
                    raw: view.getUint16(offset + 2, true)
                });
            }
            return output;
        }
        function readBags(chunk) {
            const count = records(chunk, 4, chunk.id);
            const output = [];
            for (let i = 0; i < count; i++) {
                const offset = chunk.start + i * 4;
                output.push({
                    gen: view.getUint16(offset, true),
                    mod: view.getUint16(offset + 2, true)
                });
            }
            return output;
        }
        function decodeRange(generator) {
            return generator ? {
                low: generator.raw & 255,
                high: generator.raw >>> 8
            } : { low: 0, high: 127 };
        }

        const info = chunks.find((entry) => entry.id === 'INFO');
        const nameChunk = info && chunks.find((entry) => entry.id === 'INAM');
        const soundfontName = nameChunk ? ascii(bytes, nameChunk.start, nameChunk.end - nameChunk.start) : 'Untitled SoundFont';
        const sampleChunk = requiredChunk('smpl');
        if ((sampleChunk.end - sampleChunk.start) % 2 !== 0) {
            throw new Error('The SoundFont sample data has an invalid byte length.');
        }

        const presetHeaders = requiredChunk('phdr');
        const presetBags = readBags(requiredChunk('pbag'));
        const presetGenerators = readGenerators(requiredChunk('pgen'));
        const instrumentHeaders = requiredChunk('inst');
        const instrumentBags = readBags(requiredChunk('ibag'));
        const instrumentGenerators = readGenerators(requiredChunk('igen'));
        const sampleHeaders = requiredChunk('shdr');
        const sampleCount = records(sampleHeaders, 46, 'sample header');
        const samples = [];
        for (let i = 0; i < sampleCount - 1; i++) {
            const offset = sampleHeaders.start + i * 46;
            const start = view.getUint32(offset + 20, true);
            const end = view.getUint32(offset + 24, true);
            const startLoop = view.getUint32(offset + 28, true);
            const endLoop = view.getUint32(offset + 32, true);
            const sampleRate = view.getUint32(offset + 36, true);
            if (start > end || end > (sampleChunk.end - sampleChunk.start) / 2 || sampleRate === 0) {
                throw new Error(`SoundFont sample ${i} has invalid sample offsets.`);
            }
            samples.push({
                name: ascii(bytes, offset, 20),
                start,
                end,
                startLoop,
                endLoop,
                sampleRate,
                originalPitch: bytes[offset + 40],
                pitchCorrection: view.getInt8(offset + 41),
                link: view.getUint16(offset + 42, true),
                type: view.getUint16(offset + 44, true)
            });
        }

        function zones(headers, headerSize, bagIndexOffset, bags, generators, referenceOp, label) {
            const headerCount = records(headers, headerSize, label);
            const result = [];
            for (let i = 0; i < headerCount - 1; i++) {
                const headerOffset = headers.start + i * headerSize;
                const bagStart = view.getUint16(headerOffset + bagIndexOffset, true);
                const bagEnd = view.getUint16(headerOffset + headerSize + bagIndexOffset, true);
                if (bagStart > bagEnd || bagEnd >= bags.length) {
                    throw new Error(`The SoundFont ${label} has an invalid bag index.`);
                }
                const entries = [];
                let global = null;
                for (let bagIndex = bagStart; bagIndex < bagEnd; bagIndex++) {
                    const genStart = bags[bagIndex].gen;
                    const genEnd = bags[bagIndex + 1].gen;
                    if (genStart > genEnd || genEnd > generators.length) {
                        throw new Error(`The SoundFont ${label} references an invalid generator.`);
                    }
                    const list = generators.slice(genStart, genEnd);
                    const reference = list.find((generator) => generator.op === referenceOp);
                    if (!reference && global === null && entries.length === 0) {
                        global = new Map(list.map((generator) => [generator.op, generator]));
                        continue;
                    }
                    if (!reference) continue;
                    const map = new Map(list.filter((generator) => generator.op !== referenceOp).map((generator) => [generator.op, generator]));
                    entries.push({ reference: reference.raw, generators: map });
                }
                result.push({ entries, global });
            }
            return result;
        }

        const presetZones = zones(presetHeaders, 38, 24, presetBags, presetGenerators, 41, 'preset header');
        const instrumentZones = zones(instrumentHeaders, 22, 20, instrumentBags, instrumentGenerators, 53, 'instrument header');

        function mergedGenerators(parent, child) {
            const merged = new Map(parent || []);
            for (const [op, generator] of child) {
                const previous = merged.get(op);
                if (!previous) {
                    merged.set(op, generator);
                } else {
                    merged.set(op, {
                        op,
                        amount: previous.amount + generator.amount,
                        raw: generator.raw
                    });
                }
            }
            return merged;
        }
        function rangeFor(map, op) {
            return decodeRange(map.get(op));
        }
        function intersectRange(a, b) {
            return { low: Math.max(a.low, b.low), high: Math.min(a.high, b.high) };
        }
        function generatorValue(map, op, fallback) {
            const entry = map.get(op);
            return entry ? entry.amount : fallback;
        }

        const presets = [];
        const presetCount = records(presetHeaders, 38, 'preset header');
        for (let i = 0; i < presetCount - 1; i++) {
            const offset = presetHeaders.start + i * 38;
            const name = ascii(bytes, offset, 20);
            const program = view.getUint16(offset + 20, true);
            const bank = view.getUint16(offset + 22, true);
            const zonesForPreset = presetZones[i];
            const presetRegions = [];
            for (const presetZone of zonesForPreset.entries) {
                const instrumentIndex = presetZone.reference;
                if (instrumentIndex >= instrumentZones.length) continue;
                const instrument = instrumentZones[instrumentIndex];
                for (const instrumentZone of instrument.entries) {
                    if (instrumentZone.reference >= samples.length) continue;
                    const sample = samples[instrumentZone.reference];
                    const combined = mergedGenerators(
                        mergedGenerators(zonesForPreset.global, presetZone.generators),
                        mergedGenerators(instrument.global, instrumentZone.generators)
                    );
                    const keyRange = intersectRange(
                        rangeFor(mergedGenerators(zonesForPreset.global, presetZone.generators), 43),
                        rangeFor(mergedGenerators(instrument.global, instrumentZone.generators), 43)
                    );
                    const velocityRange = intersectRange(
                        rangeFor(mergedGenerators(zonesForPreset.global, presetZone.generators), 44),
                        rangeFor(mergedGenerators(instrument.global, instrumentZone.generators), 44)
                    );
                    if (keyRange.low > keyRange.high || velocityRange.low > velocityRange.high) continue;
                    presetRegions.push({
                        sample: instrumentZone.reference,
                        keyLow: keyRange.low,
                        keyHigh: keyRange.high,
                        velocityLow: velocityRange.low,
                        velocityHigh: velocityRange.high,
                        startOffset: generatorValue(combined, 0, 0) + generatorValue(combined, 4, 0) * 32768,
                        endOffset: generatorValue(combined, 1, 0) + generatorValue(combined, 12, 0) * 32768,
                        loopStartOffset: generatorValue(combined, 2, 0) + generatorValue(combined, 45, 0) * 32768,
                        loopEndOffset: generatorValue(combined, 3, 0) + generatorValue(combined, 50, 0) * 32768,
                        coarseTune: generatorValue(combined, 51, 0),
                        fineTune: generatorValue(combined, 52, 0),
                        attenuation: generatorValue(combined, 48, 0),
                        pan: generatorValue(combined, 17, 0),
                        attack: generatorValue(combined, 34, -12000),
                        decay: generatorValue(combined, 36, -12000),
                        sustain: generatorValue(combined, 37, 0),
                        release: generatorValue(combined, 38, -12000),
                        sampleModes: generatorValue(combined, 54, 0),
                        keyNumber: generatorValue(combined, 46, -1),
                        velocityOverride: generatorValue(combined, 47, -1),
                        rootKey: generatorValue(combined, 58, sample.originalPitch),
                        scaleTuning: generatorValue(combined, 56, 100),
                        filterCutoff: generatorValue(combined, 8, 13500),
                        filterQ: generatorValue(combined, 9, 0),
                        chorusSend: generatorValue(combined, 15, 0),
                        reverbSend: generatorValue(combined, 16, 0)
                    });
                }
            }
            presets.push({ name, program, bank, regions: presetRegions });
        }

        if (sampleChunk.start % Int16Array.BYTES_PER_ELEMENT !== 0) {
            throw new Error('The SoundFont sample data is not aligned to 16-bit samples.');
        }
        const sampleData = new Int16Array(
            buffer,
            sampleChunk.start,
            (sampleChunk.end - sampleChunk.start) / Int16Array.BYTES_PER_ELEMENT
        );
        const presetLookup = new Map(
            presets.map((preset) => [`${preset.bank}:${preset.program}`, preset])
        );
        return {
            name: soundfontName,
            samples,
            presets,
            presetLookup,
            sampleData,
            fallbackPreset: chooseFallbackPreset(presets)
        };
    }

    function parseMidi(buffer) {
        const bytes = new Uint8Array(buffer);
        const view = new DataView(buffer);
        if (bytes.length < 14 || ascii(bytes, 0, 4) !== 'MThd') {
            throw new Error('This file does not have a Standard MIDI File header.');
        }
        const headerLength = view.getUint32(4, false);
        const headerEnd = checkedEnd(8, headerLength, bytes.length, 'MIDI header');
        if (headerLength < 6) throw new Error('The MIDI header is too short.');
        const format = view.getUint16(8, false);
        const trackCount = view.getUint16(10, false);
        const division = view.getUint16(12, false);
        if (format > 1) throw new Error('MIDI format 2 sequences are not supported.');
        if (trackCount === 0) throw new Error('The MIDI file does not contain any tracks.');

        const smpte = (division & 0x8000) !== 0;
        const ticksPerBeat = division & 0x7fff;
        let ticksPerSecond = 0;
        if (smpte) {
            const frameCode = view.getInt8(12);
            const ticksPerFrame = division & 255;
            const frameRates = { '-24': 24, '-25': 25, '-29': 30000 / 1001, '-30': 30 };
            const frameRate = frameRates[String(frameCode)];
            if (!frameRate || ticksPerFrame === 0) throw new Error('The MIDI file has an invalid SMPTE time division.');
            ticksPerSecond = frameRate * ticksPerFrame;
        } else if (ticksPerBeat === 0) {
            throw new Error('The MIDI file has an invalid ticks-per-beat value.');
        }

        const allEvents = [];
        const trackNames = [];
        let offset = headerEnd;
        let maxTick = 0;
        let serial = 0;
        function readVariableLength(end) {
            let value = 0;
            for (let i = 0; i < 4; i++) {
                if (offset >= end) throw new Error('The MIDI file ends inside a variable-length value.');
                const byte = bytes[offset++];
                value = (value << 7) | (byte & 127);
                if (!(byte & 128)) return value;
            }
            throw new Error('The MIDI file contains an oversized variable-length value.');
        }
        function readDataByte(end) {
            if (offset >= end || bytes[offset] > 127) throw new Error('The MIDI file contains an invalid channel event.');
            return bytes[offset++];
        }

        for (let track = 0; track < trackCount; track++) {
            if (offset + 8 > bytes.length || ascii(bytes, offset, 4) !== 'MTrk') {
                throw new Error(`MIDI track ${track + 1} is missing its MTrk header.`);
            }
            const length = view.getUint32(offset + 4, false);
            const trackStart = offset + 8;
            const trackEnd = checkedEnd(trackStart, length, bytes.length, `MIDI track ${track + 1}`);
            offset = trackStart;
            let tick = 0;
            let runningStatus = 0;
            while (offset < trackEnd) {
                tick += readVariableLength(trackEnd);
                if (!Number.isSafeInteger(tick)) throw new Error('The MIDI file has an invalid event time.');
                let status = bytes[offset];
                if (status < 128) {
                    if (!runningStatus) throw new Error('The MIDI file uses running status before a channel event.');
                    status = runningStatus;
                } else {
                    offset++;
                }

                if (status === 255) {
                    runningStatus = 0;
                    if (offset >= trackEnd) throw new Error('The MIDI file has an incomplete meta event.');
                    const type = bytes[offset++];
                    if (type !== 47) maxTick = Math.max(maxTick, tick);
                    const metaLength = readVariableLength(trackEnd);
                    const metaEnd = checkedEnd(offset, metaLength, trackEnd, 'MIDI meta event');
                    if (type === 3) trackNames[track] = ascii(bytes, offset, metaLength);
                    if (type === 81 && metaLength === 3) {
                        const tempo = (bytes[offset] << 16) | (bytes[offset + 1] << 8) | bytes[offset + 2];
                        if (tempo > 0) allEvents.push({ tick, type: 'tempo', tempo, track, serial: serial++ });
                    }
                    offset = metaEnd;
                    if (type === 47) {
                        break;
                    }
                    continue;
                }
                if (status === 240 || status === 247) {
                    runningStatus = 0;
                    const size = readVariableLength(trackEnd);
                    offset = checkedEnd(offset, size, trackEnd, 'MIDI system-exclusive event');
                    maxTick = Math.max(maxTick, tick);
                    continue;
                }
                if (status < 128 || status >= 240) {
                    throw new Error(`The MIDI file contains unsupported status 0x${status.toString(16)}.`);
                }
                maxTick = Math.max(maxTick, tick);
                runningStatus = status;
                const command = status >> 4;
                const channel = status & 15;
                const first = readDataByte(trackEnd);
                const oneByte = command === 12 || command === 13;
                const second = oneByte ? 0 : readDataByte(trackEnd);
                let event;
                if (command === 8) event = { type: 'noteOff', channel, note: first, velocity: second };
                else if (command === 9) event = second === 0
                    ? { type: 'noteOff', channel, note: first, velocity: 0 }
                    : { type: 'noteOn', channel, note: first, velocity: second };
                else if (command === 11) event = { type: 'control', channel, controller: first, value: second };
                else if (command === 12) event = { type: 'program', channel, program: first };
                else if (command === 13) event = { type: 'pressure', channel, value: first };
                else if (command === 14) event = { type: 'pitchBend', channel, value: first | (second << 7) };
                else continue;
                allEvents.push({ ...event, tick, track, serial: serial++ });
            }
            offset = trackEnd;
        }

        allEvents.sort((a, b) => a.tick - b.tick || a.track - b.track || a.serial - b.serial);
        const percussionChannels = [9];
        let tempo = 500000;
        let previousTick = 0;
        let seconds = 0;
        const events = [];
        for (const event of allEvents) {
            seconds += smpte
                ? (event.tick - previousTick) / ticksPerSecond
                : ((event.tick - previousTick) * tempo) / (ticksPerBeat * 1000000);
            previousTick = event.tick;
            if (event.type === 'tempo') {
                tempo = event.tempo;
            } else {
                events.push({ ...event, time: seconds });
            }
        }
        seconds += smpte
            ? (maxTick - previousTick) / ticksPerSecond
            : ((maxTick - previousTick) * tempo) / (ticksPerBeat * 1000000);
        return { format, events, duration: seconds, trackNames, percussionChannels };
    }

    const api = { parseMidi, parseSoundFont, resolvePreset };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.MemeMidiCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
