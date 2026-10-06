// Procedural Web Audio sound effects.
// All sounds go through a master gain + compressor so dozens of simultaneous shots don't clip,
// and each sound is rate-limited so rapid-fire towers can't flood the audio graph.

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const master = audioCtx.createGain();
const compressor = audioCtx.createDynamicsCompressor();
master.gain.value = 0.8;
master.connect(compressor);
compressor.connect(audioCtx.destination);

// White noise is generated once and reused instead of allocating a new buffer for every explosion.
const noiseBuffer = (() => {
    const size = Math.floor(audioCtx.sampleRate * 0.5);
    const buffer = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
})();

const MIN_INTERVAL = { shootrapid: 70, shootbasic: 50, hit: 45, explosion: 70, clickEnemy: 40, leak: 120 };
const lastPlayed = {};

function throttled(key) {
    const now = performance.now();
    const min = MIN_INTERVAL[key] ?? 30;
    if (now - (lastPlayed[key] || 0) < min) return true;
    lastPlayed[key] = now;
    return false;
}

export function resumeAudio() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function tone(freq, type, duration, vol = 0.1, endFreq = null, delay = 0) {
    const t0 = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.01, t0 + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration);
}

function noise(duration, vol, cutoff) {
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();
    src.stop(audioCtx.currentTime + duration);
}

const SHOOT = {
    basic: () => tone(600, 'square', 0.1, 0.05),
    sniper: () => tone(150, 'sawtooth', 0.3, 0.1, 40),
    rapid: () => tone(800, 'sine', 0.05, 0.03),
    frost: () => tone(1200, 'sine', 0.1, 0.02),
    blast: () => tone(100, 'square', 0.4, 0.15, 20),
};

const SOUNDS = {
    shoot: (type) => SHOOT[type]?.(),
    hit: () => tone(200, 'sawtooth', 0.1, 0.05),
    explosion: () => noise(0.5, 0.2, 1000),
    leak: () => tone(180, 'square', 0.25, 0.12, 90),
    placeTower: () => { tone(400, 'sine', 0.1, 0.1); tone(600, 'sine', 0.1, 0.1, null, 0.1); },
    upgrade: () => { tone(400, 'sine', 0.1, 0.1); tone(600, 'sine', 0.1, 0.1, null, 0.1); tone(800, 'sine', 0.15, 0.1, null, 0.2); },
    sell: () => tone(200, 'sawtooth', 0.1, 0.05),
    error: () => tone(150, 'square', 0.2, 0.1),
    waveStart: () => { tone(300, 'triangle', 0.2, 0.1); tone(400, 'triangle', 0.2, 0.1, null, 0.2); tone(500, 'triangle', 0.4, 0.1, null, 0.4); },
    gameOver: () => { tone(300, 'sawtooth', 0.3, 0.2); tone(250, 'sawtooth', 0.3, 0.2, null, 0.3); tone(200, 'sawtooth', 0.6, 0.2, null, 0.6); },
    victory: () => { tone(400, 'sine', 0.2, 0.2); tone(500, 'sine', 0.2, 0.2, null, 0.2); tone(600, 'sine', 0.4, 0.2, null, 0.4); },
    selectTower: () => tone(500, 'sine', 0.1, 0.05),
    generateCredit: () => { tone(800, 'sine', 0.1, 0.05); tone(1000, 'sine', 0.1, 0.05, null, 0.1); },
    clickEnemy: () => tone(300, 'square', 0.05, 0.1),
};

export function play(name, arg) {
    if (audioCtx.state !== 'running') return; // never queue sounds before the first user gesture
    const key = name === 'shoot' ? `shoot${arg}` : name;
    if (throttled(key)) return;
    SOUNDS[name]?.(arg);
}
