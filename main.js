import { Game } from './game/engine.js';
import { TOWER_SPECS, LEVELS, MAX_TOWER_LEVEL, CANVAS_W, CANVAS_H, STARTING_LIVES } from './game/config.js';
import { createBackground, render } from './game/render.js';
import { play, resumeAudio } from './game/audio.js';
import { loadSave, unlockSector, recordEndlessWave, recordSectorClear, getSave, unlockTower } from './game/save.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// UI Elements
const $ = (id) => document.getElementById(id);
const livesDisplay = $('lives-display');
const creditsDisplay = $('credits-display');
const waveDisplay = $('wave-display');
const startWaveBtn = $('start-wave-btn');
const towerBtns = document.querySelectorAll('.tower-btn');
const gameOverScreen = $('game-over-screen');
const gameOverDetail = $('game-over-detail');
const victoryScreen = $('victory-screen');
const levelSelectScreen = $('level-select-screen');
const levelButtonsContainer = $('level-buttons');
const nextLevelBtn = $('next-level-btn');
const techLabBtn = $('tech-lab-btn');
const techTreeScreen = $('tech-tree-screen');
const closeTechBtn = $('close-tech-btn');
const techList = $('tech-list');
const pauseBtn = $('pause-btn');
const speed1Btn = $('speed-1-btn');
const speed2Btn = $('speed-2-btn');
const speed3Btn = $('speed-3-btn');
const buildMenu = $('build-menu');
const upgradeMenu = $('upgrade-menu');
const selectedTowerStats = $('selected-tower-stats');
const upgradeBtn = $('upgrade-btn');
const sellBtn = $('sell-btn');
const upgradeCostDisplay = $('upgrade-cost');
const sellPriceDisplay = $('sell-price');
const targetingModeSelect = $('targeting-mode');
const targetingControls = $('targeting-controls');
const previewPanel = $('preview-panel');
let defaultInstructions = ''; // Set later when DOM is ready

// Initialize save
loadSave();

let currentLevel = 0;
let game = null;
let background = null;
let inMenu = true;
let isPaused = false;
let gameSpeed = 1;

// Transient UI state (not part of the simulation)
const ui = {
    placingType: null,
    selectedTower: null,
    mouse: null,
};

// ---------- Game lifecycle ----------

function startLevel(index, endless = false) {
    currentLevel = index;
    game = new Game(index, { endless });
    background = createBackground(game.path);
    game
        .on('sound', play)
        .on('waveEnd', ({ wave, bonus, income }) => {
            const total = bonus + income;
            game.addText(CANVAS_W / 2, CANVAS_H / 2, `WAVE CLEARED  +${total}¢`, '#06b6d4');
            if (game.endless && wave >= game.totalWaves) {
                recordEndlessWave(game.levelIndex, game.wave);
            }
        })
        .on('defeat', () => {
            const save = getSave();
            let isRecord = false;
            if (game.endless) {
                isRecord = recordEndlessWave(game.levelIndex, game.wave);
            }
            gameOverDetail.textContent = game.endless
                ? `Endless run ended on wave ${game.wave}${isRecord ? ' · NEW RECORD!' : ` · Best: ${save.endlessRecords[game.levelIndex] || 0}`}`
                : `Fell on wave ${game.wave}/${game.totalWaves}`;
            gameOverScreen.classList.remove('hidden');
            play('gameOver');
            refreshUI();
        })
        .on('victory', () => {
            const save = getSave();
            if (currentLevel === save.unlockedSectors && save.unlockedSectors < LEVELS.length - 1) {
                unlockSector(currentLevel + 1);
            }
            recordSectorClear(currentLevel, game.lives, STARTING_LIVES);
            nextLevelBtn.classList.toggle('hidden', currentLevel >= LEVELS.length - 1);
            victoryScreen.classList.remove('hidden');
            play('victory');
            refreshUI();
        });

    inMenu = false;
    isPaused = false;
    setGameSpeed(1);
    pauseBtn.textContent = '⏸';
    pauseBtn.classList.remove('paused');
    cancelPlacement();
    closeUpgradeMenu();
    levelSelectScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden');
    refreshUI();
}

function showLevelSelect() {
    inMenu = true;
    cancelPlacement();
    closeUpgradeMenu();
    gameOverScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden');
    levelSelectScreen.classList.remove('hidden');

    const save = getSave();
    $('data-cores-display').textContent = save.dataCores;

    levelButtonsContainer.innerHTML = '';
    LEVELS.forEach((_, i) => {
        const card = document.createElement('div');
        card.className = 'level-card';

        const title = document.createElement('div');
        title.style.fontWeight = 'bold';
        title.textContent = `Sector ${i + 1}`;
        card.appendChild(title);
        
        // Stars
        const starsBox = document.createElement('div');
        starsBox.style.color = '#fbbf24';
        starsBox.style.margin = '4px 0 10px 0';
        starsBox.style.fontSize = '1.2rem';
        const starsCount = save.stars[i] || 0;
        starsBox.innerHTML = '★'.repeat(starsCount) + '☆'.repeat(3 - starsCount);
        card.appendChild(starsBox);

        const btn = document.createElement('button');
        btn.id = `level-btn-${i + 1}`;
        btn.textContent = `Deploy`;

        if (i <= save.unlockedSectors) {
            btn.className = 'level-btn';
            btn.onclick = () => { resumeAudio(); startLevel(i); };
            card.appendChild(btn);

            const endlessBtn = document.createElement('button');
            endlessBtn.id = `endless-level-btn-${i + 1}`;
            endlessBtn.className = 'endless-level-btn';
            const best = save.endlessRecords[i];
            endlessBtn.innerHTML = `∞ Endless${best ? `<span class="endless-best">Best: wave ${best}</span>` : ''}`;
            endlessBtn.onclick = () => { resumeAudio(); startLevel(i, true); };
            card.appendChild(endlessBtn);
        } else {
            btn.className = 'level-btn locked';
            btn.textContent += ' (LOCKED)';
            btn.disabled = true;
            card.appendChild(btn);
        }
        levelButtonsContainer.appendChild(card);
    });
    
    if (!defaultInstructions && previewPanel) {
        defaultInstructions = previewPanel.innerHTML;
    }
    refreshUI();
}

// ---------- UI ----------

function refreshUI() {
    if (!game) return;
    
    // Hide towers that are not unlocked
    const save = getSave();
    towerBtns.forEach(btn => {
        const type = btn.dataset.type;
        if (!save.unlockedTowers.includes(type)) {
            btn.style.display = 'none';
        } else {
            btn.style.display = 'flex';
            btn.classList.toggle('disabled', game.credits < TOWER_SPECS[type].cost);
        }
    });

    livesDisplay.textContent = game.lives;
    creditsDisplay.textContent = game.credits;
    waveDisplay.textContent = game.endless ? `${game.wave} ∞` : `${game.wave}/${game.totalWaves}`;
    startWaveBtn.disabled = inMenu || game.state !== 'building';

    if (ui.selectedTower) updateUpgradeUI();
    game.dirty = false;
}

function stat(label, value, next) {
    const arrow = next !== undefined && next !== value ? ` <span style="color:#22c55e">→ ${next}</span>` : '';
    return `<p style="margin-bottom:4px">${label}: ${value}${arrow}</p>`;
}

function updateUpgradeUI() {
    const t = ui.selectedTower;
    const cost = t.upgradeCost;
    // Preview what the next level would look like
    let n;
    if (cost !== null) {
        n = Object.assign(Object.create(Object.getPrototypeOf(t)), t);
        n.applyUpgrade();
    }

    let html = `<h3 style="color:${t.color}; margin-bottom:10px;">${t.name.toUpperCase()} · LVL ${t.level}/${MAX_TOWER_LEVEL}</h3>`;
    if (t.isGenerator) {
        html += stat('Income per wave', `${t.genAmount}¢`, n && `${n.genAmount}¢`);
    } else if (t.isSupport) {
        html += stat('Fire Rate Buff', `+${Math.round(t.fireRateBuff * 100)}%`, n && `+${Math.round(n.fireRateBuff * 100)}%`);
        html += stat('Aura Range', t.range.toFixed(0), n && n.range.toFixed(0));
    } else {
        html += stat('Damage', t.damage.toFixed(0), n && n.damage.toFixed(0));
        html += stat('Range', t.range.toFixed(0), n && n.range.toFixed(0));
        html += stat('Fire Rate', `${(1000 / t.fireRate).toFixed(1)}/s`, n && `${(1000 / n.fireRate).toFixed(1)}/s`);
        html += stat('DPS', t.dps.toFixed(0), n && n.dps.toFixed(0));
        if (t.splashRadius) html += stat('Splash Radius', t.splashRadius);
        if (t.isFrost) html += stat('Slow', `${Math.round((1 - t.slowFactor) * 100)}% for ${(t.slowDuration / 1000).toFixed(1)}s`,
            n && `${Math.round((1 - n.slowFactor) * 100)}% for ${(n.slowDuration / 1000).toFixed(1)}s`);
    }
    selectedTowerStats.innerHTML = html;

    upgradeCostDisplay.textContent = cost === null ? 'MAX' : cost;
    upgradeBtn.classList.toggle('disabled', cost === null || game.credits < cost || game.isOver);
    sellPriceDisplay.textContent = t.sellValue;

    if (t.isGenerator || t.isSupport || t.splashRadius) {
        targetingControls.style.display = 'none';
    } else {
        targetingControls.style.display = 'block';
        targetingModeSelect.value = t.targetingMode;
    }
}

function showUpgradeMenu(tower) {
    ui.selectedTower = tower;
    buildMenu.classList.add('hidden');
    upgradeMenu.classList.remove('hidden');
    updateUpgradeUI();
}

function closeUpgradeMenu() {
    ui.selectedTower = null;
    buildMenu.classList.remove('hidden');
    upgradeMenu.classList.add('hidden');
}

function cancelPlacement() {
    ui.placingType = null;
    towerBtns.forEach(b => b.classList.remove('selected'));
}

// ---------- Input ----------

function canvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (canvas.width / rect.width),
        y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
}

// Show real tower prices from the config so the menu can't drift out of sync with balance changes.
towerBtns.forEach(btn => {
    const spec = TOWER_SPECS[btn.dataset.type];
    btn.dataset.cost = spec.cost;
    btn.querySelector('.tower-cost').textContent = `${spec.cost} ¢`;
    btn.querySelector('.tower-name').textContent = spec.name;
    btn.id = `tower-btn-${btn.dataset.type}`;

    btn.addEventListener('mouseenter', () => {
        let html = `<h3 style="color:${spec.color}; margin-bottom:8px; text-transform: uppercase;">${spec.name}</h3>`;
        if (spec.isGenerator) {
            html += stat('Income per wave', `${spec.genAmount}¢`);
        } else if (spec.isSupport) {
            html += stat('Fire Rate Buff', `+${(spec.fireRateBuff * 100).toFixed(0)}%`);
            html += stat('Aura Range', spec.range);
        } else {
            html += stat('Damage', spec.damage);
            html += stat('Range', spec.range);
            if (spec.isLaser) {
                html += stat('Tick Rate', `${(1000 / spec.fireRate).toFixed(1)}/s`);
            } else {
                html += stat('Fire Rate', `${(1000 / spec.fireRate).toFixed(1)}/s`);
            }
            html += stat('DPS', spec.fireRate > 0 ? (spec.damage * 1000 / spec.fireRate).toFixed(0) : 0);
            if (spec.splashRadius) html += stat('Splash Radius', spec.splashRadius);
            if (spec.isFrost) html += stat('Slow', `${Math.round((1 - spec.slowFactor) * 100)}% for ${(spec.slowDuration / 1000).toFixed(1)}s`);
        }
        previewPanel.innerHTML = html;
    });

    btn.addEventListener('mouseleave', () => {
        previewPanel.innerHTML = defaultInstructions;
    });

    btn.addEventListener('click', () => {
        if (inMenu || game.isOver) return;
        resumeAudio();
        const type = btn.dataset.type;
        if (ui.placingType === type) { cancelPlacement(); return; }
        if (game.credits < spec.cost) { play('error'); return; }
        cancelPlacement();
        closeUpgradeMenu();
        ui.placingType = type;
        btn.classList.add('selected');
        play('selectTower');
    });
});

canvas.addEventListener('click', (e) => {
    if (inMenu || game.isOver) return;
    resumeAudio();
    const { x, y } = canvasPoint(e);

    if (ui.placingType) {
        if (game.placeTower(ui.placingType, x, y)) {
            play('placeTower');
            if (!e.shiftKey) cancelPlacement();
        } else {
            play('error');
        }
        return;
    }

    const tower = game.towerAt(x, y);
    if (tower) {
        showUpgradeMenu(tower);
        play('selectTower');
        return;
    }
    game.clickAt(x, y);
});

canvas.addEventListener('mousemove', (e) => { ui.mouse = canvasPoint(e); });
canvas.addEventListener('mouseleave', () => { ui.mouse = null; });

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (inMenu || game.isOver) return;
    cancelPlacement();
    closeUpgradeMenu();
});

window.addEventListener('keydown', (e) => {
    if (inMenu || game.isOver) return;

    if ((e.code === 'Space' || e.code === 'Enter') && game.state === 'building') {
        e.preventDefault();
        startWaveBtn.click();
        return;
    }

    if (e.code === 'Escape') {
        cancelPlacement();
        closeUpgradeMenu();
        return;
    }

    const num = parseInt(e.key, 10);
    if (!isNaN(num) && num >= 1 && num <= towerBtns.length) {
        towerBtns[num - 1].click();
    }
});

startWaveBtn.addEventListener('click', () => {
    if (inMenu || !game) return;
    resumeAudio();
    if (game.startWave()) play('waveStart');
});

upgradeBtn.addEventListener('click', () => {
    if (!ui.selectedTower) return;
    if (game.upgradeTower(ui.selectedTower)) play('upgrade');
    else play('error');
});

sellBtn.addEventListener('click', () => {
    if (!ui.selectedTower) return;
    if (game.sellTower(ui.selectedTower)) {
        play('sell');
        closeUpgradeMenu();
    }
});

targetingModeSelect.addEventListener('change', (e) => {
    if (ui.selectedTower) {
        ui.selectedTower.targetingMode = e.target.value;
        play('selectTower');
    }
});

$('close-upgrade-btn').addEventListener('click', closeUpgradeMenu);
$('restart-btn').addEventListener('click', () => startLevel(currentLevel, game.endless));
$('next-level-btn').addEventListener('click', () => startLevel(Math.min(currentLevel + 1, LEVELS.length - 1)));
$('endless-btn').addEventListener('click', () => {
    if (!game.continueEndless()) return;
    victoryScreen.classList.add('hidden');
    game.addText(CANVAS_W / 2, CANVAS_H / 2, 'ENDLESS MODE ENGAGED', '#10b981', 2, 24);
    play('waveStart');
    refreshUI();
});
$('fail-menu-btn').addEventListener('click', showLevelSelect);
$('win-menu-btn').addEventListener('click', showLevelSelect);

pauseBtn.addEventListener('click', () => {
    if (inMenu || game.isOver) return;
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? '▶' : '⏸';
    pauseBtn.classList.toggle('paused', isPaused);
    if (isPaused) {
        game.addText(CANVAS_W / 2, CANVAS_H / 2, 'PAUSED', '#94a3b8', 2, 24);
        refreshUI();
    }
});

function setGameSpeed(speed) {
    gameSpeed = speed;
    speed1Btn.classList.toggle('active-speed', speed === 1);
    speed2Btn.classList.toggle('active-speed', speed === 2);
    speed3Btn.classList.toggle('active-speed', speed === 3);
}

speed1Btn.addEventListener('click', () => { if (!inMenu && !game.isOver) setGameSpeed(1); });
speed2Btn.addEventListener('click', () => { if (!inMenu && !game.isOver) setGameSpeed(2); });
speed3Btn.addEventListener('click', () => { if (!inMenu && !game.isOver) setGameSpeed(3); });

// --- Tech Lab Logic ---
techLabBtn.addEventListener('click', showTechLab);
closeTechBtn.addEventListener('click', () => {
    techTreeScreen.classList.add('hidden');
    levelSelectScreen.classList.remove('hidden');
    showLevelSelect(); // Refresh cores display
});

function showTechLab() {
    const save = getSave();
    levelSelectScreen.classList.add('hidden');
    techTreeScreen.classList.remove('hidden');
    
    $('tech-cores-display').textContent = save.dataCores;
    techList.innerHTML = '';
    
    // List locked towers
    let foundLocked = false;
    for (const [type, spec] of Object.entries(TOWER_SPECS)) {
        if (!spec.unlockCost || save.unlockedTowers.includes(type)) continue;
        
        foundLocked = true;
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.background = 'rgba(15, 23, 42, 0.8)';
        row.style.padding = '15px';
        row.style.borderRadius = '8px';
        row.style.border = '1px solid rgba(56, 189, 248, 0.3)';
        
        const info = document.createElement('div');
        info.innerHTML = `
            <div style="font-weight: bold; color: ${spec.color}; font-size: 1.1rem; margin-bottom: 4px;">${spec.name}</div>
            <div style="font-size: 0.9rem; color: #cbd5e1;">${spec.unlockDescription}</div>
        `;
        
        const unlockBtn = document.createElement('button');
        unlockBtn.className = 'glow-btn';
        unlockBtn.style.padding = '8px 16px';
        unlockBtn.style.minWidth = '120px';
        
        if (save.dataCores >= spec.unlockCost) {
            unlockBtn.innerHTML = `Unlock (${spec.unlockCost} Cores)`;
            unlockBtn.onclick = () => {
                if (unlockTower(type, spec.unlockCost)) {
                    play('selectTower'); // re-use sound
                    showTechLab(); // refresh
                }
            };
        } else {
            unlockBtn.innerHTML = `Need ${spec.unlockCost} Cores`;
            unlockBtn.disabled = true;
            unlockBtn.style.opacity = '0.5';
            unlockBtn.style.cursor = 'not-allowed';
        }
        
        row.appendChild(info);
        row.appendChild(unlockBtn);
        techList.appendChild(row);
    }
    
    if (!foundLocked) {
        techList.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 20px;">All tower schematics unlocked.</div>';
    }
}

$('fullscreen-btn').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        $('game-container').requestFullscreen().catch(err => {
            console.warn(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
});

// ---------- Main loop ----------

let lastTime = null;
function gameLoop(timestamp) {
    const rawDt = lastTime === null ? 0 : timestamp - lastTime;
    lastTime = timestamp;

    if (!inMenu && !isPaused) {
        // Cap max rawDt to prevent huge jumps if tab was suspended while not paused
        const dt = Math.min(rawDt, 100) * gameSpeed;
        game.update(dt);
    }
    
    if (game && game.dirty) refreshUI();
    render(ctx, game, background, inMenu ? {} : ui);

    requestAnimationFrame(gameLoop);
}

// Init: show sector 1's map behind the level-select overlay
game = new Game(0);
background = createBackground(game.path);
showLevelSelect();
requestAnimationFrame(gameLoop);

