import { Game } from './game/engine.js';
import { TOWER_SPECS, LEVELS, MAX_TOWER_LEVEL, CANVAS_W, CANVAS_H } from './game/config.js';
import { createBackground, render } from './game/render.js';
import { play, resumeAudio } from './game/audio.js';

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
const victoryScreen = $('victory-screen');
const levelSelectScreen = $('level-select-screen');
const levelButtonsContainer = $('level-buttons');
const nextLevelBtn = $('next-level-btn');
const buildMenu = $('build-menu');
const upgradeMenu = $('upgrade-menu');
const selectedTowerStats = $('selected-tower-stats');
const upgradeBtn = $('upgrade-btn');
const sellBtn = $('sell-btn');
const upgradeCostDisplay = $('upgrade-cost');
const sellPriceDisplay = $('sell-price');
const targetingModeSelect = $('targeting-mode');
const targetingControls = $('targeting-controls');

const SAVE_KEY = 'neonDefenseMaxLevel';
let maxLevelUnlocked = Math.min(Math.max(parseInt(localStorage.getItem(SAVE_KEY), 10) || 0, 0), LEVELS.length - 1);

let currentLevel = 0;
let game = null;
let background = null;
let inMenu = true;

// Transient UI state (not part of the simulation)
const ui = {
    placingType: null,
    selectedTower: null,
    mouse: null,
};

// ---------- Game lifecycle ----------

function startLevel(index) {
    currentLevel = index;
    game = new Game(index);
    background = createBackground(game.path);
    game
        .on('sound', play)
        .on('waveEnd', ({ bonus, income }) => {
            const total = bonus + income;
            game.addText(CANVAS_W / 2, CANVAS_H / 2, `WAVE CLEARED  +${total}¢`, '#06b6d4');
        })
        .on('defeat', () => {
            gameOverScreen.classList.remove('hidden');
            play('gameOver');
            refreshUI();
        })
        .on('victory', () => {
            if (currentLevel === maxLevelUnlocked && maxLevelUnlocked < LEVELS.length - 1) {
                maxLevelUnlocked++;
                localStorage.setItem(SAVE_KEY, maxLevelUnlocked);
            }
            nextLevelBtn.classList.toggle('hidden', currentLevel >= LEVELS.length - 1);
            victoryScreen.classList.remove('hidden');
            play('victory');
            refreshUI();
        });

    inMenu = false;
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

    levelButtonsContainer.innerHTML = '';
    LEVELS.forEach((_, i) => {
        const btn = document.createElement('button');
        btn.id = `level-btn-${i + 1}`;
        btn.textContent = `Sector ${i + 1}`;
        if (i <= maxLevelUnlocked) {
            btn.className = 'level-btn';
            btn.onclick = () => { resumeAudio(); startLevel(i); };
        } else {
            btn.className = 'level-btn locked';
            btn.textContent += ' (LOCKED)';
            btn.disabled = true;
        }
        levelButtonsContainer.appendChild(btn);
    });
    refreshUI();
}

// ---------- UI ----------

function refreshUI() {
    if (!game) return;
    livesDisplay.textContent = game.lives;
    creditsDisplay.textContent = game.credits;
    waveDisplay.textContent = `${game.wave}/${game.totalWaves}`;
    startWaveBtn.disabled = inMenu || game.state !== 'building';

    towerBtns.forEach(btn => {
        btn.classList.toggle('disabled', game.credits < TOWER_SPECS[btn.dataset.type].cost);
    });
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

    if (t.isGenerator || t.splashRadius) {
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
$('restart-btn').addEventListener('click', () => startLevel(currentLevel));
$('next-level-btn').addEventListener('click', () => startLevel(Math.min(currentLevel + 1, LEVELS.length - 1)));
$('fail-menu-btn').addEventListener('click', showLevelSelect);
$('win-menu-btn').addEventListener('click', showLevelSelect);
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
    const dt = lastTime === null ? 0 : timestamp - lastTime; // engine clamps large gaps (e.g. after tab switch)
    lastTime = timestamp;

    if (!inMenu) game.update(dt);
    if (game.dirty) refreshUI();
    render(ctx, game, background, inMenu ? {} : ui);

    requestAnimationFrame(gameLoop);
}

// Init: show sector 1's map behind the level-select overlay
game = new Game(0);
background = createBackground(game.path);
showLevelSelect();
requestAnimationFrame(gameLoop);

