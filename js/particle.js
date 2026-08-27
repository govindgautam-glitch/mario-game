/**
 * Particle and Visual FX Engine
 * Manages floating score labels, brick fragments, sparkle bursts, and victory fireworks.
 */
class Particle {
    constructor(x, y, vx, vy, color, size, life, shape = 'circle') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.maxLife = life;
        this.life = life;
        this.gravity = 400;
        this.shape = shape;
        this.rotation = Math.random() * Math.PI * 2;
        this.vRot = (Math.random() - 0.5) * 8;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += this.gravity * dt;
        this.rotation += this.vRot * dt;
        this.life -= dt;
    }

    draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;

        if (this.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.shape === 'rect') {
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        } else if (this.shape === 'star') {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * this.size, -Math.sin((18 + i * 72) * Math.PI / 180) * this.size);
                ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (this.size / 2), -Math.sin((54 + i * 72) * Math.PI / 180) * (this.size / 2));
            }
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }
}

class FloatingText {
    constructor(x, y, text, color = '#facc15', size = 16, life = 0.8) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.size = size;
        this.maxLife = life;
        this.life = life;
        this.vy = -60;
    }

    update(dt) {
        this.y += this.vy * dt;
        this.life -= dt;
    }

    draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${this.size}px "Press Start 2P", monospace`;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#000000';
        ctx.fillText(this.text, this.x + 1, this.y + 1);
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

class ParticleManager {
    constructor() {
        this.particles = [];
        this.floatingTexts = [];
    }

    reset() {
        this.particles = [];
        this.floatingTexts = [];
    }

    spawnSparkles(x, y, count = 12, color = '#ec4899') {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 140;
            const p = new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed - 60,
                color,
                3 + Math.random() * 4,
                0.4 + Math.random() * 0.4,
                Math.random() > 0.5 ? 'star' : 'circle'
            );
            p.gravity = 150;
            this.particles.push(p);
        }
    }

    spawnBrickDebris(x, y, w, h) {
        const pieces = [
            { vx: -120, vy: -280 },
            { vx: 120, vy: -280 },
            { vx: -80, vy: -180 },
            { vx: 80, vy: -180 }
        ];
        pieces.forEach(p => {
            const particle = new Particle(
                x + w / 2, y + h / 2,
                p.vx + (Math.random() - 0.5) * 40,
                p.vy,
                '#b45309',
                8,
                0.9,
                'rect'
            );
            particle.gravity = 700;
            this.particles.push(particle);
        });
    }

    spawnFirework(x, y) {
        const colors = ['#ec4899', '#f43f5e', '#38bdf8', '#fbbf24', '#a855f7', '#4ade80'];
        const chosenColor = colors[Math.floor(Math.random() * colors.length)];
        for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2;
            const speed = 100 + Math.random() * 160;
            const p = new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                chosenColor,
                4 + Math.random() * 3,
                0.8 + Math.random() * 0.5,
                'circle'
            );
            p.gravity = 120;
            this.particles.push(p);
        }
    }

    addScoreText(x, y, text, color = '#facc15') {
        this.floatingTexts.push(new FloatingText(x, y, text, color));
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(dt);
            if (this.particles[i].life <= 0) {
                this.particles.splice(i, 1);
            }
        }
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            this.floatingTexts[i].update(dt);
            if (this.floatingTexts[i].life <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        this.particles.forEach(p => p.draw(ctx));
        this.floatingTexts.forEach(t => t.draw(ctx));
    }
}

window.particleManager = new ParticleManager();
