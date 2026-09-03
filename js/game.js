/**
 * Main Game Engine (60FPS Loop, Screen Shake, LocalStorage & Leaderboard Coordinator)
 */
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // Fix #8: Aligned resolution (960x540)
        this.width = 960;
        this.height = 540;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.camera = { x: 0, y: 0 };
        this.state = 'LOADING'; // LOADING, TITLE, PLAYING, MODAL, VICTORY, GAMEOVER, PAUSED

        // Player Name & Score State
        this.playerName = localStorage.getItem('studio_mario_player_name') || 'Mario';
        this.highScore = parseInt(localStorage.getItem('studio_mario_high_score') || '0', 10);
        this.isNewHighScore = false;

        this.score = 0;
        this.coins = 0;
        this.lives = 3;
        this.time = 300;
        this.world = '1-1';

        this.lastTime = 0;
        this.isPaused = false;

        // Screen Shake Engine
        this.shakeTimer = 0;
        this.shakeIntensity = 0;

        this.player = new Player(80, 380);
        this.level = new Level();

        this.init();
    }

    async init() {
        const loadingBar = document.getElementById('loading-bar-fill');
        const loadingText = document.getElementById('loading-text');

        await window.spriteManager.loadAll((progress) => {
            if (loadingBar) loadingBar.style.width = `${Math.round(progress * 100)}%`;
            if (loadingText) loadingText.innerText = `Loading Assets... ${Math.round(progress * 100)}%`;
        });

        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) loadingOverlay.classList.add('hidden');

        this.state = 'TITLE';
        window.uiManager.showStartScreen(this.playerName, this.getLeaderboard());
        this.fetchGlobalLeaderboard(10).then(scores => {
            if (this.state === 'TITLE' && window.uiManager) {
                window.uiManager.renderLeaderboard('start-leaderboard-list', scores);
            }
        });

        this.resize();
        window.addEventListener('resize', () => this.resize());

        requestAnimationFrame((t) => this.loop(t));
    }

    resize() {
        const container = document.getElementById('canvas-container');
        const hud = document.getElementById('hud-overlay');

        let containerW = container ? container.clientWidth : 0;
        let containerH = container ? container.clientHeight : 0;

        if (containerW <= 10 || containerH <= 10) {
            containerW = window.innerWidth || 960;
            containerH = window.innerHeight || 540;
        }

        const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
        const maxW = isFullscreen ? containerW : Math.min(1280, containerW);
        const maxH = isFullscreen ? containerH : Math.min(720, containerH);

        const scale = Math.min(maxW / this.width, maxH / this.height);
        const validScale = (scale && scale > 0.1) ? scale : 1;
        const actualW = Math.round(this.width * validScale);
        const actualH = Math.round(this.height * validScale);

        this.canvas.style.width = `${actualW}px`;
        this.canvas.style.height = `${actualH}px`;

        // Anchor HUD overlay directly to rendered canvas bounding box
        if (hud) {
            hud.style.width = `${actualW}px`;
            const leftOffset = Math.max(0, (containerW - actualW) / 2);
            const topOffset = Math.max(0, (containerH - actualH) / 2);
            hud.style.left = `${leftOffset}px`;
            hud.style.top = `${topOffset}px`;
        }
    }

    setPlayerName(name) {
        this.playerName = name.trim().slice(0, 12);
        localStorage.setItem('studio_mario_player_name', this.playerName);
    }

    getLeaderboard() {
        try {
            const raw = localStorage.getItem('studio_mario_leaderboard');
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.warn('Leaderboard parse error:', e);
        }
        return [
            { name: 'Studio_i', score: 12500 },
            { name: 'Founder_1', score: 9800 },
            { name: 'Innovator', score: 7400 },
            { name: 'Speedrun', score: 5200 },
            { name: 'Alpha', score: 3600 }
        ];
    }

    async fetchGlobalLeaderboard(limit = 10) {
        try {
            const res = await fetch(`/api/leaderboard?limit=${limit}`);
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.scores) && data.scores.length > 0) {
                    localStorage.setItem('studio_mario_leaderboard', JSON.stringify(data.scores));
                    return data.scores;
                }
            }
        } catch (e) {
            // Graceful fallback to local cache when offline or API unreachable
            console.warn('Global leaderboard offline, using local storage cache.');
        }
        return this.getLeaderboard();
    }

    saveScoreToLeaderboard(name, finalScore) {
        let board = this.getLeaderboard();
        const cleanName = (name || 'Player').trim().slice(0, 12);
        const nameLower = cleanName.toLowerCase();

        // Check if player name already exists (case-insensitive)
        const existingIndex = board.findIndex(item => (item.name || '').toLowerCase() === nameLower);
        if (existingIndex !== -1) {
            if (finalScore > board[existingIndex].score) {
                board[existingIndex].score = finalScore;
                board[existingIndex].name = cleanName;
            }
        } else {
            board.push({ name: cleanName, score: finalScore });
        }

        board.sort((a, b) => b.score - a.score);
        board = board.slice(0, 10); // Keep top 10 unique
        localStorage.setItem('studio_mario_leaderboard', JSON.stringify(board));

        if (finalScore > this.highScore) {
            this.highScore = finalScore;
            this.isNewHighScore = true;
            localStorage.setItem('studio_mario_high_score', String(this.highScore));
        } else {
            this.isNewHighScore = false;
        }

        // Asynchronously post to MongoDB backend
        this.submitScoreToGlobalLeaderboard(cleanName, finalScore);

        return board;
    }

    async submitScoreToGlobalLeaderboard(name, score) {
        try {
            const res = await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, score })
            });
            if (res.ok) {
                const result = await res.json();
                if (result.success) {
                    const freshScores = await this.fetchGlobalLeaderboard(10);
                    if (window.uiManager) {
                        window.uiManager.refreshActiveLeaderboards(freshScores, name, score);
                    }
                }
            }
        } catch (e) {
            console.warn('Score submission to global backend failed, saved in local storage.');
        }
    }

    triggerScreenShake(intensity = 6, duration = 0.2) {
        this.shakeIntensity = intensity;
        this.shakeTimer = duration;
    }

    start(enteredName) {
        if (enteredName) this.setPlayerName(enteredName);
        this.resetGame();
        this.state = 'PLAYING';
        window.uiManager.hideStartScreen();
        if (window.soundManager) {
            window.soundManager.init();
            window.soundManager.startMusic('day');
        }
    }

    restart() {
        this.lives = 3;
        this.score = 0;
        this.coins = 0;
        this.time = 300;
        this.resetGame();
        this.state = 'PLAYING';
        window.uiManager.hideAllScreens();
        if (window.soundManager) {
            window.soundManager.startMusic('day');
        }
    }

    returnToTitle() {
        this.state = 'TITLE';
        window.uiManager.showStartScreen(this.playerName, this.getLeaderboard());
        this.fetchGlobalLeaderboard(10).then(scores => {
            if (this.state === 'TITLE' && window.uiManager) {
                window.uiManager.renderLeaderboard('start-leaderboard-list', scores);
            }
        });
    }

    resetGame() {
        this.player.reset();
        this.player.x = 80;
        this.player.y = 380; // Above ground 450px
        this.level.buildLevel();
        window.particleManager.reset();
        this.camera.x = 0;
        this.camera.y = 0;
        this.time = 300;
        this.shakeTimer = 0;

        // Fix #3: Guarantee background music starts/restarts on respawn or reset
        if (window.soundManager) {
            const currentZone = this.level.getCurrentZone ? this.level.getCurrentZone(0) : 'day';
            window.soundManager.startMusic(currentZone || 'day');
        }
    }

    addScore(pts) {
        this.score += pts;
    }

    addCoin() {
        this.coins++;
        if (this.coins >= 100) {
            this.coins = 0;
            this.lives++;
            if (window.particleManager) {
                window.particleManager.addScoreText(this.player.x, this.player.y - 20, '1-UP!', '#22c55e');
            }
        }
    }

    spawnBlockContent(x, y, content) {
        if (content === 'coin') {
            this.addCoin();
            this.addScore(200);
            if (window.soundManager) window.soundManager.playCoin();
            if (window.particleManager) {
                window.particleManager.addScoreText(x, y - 20, '200');
                window.particleManager.spawnSparkles(x, y - 10, 12, '#fbbf24');
            }
        } else {
            const MushroomClass = window.MushroomPowerup || (typeof MushroomPowerup !== 'undefined' ? MushroomPowerup : null);
            if (MushroomClass) {
                const shroom = new MushroomClass(x - 21, y - 20, content);
                this.level.mushrooms.push(shroom);
            }
        }
    }

    triggerVentureModal(ventureKey) {
        this.state = 'MODAL';
        window.uiManager.openVentureModal(ventureKey);
    }

    resumeFromModal() {
        if (this.state === 'MODAL') {
            this.state = 'PLAYING';
        }
    }

    onFlagpoleReached() {
        this.state = 'FLAGPOLE';
    }

    triggerVictory() {
        if (this.state === 'VICTORY') return;
        this.state = 'VICTORY';
        const timeBonus = Math.max(0, Math.ceil(this.time)) * 50;
        this.score += timeBonus;
        const updatedLeaderboard = this.saveScoreToLeaderboard(this.playerName, this.score);
        setTimeout(() => {
            window.uiManager.showVictory(this.playerName, this.score, this.isNewHighScore, updatedLeaderboard);
        }, 1500);
    }

    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        let dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        if (dt > 0.1) dt = 0.1;

        this.update(dt);
        this.draw();

        window.inputHandler.clearJustPressed();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        // Fix #5: Space/Action input handling on TITLE and GAMEOVER screens
        if (this.state === 'TITLE' && window.inputHandler.isActionJustPressed()) {
            const name = window.uiManager.nameInput ? window.uiManager.nameInput.value.trim() : this.playerName;
            if (name && name.length >= 1) {
                this.start(name);
                return;
            }
        }

        if (this.state === 'GAMEOVER' && window.inputHandler.isActionJustPressed()) {
            this.restart();
            return;
        }

        if (window.inputHandler.isPauseJustPressed() && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
            this.isPaused = !this.isPaused;
            this.state = this.isPaused ? 'PAUSED' : 'PLAYING';
            window.uiManager.showPause(this.isPaused);
        }

        if (this.state === 'MODAL' && window.inputHandler.isActionJustPressed()) {
            window.uiManager.closeModal();
            return;
        }

        // Screen Shake Countdown
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            if (this.shakeTimer <= 0) {
                this.shakeIntensity = 0;
            }
        }

        if (this.state === 'PLAYING' || this.state === 'FLAGPOLE') {
            this.time -= dt;
            if (this.time <= 0 && !this.player.isDead) {
                this.player.die();
            }

            this.player.update(dt, window.inputHandler, this.level);
            this.level.update(dt, this.player);
            window.particleManager.update(dt);

            // Smooth Camera Easing with Lookahead
            const lookahead = this.player.facing * 90;
            const targetCamX = this.player.x - this.width * 0.35 + lookahead;
            this.camera.x += (targetCamX - this.camera.x) * 5.5 * dt;

            if (this.camera.x < 0) this.camera.x = 0;
            if (this.camera.x > this.level.width - this.width) {
                this.camera.x = this.level.width - this.width;
            }

            // Dynamic BGM Zone Tuning
            const nightRatio = (this.level && this.level.themeBlend !== undefined)
                ? this.level.themeBlend
                : (this.level && this.level.getNightBlendRatio ? this.level.getNightBlendRatio(this.camera.x) : 0);
            if (window.soundManager && window.soundManager.musicPlaying) {
                window.soundManager.setZone(nightRatio > 0.5 ? 'night' : 'day');
            }

            // Death & Game Over Check
            if (this.player.isDead && this.player.y > this.level.height + 120) {
                this.lives--;
                if (this.lives <= 0) {
                    this.state = 'GAMEOVER';
                    const updatedLeaderboard = this.saveScoreToLeaderboard(this.playerName, this.score);
                    window.uiManager.showGameOver(this.playerName, this.score, this.isNewHighScore, updatedLeaderboard);
                } else {
                    this.resetGame();
                }
            }

            // Update Live HUD
            window.uiManager.updateHUD(this.playerName, this.score, this.coins, this.world, this.time, this.lives);
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.ctx.save();

        // Apply Screen Shake Offset
        if (this.shakeTimer > 0) {
            const shakeX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
            const shakeY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
            this.ctx.translate(shakeX, shakeY);
        }

        if (this.state === 'TITLE') {
            const bgDay = window.spriteManager ? window.spriteManager.rawImages.bgDay : null;
            if (bgDay && bgDay.complete) {
                this.ctx.drawImage(bgDay, 0, 0, this.width, this.height);
            }
            this.level.draw(this.ctx, this.camera);
            this.player.draw(this.ctx, this.camera);
            this.ctx.restore();
            return;
        }

        // Draw Level Elements
        this.level.draw(this.ctx, this.camera);

        // Draw Player
        this.player.draw(this.ctx, this.camera);

        // Draw Particles & Floating Text
        window.particleManager.draw(this.ctx);

        this.ctx.restore();
    }
}

function bootGame() {
    if (!window.gameInstance) {
        window.gameInstance = new Game();
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', bootGame);
} else {
    bootGame();
}
