// All tunable game data lives here so balance can be adjusted (and simulated) in one place.

export const CANVAS_W = 800;
export const CANVAS_H = 600;
export const PATH_WIDTH = 40;
export const TOWER_RADIUS = 20;       // Tower footprint (used for spacing, edges and click hit-box)
export const FRAME_MS = 1000 / 60;    // Speeds are expressed in "pixels per 60fps frame"
export const MAX_DT = 50;             // Clamp frame delta so tab-switching can't teleport enemies

export const STARTING_LIVES = 20;
export const STARTING_CREDITS = 300;
export const SELL_REFUND = 0.7;
export const MAX_TOWER_LEVEL = 10;

// Credits awarded for clearing wave N (1-based). Keeps the economy growing with enemy HP.
export const waveClearBonus = (wave) => 20 + 10 * wave;

// Manual "zap" when clicking an enemy. Rate-limited so it helps early but can't be autoclicked to victory.
export const CLICK = { damage: 15, cooldown: 200, radius: 15 };

export const FROST_COLOR = '#7dd3fc';

// Bosses split into minions on death and cost several lives if they reach the core.
export const BOSS_MINIONS = { count: 6, hpFraction: 0.03, reward: 3 };
export const BOSS_LEAK_COST = 5;

// Endless mode: procedural waves after the scripted ones, scaled off each sector's final waves.
export const ENDLESS = {
    hpBase: 1.1,        // HP multiplier on the first endless wave (enemies are also pulled toward tank-tier HP)
    hpGrowth: 1.12,     // Compounding HP growth per endless wave
    countGrowth: 0.06,  // +6% enemies per endless wave
    rewardGrowth: 0.05, // Kill rewards grow slowly so the economy can't outscale forever
    bossEvery: 5,
    bossHpMult: 0.75,
};

export const UPGRADE = {
    costBase: 0.7,      // Level 1→2 costs 70% of the tower price...
    costGrowth: 1.5,    // ...and each further level costs 50% more than the previous one
    damage: 1.35,
    fireRate: 0.9,      // Multiplier on the delay between shots (lower = faster)
    range: 1.08,
    slowDuration: 300,  // Cryo: extra ms of slow per level
    genAmount: 1.35,    // Fabricator: income multiplier per level (kept modest so endless can't be farmed)
    supportBuff: 0.08,  // Overclock: extra fire-rate buff per level
};

export const TOWER_SPECS = {
    basic: {
        name: 'Pulse Blaster', cost: 50, color: '#3b82f6', shape: 'square',
        range: 120, damage: 20, fireRate: 650, projSpeed: 8,
    },
    sniper: {
        name: 'Railgun', cost: 120, color: '#f59e0b', shape: 'diamond',
        range: 260, damage: 110, fireRate: 2400, projSpeed: 20,
    },
    rapid: {
        name: 'Plasma Repeater', cost: 150, color: '#10b981', shape: 'circle',
        range: 100, damage: 10, fireRate: 100, projSpeed: 9,
    },
    frost: {
        name: 'Cryo Emitter', cost: 120, color: '#0ea5e9', shape: 'triangle',
        range: 150, damage: 6, fireRate: 900, projSpeed: 9,
        isFrost: true, slowFactor: 0.5, slowDuration: 2000,
        unlockCost: 15, unlockDescription: "Slows enemies to a crawl."
    },
    blast: {
        name: 'Photon Mortar', cost: 180, color: '#f43f5e', shape: 'hexagon',
        range: 200, damage: 100, fireRate: 1900, projSpeed: 7, splashRadius: 80,
        unlockCost: 25, unlockDescription: "High area-of-effect explosive damage."
    },
    laser: {
        name: 'Ion Beam', cost: 180, color: '#a855f7', shape: 'pentagon',
        range: 180, damage: 5, fireRate: 50, projSpeed: 0,
        isLaser: true,
        unlockCost: 35, unlockDescription: "Continuous damage that never misses."
    },
    support: {
        name: 'Overclock Node', cost: 200, color: '#ec4899', shape: 'cross',
        range: 130, damage: 0, fireRate: 0, projSpeed: 0,
        isSupport: true, fireRateBuff: 0.3, // 30% faster firing for towers in range
        unlockCost: 50, unlockDescription: "Boosts fire rate of nearby towers."
    },
    generator: {
        name: 'Credit Fabricator', cost: 150, color: '#fbbf24', shape: 'star',
        range: 0, damage: 0, fireRate: 0, projSpeed: 0,
        isGenerator: true, genAmount: 50, // Paid out each time a wave is cleared
        unlockCost: 40, unlockDescription: "Generates bonus credits every wave."
    },
};

// Wave pressure (hp * 1000 / spawnRate) grows ~1.8x per wave instead of spiking on the final wave.
export const LEVELS = [
    {
        path: [
            { x: -30, y: 150 }, { x: 300, y: 150 }, { x: 300, y: 450 }, { x: 600, y: 450 }, { x: 600, y: 250 }, { x: 830, y: 250 }
        ],
        waves: [
            { count: 10, hp: 40, speed: 1.5, spawnRate: 1500, reward: 5, color: '#ec4899' },
            { count: 15, hp: 40, speed: 2.2, spawnRate: 1100, reward: 6, color: '#d946ef', type: 'fast' },
            { count: 35, hp: 35, speed: 1.6, spawnRate: 450, reward: 4, color: '#8b5cf6', type: 'swarm' },
            { count: 35, hp: 160, speed: 2.1, spawnRate: 750, reward: 8, color: '#6366f1' },
            { count: 12, hp: 600, speed: 1.1, spawnRate: 1600, reward: 15, color: '#ef4444', type: 'tank' },
            { count: 1, hp: 3500, speed: 0.6, spawnRate: 1000, reward: 150, color: '#f87171', type: 'boss' }
        ]
    },
    {
        path: [
            { x: 400, y: -30 }, { x: 400, y: 200 }, { x: 150, y: 200 }, { x: 150, y: 400 }, { x: 650, y: 400 }, { x: 650, y: 100 }, { x: 830, y: 100 }
        ],
        waves: [
            { count: 15, hp: 55, speed: 1.6, spawnRate: 1300, reward: 5, color: '#4ade80' },
            { count: 20, hp: 60, speed: 2.3, spawnRate: 1000, reward: 6, color: '#22c55e', type: 'fast' },
            { count: 45, hp: 45, speed: 1.8, spawnRate: 400, reward: 5, color: '#10b981', type: 'swarm' },
            { count: 35, hp: 210, speed: 2.3, spawnRate: 700, reward: 8, color: '#84cc16' },
            { count: 15, hp: 800, speed: 1.2, spawnRate: 1500, reward: 18, color: '#bef264', type: 'tank' },
            { count: 1, hp: 6000, speed: 0.65, spawnRate: 1000, reward: 250, color: '#dc2626', type: 'boss' }
        ]
    },
    {
        path: [
            { x: -30, y: 500 }, { x: 200, y: 500 }, { x: 200, y: 150 }, { x: 500, y: 150 }, { x: 500, y: 500 }, { x: 700, y: 500 }, { x: 700, y: 250 }, { x: 830, y: 250 }
        ],
        waves: [
            { count: 20, hp: 70, speed: 1.8, spawnRate: 1200, reward: 5, color: '#fbbf24' },
            { count: 30, hp: 80, speed: 2.5, spawnRate: 950, reward: 6, color: '#f59e0b', type: 'fast' },
            { count: 60, hp: 55, speed: 2.0, spawnRate: 350, reward: 5, color: '#fb923c', type: 'swarm' },
            { count: 50, hp: 240, speed: 2.5, spawnRate: 650, reward: 8, color: '#f97316' },
            { count: 20, hp: 1200, speed: 1.3, spawnRate: 1400, reward: 20, color: '#ef4444', type: 'tank' },
            { count: 1, hp: 11000, speed: 0.65, spawnRate: 1000, reward: 400, color: '#991b1b', type: 'boss' }
        ]
    },
    {
        path: [
            { x: 100, y: -30 }, { x: 100, y: 300 }, { x: 350, y: 300 }, { x: 350, y: 100 }, { x: 750, y: 100 }, { x: 750, y: 550 }, { x: 450, y: 550 }, { x: 450, y: 630 }
        ],
        waves: [
            { count: 25, hp: 100, speed: 1.8, spawnRate: 1100, reward: 5, color: '#2dd4bf' },
            { count: 40, hp: 120, speed: 2.6, spawnRate: 850, reward: 6, color: '#0ea5e9', type: 'fast' },
            { count: 70, hp: 80, speed: 2.1, spawnRate: 320, reward: 5, color: '#38bdf8', type: 'swarm' },
            { count: 60, hp: 350, speed: 2.6, spawnRate: 600, reward: 8, color: '#818cf8' },
            { count: 25, hp: 1800, speed: 1.4, spawnRate: 1300, reward: 22, color: '#a78bfa', type: 'tank' },
            { count: 1, hp: 18000, speed: 0.6, spawnRate: 1000, reward: 500, color: '#c026d3', type: 'boss' }
        ]
    },
    {
        path: [
            { x: -30, y: 300 }, { x: 150, y: 300 }, { x: 150, y: 450 }, { x: 400, y: 450 }, { x: 400, y: 150 }, { x: 650, y: 150 }, { x: 650, y: 300 }, { x: 830, y: 300 }
        ],
        waves: [
            { count: 35, hp: 150, speed: 1.9, spawnRate: 1000, reward: 5, color: '#f43f5e' },
            { count: 50, hp: 180, speed: 2.7, spawnRate: 750, reward: 6, color: '#fb7185', type: 'fast' },
            { count: 80, hp: 120, speed: 2.2, spawnRate: 300, reward: 5, color: '#fda4af', type: 'swarm' },
            { count: 70, hp: 500, speed: 2.7, spawnRate: 550, reward: 8, color: '#e11d48' },
            { count: 35, hp: 2500, speed: 1.4, spawnRate: 1200, reward: 25, color: '#be123c', type: 'tank' },
            // World 1 Boss - massive HP
            { count: 1, hp: 32000, speed: 0.55, spawnRate: 1000, reward: 1000, color: '#881337', type: 'boss' }
        ]
    }
];
