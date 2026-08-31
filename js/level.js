/**
 * Level and Tilemap Engine
 * Features smooth Day-to-Night background & palette crossfading, classic mushroom physics,
 * parallax scenery, interactive transition pipes, blocks, coins, and goal elements.
 */

class Block {
    constructor(x, y, w, h, type = 'brick', content = null) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.type = type; // 'brick', 'qbox', 'ground'
        this.content = content; // 'coin', 'innovher', 'innoveda', 'innovidea', 'bharat', 'code', 'beyondAbility'
        this.isHit = false;
        this.bumpY = 0;
        this.bumpTimer = 0;
        this.margin = 0;
    }

    update(dt) {
        if (this.bumpTimer > 0) {
            this.bumpTimer -= dt;
            this.bumpY = Math.sin((1 - this.bumpTimer / 0.18) * Math.PI) * -14;
            if (this.bumpTimer <= 0) {
                this.bumpY = 0;
            }
        }
    }

    onHitFromBelow(player) {
        if (this.type === 'qbox') {
            if (!this.isHit) {
                this.isHit = true;
                this.bumpTimer = 0.18;
                if (window.gameInstance) window.gameInstance.triggerScreenShake(4, 0.15);
                if (window.soundManager) window.soundManager.playBlockBump();

                // Spawn content
                if (this.content && window.gameInstance) {
                    window.gameInstance.spawnBlockContent(this.x + this.w / 2, this.y, this.content);
                }
            } else {
                if (window.soundManager) window.soundManager.playBlockBump();
            }
        } else if (this.type === 'brick') {
            this.bumpTimer = 0.18;
            if (window.gameInstance) window.gameInstance.triggerScreenShake(3, 0.12);
            if (window.soundManager) window.soundManager.playBlockBump();
            if (window.particleManager) {
                window.particleManager.spawnBrickDebris(this.x, this.y, this.w, this.h);
            }
        }
    }

    draw(ctx, camera, nightRatio = 0) {
        const drawX = Math.round(this.x - camera.x);
        const drawY = Math.round(this.y + this.bumpY - camera.y);

        if (this.type === 'brick') {
            const spriteDay = window.spriteManager.sprites.brick;
            const spriteNight = window.spriteManager.sprites.brickNight || spriteDay;

            if (spriteDay) {
                if (nightRatio <= 0) {
                    ctx.drawImage(spriteDay, drawX, drawY, this.w, this.h);
                } else if (nightRatio >= 1) {
                    ctx.drawImage(spriteNight, drawX, drawY, this.w, this.h);
                } else {
                    ctx.drawImage(spriteDay, drawX, drawY, this.w, this.h);
                    ctx.save();
                    ctx.globalAlpha = nightRatio;
                    ctx.drawImage(spriteNight, drawX, drawY, this.w, this.h);
                    ctx.restore();
                }
            } else {
                ctx.fillStyle = nightRatio > 0.5 ? '#7f1d1d' : '#b45309';
                ctx.fillRect(drawX, drawY, this.w, this.h);
            }
        } else if (this.type === 'qbox') {
            const sprite = this.isHit
                ? window.spriteManager.sprites.qboxEmpty
                : window.spriteManager.sprites.qbox;
            if (sprite) {
                ctx.drawImage(sprite, drawX, drawY, this.w, this.h);
            } else {
                ctx.fillStyle = this.isHit ? '#6b7280' : '#ec4899';
                ctx.fillRect(drawX, drawY, this.w, this.h);
            }
        }
    }
}

class PipeSolid {
    constructor(x, y, type = 'medium', themeTarget = null, targetX = null, targetY = null) {
        this.x = x;
        this.type = type;
        this.themeTarget = themeTarget; // 'night' or 'day'
        this.isTransitionPipe = !!themeTarget;
        this.targetX = targetX;
        this.targetY = targetY;
        this.margin = 0;

        if (type === 'tall') {
            this.w = 68;
            this.h = 140;
        } else if (type === 'medium') {
            this.w = 68;
            this.h = 95;
        } else if (type === 'short') {
            this.w = 68;
            this.h = 65;
        } else {
            this.w = 95;
            this.h = 70;
        }
        this.y = y - this.h;
    }

    draw(ctx, camera, nightRatio = 0) {
        const drawX = Math.round(this.x - camera.x);
        const drawY = Math.round(this.y - camera.y);

        let spriteDay = window.spriteManager.sprites.pipeMedium;
        let spriteNight = window.spriteManager.sprites.pipeMediumNight || spriteDay;

        if (this.type === 'tall') {
            spriteDay = window.spriteManager.sprites.pipeTall;
            spriteNight = window.spriteManager.sprites.pipeTallNight || spriteDay;
        } else if (this.type === 'horizontal') {
            spriteDay = window.spriteManager.sprites.pipeHorizontal;
            spriteNight = window.spriteManager.sprites.pipeHorizontalNight || spriteDay;
        }

        if (spriteDay) {
            if (nightRatio <= 0) {
                ctx.drawImage(spriteDay, drawX, drawY, this.w, this.h);
            } else if (nightRatio >= 1) {
                ctx.drawImage(spriteNight, drawX, drawY, this.w, this.h);
            } else {
                ctx.drawImage(spriteDay, drawX, drawY, this.w, this.h);
                ctx.save();
                ctx.globalAlpha = nightRatio;
                ctx.drawImage(spriteNight, drawX, drawY, this.w, this.h);
                ctx.restore();
            }
        } else {
            ctx.fillStyle = nightRatio > 0.5 ? '#334155' : '#22c55e';
            ctx.fillRect(drawX, drawY, this.w, this.h);
        }
    }
}

class CoinItem {
    constructor(x, y, label = '') {
        this.x = x;
        this.y = y;
        this.w = 40;
        this.h = 40;
        this.label = label;
        this.isCollected = false;
        this.animTimer = Math.random() * 5;
        this.popY = 0;
        this.isPopping = false;
        this.popVy = 0;
    }

    triggerPop() {
        this.isPopping = true;
        this.popVy = -420;
    }

    update(dt, player) {
        if (this.isCollected) return;
        this.animTimer += dt * 8;

        if (this.isPopping) {
            this.popY += this.popVy * dt;
            this.popVy += 1300 * dt;
            if (this.popVy > 220) {
                this.isCollected = true;
            }
            return;
        }

        // Bounding box collision with player
        const pBounds = player.getBounds();
        if (
            pBounds.x < this.x + this.w &&
            pBounds.x + pBounds.w > this.x &&
            pBounds.y < this.y + this.h &&
            pBounds.y + pBounds.h > this.y
        ) {
            this.isCollected = true;
            if (window.soundManager) window.soundManager.playCoin();
            if (window.particleManager) {
                window.particleManager.addScoreText(this.x + this.w / 2, this.y, this.label ? `${this.label} +100` : '100');
                window.particleManager.spawnSparkles(this.x + this.w / 2, this.y + this.h / 2, 12, '#fbbf24');
            }
            if (window.gameInstance) {
                window.gameInstance.addCoin();
                window.gameInstance.addScore(100);
            }
        }
    }

    draw(ctx, camera) {
        if (this.isCollected) return;
        const frames = window.spriteManager.sprites.coinFrames;
        if (!frames || frames.length === 0) return;

        const frameIdx = Math.floor(this.animTimer) % frames.length;
        const frame = frames[frameIdx];

        const drawX = Math.round(this.x - camera.x);
        const drawY = Math.round(this.y + this.popY - camera.y);

        ctx.drawImage(frame, drawX, drawY, this.w, this.h);

        if (this.label && !this.isPopping) {
            ctx.save();
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#451a03';
            ctx.strokeText(this.label, drawX + this.w / 2, drawY + this.h / 2);
            ctx.fillStyle = '#fffbeb';
            ctx.fillText(this.label, drawX + this.w / 2, drawY + this.h / 2);
            ctx.restore();
        }
    }
}

class MushroomPowerup {
    constructor(x, y, ventureType) {
        this.x = x;
        this.y = y;
        this.w = 42;
        this.h = 42;
        this.ventureType = ventureType;
        this.emerging = true;
        this.emergeTargetY = y - 44;
        this.vy = -60;
        this.vx = 90; // Steady continuous rightward walking speed
        this.isCollected = false;
        this.onGround = false;
    }

    update(dt, level, player) {
        if (this.isCollected) return;

        if (this.emerging) {
            this.y += this.vy * dt;
            if (this.y <= this.emergeTargetY) {
                this.y = this.emergeTargetY;
                this.emerging = false;
                this.vy = 0;
                if (window.soundManager) window.soundManager.playPowerupAppear();
            }
        } else {
            // Horizontal movement and wall bouncing
            this.x += this.vx * dt;

            const solids = level.getNearbySolids(this.x, this.y);
            const bounds = this.getBounds();

            for (const solid of solids) {
                if (solid.type === 'ground') continue;
                if (this.intersects(bounds, solid)) {
                    if (bounds.y + bounds.h > solid.y + 6 && bounds.y < solid.y + solid.h - 6) {
                        if (this.vx > 0) {
                            this.x = solid.x - this.w;
                            this.vx = -Math.abs(this.vx); // Bounce left
                        } else if (this.vx < 0) {
                            this.x = solid.x + solid.w;
                            this.vx = Math.abs(this.vx); // Bounce right
                        }
                    }
                }
            }

            // Gravity & Vertical collision with ground / platforms
            this.vy += 1200 * dt;
            if (this.vy > 650) this.vy = 650;
            this.y += this.vy * dt;

            this.onGround = false;
            const updatedBounds = this.getBounds();

            for (const solid of solids) {
                if (this.intersects(updatedBounds, solid)) {
                    if (this.vy > 0 && updatedBounds.y + updatedBounds.h - this.vy * dt <= solid.y + 14) {
                        this.y = solid.y - this.h;
                        this.vy = 0;
                        this.onGround = true;
                    }
                }
            }

            // Pit check
            if (this.y > level.height + 100) {
                this.isCollected = true;
                return;
            }
        }

        // Collection check with player
        const pBounds = player.getBounds();
        if (this.intersects(this.getBounds(), pBounds)) {
            this.isCollected = true;
            if (window.soundManager) window.soundManager.playPowerupCollect();
            if (window.particleManager) {
                window.particleManager.addScoreText(this.x + this.w / 2, this.y, '+1000 VENTURE');
                window.particleManager.spawnSparkles(this.x + this.w / 2, this.y + this.h / 2, 18, '#ec4899');
            }
            if (window.gameInstance) {
                window.gameInstance.addScore(1000);
                window.gameInstance.triggerVentureModal(this.ventureType);
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
            x: this.x,
            y: this.y,
            w: this.w,
            h: this.h
        };
    }

    draw(ctx, camera) {
        if (this.isCollected) return;
        const shrooms = window.spriteManager.sprites.mushrooms;
        const sprite = shrooms ? shrooms[this.ventureType] : null;

        const drawX = Math.round(this.x - camera.x);
        const drawY = Math.round(this.y - camera.y);

        if (sprite) {
            ctx.drawImage(sprite, drawX - 3, drawY - 3, this.w + 6, this.h + 6);
        } else {
            ctx.fillStyle = '#ec4899';
            ctx.beginPath();
            ctx.arc(drawX + this.w / 2, drawY + this.h / 2, this.w / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class Level {
    constructor() {
        this.width = 5200;
        this.height = 540; // Fix #8: Aligned to canvas 540px
        this.groundY = 450; // Fix #8: 450px ensures full 90px floor tile visibility

        this.solids = [];
        this.blocks = [];
        this.pipes = [];
        this.coins = [];
        this.mushrooms = [];
        this.enemies = [];
        this.trees = [];

        // Active Theme State Manager (Day ↔ Night Crossfade Engine)
        this.currentTheme = 'day';
        this.themeBlend = 0; // 0 = 100% Day, 1 = 100% Night
        this.themeTargetBlend = 0;
        this.themeTransitionDuration = 0.35; // 350ms smooth crossfade

        this.flagpole = { x: 4400, y: 110, w: 46, h: 340 };
        this.building = { x: 4620, y: 160, w: 320, h: 290 };

        this.buildLevel();
    }

    setTheme(themeName, duration = 0.35) {
        this.currentTheme = themeName;
        this.themeTargetBlend = (themeName === 'night') ? 1 : 0;
        this.themeTransitionDuration = duration || 0.35;
        if (window.soundManager && window.soundManager.musicPlaying) {
            window.soundManager.setZone(themeName);
        }
    }

    buildLevel() {
        this.solids = [];
        this.blocks = [];
        this.pipes = [];
        this.coins = [];
        this.mushrooms = [];
        this.enemies = [];
        this.trees = [];
        this.currentTheme = 'day';
        this.themeBlend = 0;
        this.themeTargetBlend = 0;

        // Ground Segments with Open Pits/Chasms
        const groundSegments = [
            { x: 0, w: 1360 },        // Zone 1 Day Ground -> Pit at 1360px - 1500px
            { x: 1500, w: 1060 },      // Zone 2 Night Ground -> Pit at 2560px - 2700px
            { x: 2700, w: 1000 },      // Zone 2 Floating Ascent -> Pit at 3700px - 3820px
            { x: 3820, w: 1380 }       // Zone 3 Final Runway & Studio i HQ
        ];

        groundSegments.forEach(g => {
            this.solids.push({
                x: g.x,
                y: this.groundY,
                w: g.w,
                h: this.height - this.groundY + 100,
                margin: 0,
                type: 'ground'
            });
        });

        // Parallax Trees (Cleanly positioned on solid islands)
        this.trees = [
            { x: 120, y: this.groundY - 140, type: 'treeGreen', w: 120, h: 140 },
            { x: 420, y: this.groundY - 150, type: 'treePink', w: 130, h: 150 },
            { x: 820, y: this.groundY - 145, type: 'treeGreen', w: 120, h: 145 },
            { x: 1040, y: this.groundY - 155, type: 'treePine', w: 110, h: 155 },
            { x: 1700, y: this.groundY - 150, type: 'treeOrange', w: 120, h: 150 },
            { x: 2100, y: this.groundY - 140, type: 'treePink', w: 125, h: 140 },
            { x: 2800, y: this.groundY - 150, type: 'treeGreen', w: 120, h: 150 },
            { x: 3350, y: this.groundY - 155, type: 'treePine', w: 115, h: 155 },
            { x: 4100, y: this.groundY - 150, type: 'treePink', w: 130, h: 150 }
        ];

        // Zone 1: Day Overworld (0px - 1600px)
        this.addBlock(280, 290, 48, 48, 'brick');
        this.addBlock(328, 290, 48, 48, 'qbox', 'innovher');
        this.addBlock(376, 290, 48, 48, 'brick');

        this.addCoin(336, 230);
        this.addCoin(520, 390, 'IRR');
        this.addCoin(570, 390, '$ ROI');

        this.addPipe(680, this.groundY, 'short');
        this.addEnemy(800, this.groundY - 60, 110);

        this.addBlock(920, 290, 48, 48, 'qbox', 'innoveda');
        this.addBlock(968, 290, 48, 48, 'brick');
        this.addBlock(1016, 290, 48, 48, 'brick');
        this.addBlock(1064, 290, 48, 48, 'qbox', 'coin');

        this.addPipe(1180, this.groundY, 'medium');
        this.addEnemy(1300, this.groundY - 60, 80);

        // Zone 2: Deep Night / Underworld (1600px - 3200px) - Transition Pipe into Night
        this.addPipe(1520, this.groundY, 'tall', 'night', 1720, this.groundY);
        this.addPipe(1720, this.groundY, 'medium'); // Destination exit pipe in Night
        this.addEnemy(1780, this.groundY - 60, 100);

        this.addBlock(1840, 320, 48, 48, 'brick');
        this.addBlock(1888, 320, 48, 48, 'brick');
        this.addBlock(1936, 320, 48, 48, 'qbox', 'innovidea');

        this.addCoin(1896, 260);
        this.addCoin(1944, 260);

        // Staircase over Pit
        this.addBlock(2050, 310, 48, 48, 'brick');
        this.addBlock(2098, 270, 48, 48, 'brick');
        this.addBlock(2146, 230, 48, 48, 'qbox', 'bharat');
        this.addBlock(2194, 230, 48, 48, 'brick');

        this.addCoin(2106, 210);
        this.addCoin(2202, 180);

        this.addPipe(2380, this.groundY, 'medium');
        this.addEnemy(2480, this.groundY - 60, 90);

        // Floating Coin Island
        this.addBlock(2750, 290, 48, 48, 'brick');
        this.addBlock(2798, 290, 48, 48, 'qbox', 'code');
        this.addBlock(2846, 290, 48, 48, 'brick');
        this.addBlock(2894, 290, 48, 48, 'brick');

        this.addCoin(2806, 230);
        this.addCoin(2854, 230);
        this.addCoin(2902, 230);

        this.addEnemy(3020, this.groundY - 60, 120);

        // Zone 3: Finale Ascent & Studio i HQ (3200px - 5200px) - Return Pipe to Day
        this.addPipe(3280, this.groundY, 'medium', 'day', 3540, this.groundY);
        this.addPipe(3540, this.groundY, 'short'); // Destination exit pipe in Day
        this.addBlock(3620, 280, 48, 48, 'qbox', 'beyondAbility');
        this.addBlock(3668, 280, 48, 48, 'brick');

        this.addEnemy(3560, this.groundY - 60, 100);

        // Ascending Pipes
        this.addPipe(3840, this.groundY, 'short');
        this.addPipe(3960, this.groundY, 'medium');
        this.addPipe(4080, this.groundY, 'tall');

        this.addCoin(3855, 340, 'GTM');
        this.addCoin(3975, 300, 'SCALE');
        this.addCoin(4095, 250, 'GROW');
    }

    addBlock(x, y, w, h, type, content = null) {
        const b = new Block(x, y, w, h, type, content);
        this.blocks.push(b);
        this.solids.push(b);
    }

    addPipe(x, y, type, themeTarget = null, targetX = null, targetY = null) {
        const p = new PipeSolid(x, y, type, themeTarget, targetX, targetY);
        this.pipes.push(p);
        this.solids.push(p);
    }

    addCoin(x, y, label = '') {
        this.coins.push(new CoinItem(x, y, label));
    }

    addEnemy(x, y, patrolRange) {
        this.enemies.push(new DistractionEnemy(x, y, patrolRange));
    }

    getGroundY(x) {
        for (const s of this.solids) {
            if (s.type === 'ground' && x >= s.x && x <= s.x + s.w) {
                return s.y;
            }
        }
        return this.height + 200;
    }

    getNearbySolids(x, y, range = 250) {
        return this.solids.filter(s => {
            return (
                s.x < x + range &&
                s.x + s.w > x - range &&
                s.y < y + range &&
                s.y + s.h > y - range
            );
        });
    }

    getNightBlendRatio(cameraX) {
        return this.themeBlend !== undefined ? this.themeBlend : 0;
    }

    update(dt, player) {
        // Update Smooth Theme Crossfade Easing (350ms)
        if (this.themeBlend !== this.themeTargetBlend) {
            const step = dt / (this.themeTransitionDuration || 0.35);
            if (this.themeBlend < this.themeTargetBlend) {
                this.themeBlend = Math.min(this.themeTargetBlend, this.themeBlend + step);
            } else {
                this.themeBlend = Math.max(this.themeTargetBlend, this.themeBlend - step);
            }
        }

        // Automatic fallback detection when traversing between zones on foot (bypassed during pipe transitions)
        if (player && !player.isDead && !player.isPipeTransitioning) {
            if (player.x >= 1800 && player.x < 3300 && this.currentTheme !== 'night') {
                this.setTheme('night', 0.40);
            } else if (player.x >= 3560 && this.currentTheme !== 'day') {
                this.setTheme('day', 0.40);
            }
        }

        this.blocks.forEach(b => b.update(dt));
        this.coins.forEach(c => c.update(dt, player));
        this.mushrooms.forEach(m => m.update(dt, this, player));
        this.enemies.forEach(e => e.update(dt, this, player));

        // Flagpole Grab
        if (
            !player.isDead &&
            !player.isSlidingFlag &&
            !player.isEnteringBuilding
        ) {
            const pBounds = player.getBounds();
            if (
                pBounds.x + pBounds.w > this.flagpole.x &&
                pBounds.x < this.flagpole.x + this.flagpole.w &&
                pBounds.y + pBounds.h > this.flagpole.y
            ) {
                player.grabFlagpole(this.flagpole);
                if (window.gameInstance) {
                    window.gameInstance.onFlagpoleReached();
                }
            }
        }

        // Victory Entrance at Studio i Building
        if (player.isEnteringBuilding && player.x >= this.building.x + 120) {
            if (window.gameInstance) {
                window.gameInstance.triggerVictory();
            }
        }
    }

    draw(ctx, camera) {
        const nightRatio = this.themeBlend;

        // 1. Smooth Parallax Background with Crossfading
        this.drawBackground(ctx, camera, nightRatio);

        // 2. Trees (drawn locked to world island coordinates)
        this.trees.forEach(t => {
            const sprite = window.spriteManager.sprites[t.type];
            if (sprite) {
                const drawX = Math.round(t.x - camera.x);
                ctx.drawImage(sprite, drawX, t.y, t.w, t.h);
            }
        });

        // 3. Ground Segments
        this.drawGround(ctx, camera, nightRatio);

        // 4. Pipes
        this.pipes.forEach(p => p.draw(ctx, camera, nightRatio));

        // 5. Blocks
        this.blocks.forEach(b => b.draw(ctx, camera, nightRatio));

        // 6. Coins & Mushrooms
        this.coins.forEach(c => c.draw(ctx, camera));
        this.mushrooms.forEach(m => m.draw(ctx, camera));

        // 7. Flagpole & Goal Building
        this.drawGoalElements(ctx, camera);

        // 8. Enemies
        this.enemies.forEach(e => e.draw(ctx, camera));
    }

    drawBackground(ctx, camera, nightRatio) {
        const bgDay = window.spriteManager.rawImages.bgDay;
        const bgNight = window.spriteManager.rawImages.bgNight;

        const viewportW = (ctx && ctx.canvas ? ctx.canvas.width : 960) || 960;
        const viewportH = (ctx && ctx.canvas ? ctx.canvas.height : 540) || 540;
        const parallaxX = (camera ? camera.x : 0) * 0.25;

        // Seamless continuous parallax layer renderer with alternating mirror edge-matching
        const renderSeamlessParallax = (img, alpha) => {
            if (!img || !img.complete || img.naturalWidth === 0 || alpha <= 0) return;

            ctx.save();
            ctx.globalAlpha = alpha;

            // Preserve authentic 2:1 aspect ratio across vertical height
            const imgAspect = (img.naturalWidth && img.naturalHeight) ? (img.naturalWidth / img.naturalHeight) : (img.width / img.height || 2);
            const tileW = Math.max(100, Math.round(viewportH * imgAspect));

            // Compute exact tile index span to cover entire screen with buffer
            const firstTileIndex = Math.floor((parallaxX - 100) / tileW);
            const numTiles = Math.ceil(viewportW / tileW) + 3;

            for (let i = 0; i < numTiles; i++) {
                const tileIndex = firstTileIndex + i;
                const drawX = Math.floor(tileIndex * tileW - parallaxX);

                // Alternating mirror: even tiles face right, odd tiles mirrored horizontally
                // Mathematically guarantees adjacent borders have 100% identical pixel colors (no seam or color jump)
                const isMirrored = Math.abs(tileIndex) % 2 === 1;

                if (isMirrored) {
                    ctx.save();
                    ctx.translate(drawX + tileW, 0);
                    ctx.scale(-1, 1);
                    // +1px bleed prevents sub-pixel anti-aliasing hairline gaps
                    ctx.drawImage(img, 0, 0, tileW + 1, viewportH);
                    ctx.restore();
                } else {
                    ctx.drawImage(img, drawX, 0, tileW + 1, viewportH);
                }
            }

            ctx.restore();
        };

        // 1. Draw Day Background Layer
        if (nightRatio < 1) {
            renderSeamlessParallax(bgDay, 1 - nightRatio);
        }

        // 2. Draw Night Background Layer with Crossfade
        if (nightRatio > 0) {
            renderSeamlessParallax(bgNight, nightRatio);
        }
    }

    drawGround(ctx, camera, nightRatio = 0) {
        const floorDay = window.spriteManager.sprites.floor;
        const floorNight = window.spriteManager.sprites.floorNight || floorDay;
        const tileW = 1200;
        const tileH = 122;

        this.solids.filter(s => s.type === 'ground').forEach(g => {
            const drawX = g.x - camera.x;
            const drawY = g.y - camera.y;

            if (floorDay) {
                const count = Math.ceil(g.w / tileW);
                for (let i = 0; i < count; i++) {
                    const segX = drawX + i * tileW;
                    const segW = Math.min(tileW, g.w - i * tileW);
                    if (nightRatio <= 0) {
                        ctx.drawImage(floorDay, 0, 0, segW, tileH, segX, drawY, segW, tileH);
                    } else if (nightRatio >= 1) {
                        ctx.drawImage(floorNight, 0, 0, segW, tileH, segX, drawY, segW, tileH);
                    } else {
                        ctx.drawImage(floorDay, 0, 0, segW, tileH, segX, drawY, segW, tileH);
                        ctx.save();
                        ctx.globalAlpha = nightRatio;
                        ctx.drawImage(floorNight, 0, 0, segW, tileH, segX, drawY, segW, tileH);
                        ctx.restore();
                    }
                }

                // 3D Cliff Edge Ledge Shading at Pit Boundaries
                ctx.save();
                ctx.fillStyle = nightRatio > 0.5 ? 'rgba(10, 8, 30, 0.65)' : 'rgba(30, 15, 5, 0.55)';
                ctx.fillRect(drawX, drawY + 14, 5, tileH - 14);
                ctx.fillRect(drawX + g.w - 5, drawY + 14, 5, tileH - 14);
                ctx.restore();
            } else {
                ctx.fillStyle = nightRatio > 0.5 ? '#1e1b4b' : '#15803d';
                ctx.fillRect(drawX, drawY, g.w, 20);
                ctx.fillStyle = nightRatio > 0.5 ? '#0f172a' : '#78350f';
                ctx.fillRect(drawX, drawY + 20, g.w, g.h - 20);
            }
        });
    }

    drawGoalElements(ctx, camera) {
        const flagSprite = window.spriteManager.sprites.flagpole;
        if (flagSprite) {
            const drawX = Math.round(this.flagpole.x - camera.x);
            const drawY = Math.round(this.flagpole.y - camera.y);
            ctx.drawImage(flagSprite, drawX, drawY, 120, 340);
        }

        const bldgSprite = window.spriteManager.sprites.building;
        if (bldgSprite) {
            const drawX = Math.round(this.building.x - camera.x);
            const drawY = Math.round(this.building.y - camera.y);
            ctx.drawImage(bldgSprite, drawX, drawY, this.building.w, this.building.h);
        }
    }
}

window.Block = Block;
window.PipeSolid = PipeSolid;
window.CoinItem = CoinItem;
window.MushroomPowerup = MushroomPowerup;
window.Level = Level;
