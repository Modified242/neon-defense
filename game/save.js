const SAVE_KEY = 'neonDefenseSaveData_v1';

// Default save state
const defaultSave = {
    unlockedSectors: 0,
    dataCores: 0,
    stars: {},          // levelIndex -> number of stars (1-3)
    endlessRecords: {}, // levelIndex -> max wave reached
    unlockedTowers: ['basic', 'rapid', 'sniper'],
    techTree: {},       // nodeId -> boolean
};

let currentSave = null;

export function loadSave() {
    if (currentSave) return currentSave;
    try {
        const data = localStorage.getItem(SAVE_KEY);
        if (data) {
            currentSave = { ...defaultSave, ...JSON.parse(data) };
        } else {
            // Migration from old keys
            const oldMax = parseInt(localStorage.getItem('neonDefenseMaxLevel'), 10) || 0;
            let oldEndless = {};
            try { oldEndless = JSON.parse(localStorage.getItem('neonDefenseEndlessBest')) || {}; } catch (e) {}
            
            currentSave = {
                ...defaultSave,
                unlockedTowers: ['basic', 'rapid', 'sniper'],
                unlockedSectors: Math.max(0, oldMax),
                endlessRecords: oldEndless
            };
            saveGame(); // Write the migrated save
        }
    } catch (e) {
        console.error("Save load failed, using default", e);
        currentSave = { ...defaultSave };
    }
    return currentSave;
}

export function saveGame() {
    if (!currentSave) return;
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(currentSave));
    } catch (e) {
        console.error("Save write failed", e);
    }
}

export function unlockSector(index) {
    const save = loadSave();
    if (index > save.unlockedSectors) {
        save.unlockedSectors = index;
        saveGame();
        return true;
    }
    return false;
}

export function recordEndlessWave(levelIndex, wave) {
    const save = loadSave();
    const prev = save.endlessRecords[levelIndex] || 0;
    if (wave > prev) {
        save.endlessRecords[levelIndex] = wave;
        saveGame();
        return true;
    }
    return false;
}

export function recordSectorClear(levelIndex, livesRemaining, startingLives) {
    const save = loadSave();
    
    // Calculate stars (3 stars if perfect, 2 if > 50%, 1 otherwise)
    let stars = 1;
    if (livesRemaining === startingLives) stars = 3;
    else if (livesRemaining >= startingLives / 2) stars = 2;

    const prevStars = save.stars[levelIndex] || 0;
    
    let isNewRecord = false;
    if (stars > prevStars) {
        // Award data cores for new stars earned
        const newStars = stars - prevStars;
        save.dataCores += newStars * 10; // 10 cores per star
        save.stars[levelIndex] = stars;
        isNewRecord = true;
    }
    
    // Always grant a small flat amount of cores for clearing
    save.dataCores += 5;
    
    saveGame();
    return { stars, isNewRecord, totalCores: save.dataCores };
}

export function getSave() {
    return loadSave();
}

export function unlockTower(type, cost) {
    const save = loadSave();
    if (save.unlockedTowers.includes(type)) return false;
    if (save.dataCores < cost) return false;
    
    save.dataCores -= cost;
    save.unlockedTowers.push(type);
    saveGame();
    return true;
}
