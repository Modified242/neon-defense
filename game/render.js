// Canvas rendering. Visual style matches the original game; shape drawing is shared between
// placed towers and the placement preview.
import { CANVAS_W, CANVAS_H, PATH_WIDTH, TOWER_SPECS } from './config.js';

const rgbaCache = new Map();
export function rgba(hex, alpha) {
    const key = hex + alpha;
    let v = rgbaCache.get(key);
    if (!v) {
        const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
        v = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        rgbaCache.set(key, v);
    }
    return v;
}

/** Grid + path never change during a level, so they're rendered once to an offscreen canvas. */
export function createBackground(path) {
    const bg = document.createElement('canvas');
    bg.width = CANVAS_W;
    bg.height = CANVAS_H;
    const ctx = bg.getContext('2d');

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < CANVAS_W; i += 40) { ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_H); }
    for (let i = 0; i < CANVAS_H; i += 40) { ctx.moveTo(0, i); ctx.lineTo(CANVAS_W, i); }
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i++) ctx.lineTo(path.points[i].x, path.points[i].y);
    ctx.lineWidth = PATH_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.stroke();
    return bg;
}

function polygon(ctx, sides, radius, step = 1) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
        const a = i * step * Math.PI * 2 / sides;
        ctx.lineTo(radius * Math.cos(a), radius * Math.sin(a));
    }
    ctx.closePath();
}

/** Draws a tower body (already translated + rotated). `withBarrel` is false for previews. */
function drawTowerShape(ctx, shape, color, withBarrel) {
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    switch (shape) {
        case 'square':
            ctx.fillRect(-12, -12, 24, 24);
            ctx.strokeRect(-12, -12, 24, 24);
            if (withBarrel) { ctx.fillStyle = color; ctx.fillRect(0, -4, 20, 8); }
            break;
        case 'diamond':
            ctx.beginPath();
            ctx.moveTo(15, 0); ctx.lineTo(0, 15); ctx.lineTo(-15, 0); ctx.lineTo(0, -15);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            if (withBarrel) { ctx.fillStyle = color; ctx.fillRect(0, -2, 30, 4); }
            break;
        case 'circle':
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
            if (withBarrel) {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(10, 0, 5, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        case 'triangle':
            ctx.beginPath();
            ctx.moveTo(15, 0); ctx.lineTo(-10, 12); ctx.lineTo(-10, -12);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            break;
        case 'hexagon':
            polygon(ctx, 6, 12);
            ctx.fill(); ctx.stroke();
            if (withBarrel) { ctx.fillStyle = color; ctx.fillRect(0, -6, 20, 12); }
            break;
        case 'star':
            polygon(ctx, 5, 15, 2);
            ctx.fill(); ctx.stroke();
            break;
    }
}

function drawTower(ctx, t) {
    ctx.save();
    ctx.translate(t.x, t.y);

    if (t.range > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, t.range, 0, Math.PI * 2);
        ctx.fillStyle = rgba(t.color, 0.05);
        ctx.fill();
        ctx.strokeStyle = rgba(t.color, 0.2);
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // Upgrade level pips under the tower
    if (t.level > 1) {
        ctx.fillStyle = t.color;
        const n = t.level - 1;
        const w = n > 5 ? 20 / n : 5;
        for (let i = 0; i < n; i++) ctx.fillRect(-((n * w + (n - 1) * 2) / 2) + i * (w + 2), 18, w, 3);
    }

    ctx.rotate(t.angle);
    ctx.shadowBlur = 15;
    ctx.shadowColor = t.color;
    drawTowerShape(ctx, t.shape, t.color, true);
    ctx.restore();
}

function drawEnemy(ctx, e, game) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.shadowBlur = 10;
    ctx.shadowColor = e.color;
    ctx.fillStyle = e.color;
    
    if (e.type === 'fast') {
        const next = game.path.pointAt(e.distance + 5, e.seg);
        ctx.rotate(Math.atan2(next.y - e.y, next.x - e.x));
        polygon(ctx, 3, e.size + 4);
    } else if (e.type === 'tank') {
        ctx.beginPath();
        ctx.rect(-e.size, -e.size, e.size * 2, e.size * 2);
    } else if (e.type === 'swarm') {
        ctx.beginPath();
        ctx.arc(0, 0, e.size, 0, Math.PI * 2);
    } else {
        polygon(ctx, 6, e.size);
    }
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-15, -20, 30, 4);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(-15, -20, 30 * Math.max(0, e.hp / e.maxHp), 4);
    ctx.restore();
}

function drawProjectile(ctx, p) {
    ctx.save();
    if (p.history && p.history.length > 0) {
        ctx.beginPath();
        ctx.moveTo(p.history[0].x, p.history[0].y);
        for (let i = 1; i < p.history.length; i++) {
            ctx.lineTo(p.history[i].x, p.history[i].y);
        }
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = rgba(p.color, 0.4);
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    ctx.shadowBlur = 10;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawEffects(ctx, game) {
    for (const r of game.rings) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, r.life);
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius * (1.1 - 0.3 * r.life), 0, Math.PI * 2);
        ctx.fillStyle = rgba(r.color, 0.25);
        ctx.fill();
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
    for (const p of game.particles) {
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const t of game.floatingTexts) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, t.life);
        ctx.fillStyle = t.color;
        ctx.font = 'bold 16px Outfit';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 5;
        ctx.shadowColor = t.color;
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
    }
}

function drawPlacementPreview(ctx, game, type, x, y) {
    const spec = TOWER_SPECS[type];
    const valid = game.canPlace(x, y) && game.credits >= spec.cost;
    const color = valid ? spec.color : '#ef4444';

    ctx.save();
    ctx.translate(x, y);
    const radius = spec.range || 24; // Fabricator has no range; still show its footprint
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = valid ? rgba(spec.color, 0.15) : 'rgba(239, 68, 68, 0.2)';
    ctx.fill();
    ctx.strokeStyle = valid ? rgba(spec.color, 0.5) : 'rgba(239, 68, 68, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.globalAlpha = 0.5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.rotate(-Math.PI / 2);
    drawTowerShape(ctx, spec.shape, color, false);
    ctx.restore();
}

function drawSelection(ctx, t) {
    ctx.save();
    ctx.translate(t.x, t.y);
    if (t.range > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, t.range, 0, Math.PI * 2);
        ctx.fillStyle = rgba(t.color, 0.1);
        ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
}

export function render(ctx, game, background, ui) {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.save();
    if (game.shakeTimer > 0) {
        const mag = game.shakeTimer * 0.15;
        ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }

    ctx.drawImage(background, 0, 0);

    const pathEnd = game.path.points[game.path.points.length - 1];
    const t = performance.now() / 400;
    ctx.beginPath();
    ctx.arc(pathEnd.x, pathEnd.y, 25, 0, Math.PI * 2);
    ctx.fillStyle = rgba('#38bdf8', 0.5 + 0.3 * Math.sin(t));
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pathEnd.x, pathEnd.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#0ea5e9';
    ctx.fill();

    for (const t of game.towers) drawTower(ctx, t);
    for (const e of game.enemies) drawEnemy(ctx, e, game);
    for (const p of game.projectiles) drawProjectile(ctx, p);
    drawEffects(ctx, game);

    if (game.isOver) return;
    if (ui.placingType && ui.mouse) {
        drawPlacementPreview(ctx, game, ui.placingType, ui.mouse.x, ui.mouse.y);
    } else if (ui.selectedTower) {
        drawSelection(ctx, ui.selectedTower);
    }

    ctx.restore();
}

