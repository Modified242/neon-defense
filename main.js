const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const SoundEffects = {
    playTone(freq, type, duration, vol = 0.1) {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    },
    shootBasic() { this.playTone(600, 'square', 0.1, 0.05); },
    shootSniper() {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    },
    shootRapid() { this.playTone(800, 'sine', 0.05, 0.03); },
    shootFrost() { this.playTone(1200, 'sine', 0.1, 0.02); },
    shootBlast() {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
    },
    hit() { this.playTone(200, 'sawtooth', 0.1, 0.05); },
    explosion() {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const bufferSize = audioCtx.sampleRate * 0.5;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start();
    },
    placeTower() {
        this.playTone(400, 'sine', 0.1, 0.1);
        setTimeout(() => this.playTone(600, 'sine', 0.1, 0.1), 100);
    },
    error() { this.playTone(150, 'square', 0.2, 0.1); },
    waveStart() {
        this.playTone(300, 'triangle', 0.2, 0.1);
        setTimeout(() => this.playTone(400, 'triangle', 0.2, 0.1), 200);
        setTimeout(() => this.playTone(500, 'triangle', 0.4, 0.1), 400);
    },
    gameOver() {
        this.playTone(300, 'sawtooth', 0.3, 0.2);
        setTimeout(() => this.playTone(250, 'sawtooth', 0.3, 0.2), 300);
        setTimeout(() => this.playTone(200, 'sawtooth', 0.6, 0.2), 600);
    },
    victory() {
        this.playTone(400, 'sine', 0.2, 0.2);
        setTimeout(() => this.playTone(500, 'sine', 0.2, 0.2), 200);
        setTimeout(() => this.playTone(600, 'sine', 0.4, 0.2), 400);
    },
    selectTower() { this.playTone(500, 'sine', 0.1, 0.05); },
    generateCredit() { this.playTone(800, 'sine', 0.1, 0.05); setTimeout(() => this.playTone(1000, 'sine', 0.1, 0.05), 100); },
    clickEnemy() { this.playTone(300, 'square', 0.05, 0.1); }
};

// UI Elements
const livesDisplay = document.getElementById('lives-display');
const creditsDisplay = document.getElementById('credits-display');
const waveDisplay = document.getElementById('wave-display');
const startWaveBtn = document.getElementById('start-wave-btn');
const towerBtns = document.querySelectorAll('.tower-btn');
const gameOverScreen = document.getElementById('game-over-screen');
const victoryScreen = document.getElementById('victory-screen');
const restartBtn = document.getElementById('restart-btn');
const nextLevelBtn = document.getElementById('next-level-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const levelSelectScreen = document.getElementById('level-select-screen');
const levelButtonsContainer = document.getElementById('level-buttons');
const failMenuBtn = document.getElementById('fail-menu-btn');
const winMenuBtn = document.getElementById('win-menu-btn');

// Upgrade Menu Elements
const buildMenu = document.getElementById('build-menu');
const upgradeMenu = document.getElementById('upgrade-menu');
const selectedTowerStats = document.getElementById('selected-tower-stats');
const upgradeBtn = document.getElementById('upgrade-btn');
const sellBtn = document.getElementById('sell-btn');
const closeUpgradeBtn = document.getElementById('close-upgrade-btn');
const upgradeCostDisplay = document.getElementById('upgrade-cost');
const sellPriceDisplay = document.getElementById('sell-price');

// Game State
let lives = 50;
let credits = 300;
let wave = 0;
let isWaveActive = false;
let gameOver = false;
let lastTime = 0;

// Entities
let towers = [];
let enemies = [];
let projectiles = [];
let particles = [];
let floatingTexts = [];

// Tower Selection & Upgrading
let selectedTowerType = null;
let selectedTowerForUpgrade = null;
const TOWER_SPECS = {
    basic: { cost: 50, range: 120, damage: 25, fireRate: 800, color: '#3b82f6', projSpeed: 5, shape: 'square' },
    sniper: { cost: 100, range: 350, damage: 120, fireRate: 2500, color: '#f59e0b', projSpeed: 10, shape: 'diamond' },
    rapid: { cost: 150, range: 90, damage: 10, fireRate: 200, color: '#10b981', projSpeed: 4, shape: 'circle' },
    frost: { cost: 120, range: 150, damage: 5, fireRate: 1000, color: '#0ea5e9', projSpeed: 6, shape: 'triangle', isFrost: true },
    blast: { cost: 200, range: 250, damage: 60, fireRate: 3000, color: '#f43f5e', projSpeed: 3, shape: 'hexagon', splashRadius: 100 },
    generator: { cost: 150, range: 0, damage: 0, fireRate: 2000, color: '#fbbf24', projSpeed: 0, shape: 'star', isGenerator: true, genAmount: 15 }
};

// Levels Configuration
const LEVELS = [
    {
        path: [
            {x: -30, y: 150}, {x: 300, y: 150}, {x: 300, y: 450}, {x: 600, y: 450}, {x: 600, y: 250}, {x: 830, y: 250}
        ],
        waves: [
            { count: 10, hp: 40, speed: 1.5, spawnRate: 1500, reward: 5, color: '#ec4899' },
            { count: 15, hp: 60, speed: 1.8, spawnRate: 1200, reward: 5, color: '#d946ef' },
            { count: 20, hp: 90, speed: 2.0, spawnRate: 1000, reward: 6, color: '#8b5cf6' },
            { count: 25, hp: 150, speed: 2.2, spawnRate: 800, reward: 7, color: '#6366f1' },
            { count: 35, hp: 250, speed: 2.5, spawnRate: 600, reward: 8, color: '#ef4444' }
        ]
    },
    {
        path: [
            {x: 400, y: -30}, {x: 400, y: 200}, {x: 150, y: 200}, {x: 150, y: 400}, {x: 650, y: 400}, {x: 650, y: 100}, {x: 830, y: 100}
        ],
        waves: [
            { count: 15, hp: 50, speed: 1.6, spawnRate: 1400, reward: 5, color: '#10b981' },
            { count: 20, hp: 80, speed: 1.8, spawnRate: 1100, reward: 5, color: '#059669' },
            { count: 25, hp: 120, speed: 2.2, spawnRate: 900, reward: 6, color: '#047857' },
            { count: 35, hp: 180, speed: 2.4, spawnRate: 700, reward: 7, color: '#064e3b' },
            { count: 50, hp: 300, speed: 2.8, spawnRate: 500, reward: 8, color: '#022c22' }
        ]
    },
    {
        path: [
            {x: -30, y: 500}, {x: 200, y: 500}, {x: 200, y: 150}, {x: 500, y: 150}, {x: 500, y: 500}, {x: 700, y: 500}, {x: 700, y: 250}, {x: 830, y: 250}
        ],
        waves: [
            { count: 20, hp: 70, speed: 1.8, spawnRate: 1200, reward: 5, color: '#f59e0b' },
            { count: 30, hp: 100, speed: 2.0, spawnRate: 1000, reward: 5, color: '#d97706' },
            { count: 40, hp: 150, speed: 2.4, spawnRate: 800, reward: 6, color: '#b45309' },
            { count: 50, hp: 220, speed: 2.6, spawnRate: 600, reward: 7, color: '#92400e' },
            { count: 70, hp: 400, speed: 3.0, spawnRate: 400, reward: 8, color: '#78350f' }
        ]
    }
];

let maxLevelUnlocked = parseInt(localStorage.getItem('neonDefenseMaxLevel')) || 0;
let currentLevel = 0;
let WAVES = LEVELS[currentLevel].waves;
let PATH = LEVELS[currentLevel].path;

let currentWaveData = null;
let enemiesSpawned = 0;
let timeSinceLastSpawn = 0;
const PATH_WIDTH = 40;

// Events
startWaveBtn.addEventListener('click', startWave);
restartBtn.addEventListener('click', resetGame);
fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.getElementById('game-container').requestFullscreen().catch(err => {
            console.warn(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
});
nextLevelBtn.addEventListener('click', () => {
    currentLevel++;
    if (currentLevel >= LEVELS.length) {
        currentLevel = 0; // Loop back to start or handle end of game
    }
    WAVES = LEVELS[currentLevel].waves;
    PATH = LEVELS[currentLevel].path;
    resetGame();
});

function showLevelSelect() {
    gameOverScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden');
    levelSelectScreen.classList.remove('hidden');
    
    levelButtonsContainer.innerHTML = '';
    for (let i = 0; i < LEVELS.length; i++) {
        const btn = document.createElement('button');
        btn.textContent = `Sector ${i + 1}`;
        if (i <= maxLevelUnlocked) {
            btn.className = 'level-btn';
            btn.onclick = () => {
                currentLevel = i;
                WAVES = LEVELS[currentLevel].waves;
                PATH = LEVELS[currentLevel].path;
                levelSelectScreen.classList.add('hidden');
                resetGame();
            };
        } else {
            btn.className = 'level-btn locked';
            btn.textContent += ' (LOCKED)';
        }
        levelButtonsContainer.appendChild(btn);
    }
}

failMenuBtn.addEventListener('click', showLevelSelect);
winMenuBtn.addEventListener('click', showLevelSelect);

towerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (gameOver) return;
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const type = btn.dataset.type;
        const cost = TOWER_SPECS[type].cost;
        if (credits >= cost) {
            towerBtns.forEach(b => b.classList.remove('selected'));
            if (selectedTowerType !== type) {
                btn.classList.add('selected');
                selectedTowerType = type;
                closeUpgradeMenu();
                SoundEffects.selectTower();
            } else {
                selectedTowerType = null;
            }
        } else {
            SoundEffects.error();
        }
    });
});

canvas.addEventListener('click', (e) => {
    if (gameOver) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    if (selectedTowerType) {
        placeTower(x, y);
    } else {
        // Check for tower click
        let clickedTower = null;
        for (let t of towers) {
            if (getDistance(x, y, t.x, t.y) < 20) {
                clickedTower = t;
                break;
            }
        }
        
        if (clickedTower) {
            selectedTowerForUpgrade = clickedTower;
            showUpgradeMenu();
            SoundEffects.selectTower();
            return;
        }

        // Handle click on enemy
        for (let i = enemies.length - 1; i >= 0; i--) {
            let enemy = enemies[i];
            if (getDistance(x, y, enemy.x, enemy.y) < enemy.size + 15) {
                enemy.hp -= 25;
                credits += 2;
                updateUI();
                floatingTexts.push(new FloatingText(enemy.x, enemy.y - 15, "-25 / +2¢", "#fbbf24"));
                createParticles(enemy.x, enemy.y, '#ffffff', 5);
                SoundEffects.clickEnemy();
                
                if (enemy.hp <= 0) {
                    credits += enemy.reward;
                    updateUI();
                    createParticles(enemy.x, enemy.y, enemy.color, 15);
                    enemies.splice(i, 1);
                    SoundEffects.explosion();
                }
                break; // only hit one per click
            }
        }
    }
});

let mouseX = -1000;
let mouseY = -1000;

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouseX = (e.clientX - rect.left) * scaleX;
    mouseY = (e.clientY - rect.top) * scaleY;
});

canvas.addEventListener('mouseleave', () => {
    mouseX = -1000;
    mouseY = -1000;
});

function updateUI() {
    livesDisplay.textContent = lives;
    creditsDisplay.textContent = credits;
    waveDisplay.textContent = wave > 0 ? wave : 1;
    
    towerBtns.forEach(btn => {
        const cost = TOWER_SPECS[btn.dataset.type].cost;
        if (credits < cost) {
            btn.classList.add('disabled');
        } else {
            btn.classList.remove('disabled');
        }
    });
    
    if (selectedTowerForUpgrade) {
        updateUpgradeUI();
    }
}

function showUpgradeMenu() {
    buildMenu.classList.add('hidden');
    upgradeMenu.classList.remove('hidden');
    updateUpgradeUI();
}

function closeUpgradeMenu() {
    selectedTowerForUpgrade = null;
    buildMenu.classList.remove('hidden');
    upgradeMenu.classList.add('hidden');
}

function updateUpgradeUI() {
    if (!selectedTowerForUpgrade) return;
    const t = selectedTowerForUpgrade;
    const cost = Math.floor(t.baseCost * Math.pow(1.5, t.level));
    const sellPrice = Math.floor(t.totalSpent * 0.5);
    
    upgradeCostDisplay.textContent = cost;
    sellPriceDisplay.textContent = sellPrice;
    
    let statsHtml = `
        <h3 style="color:${t.color}; margin-bottom:10px;">${t.type.toUpperCase()} LVL ${t.level}</h3>
        <p style="margin-bottom:4px">Damage: ${t.damage.toFixed(1)}</p>
        <p style="margin-bottom:4px">Range: ${t.range.toFixed(0)}</p>
        <p style="margin-bottom:4px">Fire Rate: ${(1000/t.fireRate).toFixed(1)}/s</p>
    `;
    if (t.isGenerator) statsHtml += `<p style="margin-bottom:4px">Income: ${t.genAmount}</p>`;
    
    selectedTowerStats.innerHTML = statsHtml;
    
    if (credits < cost) upgradeBtn.classList.add('disabled');
    else upgradeBtn.classList.remove('disabled');
}

upgradeBtn.addEventListener('click', () => {
    if (!selectedTowerForUpgrade) return;
    const t = selectedTowerForUpgrade;
    const cost = Math.floor(t.baseCost * Math.pow(1.5, t.level));
    if (credits >= cost) {
        credits -= cost;
        t.totalSpent += cost;
        t.level++;
        t.damage *= 1.2;
        t.range *= 1.1;
        t.fireRate *= 0.9;
        if (t.isGenerator) t.genAmount = Math.floor(t.genAmount * 1.5);
        
        SoundEffects.placeTower();
        createParticles(t.x, t.y, t.color, 20);
        updateUI();
    } else {
        SoundEffects.error();
    }
});

sellBtn.addEventListener('click', () => {
    if (!selectedTowerForUpgrade) return;
    const t = selectedTowerForUpgrade;
    credits += Math.floor(t.totalSpent * 0.5);
    towers.splice(towers.indexOf(t), 1);
    createParticles(t.x, t.y, '#ffffff', 20);
    SoundEffects.hit();
    updateUI();
    closeUpgradeMenu();
});

closeUpgradeBtn.addEventListener('click', closeUpgradeMenu);

function resetGame() {
    lives = 50;
    credits = 300;
    wave = 0;
    isWaveActive = false;
    gameOver = false;
    towers = [];
    enemies = [];
    projectiles = [];
    particles = [];
    floatingTexts = [];
    selectedTowerType = null;
    closeUpgradeMenu();
    towerBtns.forEach(b => b.classList.remove('selected'));
    
    gameOverScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden');
    startWaveBtn.disabled = false;
    updateUI();
}

function startWave() {
    if (isWaveActive || wave >= WAVES.length) return;
    if(audioCtx.state === 'suspended') audioCtx.resume();
    SoundEffects.waveStart();
    wave++;
    currentWaveData = WAVES[wave - 1];
    enemiesSpawned = 0;
    timeSinceLastSpawn = currentWaveData.spawnRate;
    isWaveActive = true;
    startWaveBtn.disabled = true;
    updateUI();
}

// Distance helper
function getDistance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

// Point to line segment distance
function distToSegmentSquared(p, v, w) {
    let l2 = getDistance(v.x, v.y, w.x, w.y) ** 2;
    if (l2 === 0) return getDistance(p.x, p.y, v.x, v.y) ** 2;
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return getDistance(p.x, p.y, v.x + t * (w.x - v.x), v.y + t * (w.y - v.y)) ** 2;
}

function distToSegment(p, v, w) {
    return Math.sqrt(distToSegmentSquared(p, v, w));
}

function canPlaceTower(x, y) {
    // Check path intersection
    const p = {x, y};
    for (let i = 0; i < PATH.length - 1; i++) {
        if (distToSegment(p, PATH[i], PATH[i+1]) < PATH_WIDTH / 2 + 20) {
            return false;
        }
    }
    
    // Check other towers
    for (let t of towers) {
        if (getDistance(x, y, t.x, t.y) < 40) {
            return false;
        }
    }
    return true;
}

function placeTower(x, y) {
    if (!canPlaceTower(x, y)) {
        SoundEffects.error();
        return;
    }
    
    const spec = TOWER_SPECS[selectedTowerType];
    if (credits >= spec.cost) {
        credits -= spec.cost;
        towers.push(new Tower(x, y, selectedTowerType, spec));
        selectedTowerType = null;
        towerBtns.forEach(b => b.classList.remove('selected'));
        updateUI();
        createParticles(x, y, spec.color, 15);
        SoundEffects.placeTower();
    } else {
        SoundEffects.error();
    }
}

class Tower {
    constructor(x, y, type, spec) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.range = spec.range;
        this.damage = spec.damage;
        this.fireRate = spec.fireRate;
        this.color = spec.color;
        this.projSpeed = spec.projSpeed;
        this.shape = spec.shape;
        this.isFrost = spec.isFrost || false;
        this.splashRadius = spec.splashRadius || 0;
        this.isGenerator = spec.isGenerator || false;
        this.genAmount = spec.genAmount || 0;
        this.timeSinceFired = 0;
        this.angle = 0;
        this.level = 1;
        this.baseCost = spec.cost;
        this.totalSpent = spec.cost;
    }

    update(dt) {
        if (this.isGenerator) {
            this.angle += 0.02 * (dt/16.6); // keep spinning visually
            if (isWaveActive) {
                this.timeSinceFired += dt;
                if (this.timeSinceFired >= this.fireRate) {
                    this.timeSinceFired = 0;
                    credits += this.genAmount;
                    updateUI();
                    floatingTexts.push(new FloatingText(this.x, this.y - 20, `+${this.genAmount}¢`, this.color));
                    SoundEffects.generateCredit();
                }
            } else {
                this.timeSinceFired = 0; // reset cooldown if wave ends
            }
            return;
        }

        this.timeSinceFired += dt;

        let target = null;
        let minTime = Infinity;

        // Find enemy closest to end (or simple distance, but closest to end is better)
        for (let e of enemies) {
            if (getDistance(this.x, this.y, e.x, e.y) <= this.range) {
                // simple target selection: closest to base
                let progress = e.pathIndex * 1000 + e.progress;
                let timeToReach = 10000 - progress; // hacky priority
                if (timeToReach < minTime) {
                    minTime = timeToReach;
                    target = e;
                }
            }
        }

        if (target) {
            this.angle = Math.atan2(target.y - this.y, target.x - this.x);
            if (this.timeSinceFired >= this.fireRate) {
                this.timeSinceFired = 0;
                projectiles.push(new Projectile(this.x, this.y, target, this.damage, this.projSpeed, this.color, this.isFrost, this.splashRadius));
                
                if (this.type === 'basic') SoundEffects.shootBasic();
                else if (this.type === 'sniper') SoundEffects.shootSniper();
                else if (this.type === 'rapid') SoundEffects.shootRapid();
                else if (this.type === 'frost') SoundEffects.shootFrost();
                else if (this.type === 'blast') SoundEffects.shootBlast();
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // Range indicator (subtle)
        ctx.beginPath();
        ctx.arc(0, 0, this.range, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${parseInt(this.color.slice(1,3), 16)}, ${parseInt(this.color.slice(3,5), 16)}, ${parseInt(this.color.slice(5,7), 16)}, 0.05)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${parseInt(this.color.slice(1,3), 16)}, ${parseInt(this.color.slice(3,5), 16)}, ${parseInt(this.color.slice(5,7), 16)}, 0.2)`;
        ctx.stroke();

        ctx.rotate(this.angle);

        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;

        if (this.shape === 'square') {
            ctx.fillRect(-12, -12, 24, 24);
            ctx.strokeRect(-12, -12, 24, 24);
            ctx.fillStyle = this.color;
            ctx.fillRect(0, -4, 20, 8); // barrel
        } else if (this.shape === 'diamond') {
            ctx.beginPath();
            ctx.moveTo(15, 0);
            ctx.lineTo(0, 15);
            ctx.lineTo(-15, 0);
            ctx.lineTo(0, -15);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = this.color;
            ctx.fillRect(0, -2, 30, 4);
        } else if (this.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI*2);
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(10, 0, 5, 0, Math.PI*2);
            ctx.fill();
        } else if (this.shape === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(15, 0); ctx.lineTo(-10, 12); ctx.lineTo(-10, -12);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
        } else if (this.shape === 'hexagon') {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                ctx.lineTo(12 * Math.cos(i * Math.PI / 3), 12 * Math.sin(i * Math.PI / 3));
            }
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = this.color;
            ctx.fillRect(0, -6, 20, 12);
        } else if (this.shape === 'star') {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                ctx.lineTo(15 * Math.cos(i * 4 * Math.PI / 5), 15 * Math.sin(i * 4 * Math.PI / 5));
            }
            ctx.closePath();
            ctx.fill(); ctx.stroke();
        }
        
        ctx.restore();
    }
}

class Enemy {
    constructor(waveData) {
        this.hp = waveData.hp;
        this.maxHp = waveData.hp;
        this.baseSpeed = waveData.speed;
        this.speed = waveData.speed;
        this.reward = waveData.reward;
        this.color = waveData.color;
        this.pathIndex = 0;
        this.x = PATH[0].x;
        this.y = PATH[0].y;
        this.progress = 0; // distance towards next waypoint
        this.size = 12;
        this.slowTimer = 0;
    }
    
    applySlow(duration) {
        this.slowTimer = duration;
    }

    update(dt) {
        if (this.slowTimer > 0) {
            this.slowTimer -= dt;
            this.speed = this.baseSpeed * 0.5;
            this.color = '#7dd3fc'; // frost color
        } else {
            this.speed = this.baseSpeed;
            this.color = currentWaveData.color;
        }
        if (this.pathIndex >= PATH.length - 1) {
            // Reached end
            lives--;
            updateUI();
            if (lives <= 0 && !gameOver) {
                gameOver = true;
                gameOverScreen.classList.remove('hidden');
                SoundEffects.gameOver();
            }
            return false; // remove
        }

        const p1 = PATH[this.pathIndex];
        const p2 = PATH[this.pathIndex + 1];
        const dist = getDistance(p1.x, p1.y, p2.x, p2.y);
        
        // calculate movement for this frame (normalized to 60fps approx)
        const moveAmt = this.speed * (dt / 16.6);
        this.progress += moveAmt;

        if (this.progress >= dist) {
            this.progress -= dist;
            this.pathIndex++;
            if (this.pathIndex >= PATH.length - 1) {
                lives--;
                updateUI();
                if (lives <= 0 && !gameOver) {
                    gameOver = true;
                    gameOverScreen.classList.remove('hidden');
                    SoundEffects.gameOver();
                }
                return false;
            }
        }

        const np1 = PATH[this.pathIndex];
        const np2 = PATH[this.pathIndex + 1];
        const ndist = getDistance(np1.x, np1.y, np2.x, np2.y);
        const ratio = this.progress / ndist;
        
        this.x = np1.x + (np2.x - np1.x) * ratio;
        this.y = np1.y + (np2.y - np1.y) * ratio;

        return true;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        
        // draw hexagon
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            ctx.lineTo(this.size * Math.cos(i * Math.PI / 3), this.size * Math.sin(i * Math.PI / 3));
        }
        ctx.closePath();
        ctx.fill();

        // HP bar
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-15, -20, 30, 4);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(-15, -20, 30 * (this.hp / this.maxHp), 4);
        
        ctx.restore();
    }
}

class Projectile {
    constructor(x, y, target, damage, speed, color, isFrost, splashRadius) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = speed;
        this.color = color;
        this.isFrost = isFrost;
        this.splashRadius = splashRadius;
    }

    update(dt) {
        // if target is dead, just move towards last known or vanish (we'll vanish for simplicity)
        if (!enemies.includes(this.target)) return false;

        const moveAmt = this.speed * (dt / 16.6);
        const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
        
        this.x += Math.cos(angle) * moveAmt;
        this.y += Math.sin(angle) * moveAmt;

        if (getDistance(this.x, this.y, this.target.x, this.target.y) < this.target.size + 5) {
            // Apply damage and effects
            let targetsHit = [this.target];
            
            if (this.splashRadius > 0) {
                targetsHit = enemies.filter(e => getDistance(this.x, this.y, e.x, e.y) <= this.splashRadius);
                // Draw explosion ring
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.splashRadius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${parseInt(this.color.slice(1,3), 16)}, ${parseInt(this.color.slice(3,5), 16)}, ${parseInt(this.color.slice(5,7), 16)}, 0.3)`;
                ctx.fill();
            }

            targetsHit.forEach(e => {
                e.hp -= this.damage;
                if (this.isFrost) e.applySlow(2000);
                
                if (e.hp <= 0 && enemies.includes(e)) {
                    credits += e.reward;
                    updateUI(); // Fix: Update the UI after adding credits
                    createParticles(e.x, e.y, e.color, 15);
                    enemies.splice(enemies.indexOf(e), 1);
                }
            });
            
            createParticles(this.target.x, this.target.y, this.color, 5);
            SoundEffects.hit();
            if (targetsHit.some(e => e.hp <= 0)) SoundEffects.explosion();
            
            return false;
        }
        return true;
    }

    draw(ctx) {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.decay = Math.random() * 0.05 + 0.02;
    }
    
    update(dt) {
        this.x += this.vx * (dt / 16.6);
        this.y += this.vy * (dt / 16.6);
        this.life -= this.decay * (dt / 16.6);
        return this.life > 0;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
    }
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1.0;
        this.vy = -0.5;
    }
    update(dt) {
        this.y += this.vy * (dt / 16.6);
        this.life -= 0.02 * (dt / 16.6);
        return this.life > 0;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.font = 'bold 16px Outfit';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.color;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

function drawPath() {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(PATH[0].x, PATH[0].y);
    for (let i = 1; i < PATH.length; i++) {
        ctx.lineTo(PATH[i].x, PATH[i].y);
    }
    ctx.lineWidth = PATH_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
    ctx.stroke();
    
    // Path center line
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.stroke();
    ctx.restore();
}

function gameLoop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
    }
    for (let i = 0; i < canvas.height; i += 40) {
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
    }
    ctx.stroke();

    drawPath();

    if (!gameOver) {
        // Spawning logic
        if (isWaveActive) {
            timeSinceLastSpawn += dt;
            if (enemiesSpawned < currentWaveData.count && timeSinceLastSpawn >= currentWaveData.spawnRate) {
                enemies.push(new Enemy(currentWaveData));
                enemiesSpawned++;
                timeSinceLastSpawn = 0;
            }
            
            // Check wave end
            if (enemiesSpawned >= currentWaveData.count && enemies.length === 0) {
                isWaveActive = false;
                startWaveBtn.disabled = false;
                if (wave >= WAVES.length) {
                    victoryScreen.classList.remove('hidden');
                    gameOver = true;
                    SoundEffects.victory();
                    if (currentLevel === maxLevelUnlocked && maxLevelUnlocked < LEVELS.length - 1) {
                        maxLevelUnlocked++;
                        localStorage.setItem('neonDefenseMaxLevel', maxLevelUnlocked);
                    }
                }
            }
        }

        // Update entities
        towers.forEach(t => t.update(dt));
        
        for (let i = enemies.length - 1; i >= 0; i--) {
            if (!enemies[i].update(dt)) {
                enemies.splice(i, 1);
            }
        }

        for (let i = projectiles.length - 1; i >= 0; i--) {
            if (!projectiles[i].update(dt)) {
                projectiles.splice(i, 1);
            }
        }
        
        for (let i = particles.length - 1; i >= 0; i--) {
            if (!particles[i].update(dt)) {
                particles.splice(i, 1);
            }
        }
        
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            if (!floatingTexts[i].update(dt)) {
                floatingTexts.splice(i, 1);
            }
        }
    }

    // Draw entities
    towers.forEach(t => t.draw(ctx));
    enemies.forEach(e => e.draw(ctx));
    projectiles.forEach(p => p.draw(ctx));
    particles.forEach(p => p.draw(ctx));
    floatingTexts.forEach(ft => ft.draw(ctx));

    // Draw placement preview or upgrade selection
    if (selectedTowerType && !gameOver && mouseX >= 0 && mouseY >= 0 && mouseX <= canvas.width && mouseY <= canvas.height) {
        const spec = TOWER_SPECS[selectedTowerType];
        const valid = canPlaceTower(mouseX, mouseY) && credits >= spec.cost;
        
        ctx.save();
        ctx.translate(mouseX, mouseY);
        
        // Range indicator
        ctx.beginPath();
        ctx.arc(0, 0, spec.range, 0, Math.PI * 2);
        ctx.fillStyle = valid ? `rgba(${parseInt(spec.color.slice(1,3), 16)}, ${parseInt(spec.color.slice(3,5), 16)}, ${parseInt(spec.color.slice(5,7), 16)}, 0.15)` : 'rgba(239, 68, 68, 0.2)';
        ctx.fill();
        ctx.strokeStyle = valid ? `rgba(${parseInt(spec.color.slice(1,3), 16)}, ${parseInt(spec.color.slice(3,5), 16)}, ${parseInt(spec.color.slice(5,7), 16)}, 0.5)` : 'rgba(239, 68, 68, 0.8)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Tower preview
        ctx.globalAlpha = 0.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = valid ? spec.color : '#ef4444';
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = valid ? spec.color : '#ef4444';
        ctx.lineWidth = 2;

        if (spec.shape === 'square') {
            ctx.fillRect(-12, -12, 24, 24);
            ctx.strokeRect(-12, -12, 24, 24);
        } else if (spec.shape === 'diamond') {
            ctx.beginPath();
            ctx.moveTo(15, 0); ctx.lineTo(0, 15); ctx.lineTo(-15, 0); ctx.lineTo(0, -15);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
        } else if (spec.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI*2);
            ctx.fill(); ctx.stroke();
        } else if (spec.shape === 'triangle') {
            ctx.beginPath();
            ctx.moveTo(15, 0); ctx.lineTo(-10, 12); ctx.lineTo(-10, -12);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
        } else if (spec.shape === 'hexagon') {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) ctx.lineTo(12 * Math.cos(i * Math.PI / 3), 12 * Math.sin(i * Math.PI / 3));
            ctx.closePath();
            ctx.fill(); ctx.stroke();
        } else if (spec.shape === 'star') {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                ctx.lineTo(15 * Math.cos(i * 4 * Math.PI / 5), 15 * Math.sin(i * 4 * Math.PI / 5));
            }
            ctx.closePath();
            ctx.fill(); ctx.stroke();
        }
        
        ctx.restore();
    } else if (selectedTowerForUpgrade && !gameOver) {
        // Draw selection ring for upgrade
        ctx.save();
        ctx.translate(selectedTowerForUpgrade.x, selectedTowerForUpgrade.y);
        
        // Show true range
        ctx.beginPath();
        ctx.arc(0, 0, selectedTowerForUpgrade.range, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${parseInt(selectedTowerForUpgrade.color.slice(1,3), 16)}, ${parseInt(selectedTowerForUpgrade.color.slice(3,5), 16)}, ${parseInt(selectedTowerForUpgrade.color.slice(5,7), 16)}, 0.1)`;
        ctx.fill();
        
        // Selection ring
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
    }

    requestAnimationFrame(gameLoop);
}

// Init
gameOver = true;
showLevelSelect();
updateUI();
requestAnimationFrame(gameLoop);
