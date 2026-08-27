/**
 * Sprite Loader & Slicing Engine
 * Loads all image assets, slices sprite frames into optimized offscreen canvases,
 * and provides fast blitting handles for the renderer.
 */
class SpriteManager {
    constructor() {
        this.rawImages = {};
        this.sprites = {};
        this.loaded = false;
        this.totalAssets = 0;
        this.loadedAssets = 0;
    }

    async loadAll(onProgress) {
        const assetMap = {
            marioSheet: 'mario game iamges/Mario Model All Angles.png',
            marioAction: 'mario game iamges/Main Mario Model (2).png',
            distraction: 'mario game iamges/Distraction.png',
            floor: 'mario game iamges/Mario Game Floor Element.png',
            bgDay: 'mario game iamges/Mario Game Background.png',
            bgNight: 'mario game iamges/ChatGPT Image Aug 27, 2026, 02_35_21 AM.png',
            brick: 'mario game iamges/Mario Game Brick.png',
            qbox: 'mario game iamges/Mario Game _ box.png',
            pipes: 'mario game iamges/Mario Game Pipe Element.png',
            trees: 'mario game iamges/Mario Tree.png',
            flagpole: 'mario game iamges/19.png',
            building: 'mario game iamges/Mario Studio i Final Building.png',
            joinUsBtn: 'mario game iamges/ChatGPT Image Aug 27, 2026, 06_13_21 AM.png',
            shroomInnovher: 'mario game iamges/Mario Innovher Mashroom.png',
            shroomInnoveda: 'mario game iamges/Mario Innoveda ai Mashroom.png',
            shroomInnovidea: 'mario game iamges/Mario Innovidea Mashroom.png',
            shroomBharat: 'mario game iamges/Mario Bharat Venture Mashroom.png',
            shroomCode: 'mario game iamges/Mario Code Mashroom.png',
            shroomBeyondAbility: 'mario game iamges/ChatGPT Image Aug 27, 2026, 05_25_47 AM.png'
        };

        const keys = Object.keys(assetMap);
        this.totalAssets = keys.length;

        const promises = keys.map(key => {
            return new Promise((resolve) => {
                const img = new Image();
                // Fix #4: Removed img.crossOrigin = 'anonymous' for local bundled assets
                img.onload = () => {
                    this.rawImages[key] = img;
                    this.loadedAssets++;
                    if (onProgress) onProgress(this.loadedAssets / this.totalAssets);
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`Failed to load asset: ${assetMap[key]}`);
                    this.rawImages[key] = img;
                    this.loadedAssets++;
                    resolve();
                };
                img.src = assetMap[key];
            });
        });

        await Promise.all(promises);
        this.sliceAllSprites();
        this.loaded = true;
    }

    createCanvasSlice(img, sx, sy, sw, sh) {
        const c = document.createElement('canvas');
        c.width = sw;
        c.height = sh;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        return c;
    }

    createTintedCanvas(sourceCanvas, tintColor, blendMode = 'source-atop', globalAlpha = 0.5) {
        const c = document.createElement('canvas');
        c.width = sourceCanvas.width;
        c.height = sourceCanvas.height;
        const ctx = c.getContext('2d');
        ctx.drawImage(sourceCanvas, 0, 0);
        ctx.save();
        ctx.globalCompositeOperation = blendMode;
        ctx.globalAlpha = globalAlpha;
        ctx.fillStyle = tintColor;
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.restore();
        return c;
    }

    sliceAllSprites() {
        const sheet = this.rawImages.marioSheet;

        // Player Animation Frames from Mario Model All Angles.png
        this.sprites.player = {
            idle: [
                this.createCanvasSlice(sheet, 187, 88, 114, 203), // 3/4 front
                this.createCanvasSlice(sheet, 12, 88, 140, 203)   // Front
            ],
            run: [
                this.createCanvasSlice(sheet, 16, 325, 121, 170),
                this.createCanvasSlice(sheet, 153, 322, 125, 195),
                this.createCanvasSlice(sheet, 296, 322, 148, 173),
                this.createCanvasSlice(sheet, 467, 321, 138, 175),
                this.createCanvasSlice(sheet, 620, 313, 138, 195)
            ],
            jump: this.createCanvasSlice(sheet, 783, 312, 122, 188),
            land: this.createCanvasSlice(sheet, 924, 355, 124, 149),
            crouch: this.createCanvasSlice(sheet, 1071, 387, 100, 119),
            turn: this.createCanvasSlice(sheet, 356, 88, 100, 203)
        };

        // Enemy (Distraction)
        if (this.rawImages.distraction) {
            this.sprites.distraction = this.createCanvasSlice(
                this.rawImages.distraction,
                443, 49, 316, 480
            );
        }

        // Clay Brick Platform (Day & Night)
        if (this.rawImages.brick) {
            this.sprites.brick = this.createCanvasSlice(
                this.rawImages.brick,
                422, 209, 357, 182
            );
            // Night theme brick: dark crimson/purple stone texture
            this.sprites.brickNight = this.createTintedCanvas(this.sprites.brick, '#4a0e2e', 'source-atop', 0.65);
        }

        // Pink Question Box
        if (this.rawImages.qbox) {
            this.sprites.qbox = this.createCanvasSlice(
                this.rawImages.qbox,
                418, 125, 365, 343
            );
            // Inactive/empty box (slightly darkened)
            const emptyC = document.createElement('canvas');
            emptyC.width = 365;
            emptyC.height = 343;
            const ectx = emptyC.getContext('2d');
            ectx.drawImage(this.sprites.qbox, 0, 0);
            ectx.fillStyle = 'rgba(70, 40, 60, 0.45)';
            ectx.fillRect(0, 0, 365, 343);
            this.sprites.qboxEmpty = emptyC;
        }

        // Pipes (Day & Night)
        if (this.rawImages.pipes) {
            const p = this.rawImages.pipes;
            this.sprites.pipeTall = this.createCanvasSlice(p, 324, 150, 149, 304);
            this.sprites.pipeMedium = this.createCanvasSlice(p, 497, 252, 145, 200);
            this.sprites.pipeHorizontal = this.createCanvasSlice(p, 663, 291, 215, 163);

            // Night theme pipes: dark grey metallic / night stone
            this.sprites.pipeTallNight = this.createTintedCanvas(this.sprites.pipeTall, '#1e293b', 'color', 0.85);
            this.sprites.pipeMediumNight = this.createTintedCanvas(this.sprites.pipeMedium, '#1e293b', 'color', 0.85);
            this.sprites.pipeHorizontalNight = this.createTintedCanvas(this.sprites.pipeHorizontal, '#1e293b', 'color', 0.85);
        }

        // Trees
        if (this.rawImages.trees) {
            const t = this.rawImages.trees;
            this.sprites.treeGreen = this.createCanvasSlice(t, 244, 60, 209, 241);
            this.sprites.treePink = this.createCanvasSlice(t, 488, 58, 220, 240);
            this.sprites.treePalm = this.createCanvasSlice(t, 715, 58, 245, 245);
            this.sprites.treePine = this.createCanvasSlice(t, 383, 320, 172, 220);
            this.sprites.treeOrange = this.createCanvasSlice(t, 656, 320, 166, 221);
        }

        // Ground Tile (Day & Night)
        if (this.rawImages.floor) {
            this.sprites.floor = this.createCanvasSlice(
                this.rawImages.floor,
                0, 478, 1200, 122
            );
            // Night theme ground: cool dark blue-purple tone
            this.sprites.floorNight = this.createTintedCanvas(this.sprites.floor, '#1e1035', 'color', 0.7);
        }

        // Flagpole & Goal Building
        if (this.rawImages.flagpole) {
            this.sprites.flagpole = this.createCanvasSlice(
                this.rawImages.flagpole,
                91, 147, 449, 992
            );
        }

        if (this.rawImages.building) {
            this.sprites.building = this.createCanvasSlice(
                this.rawImages.building,
                389, 106, 433, 381
            );
        }

        if (this.rawImages.joinUsBtn) {
            this.sprites.joinUsBtn = this.createCanvasSlice(
                this.rawImages.joinUsBtn,
                48, 55, 1973, 640
            );
        }

        // Venture Mushrooms
        this.sprites.mushrooms = {
            innovher: this.createCanvasSlice(this.rawImages.shroomInnovher, 404, 124, 383, 363),
            innoveda: this.createCanvasSlice(this.rawImages.shroomInnoveda, 399, 113, 403, 369),
            innovidea: this.createCanvasSlice(this.rawImages.shroomInnovidea, 400, 130, 395, 347),
            bharat: this.createCanvasSlice(this.rawImages.shroomBharat, 400, 120, 393, 376),
            code: this.createCanvasSlice(this.rawImages.shroomCode, 373, 110, 449, 375),
            beyondAbility: this.createCanvasSlice(this.rawImages.shroomBeyondAbility, 236, 20, 1065, 980)
        };

        // Synthesized Coin Graphic
        this.sprites.coinFrames = this.generateCoinFrames();
    }

    generateCoinFrames() {
        const frames = [];
        const numFrames = 6;
        for (let i = 0; i < numFrames; i++) {
            const c = document.createElement('canvas');
            c.width = 36;
            c.height = 36;
            const ctx = c.getContext('2d');
            const scaleX = Math.abs(Math.cos((i / numFrames) * Math.PI));
            const w = Math.max(4, 30 * scaleX);

            ctx.save();
            ctx.translate(18, 18);

            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.ellipse(0, 0, w / 2, 15, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.ellipse(0, 0, (w * 0.75) / 2, 12, 0, 0, Math.PI * 2);
            ctx.fill();

            if (scaleX > 0.4) {
                ctx.fillStyle = '#fffbeb';
                ctx.fillRect(-2 * scaleX, -7, 4 * scaleX, 14);
            }

            ctx.restore();
            frames.push(c);
        }
        return frames;
    }
}

window.spriteManager = new SpriteManager();
