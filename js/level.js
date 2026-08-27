/**
 * Level and Tilemap Engine
 * Features smooth Day-to-Night background crossfading, parallax scenery, blocks, pipes, coins, venture mushrooms, and goal elements.
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

    draw(ctx, camera) {
        const drawX = Math.round(this.x - camera.x);
        const drawY = Math.round(this.y + this.bumpY - camera.y);

        if (this.type === 'brick') {
            const sprite = window.spriteManager.sprites.brick;
            if (sprite) {
                ctx.drawImage(sprite, drawX, drawY, this.w, this.h);
            } else {
                ctx.fillStyle = '#b45309';
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
    constructor(x, y, type = 'medium') {
        this.x = x;
        this.type = type;
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

    draw(ctx, camera) {
        const drawX = Math.round(this.x - camera.x);
        const drawY = Math.round(this.y - camera.y);
        let sprite = window.spriteManager.sprites.pipeMedium;
        if (this.type === 'tall') sprite = window.spriteManager.sprites.pipeTall;
        if (this.type === 'horizontal') sprite = window.spriteManager.sprites.pipeHorizontal;

        if (sprite) {
            ctx.drawImage(sprite, drawX, drawY, this.w, this.h);
        } else {
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(drawX, drawY, this.w, this.h);
        }
    }
}

class CoinItem {
    constructor(x, y, label = '') {
        this.x = x;
        this.y = y;
        this.w = 32;
        this.h = 32;
        this.label = label;
        this.isCollected = false;
        this.animTimer = Math.random() * 5;
        this.popY = 0;
        this.isPopping = false;
        this.popVy = 0;
    }

    triggerPop() {
        this.isPopping = true;
        this.popVy = -400;
    }

    update(dt, player) {
        if (this.isCollected) return;
        this.animTimer += dt * 8;

        if (this.isPopping) {
            this.popY += this.popVy * dt;
            this.popVy += 1200 * dt;
            if (this.popVy > 200) {
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
            ctx.fillStyle = '#78350f';
            ctx.textAlign = 'center';
            ctx.fillText(this.label, drawX + this.w / 2, drawY + this.h / 2 + 3);
            ctx.restore();
        }
    }
}

class MushroomPowerup {
    constructor(x, y, ventureType) {
        this.x = x;
        this.y = y;
        this.w = 46;
        this.h = 44;
        this.ventureType = ventureType;
        this.emerging = true;
        this.emergeTargetY = y - 48;
        this.vy = -65;
        this.isCollected = false;
        this.bobTimer = 0;
    }

    update(dt, level, player) {
        if (this.isCollected) return;

        if (this.emerging) {
            this.y += this.vy * dt;
            if (this.y <= this.emergeTargetY) {
                this.y = this.emergeTargetY;
                this.emerging = false;
                if (window.soundManager) window.soundManager.playPowerupAppear();
            }
            return;
        }

        this.bobTimer += dt * 4;
        this.y += Math.sin(this.bobTimer) * 0.35;

        const pBounds = player.getBounds();
        if (
            pBounds.x < this.x + this.w &&
            pBounds.x + pBounds.w > this.x &&
            pBounds.y < this.y + this.h &&
            pBounds.y + pBounds.h > this.y
        ) {
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

    draw(ctx, camera) {
        if (this.isCollected) return;
        const shrooms = window.spriteManager.sprites.mushrooms;
        const sprite = shrooms ? shrooms[this.ventureType] : null;

        const drawX = Math.round(this.x - camera.x);
        const drawY = Math.round(this.y - camera.y);

        if (sprite) {
            ctx.drawImage(sprite, drawX - 4, drawY - 4, this.w + 8, this.h + 8);
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
        this.height = 600;
        this.groundY = 510;

        this.solids = [];
        this.blocks = [];
        this.pipes = [];
        this.coins = [];
        this.mushrooms = [];
        this.enemies = [];
        this.trees = [];

        this.flagpole = { x: 4400, y: 170, w: 46, h: 340 };
        this.building = { x: 4620, y: 220, w: 320, h: 290 };

        this.buildLevel();
    }

    buildLevel() {
        this.solids = [];
        this.blocks = [];
        this.pipes = [];
        this.coins = [];
        this.mushrooms = [];
        this.enemies = [];
        this.trees = [];

        // Ground Segments
        const groundSegments = [
            { x: 0, w: 1400 },
            { x: 1480, w: 1100 },
            { x: 2680, w: 1000 },
            { x: 3780, w: 1420 }
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

        // Parallax Trees
        this.trees = [
            { x: 120, y: this.groundY - 140, type: 'treeGreen', w: 120, h: 140 },
            { x: 420, y: this.groundY - 150, type: 'treePink', w: 130, h: 150 },
            { x: 820, y: this.groundY - 145, type: 'treeGreen', w: 120, h: 145 },
            { x: 1200, y: this.groundY - 160, type: 'treePine', w: 110, h: 160 },
            { x: 1700, y: this.groundY - 150, type: 'treeOrange', w: 120, h: 150 },
            { x: 2100, y: this.groundY - 140, type: 'treePink', w: 125, h: 140 },
            { x: 2900, y: this.groundY - 150, type: 'treeGreen', w: 120, h: 150 },
            { x: 3400, y: this.groundY - 160, type: 'treePine', w: 115, h: 160 },
            { x: 4100, y: this.groundY - 150, type: 'treePink', w: 130, h: 150 }
        ];

        // Zone 1: Day Overworld (0px - 1600px)
        this.addBlock(280, 360, 48, 48, 'brick');
        this.addBlock(328, 360, 48, 48, 'qbox', 'innovher');
        this.addBlock(376, 360, 48, 48, 'brick');

        this.addCoin(336, 300);
        this.addCoin(520, 460, 'IRR');
        this.addCoin(570, 460, '$ ROI');

        this.addPipe(680, this.groundY, 'short');
        this.addEnemy(800, this.groundY - 60, 110);

        this.addBlock(920, 360, 48, 48, 'qbox', 'innoveda');
        this.addBlock(968, 360, 48, 48, 'brick');
        this.addBlock(1016, 360, 48, 48, 'brick');
        this.addBlock(1064, 360, 48, 48, 'qbox', 'coin');

        this.addPipe(1180, this.groundY, 'medium');
        this.addEnemy(1300, this.groundY - 60, 80);

        // Zone 2: Deep Night / Underworld (1600px - 3200px)
        this.addPipe(1520, this.groundY, 'tall');
        this.addEnemy(1680, this.groundY - 60, 100);

        this.addBlock(1780, 390, 48, 48, 'brick');
        this.addBlock(1828, 390, 48, 48, 'brick');
        this.addBlock(1876, 390, 48, 48, 'qbox', 'innovidea');

        this.addCoin(1836, 340);
        this.addCoin(1884, 340);

        // Staircase over Pit
        this.addBlock(2050, 380, 48, 48, 'brick');
        this.addBlock(2098, 340, 48, 48, 'brick');
        this.addBlock(2146, 300, 48, 48, 'qbox', 'bharat');
        this.addBlock(2194, 300, 48, 48, 'brick');

        this.addCoin(2106, 280);
        this.addCoin(2202, 250);

        this.addPipe(2380, this.groundY, 'medium');
        this.addEnemy(2480, this.groundY - 60, 90);

        // Floating Coin Island
        this.addBlock(2750, 360, 48, 48, 'brick');
        this.addBlock(2798, 360, 48, 48, 'qbox', 'code');
        this.addBlock(2846, 360, 48, 48, 'brick');
        this.addBlock(2894, 360, 48, 48, 'brick');

        this.addCoin(2806, 300);
        this.addCoin(2854, 300);
        this.addCoin(2902, 300);

        this.addEnemy(3020, this.groundY - 60, 120);

        // Zone 3: Finale Ascent & Studio i HQ (3200px - 5200px)
        this.addPipe(3280, this.groundY, 'short');
        this.addBlock(3420, 350, 48, 48, 'qbox', 'beyondAbility');
        this.addBlock(3468, 350, 48, 48, 'brick');

        this.addEnemy(3560, this.groundY - 60, 100);

        // Ascending Pipes
        this.addPipe(3840, this.groundY, 'short');
        this.addPipe(3960, this.groundY, 'medium');
        this.addPipe(4080, this.groundY, 'tall');

        this.addCoin(3855, 410, 'GTM');
        this.addCoin(3975, 370, 'SCALE');
        this.addCoin(4095, 320, 'GROW');
    }

    addBlock(x, y, w, h, type, content = null) {
        const b = new Block(x, y, w, h, type, content);
        this.blocks.push(b);
        this.solids.push(b);
    }

    addPipe(x, y, type) {
        const p = new PipeSolid(x, y, type);
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

    // Calculates night blend ratio (0 = 100% Day, 1 = 100% Night) with smooth hermite curve
    getNightBlendRatio(cameraX) {
        // Transition Day -> Night between 1350px and 1750px
        if (cameraX < 1350) return 0;
        if (cameraX >= 1350 && cameraX <= 1750) {
            const t = (cameraX - 1350) / 400;
            return t * t * (3 - 2 * t);
        }
        // Deep Night between 1750px and 3050px
        if (cameraX > 1750 && cameraX < 3050) return 1;
        // Transition Night -> Day between 3050px and 3450px
        if (cameraX >= 3050 && cameraX <= 3450) {
            const t = 1 - (cameraX - 3050) / 400;
            return t * t * (3 - 2 * t);
        }
        return 0;
    }

    update(dt, player) {
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
        const nightRatio = this.getNightBlendRatio(camera.x);

        // 1. Smooth Parallax Background with Crossfading
        this.drawBackground(ctx, camera, nightRatio);

        // 2. Parallax Trees
        this.trees.forEach(t => {
            const sprite = window.spriteManager.sprites[t.type];
            if (sprite) {
                const drawX = Math.round(t.x - camera.x * 0.85);
                ctx.drawImage(sprite, drawX, t.y, t.w, t.h);
            }
        });

        // 3. Ground Segments
        this.drawGround(ctx, camera);

        // 4. Pipes
        this.pipes.forEach(p => p.draw(ctx, camera));

        // 5. Blocks
        this.blocks.forEach(b => b.draw(ctx, camera));

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

        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        const scrollX = -(camera.x * 0.28) % w;

        // Draw Day Background
        if (bgDay && bgDay.complete && nightRatio < 1) {
            ctx.save();
            ctx.globalAlpha = 1 - nightRatio;
            ctx.drawImage(bgDay, scrollX, 0, w, h);
            ctx.drawImage(bgDay, scrollX + w, 0, w, h);
            ctx.restore();
        }

        // Draw Night Background with Crossfade
        if (bgNight && bgNight.complete && nightRatio > 0) {
            ctx.save();
            ctx.globalAlpha = nightRatio;
            ctx.drawImage(bgNight, scrollX, 0, w, h);
            ctx.drawImage(bgNight, scrollX + w, 0, w, h);
            ctx.restore();
        }
    }

    drawGround(ctx, camera) {
        const floorSprite = window.spriteManager.sprites.floor;
        const tileW = 1200;
        const tileH = 122;

        this.solids.filter(s => s.type === 'ground').forEach(g => {
            const drawX = g.x - camera.x;
            const drawY = g.y - camera.y;

            if (floorSprite) {
                const count = Math.ceil(g.w / tileW);
                for (let i = 0; i < count; i++) {
                    const segX = drawX + i * tileW;
                    const segW = Math.min(tileW, g.w - i * tileW);
                    ctx.drawImage(floorSprite, 0, 0, segW, tileH, segX, drawY, segW, tileH);
                }
            } else {
                ctx.fillStyle = '#15803d';
                ctx.fillRect(drawX, drawY, g.w, 20);
                ctx.fillStyle = '#78350f';
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

window.Level = Level;
