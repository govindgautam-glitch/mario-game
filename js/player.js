const PIPE_STATE = {
    NORMAL: 'NORMAL',
    PIPE_ENTERING: 'PIPE_ENTERING',
    PIPE_TRAVEL: 'PIPE_TRAVEL',
    PIPE_EXITING: 'PIPE_EXITING'
};

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

        // Pipe Transition State Machine (Authoritative 0.7s - 1.2s Spec)
        this.pipeState = PIPE_STATE.NORMAL;
        this.pipeTimer = 0;
        this.pipeDuration = 0;
        this.pipeEntryDuration = 0.85;  // 0.85s visible deliberate descent (0.7-1.2s range)
        this.pipeTravelDuration = 0.40; // 0.40s dark hold travel moment
        this.pipeExitDuration = 0.85;   // 0.85s visible deliberate emergence (0.7-1.2s range)
        this.pipeCooldown = 0;
        this.pipeEntryPipe = null;
        this.pipeExitPipe = null;
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

    get isPipeTransitioning() {
        return this.pipeState !== PIPE_STATE.NORMAL;
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

        if (this.pipeState !== PIPE_STATE.NORMAL) {
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

        // Cooldown timer after exiting pipe to prevent accidental re-entry while holding Down
        if (this.pipeCooldown > 0) {
            this.pipeCooldown -= dt;
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

        // Pit Fall Check: Fall realistically through the chasm down into the void
        if (this.y > level.groundY + 20 && !this.isDead) {
            this.isFallingIntoPit = true;
            this.vx *= 0.90; // Natural air deceleration in pit
            this.state = 'jump';
        }

        if (this.y > level.height + 60 && !this.isDead) {
            this.die(true); // Pit death: smoothly drops into abyss
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
                    this.isJumping = false;
                } else if (this.vy < 0) {
                    // Hitting block from below
                    this.y = solid.y + solid.h;
                    this.vy = 0;
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

    die(isPit = false) {
        if (this.isDead) return;
        this.isDead = true;
        this.vx = 0;
        if (isPit) {
            this.vy = Math.max(320, this.vy); // Maintain realistic downward fall acceleration into void
            this.triggerSquash(0.85, 1.25);
        } else {
            this.vy = -560; // Upward shock bounce on enemy impact
            this.triggerSquash(0.9, 1.2);
            if (window.gameInstance) window.gameInstance.triggerScreenShake(8, 0.35);
        }
        if (window.soundManager) {
            window.soundManager.stopMusic();
            window.soundManager.playHurt();
            window.soundManager.playGameOver();
        }
    }

    takeDamage() {
        if (this.isInvulnerable || this.isDead || this.isSlidingFlag || this.isPipeTransitioning) return false;
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
        if (this.pipeState !== PIPE_STATE.NORMAL || this.isDead || this.isSlidingFlag || this.isEnteringBuilding) return;
        if (!level || !level.pipes) return;
        if (this.pipeCooldown > 0) return;

        for (const pipe of level.pipes) {
            if (pipe.isTransitionPipe && pipe.themeTarget) {
                // Check if Mario has reached / is standing on the transition pipe rim
                const onPipeTop = (
                    this.onGround &&
                    this.x >= pipe.x + 8 &&
                    this.x <= pipe.x + pipe.w - 8 &&
                    Math.abs((this.y + this.height) - pipe.y) < 14
                );

                if (onPipeTop) {
                    this.enterPipe(pipe, level);
                    break;
                }
            }
        }
    }

    enterPipe(pipe, level) {
        if (this.pipeState !== PIPE_STATE.NORMAL) return;

        // Advance to Phase 1: PIPE_ENTERING
        this.pipeState = PIPE_STATE.PIPE_ENTERING;
        this.pipeDuration = this.pipeEntryDuration; // 0.85s (0.7 - 1.2s range)
        this.pipeTimer = this.pipeEntryDuration;
        this.pipeEntryPipe = pipe;
        this.pipeTargetTheme = pipe.themeTarget;
        this.pipeTargetX = pipe.targetX;
        this.pipeTargetY = pipe.targetY;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;

        // Center player precisely on pipe mouth
        this.x = pipe.x + pipe.w / 2;

        if (window.soundManager) {
            window.soundManager.playPipe();
        }
    }

    updatePipeTransition(dt, level) {
        this.pipeTimer -= dt;

        if (this.pipeState === PIPE_STATE.PIPE_ENTERING) {
            // STATE 1: PIPE_ENTERING (exactly 0.85s): player moves downward through rim with ease-in
            const t = Math.max(0, Math.min(1, 1 - (this.pipeTimer / this.pipeEntryDuration)));
            const eased = t * t; // ease-in

            if (this.pipeEntryPipe) {
                const startY = this.pipeEntryPipe.y - this.height;
                const endY = this.pipeEntryPipe.y + this.height + 20; // Full 160px descent
                this.y = startY + (endY - startY) * eased;
            }

            if (this.pipeTimer <= 0) {
                // SINK COMPLETE: Player is 100% hidden inside pipe.
                // Advance to STATE 2: PIPE_TRAVEL (0.40s dark hold moment)
                this.pipeState = PIPE_STATE.PIPE_TRAVEL;
                this.pipeDuration = this.pipeTravelDuration; // exactly 0.40s
                this.pipeTimer = this.pipeTravelDuration;

                // Position player inside destination exit pipe (fully submerged below exit rim)
                if (this.pipeTargetX !== undefined && this.pipeTargetX !== null) {
                    const exitPipe = (level && level.pipes) ? level.pipes.find(p => Math.abs(p.x - this.pipeTargetX) < 160) : null;
                    this.pipeExitPipe = exitPipe || { x: this.pipeTargetX, y: (this.pipeTargetY || level.groundY) - 95, w: 68, h: 95 };

                    this.x = this.pipeExitPipe.x + this.pipeExitPipe.w / 2;
                    this.y = this.pipeExitPipe.y + this.height + 20; // Hidden below exit pipe rim

                    // Smooth camera target repositioning
                    if (window.gameInstance) {
                        const targetCamX = this.x - window.gameInstance.width * 0.35;
                        window.gameInstance.camera.x = Math.max(0, Math.min(level.width - window.gameInstance.width, targetCamX));
                    }
                }

                // THEME TRANSITION BEGINS HERE: Trigger theme crossfade at the START of PIPE_TRAVEL
                if (level && level.setTheme) {
                    level.setTheme(this.pipeTargetTheme, this.pipeTravelDuration);
                }
            }
        } else if (this.pipeState === PIPE_STATE.PIPE_TRAVEL) {
            // STATE 2: PIPE_TRAVEL (0.40s): holding dark state while player is hidden
            if (this.pipeExitPipe) {
                this.y = this.pipeExitPipe.y + this.height + 20;
            }

            if (this.pipeTimer <= 0) {
                // TRAVEL COMPLETE: Advance to STATE 3: PIPE_EXITING
                this.pipeState = PIPE_STATE.PIPE_EXITING;
                this.pipeDuration = this.pipeExitDuration; // exactly 0.85s
                this.pipeTimer = this.pipeExitDuration;

                if (window.soundManager) {
                    window.soundManager.playPipe();
                }
            }
        } else if (this.pipeState === PIPE_STATE.PIPE_EXITING) {
            // STATE 3: PIPE_EXITING (exactly 0.85s): player moves upward through rim with ease-out
            const t = Math.max(0, Math.min(1, 1 - (this.pipeTimer / this.pipeExitDuration)));
            const eased = 1 - Math.pow(1 - t, 2); // ease-out

            if (this.pipeExitPipe) {
                const startY = this.pipeExitPipe.y + this.height + 20; // Starts fully below rim
                const endY = this.pipeExitPipe.y - this.height; // Ends standing on rim
                this.y = startY + (endY - startY) * eased;
            }

            if (this.pipeTimer <= 0) {
                // STATE 4: NORMAL gameplay resumption
                this.pipeState = PIPE_STATE.NORMAL;
                if (this.pipeExitPipe) {
                    this.y = this.pipeExitPipe.y - this.height;
                }
                this.onGround = true;
                this.vx = 0;
                this.vy = 0;
                this.pipeCooldown = 0.6;
                this.triggerSquash(0.88, 1.22);
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
        if (this.pipeState === PIPE_STATE.PIPE_ENTERING || this.pipeState === PIPE_STATE.PIPE_EXITING || this.pipeState === PIPE_STATE.PIPE_TRAVEL) {
            this.drawPlayerDuringPipeTransition(ctx, camera);
            return;
        }

        this.drawNormal(ctx, camera, false);
    }

    drawPlayerDuringPipeTransition(ctx, camera) {
        if (this.pipeState === PIPE_STATE.PIPE_TRAVEL) {
            return; // Player is 100% hidden during travel state
        }

        const activePipe = (this.pipeState === PIPE_STATE.PIPE_ENTERING) ? this.pipeEntryPipe : this.pipeExitPipe;
        if (!activePipe) {
            this.drawNormal(ctx, camera, true);
            return;
        }

        const pipeRimY = Math.round(activePipe.y - camera.y);

        ctx.save();
        ctx.beginPath();
        // Only allow drawing ABOVE the pipe's rim (i.e., y < pipeRimY)
        ctx.rect(0, 0, (ctx.canvas ? ctx.canvas.width : 960), pipeRimY);
        ctx.clip();

        // Draw the player sprite completely normally at its real position
        this.drawNormal(ctx, camera, true);

        ctx.restore();
    }

    drawNormal(ctx, camera, inPipeTransition = false) {
        const sprites = window.spriteManager ? window.spriteManager.sprites.player : null;

        ctx.save();
        // Translate to player bottom center for natural squash & stretch
        const drawX = Math.round(this.x - camera.x);
        const drawY = Math.round(this.y + this.height - camera.y);
        ctx.translate(drawX, drawY);

        // Apply Squash & Stretch from the ground/pivot
        const sx = inPipeTransition ? 1.0 : this.scaleX;
        const sy = inPipeTransition ? 1.0 : this.scaleY;
        ctx.scale(this.facing * sx, sy);

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
            } else if (inPipeTransition) {
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
        if (this.onGround && !this.isDead && !inPipeTransition) {
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
    }
}

window.Player = Player;
