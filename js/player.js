/**
 * Player Class (Studio i Mario)
 * Enhanced with squash-and-stretch physics, inertia curves, coyote time, and polished animations.
 */
class Player {
    constructor(x, y) {
        this.startX = x;
        this.startY = y;
        this.reset();
    }

    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.vx = 0;
        this.vy = 0;

        // Visual and Collision Box
        this.width = 44;
        this.height = 70;
        this.facing = 1; // 1 = right, -1 = left

        // Movement Physics Constants
        this.accel = 1300;
        this.decel = 1500;
        this.airAccel = 900;
        this.maxSpeedWalk = 250;
        this.maxSpeedRun = 360;
        this.jumpForce = -580;
        this.gravityNormal = 1550;
        this.gravityJumpHold = 950;
        this.gravityFall = 1850;

        // Squash & Stretch Spring Physics
        this.scaleX = 1.0;
        this.scaleY = 1.0;
        this.targetScaleX = 1.0;
        this.targetScaleY = 1.0;
        this.springSpeed = 18;

        // States
        this.onGround = false;
        this.wasOnGround = false;
        this.isJumping = false;
        this.isSkidding = false;
        this.isDead = false;
        this.isInvulnerable = false;
        this.invulnerableTimer = 0;
        this.isSlidingFlag = false;
        this.isEnteringBuilding = false;

        // Jump Timers
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;

        // Animation System
        this.animTimer = 0;
        this.animFrame = 0;
        this.state = 'idle'; // idle, run, jump, fall, skid, land, die
    }

    triggerSquash(sx, sy) {
        this.scaleX = sx;
        this.scaleY = sy;
    }

    update(dt, input, level) {
        if (this.isDead) {
            this.updateDeath(dt);
            return;
        }

        if (this.isSlidingFlag) {
            this.updateFlagpole(dt, level);
            return;
        }

        if (this.isEnteringBuilding) {
            this.updateEnterBuilding(dt);
            return;
        }

        // Recover Squash & Stretch toward 1.0 via smooth spring lerp
        this.scaleX += (this.targetScaleX - this.scaleX) * this.springSpeed * dt;
        this.scaleY += (this.targetScaleY - this.scaleY) * this.springSpeed * dt;

        // Invulnerability countdown
        if (this.isInvulnerable) {
            this.invulnerableTimer -= dt;
            if (this.invulnerableTimer <= 0) {
                this.isInvulnerable = false;
            }
        }

        // Coyote Time & Jump Buffer
        if (this.onGround) {
            this.coyoteTimer = 0.13;
        } else {
            this.coyoteTimer -= dt;
        }

        if (input.isJumpJustPressed()) {
            this.jumpBufferTimer = 0.15;
        } else {
            this.jumpBufferTimer -= dt;
        }

        // Horizontal Movement Input with Natural Inertia Easing
        const isSprint = input.isSprint();
        const maxSpeed = isSprint ? this.maxSpeedRun : this.maxSpeedWalk;
        const moveLeft = input.isLeft();
        const moveRight = input.isRight();
        const currentAccel = this.onGround ? this.accel : this.airAccel;

        if (moveLeft && !moveRight) {
            if (this.vx > 30 && this.onGround) {
                // Skidding / braking
                this.isSkidding = true;
                this.vx -= this.decel * 1.8 * dt;
            } else {
                this.isSkidding = false;
                this.vx -= currentAccel * dt;
                if (this.vx < -maxSpeed) this.vx = -maxSpeed;
            }
            this.facing = -1;
        } else if (moveRight && !moveLeft) {
            if (this.vx < -30 && this.onGround) {
                // Skidding / braking
                this.isSkidding = true;
                this.vx += this.decel * 1.8 * dt;
            } else {
                this.isSkidding = false;
                this.vx += currentAccel * dt;
                if (this.vx > maxSpeed) this.vx = maxSpeed;
            }
            this.facing = 1;
        } else {
            this.isSkidding = false;
            // Smooth natural deceleration friction
            const friction = this.onGround ? this.decel : this.decel * 0.4;
            if (this.vx > 0) {
                this.vx = Math.max(0, this.vx - friction * dt);
            } else if (this.vx < 0) {
                this.vx = Math.min(0, this.vx + friction * dt);
            }
        }

        // Jumping Logic with Takeoff Stretch
        if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
            this.vy = this.jumpForce;
            this.isJumping = true;
            this.onGround = false;
            this.coyoteTimer = 0;
            this.jumpBufferTimer = 0;
            // Launch Stretch (tall & narrow)
            this.triggerSquash(0.82, 1.25);
            if (window.soundManager) window.soundManager.playJump();
        }

        // Variable Jump Height Gravity
        let currentGravity = this.gravityNormal;
        if (this.vy < 0) {
            if (input.isJump()) {
                currentGravity = this.gravityJumpHold;
            } else {
                currentGravity = this.gravityFall;
            }
        } else {
            currentGravity = this.gravityFall;
            this.isJumping = false;
        }
        this.vy += currentGravity * dt;
        if (this.vy > 950) this.vy = 950; // Terminal velocity

        // Store state before collision
        this.wasOnGround = this.onGround;

        // Update Physics & Collisions (Separated X and Y axes)
        this.x += this.vx * dt;
        this.checkHorizontalCollisions(level);

        this.y += this.vy * dt;
        this.checkVerticalCollisions(level);

        // Landing Squash on Touchdown
        if (!this.wasOnGround && this.onGround) {
            // Impact squash (wide & short) proportional to fall speed
            this.triggerSquash(1.24, 0.78);
        }

        // Pit Fall Check
        if (this.y > level.height + 150) {
            this.die();
        }

        // Update Animation Frame
        this.updateAnimation(dt);
    }

    checkHorizontalCollisions(level) {
        const bounds = this.getBounds();
        const solids = level.getNearbySolids(this.x, this.y);

        for (const solid of solids) {
            if (this.intersects(bounds, solid)) {
                if (this.vx > 0) {
                    this.x = solid.x - this.width / 2 - solid.margin;
                    this.vx = 0;
                } else if (this.vx < 0) {
                    this.x = solid.x + solid.w + this.width / 2 + solid.margin;
                    this.vx = 0;
                }
            }
        }

        if (this.x - this.width / 2 < 0) {
            this.x = this.width / 2;
            this.vx = 0;
        }
    }

    checkVerticalCollisions(level) {
        this.onGround = false;
        const bounds = this.getBounds();
        const solids = level.getNearbySolids(this.x, this.y);

        for (const solid of solids) {
            if (this.intersects(bounds, solid)) {
                if (this.vy > 0) {
                    // Landing on top
                    this.y = solid.y - this.height;
                    this.vy = 0;
                    this.onGround = true;
                } else if (this.vy < 0) {
                    // Hitting from below
                    this.y = solid.y + solid.h;
                    this.vy = 0;
                    // Bump squash
                    this.triggerSquash(1.2, 0.82);
                    if (solid.onHitFromBelow) {
                        solid.onHitFromBelow(this);
                    }
                }
            }
        }
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

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.vy = -560;
        this.vx = 0;
        this.triggerSquash(0.9, 1.2);
        if (window.gameInstance) window.gameInstance.triggerScreenShake(8, 0.35);
        if (window.soundManager) {
            window.soundManager.stopMusic();
            window.soundManager.playHurt();
            window.soundManager.playGameOver();
        }
    }

    takeDamage() {
        if (this.isInvulnerable || this.isDead || this.isSlidingFlag) return false;
        this.die();
        return true;
    }

    bounceOffEnemy() {
        this.vy = -480;
        this.onGround = false;
        this.triggerSquash(0.85, 1.28);
        if (window.gameInstance) window.gameInstance.triggerScreenShake(5, 0.2);
        if (window.soundManager) window.soundManager.playStomp();
    }

    grabFlagpole(flagpole) {
        if (this.isSlidingFlag || this.isEnteringBuilding) return;
        this.isSlidingFlag = true;
        this.vx = 0;
        this.vy = 170;
        this.x = flagpole.x + 10;
        this.triggerSquash(1.0, 1.0);
        if (window.soundManager) {
            window.soundManager.stopMusic();
            window.soundManager.playFlagpole();
        }
    }

    updateFlagpole(dt, level) {
        this.y += this.vy * dt;
        const groundY = level.getGroundY(this.x);
        if (this.y >= groundY - this.height) {
            this.y = groundY - this.height;
            this.isSlidingFlag = false;
            this.isEnteringBuilding = true;
            this.facing = 1;
            this.vx = 190;
            if (window.soundManager) window.soundManager.playVictory();
        }
    }

    updateEnterBuilding(dt) {
        this.x += this.vx * dt;
        this.updateAnimation(dt);
        if (window.particleManager && Math.random() < 0.25) {
            window.particleManager.spawnFirework(
                this.x - 100 + Math.random() * 260,
                this.y - 120 - Math.random() * 160
            );
        }
    }

    updateDeath(dt) {
        this.y += this.vy * dt;
        this.vy += 1200 * dt;
    }

    updateAnimation(dt) {
        if (!this.onGround) {
            this.state = 'jump';
        } else if (this.isSkidding) {
            this.state = 'skid';
        } else if (Math.abs(this.vx) > 12) {
            this.state = 'run';
            this.animTimer += dt * (Math.abs(this.vx) / 32);
            this.animFrame = Math.floor(this.animTimer) % 5;
        } else {
            this.state = 'idle';
            this.animTimer += dt * 2.2;
            this.animFrame = Math.floor(this.animTimer) % 2;
        }
    }

    draw(ctx, camera) {
        const sprites = window.spriteManager.sprites.player;
        if (!sprites) return;

        ctx.save();
        // Translate to player bottom center for natural squash & stretch
        const drawX = Math.round(this.x - camera.x);
        const drawY = Math.round(this.y + this.height - camera.y);
        ctx.translate(drawX, drawY);

        // Apply Squash & Stretch from the ground/pivot
        ctx.scale(this.facing * this.scaleX, this.scaleY);

        // Flashing when invulnerable
        if (this.isInvulnerable && Math.floor(this.invulnerableTimer * 20) % 2 === 0) {
            ctx.globalAlpha = 0.4;
        }

        let spriteToDraw = sprites.idle[0];
        let renderW = 54;
        let renderH = 74;

        if (this.isDead) {
            spriteToDraw = sprites.jump;
        } else if (this.state === 'jump') {
            spriteToDraw = sprites.jump;
        } else if (this.state === 'skid') {
            spriteToDraw = sprites.turn;
        } else if (this.state === 'run') {
            spriteToDraw = sprites.run[this.animFrame] || sprites.run[0];
        } else {
            spriteToDraw = sprites.idle[this.animFrame] || sprites.idle[0];
        }

        // Ground shadow
        if (this.onGround && !this.isDead) {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.beginPath();
            ctx.ellipse(0, 0, 22 * this.scaleX, 6 * this.scaleY, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        if (spriteToDraw) {
            ctx.drawImage(
                spriteToDraw,
                -renderW / 2,
                -renderH,
                renderW,
                renderH
            );
        }

        ctx.restore();
    }
}

window.Player = Player;
