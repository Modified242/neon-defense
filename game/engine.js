// Pure game simulation: no DOM, no canvas, no audio. Side effects are reported through events,
// which lets the same code run in the browser and in a headless balance simulation.
import {
    TOWER_SPECS, LEVELS, PATH_WIDTH, CANVAS_W, CANVAS_H, TOWER_RADIUS, FRAME_MS, MAX_DT,
    STARTING_LIVES, STARTING_CREDITS, SELL_REFUND, MAX_TOWER_LEVEL, UPGRADE, CLICK, FROST_COLOR,
    waveClearBonus, ENDLESS, BOSS_MINIONS, BOSS_LEAK_COST,
} from './config.js';

const MAX_PARTICLES = 500;

export function dist(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
}

function distToSegment(px, py, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) return dist(px, py, a.x, a.y);
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l2));
    return dist(px, py, a.x + t * dx, a.y + t * dy);
}

export class Path {
    constructor(points) {
        this.points = points;
        this.cum = [0];
        for (let i = 1; i < points.length; i++) {
            this.cum.push(this.cum[i - 1] + dist(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y));
        }
        this.length = this.cum[this.cum.length - 1];
    }

    /** Position at distance `d` along the path. `seg` is a search hint (segments only move forward). */
    pointAt(d, seg = 0) {
        while (seg < this.points.length - 2 && d > this.cum[seg + 1]) seg++;
        const a = this.points[seg], b = this.points[seg + 1];
        const segLen = this.cum[seg + 1] - this.cum[seg];
        const t = segLen > 0 ? Math.min(1, (d - this.cum[seg]) / segLen) : 0;
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, seg };
    }

    distanceTo(x, y) {
        let min = Infinity;
        for (let i = 0; i < this.points.length - 1; i++) {
            min = Math.min(min, distToSegment(x, y, this.points[i], this.points[i + 1]));
        }
        return min;
    }
}

export class Tower {
    constructor(type, x, y) {
        const s = TOWER_SPECS[type];
        this.type = type;
        this.spec = s;
        this.x = x;
        this.y = y;
        this.name = s.name;
        this.color = s.color;
        this.shape = s.shape;
        this.range = s.range;
        this.damage = s.damage;
        this.fireRate = s.fireRate;
        this.projSpeed = s.projSpeed;
        this.splashRadius = s.splashRadius || 0;
        this.isFrost = !!s.isFrost;
        this.isLaser = !!s.isLaser;
        this.isSupport = !!s.isSupport;
        this.fireRateBuff = s.fireRateBuff || 0;
        this.slowFactor = s.slowFactor || 1;
        this.slowDuration = s.slowDuration || 0;
        this.isGenerator = !!s.isGenerator;
        this.genAmount = s.genAmount || 0;
        this.level = 1;
        this.totalSpent = s.cost;
        this.cooldown = 0;
        this.angle = -Math.PI / 2;
        this.targetingMode = 'first'; // 'first', 'strong', 'weak', 'close'
        this.recoil = 0;
        this.isFiring = false;
        this.laserTarget = null;
        this.game = null;
    }

    get isMaxLevel() { return this.level >= MAX_TOWER_LEVEL; }

    get upgradeCost() {
        if (this.isMaxLevel) return null;
        return Math.round(this.spec.cost * UPGRADE.costBase * UPGRADE.costGrowth ** (this.level - 1));
    }

    get sellValue() { return Math.floor(this.totalSpent * SELL_REFUND); }

    get effectiveFireRate() {
        if (!this.game || this.isSupport || this.isGenerator) return this.fireRate;
        let buff = 0;
        for (const t of this.game.towers) {
            if (t.isSupport && dist(this.x, this.y, t.x, t.y) <= t.range) {
                buff += t.fireRateBuff;
            }
        }
        return this.fireRate / (1 + buff);
    }

    get dps() { return this.effectiveFireRate > 0 ? this.damage * 1000 / this.effectiveFireRate : 0; }

    applyUpgrade() {
        this.level++;
        if (this.isGenerator) {
            this.genAmount = Math.round(this.genAmount * UPGRADE.genAmount);
            return;
        }
        if (this.isSupport) {
            this.fireRateBuff += UPGRADE.supportBuff;
            this.range *= UPGRADE.range;
            return;
        }
        this.damage *= UPGRADE.damage;
        this.fireRate *= UPGRADE.fireRate;
        this.range *= UPGRADE.range;
        if (this.isFrost) this.slowDuration += UPGRADE.slowDuration;
    }

    pickTarget(enemies) {
        let best = null, bestScore = -Infinity;
        for (const e of enemies) {
            if (!e.alive || dist(this.x, this.y, e.x, e.y) > this.range) continue;
            let score = 0;
            if (this.splashRadius) {
                let n = 0;
                for (const o of enemies) if (o.alive && dist(e.x, e.y, o.x, o.y) <= this.splashRadius) n++;
                score = n * 1e5 + e.distance;
            } else {
                if (this.targetingMode === 'first') score = e.distance;
                else if (this.targetingMode === 'strong') score = e.hp;
                else if (this.targetingMode === 'weak') score = -e.hp;
                else if (this.targetingMode === 'close') score = -dist(this.x, this.y, e.x, e.y);
            }
            if (this.isFrost && e.slowTimer > 400) score -= 1e6;
            
            if (score > bestScore) { bestScore = score; best = e; }
        }
        return best;
    }

    update(dt, game) {
        if (this.isSupport) {
            this.angle += 0.01 * (dt / FRAME_MS);
            return;
        }
        if (this.isGenerator) {
            this.angle += 0.02 * (dt / FRAME_MS);
            return;
        }
        
        if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt / 150);
        this.cooldown -= dt;
        
        const target = this.pickTarget(game.enemies);
        this.isFiring = false;
        this.laserTarget = null;
        
        if (!target) {
            if (this.cooldown < 0) this.cooldown = 0; // don't bank shots while idle
            return;
        }
        
        this.angle = Math.atan2(target.y - this.y, target.x - this.x);
        
        if (this.isLaser) {
            this.isFiring = true;
            this.laserTarget = target;
            if (this.cooldown <= 0) {
                this.cooldown += this.effectiveFireRate;
                game.damageEnemy(target, this.damage);
                game.addParticles(target.x, target.y, this.color, 1);
            }
            return;
        }
        
        if (this.cooldown <= 0) {
            this.cooldown += this.effectiveFireRate; // keep remainder so fire rate isn't quantized to frames
            game.projectiles.push(new Projectile(this, target));
            this.recoil = 1;
            game.emit('sound', 'shoot', this.type);
        }
    }
}

export class Enemy {
    constructor(waveData, path) {
        this.hp = waveData.hp;
        this.maxHp = waveData.hp;
        this.baseSpeed = waveData.speed;
        this.reward = waveData.reward;
        this.baseColor = waveData.color;
        this.type = waveData.type || 'normal';
        this.size = this.type === 'boss' ? 26 : this.type === 'tank' ? 16 : this.type === 'swarm' ? 8 : 12;
        this.distance = 0;
        this.seg = 0;
        this.slowTimer = 0;
        this.slowFactor = 1;
        this.alive = true;
        const p = path.pointAt(0);
        this.x = p.x;
        this.y = p.y;
    }

    get color() { return this.slowTimer > 0 ? FROST_COLOR : this.baseColor; }

    get speed() { return this.slowTimer > 0 ? this.baseSpeed * this.slowFactor : this.baseSpeed; }

    applySlow(factor, duration) {
        // Strongest slow wins; a weaker/shorter hit never shortens an existing slow.
        this.slowFactor = this.slowTimer > 0 ? Math.min(this.slowFactor, factor) : factor;
        this.slowTimer = Math.max(this.slowTimer, duration);
    }

    /** Returns false once the enemy has reached the end of the path. */
    update(dt, path) {
        const speed = this.speed;
        if (this.slowTimer > 0) this.slowTimer -= dt;
        this.distance += speed * (dt / FRAME_MS);
        if (this.distance >= path.length) return false;
        const p = path.pointAt(this.distance, this.seg);
        this.x = p.x;
        this.y = p.y;
        this.seg = p.seg;
        return true;
    }
}

export class Projectile {
    constructor(tower, target) {
        this.x = tower.x;
        this.y = tower.y;
        this.target = target;
        this.tx = target.x;
        this.ty = target.y;
        this.damage = tower.damage;
        this.speed = tower.projSpeed;
        this.color = tower.color;
        this.isFrost = tower.isFrost;
        this.slowFactor = tower.slowFactor;
        this.slowDuration = tower.slowDuration;
        this.splashRadius = tower.splashRadius;
        this.history = [];
    }

    /** Returns false when the projectile is spent. */
    update(dt, game) {
        if (!this.target.alive && !this.splashRadius) {
            // Target died mid-flight: redirect to the nearest enemy instead of wasting the shot.
            this.target = game.nearestEnemy(this.x, this.y, 120) || this.target;
        }
        if (this.target.alive) {
            this.tx = this.target.x;
            this.ty = this.target.y;
        }

        this.history.push({ x: this.x, y: this.y });
        if (this.history.length > 6) this.history.shift();

        const step = this.speed * (dt / FRAME_MS);
        const d = dist(this.x, this.y, this.tx, this.ty);
        const hitRadius = this.target.alive ? this.target.size : 2;
        if (d <= step + hitRadius) {
            this.x = this.tx;
            this.y = this.ty;
            this.impact(game);
            return false;
        }
        this.x += (this.tx - this.x) / d * step;
        this.y += (this.ty - this.y) / d * step;
        return true;
    }

    impact(game) {
        if (this.splashRadius > 0) {
            // Mortar shells still detonate at the last known position if their target died.
            game.addRing(this.x, this.y, this.splashRadius, this.color);
            for (const e of game.enemies) {
                if (e.alive && dist(this.x, this.y, e.x, e.y) <= this.splashRadius + e.size) {
                    game.damageEnemy(e, this.damage);
                }
            }
        } else if (this.target.alive) {
            if (this.isFrost) this.target.applySlow(this.slowFactor, this.slowDuration);
            game.damageEnemy(this.target, this.damage);
        } else {
            return; // fizzled
        }
        game.addParticles(this.x, this.y, this.color, 5);
        game.emit('sound', 'hit');
    }
}

export class Game {
    constructor(levelIndex, { effects = true, endless = false } = {}) {
        this.levelIndex = levelIndex;
        this.level = LEVELS[levelIndex];
        this.path = new Path(this.level.path);
        this.waves = this.level.waves;
        this.effects = effects;
        this.endless = endless;

        this.lives = STARTING_LIVES;
        this.credits = STARTING_CREDITS;
        this.wave = 0;               // Number of waves started
        this.state = 'building';     // 'building' | 'wave' | 'won' | 'lost'
        this.leaked = 0;

        this.towers = [];
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.floatingTexts = [];
        this.rings = [];
        this.shakeTimer = 0;

        this.waveData = null;
        this.spawned = 0;
        this.spawnTimer = 0;
        this.clickCooldown = 0;
        this.dirty = true;           // UI needs refresh
        this.listeners = {};
    }

    on(event, fn) { (this.listeners[event] ||= []).push(fn); return this; }
    emit(event, ...args) { (this.listeners[event] || []).forEach(fn => fn(...args)); }

    get isOver() { return this.state === 'won' || this.state === 'lost'; }
    get isWaveActive() { return this.state === 'wave'; }
    get totalWaves() { return this.waves.length; }

    // ---------- Player actions ----------

    canPlace(x, y) {
        if (x < TOWER_RADIUS || y < TOWER_RADIUS || x > CANVAS_W - TOWER_RADIUS || y > CANVAS_H - TOWER_RADIUS) return false;
        if (this.path.distanceTo(x, y) < PATH_WIDTH / 2 + TOWER_RADIUS) return false;
        return !this.towers.some(t => dist(x, y, t.x, t.y) < TOWER_RADIUS * 2);
    }

    placeTower(type, x, y) {
        const spec = TOWER_SPECS[type];
        if (this.isOver || !spec || this.credits < spec.cost || !this.canPlace(x, y)) return null;
        this.credits -= spec.cost;
        const tower = new Tower(type, x, y);
        tower.game = this;
        this.towers.push(tower);
        this.addParticles(x, y, spec.color, 15);
        this.dirty = true;
        return tower;
    }

    upgradeTower(tower) {
        const cost = tower.upgradeCost;
        if (this.isOver || cost === null || this.credits < cost) return false;
        this.credits -= cost;
        tower.totalSpent += cost;
        tower.applyUpgrade();
        this.addParticles(tower.x, tower.y, tower.color, 20);
        this.dirty = true;
        return true;
    }

    sellTower(tower) {
        const i = this.towers.indexOf(tower);
        if (this.isOver || i === -1) return false;
        this.credits += tower.sellValue;
        this.towers.splice(i, 1);
        this.addParticles(tower.x, tower.y, '#ffffff', 20);
        this.dirty = true;
        return true;
    }

    towerAt(x, y) {
        return this.towers.find(t => dist(x, y, t.x, t.y) < TOWER_RADIUS) || null;
    }

    /** Keep playing past the last scripted wave (from the victory screen). */
    continueEndless() {
        if (this.state !== 'won') return false;
        this.endless = true;
        this.state = 'building';
        this.dirty = true;
        return true;
    }

    /** Procedural wave N (0-based) past the scripted ones. Scales off the sector's own final waves. */
    endlessWave(n) {
        const scripted = this.waves.filter(w => w.type !== 'boss');
        const last = scripted[scripted.length - 1];
        const hpScale = ENDLESS.hpBase * ENDLESS.hpGrowth ** n;
        if (n % ENDLESS.bossEvery === ENDLESS.bossEvery - 1) {
            const boss = this.waves.find(w => w.type === 'boss') || last;
            return { ...boss, count: 1, hp: Math.round(boss.hp * hpScale * ENDLESS.bossHpMult), reward: Math.round(boss.reward * 1.2) };
        }
        // Cycle through the sector's enemy archetypes (skipping boss slots) so every type keeps showing up.
        const template = scripted[(n - Math.floor((n + 1) / ENDLESS.bossEvery)) % scripted.length];
        const pressure = 1 + n * ENDLESS.countGrowth;
        return {
            ...template,
            count: Math.round(template.count * pressure),
            hp: Math.round(template.hp * (last.hp / template.hp) ** 0.35 * hpScale),
            speed: Math.min(template.speed * (1 + n * 0.01), template.speed + 0.8),
            spawnRate: Math.max(Math.round(template.spawnRate / Math.sqrt(pressure)), 180),
            reward: Math.round(template.reward * (1 + n * ENDLESS.rewardGrowth)),
        };
    }

    startWave() {
        if (this.state !== 'building') return false;

        this.waveData = this.wave < this.waves.length
            ? this.waves[this.wave]
            : this.endlessWave(this.wave - this.waves.length);

        this.wave++;
        this.spawned = 0;
        this.spawnTimer = 0; // first enemy spawns immediately
        this.state = 'wave';
        this.dirty = true;
        return true;
    }

    /** Manually zap an enemy. Returns true if something was hit. */
    clickAt(x, y) {
        if (this.state !== 'wave' || this.clickCooldown > 0) return false;
        let hit = null, best = Infinity;
        for (const e of this.enemies) {
            const d = dist(x, y, e.x, e.y);
            if (e.alive && d < e.size + CLICK.radius && d < best) { best = d; hit = e; }
        }
        if (!hit) return false;
        this.clickCooldown = CLICK.cooldown;
        this.addText(hit.x, hit.y - 15, `-${CLICK.damage}`, '#ffffff');
        this.addParticles(hit.x, hit.y, '#ffffff', 5);
        this.emit('sound', 'clickEnemy');
        this.damageEnemy(hit, CLICK.damage);
        this.enemies = this.enemies.filter(e => e.alive);
        return true;
    }

    // ---------- Simulation ----------

    nearestEnemy(x, y, maxDist = Infinity) {
        let best = null, bestD = maxDist;
        for (const e of this.enemies) {
            if (!e.alive) continue;
            const d = dist(x, y, e.x, e.y);
            if (d < bestD) { bestD = d; best = e; }
        }
        return best;
    }

    damageEnemy(e, amount) {
        if (!e.alive) return;
        e.hp -= amount;
        this.addText(e.x + (Math.random() - 0.5) * 10, e.y - 10 + (Math.random() - 0.5) * 10, amount >= 10 ? Math.round(amount) : amount.toFixed(1), '#f8fafc', 0.6, 11);
        if (e.hp > 0) return;
        e.alive = false;
        this.credits += e.reward;
        this.dirty = true;
        this.addParticles(e.x, e.y, e.color, e.type === 'boss' ? 50 : 15);
        this.shakeTimer = Math.min(this.shakeTimer + (e.type === 'boss' ? 30 : 15), 60);
        this.emit('sound', 'explosion');

        if (e.type === 'boss') {
            for (let i = 0; i < BOSS_MINIONS.count; i++) {
                const swarm = new Enemy({ hp: Math.round(e.maxHp * BOSS_MINIONS.hpFraction), speed: 1.9, reward: BOSS_MINIONS.reward, color: e.baseColor, type: 'swarm' }, this.path);
                swarm.distance = Math.max(0, e.distance - (i * 12));
                const p = this.path.pointAt(swarm.distance);
                swarm.x = p.x;
                swarm.y = p.y;
                swarm.seg = p.seg;
                this.enemies.push(swarm);
            }
            this.addText(e.x, e.y - 30, "BOSS DEFEATED!", '#facc15', 2, 20);
        }
    }

    leak(e) {
        e.alive = false;
        this.leaked++;
        this.lives = Math.max(0, this.lives - (e.type === 'boss' ? BOSS_LEAK_COST : 1));
        this.dirty = true;
        this.emit('sound', 'leak');
        if (this.lives === 0) {
            this.state = 'lost';
            this.emit('defeat');
        }
    }

    finishWave() {
        this.projectiles = [];
        this.dirty = true;

        const bonus = waveClearBonus(this.wave);
        let income = 0;
        for (const t of this.towers) {
            if (!t.isGenerator) continue;
            income += t.genAmount;
            this.addText(t.x, t.y - 20, `+${t.genAmount}¢`, t.color, 1.5, 14);
        }

        this.credits += bonus + income;
        this.state = 'building';
        if (income > 0) this.emit('sound', 'generateCredit');

        if (this.wave === this.waves.length && !this.endless) {
            this.state = 'won';
            this.emit('victory');
        } else {
            this.emit('waveEnd', { wave: this.wave, bonus, income });
        }
    }

    update(rawDt) {
        const dt = Math.min(Math.max(rawDt, 0), MAX_DT);
        this.updateEffects(dt);
        if (this.isOver) return;

        this.clickCooldown -= dt;

        if (this.state === 'wave') {
            this.spawnTimer -= dt;
            while (this.spawned < this.waveData.count && this.spawnTimer <= 0) {
                this.enemies.push(new Enemy(this.waveData, this.path));
                this.spawned++;
                this.spawnTimer += this.waveData.spawnRate;
            }
        }

        for (const e of this.enemies) {
            if (e.alive && !e.update(dt, this.path)) {
                this.leak(e);
                if (this.isOver) return;
            }
        }
        for (const t of this.towers) t.update(dt, this);
        this.projectiles = this.projectiles.filter(p => p.update(dt, this));
        this.enemies = this.enemies.filter(e => e.alive);

        if (this.state === 'wave' && this.spawned >= this.waveData.count && this.enemies.length === 0) {
            this.finishWave();
        }
    }

    // ---------- Visual effects (kept here so they share the sim clock; skipped in headless runs) ----------

    addParticles(x, y, color, count) {
        if (!this.effects) return;
        count = Math.min(count, MAX_PARTICLES - this.particles.length);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 2 + 1;
            this.particles.push({
                x, y, color,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: Math.random() * 0.05 + 0.02,
            });
        }
    }

    addText(x, y, text, color, life = 1, size = 16) {
        if (this.effects) this.floatingTexts.push({ x, y, text, color, life, size });
    }

    addRing(x, y, radius, color) {
        if (this.effects) this.rings.push({ x, y, radius, color, life: 1 });
    }

    updateEffects(dt) {
        if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt);
        const f = dt / FRAME_MS;
        for (const p of this.particles) {
            p.x += p.vx * f;
            p.y += p.vy * f;
            p.life -= p.decay * f;
        }
        for (const t of this.floatingTexts) {
            t.y -= 0.5 * f;
            t.life -= 0.02 * f;
        }
        for (const r of this.rings) r.life -= 0.06 * f;
        this.particles = this.particles.filter(p => p.life > 0);
        this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);
        this.rings = this.rings.filter(r => r.life > 0);
    }
}
