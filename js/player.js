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
        this.isPipeTransitioning = false;
        this.pipeTimer = 0;
        this.pipeTargetTheme = null;
        this.pipeTargetX = null;
        this.pipeTargetY = null;

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

        if (this.isPipeTransitioning) {
            this.updatePipeTransition(dt, level);
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

        // Check for down-crouch pipe transition interaction
        this.checkPipeInteraction(input, level);

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
            // Fix #1: Exclude ground from horizontal wall checks to prevent teleporting/snapping
            if (solid.type === 'ground') continue;

            if (this.intersects(bounds, solid)) {
                if (bounds.y + bounds.h > solid.y + 8 && bounds.y < solid.y + solid.h - 8) {
                    if (this.vx > 0) {
                        this.x = solid.x - this.width / 2 - solid.margin;
                        this.vx = 0;
                    } else if (this.vx < 0) {
                        this.x = solid.x + solid.w + this.width / 2 + solid.margin;
                        this.vx = 0;
                    }
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

    checkPipeInteraction(input, level) {
        if (this.isPipeTransitioning || this.isDead || this.isSlidingFlag || this.isEnteringBuilding) return;
        if (!level || !level.pipes) return;

        const isCrouch = input.isCrouch();

        for (const pipe of level.pipes) {
            if (pipe.isTransitionPipe && pipe.themeTarget) {
                // Check if Mario is standing on the pipe rim
                const onPipeTop = (
                    this.onGround &&
                    this.x >= pipe.x + 8 &&
                    this.x <= pipe.x + pipe.w - 8 &&
                    Math.abs((this.y + this.height) - pipe.y) < 14
                );

                if (onPipeTop && isCrouch) {
                    this.enterPipe(pipe, level);
                    break;
                }
            }
        }
    }

    enterPipe(pipe, level) {
        if (this.isPipeTransitioning) return;
        this.isPipeTransitioning = true;
        this.pipePhase = 'descend'; // 'descend' -> 'emerge'
        this.pipeTimer = 0.45;
        this.pipeDuration = 0.45;
        this.pipeEntryPipe = pipe;
        this.pipeTargetTheme = pipe.themeTarget;
        this.pipeTargetX = pipe.targetX;
        this.pipeTargetY = pipe.targetY;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;

        // Center player on pipe mouth
        this.x = pipe.x + pipe.w / 2 - this.width / 2;

        if (window.soundManager) {
            window.soundManager.playPipe();
        }
    }

    updatePipeTransition(dt, level) {
        this.pipeTimer -= dt;
        const progress = Math.max(0, Math.min(1, 1 - (this.pipeTimer / (this.pipeDuration || 0.45))));

        if (this.pipePhase === 'descend') {
            // Player physically sinks down into the pipe rim
            if (this.pipeEntryPipe) {
                const startY = this.pipeEntryPipe.y - this.height;
                const endY = this.pipeEntryPipe.y + 12;
                this.y = startY + (endY - startY) * progress;
            } else {
                this.y += 60 * dt;
            }

            if (this.pipeTimer <= 0) {
                // Descent animation complete -> Now start theme transition & emerge at exit pipe
                if (this.pipeTargetX !== undefined && this.pipeTargetX !== null) {
                    const exitPipe = (level && level.pipes) ? level.pipes.find(p => Math.abs(p.x - this.pipeTargetX) < 160) : null;
                    this.pipeExitPipe = exitPipe || { x: this.pipeTargetX - 35, y: this.pipeTargetY + this.height, w: 70, h: 100 };

                    this.x = this.pipeExitPipe.x + this.pipeExitPipe.w / 2 - this.width / 2;
                    this.y = this.pipeExitPipe.y + 12; // fully inside exit pipe

                    this.pipePhase = 'emerge';
                    this.pipeTimer = 0.45;
                    this.pipeDuration = 0.45;

                    if (level && level.setTheme) {
                        level.setTheme(this.pipeTargetTheme, 0.35);
                    }

                    if (window.soundManager) {
                        window.soundManager.playPipe();
                    }
                } else {
                    this.isPipeTransitioning = false;
                    this.pipePhase = null;
                    this.triggerSquash(0.85, 1.25);
                }
            }
        } else if (this.pipePhase === 'emerge') {
            // Player physically rises up out of the destination pipe rim
            if (this.pipeExitPipe) {
                const startY = this.pipeExitPipe.y + 12;
                const endY = this.pipeExitPipe.y - this.height;
                this.y = startY + (endY - startY) * progress;
            } else {
                this.y -= 60 * dt;
            }

            if (this.pipeTimer <= 0) {
                this.isPipeTransitioning = false;
                this.pipePhase = null;
                if (this.pipeExitPipe) {
                    this.y = this.pipeExitPipe.y - this.height;
                }
                this.onGround = true;
                this.vx = 0;
                this.vy = 0;
                this.triggerSquash(0.85, 1.25);
            }
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
        const sprites = window.spriteManager ? window.spriteManager.sprites.player : null;

        let hasClip = false;
        if (this.isPipeTransitioning && this.pipePhase === 'descend' && this.pipeEntryPipe) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, 99999, Math.round(this.pipeEntryPipe.y - camera.y));
            ctx.clip();
            hasClip = true;
        } else if (this.isPipeTransitioning && this.pipePhase === 'emerge' && this.pipeExitPipe) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, 99999, Math.round(this.pipeExitPipe.y - camera.y));
            ctx.clip();
            hasClip = true;
        }

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

        let spriteToDraw = sprites ? sprites.idle[0] : null;
        let renderW = 54;
        let renderH = 74;

        if (sprites) {
            if (this.isDead) {
                spriteToDraw = sprites.jump;
            } else if (this.isPipeTransitioning) {
                spriteToDraw = sprites.idle[0]; // Clean upright pose while descending/emerging
            } else if (this.state === 'jump') {
                spriteToDraw = sprites.jump;
            } else if (this.state === 'skid') {
                spriteToDraw = sprites.turn;
            } else if (this.state === 'run') {
                spriteToDraw = sprites.run[this.animFrame] || sprites.run[0];
            } else {
                spriteToDraw = sprites.idle[this.animFrame] || sprites.idle[0];
            }
        }

        // Ground shadow (not while in pipe transition or dead)
        if (this.onGround && !this.isDead && !this.isPipeTransitioning) {
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
        } else {
            const rawImg = window.spriteManager ? (window.spriteManager.rawImages.marioAction || window.spriteManager.rawImages.marioSheet) : null;
            if (rawImg && rawImg.complete && rawImg.naturalWidth > 0) {
                ctx.drawImage(rawImg, -renderW / 2, -renderH, renderW, renderH);
            } else {
                ctx.fillStyle = '#ec4899';
                ctx.fillRect(-renderW / 2, -renderH, renderW, renderH);
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(-renderW / 4, -renderH * 0.8, renderW / 2, renderH * 0.3);
            }
        }

        ctx.restore();
        if (hasClip) {
            ctx.restore();
        }
    }
}

window.Player = Player;
