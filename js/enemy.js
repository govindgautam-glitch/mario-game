/**
 * Enemy Class (Distraction)
 * Implements ground patrol AI, turnaround on obstacle collision, and stomp squash mechanics.
 */
class DistractionEnemy {
    constructor(x, y, patrolRange = 160) {
        this.startX = x;
        this.startY = y;
        this.x = x;
        this.y = y;
        this.vx = -60; // Patrol speed
        this.vy = 0;
        this.width = 46;
        this.height = 62;
        this.patrolLeft = x - patrolRange;
        this.patrolRight = x + patrolRange;
        this.isSquashed = false;
        this.squashTimer = 0;
        this.isDead = false;
        this.animTimer = 0;
    }

    update(dt, level, player) {
        if (this.isDead) return;

        if (this.isSquashed) {
            this.squashTimer -= dt;
            if (this.squashTimer <= 0) {
                this.isDead = true;
            }
            return;
        }

        // Horizontal Patrol
        this.x += this.vx * dt;
        this.animTimer += dt * 5;

        // Turn around at patrol limits
        if (this.x < this.patrolLeft && this.vx < 0) {
            this.vx = Math.abs(this.vx);
        } else if (this.x > this.patrolRight && this.vx > 0) {
            this.vx = -Math.abs(this.vx);
        }

        // Check collision with obstacles (pipes, walls)
        const solids = level.getNearbySolids(this.x, this.y);
        const bounds = this.getBounds();

        for (const solid of solids) {
            // Fix #1: Exclude ground from horizontal obstacle collision
            if (solid.type === 'ground') continue;

            if (this.intersects(bounds, solid)) {
                if (bounds.y + bounds.h > solid.y + 8 && bounds.y < solid.y + solid.h - 8) {
                    if (this.vx > 0) {
                        this.x = solid.x - this.width / 2;
                        this.vx = -this.vx;
                    } else if (this.vx < 0) {
                        this.x = solid.x + solid.w + this.width / 2;
                        this.vx = -this.vx;
                    }
                }
            }
        }

        // Apply ground gravity
        const groundY = level.getGroundY(this.x);
        if (this.y < groundY - this.height) {
            this.vy += 1200 * dt;
            this.y += this.vy * dt;
            if (this.y >= groundY - this.height) {
                this.y = groundY - this.height;
                this.vy = 0;
            }
        } else {
            this.y = groundY - this.height;
            this.vy = 0;
        }

        // Player Collision Check
        if (!player.isDead && !player.isInvulnerable) {
            const playerBounds = player.getBounds();
            if (this.intersects(playerBounds, bounds)) {
                // Fix #2: Velocity-aware stomp threshold to prevent race condition on fast falls
                const playerFeet = player.y + player.height;
                const enemyTop = this.y;
                const stompThreshold = enemyTop + Math.max(28, player.vy * dt);

                if (player.vy > 0 && playerFeet <= stompThreshold) {
                    this.squash();
                    player.bounceOffEnemy();
                    if (window.particleManager) {
                        window.particleManager.addScoreText(this.x, this.y - 10, '200');
                        window.particleManager.spawnSparkles(this.x, this.y, 8, '#a855f7');
                    }
                    if (window.gameInstance) {
                        window.gameInstance.addScore(200);
                    }
                } else {
                    player.takeDamage();
                }
            }
        }
    }

    squash() {
        this.isSquashed = true;
        this.squashTimer = 0.5;
    }

    intersects(a, b) {
        return (
            a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y
        );
    }

    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y,
            w: this.width,
            h: this.height
        };
    }

    draw(ctx, camera) {
        if (this.isDead) return;
        const sprite = window.spriteManager.sprites.distraction;
        if (!sprite) return;

        ctx.save();
        ctx.translate(Math.round(this.x - camera.x), Math.round(this.y - camera.y));

        // Walking waddle / scale effect
        const waddle = Math.sin(this.animTimer) * 0.05;
        let scaleY = 1;
        let scaleX = 1 + waddle;

        if (this.isSquashed) {
            scaleY = 0.28;
            scaleX = 1.4;
            ctx.translate(0, this.height * 0.72);
        }

        ctx.scale(scaleX, scaleY);

        // Ground shadow
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.beginPath();
        ctx.ellipse(0, this.height - 2, 22, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const renderW = 54;
        const renderH = 68;

        ctx.drawImage(
            sprite,
            -renderW / 2,
            0,
            renderW,
            renderH
        );

        ctx.restore();
    }
}

window.DistractionEnemy = DistractionEnemy;
