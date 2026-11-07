importScripts('meme-midi-core.js');

self.addEventListener('message', (event) => {
    try {
        const soundfont = self.MemeMidiCore.parseSoundFont(event.data.buffer);
        self.postMessage({ soundfont }, [soundfont.sampleData.buffer]);
    } catch (error) {
        self.postMessage({ error: error.message || String(error) });
    }
});
