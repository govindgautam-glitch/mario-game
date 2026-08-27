/**
 * UI & Storytelling Modal System
 * Manages Start Screen Name Input, Live Arcade HUD, Local Leaderboards, High Score Badges, and Venture Lore Cards.
 */

const VENTURE_DATA = {
    innovher: {
        title: 'INNOVHER',
        tagline: 'VENTURE STUDIO FOR FOUNDERS',
        imgKey: 'shroomInnovher',
        text: 'INNOVHER IS A VENTURE STUDIO THAT WORKS ALONGSIDE EARLY-STAGE FOUNDERS TO TURN PROMISING IDEAS INTO STRUCTURED, EXECUTION-READY BUSINESSES. FROM REFINING THE MODEL AND PLANNING THE GO-TO-MARKET TO STRENGTHENING OPERATIONS, OPENING INDUSTRY NETWORKS AND FACILITATING ACCESS TO CAPITAL, INNOVHER HELPS FOUNDERS NAVIGATE WHAT COMES NEXT.'
    },
    innoveda: {
        title: 'INNOVEDA AI',
        tagline: 'END-TO-END TECH & AI INFRASTRUCTURE',
        imgKey: 'shroomInnoveda',
        text: 'INNOVEDA AI IS AN END-TO-END TECHNOLOGY COMPANY THAT HELPS BUSINESSES BUILD, STRENGTHEN AND SCALE THEIR DIGITAL INFRASTRUCTURE. FROM PRODUCT DEVELOPMENT AND CUSTOM SOFTWARE TO AI-POWERED AUTOMATION AND SCALABLE TECHNOLOGY SYSTEMS, IT BUILDS SOLUTIONS AROUND REAL BUSINESS REQUIREMENTS.'
    },
    innovidea: {
        title: 'INNOVIDEA',
        tagline: 'INTEGRATED MARKETING & DIGITAL SYSTEMS',
        imgKey: 'shroomInnovidea',
        text: 'INNOVIDEA IS AN INTEGRATED MARKETING AND TECHNOLOGY COMPANY THAT HELPS STARTUPS AND BUSINESSES BUILD THEIR BRAND, REACH THE RIGHT AUDIENCE AND CREATE THE DIGITAL SYSTEMS NEEDED TO GROW. FROM BRANDING, CONTENT AND PERFORMANCE MARKETING TO WEBSITES, CUSTOM SOFTWARE AND AI AUTOMATION.'
    },
    bharat: {
        title: 'BHARAT VENTURES',
        tagline: 'INDIA-FIRST INNOVATION ECOSYSTEM',
        imgKey: 'shroomBharat',
        text: 'BHARAT VENTURES IS A FULL-SPECTRUM, INDIA-FIRST INNOVATION ECOSYSTEM BUILT AT THE INTERSECTION OF NATIONAL POLICY AND GRASSROOTS ENTREPRENEURSHIP. IT BRINGS POLICY ACCESS, VENTURE STUDIO SUPPORT, OPERATIONAL EXPERTISE, CAPITAL PATHWAYS AND MARKET NETWORKS INTO ONE CLOSED LOOP.'
    },
    code: {
        title: 'ENCODE (CREATIVE LEARNING NETWORK)',
        tagline: 'AI-POWERED PHYGITAL LEARNING',
        imgKey: 'shroomCode',
        text: 'ENCODE IS AN AI-POWERED PHYGITAL LEARNING ECOSYSTEM CONNECTING STUDENTS, EDUCATORS AND INSTITUTIONS WITH PERSONALISED LEARNING PATHWAYS, INDUSTRY MENTORSHIP AND REAL-WORLD PROJECTS. FROM ADAPTIVE ASSESSMENTS TO MICRO-CREDIT PROGRAMMES, PORTFOLIO BUILDING, AND CAREER MATCHMAKING.'
    },
    beyondAbility: {
        title: 'BEYOND ABILITY X',
        tagline: 'PROFESSIONAL ECOSYSTEM FOR ATHLETES',
        imgKey: 'shroomBeyondAbility',
        text: 'BEYOND ABILITY X IS BUILDING INDIA\'S FIRST PROFESSIONAL ECOSYSTEM FOR DIFFERENTLY-ABLED ATHLETES, POWERED BY SPORT, MEDIA, TECHNOLOGY AND OPPORTUNITY. FROM NATIONWIDE TALENT DISCOVERY AND ELITE COACHING TO A BROADCASTED LEAGUE AND A UNIFIED ATHLETE PASSPORT.'
    }
};

class UIManager {
    constructor() {
        // In-game HUD
        this.playerNameEl = document.getElementById('hud-player-name');
        this.scoreEl = document.getElementById('hud-score');
        this.coinsEl = document.getElementById('hud-coins');
        this.worldEl = document.getElementById('hud-world');
        this.timeEl = document.getElementById('hud-time');
        this.livesEl = document.getElementById('hud-lives');

        // Start Screen Name Input
        this.nameInput = document.getElementById('player-name-input');
        this.startBtn = document.getElementById('btn-start-game');
        this.startLeaderboardEl = document.getElementById('start-leaderboard-list');

        // Lore Modal
        this.modalEl = document.getElementById('venture-modal');
        this.modalImg = document.getElementById('modal-mushroom-img');
        this.modalTitle = document.getElementById('modal-venture-title');
        this.modalText = document.getElementById('modal-venture-text');
        this.modalCloseBtn = document.getElementById('modal-close-btn');

        // Screens
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.victoryScreen = document.getElementById('victory-screen');
        this.pauseScreen = document.getElementById('pause-screen');

        this.isModalOpen = false;
        this.typewriterInterval = null;

        this.initEvents();
    }

    initEvents() {
        // Name Input validation
        if (this.nameInput) {
            this.nameInput.addEventListener('input', () => {
                this.validateNameInput();
            });

            this.nameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const name = this.nameInput.value.trim();
                    if (name.length >= 1 && window.gameInstance) {
                        window.gameInstance.start(name);
                    }
                }
            });
        }

        if (this.startBtn) {
            this.startBtn.addEventListener('click', () => {
                const name = this.nameInput ? this.nameInput.value.trim() : 'Player';
                if (name.length >= 1 && window.gameInstance) {
                    window.gameInstance.start(name);
                }
            });
        }

        if (this.modalCloseBtn) {
            this.modalCloseBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        const restartBtn = document.getElementById('btn-restart-game');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                if (window.gameInstance) window.gameInstance.restart();
            });
        }

        const gameOverTitleBtn = document.getElementById('btn-gameover-title');
        if (gameOverTitleBtn) {
            gameOverTitleBtn.addEventListener('click', () => {
                if (window.gameInstance) window.gameInstance.returnToTitle();
            });
        }

        const victoryRestartBtn = document.getElementById('btn-victory-restart');
        if (victoryRestartBtn) {
            victoryRestartBtn.addEventListener('click', () => {
                if (window.gameInstance) window.gameInstance.restart();
            });
        }

        const victoryTitleBtn = document.getElementById('btn-victory-title');
        if (victoryTitleBtn) {
            victoryTitleBtn.addEventListener('click', () => {
                if (window.gameInstance) window.gameInstance.returnToTitle();
            });
        }

        const joinUsBtn = document.getElementById('btn-join-us');
        if (joinUsBtn) {
            joinUsBtn.addEventListener('click', () => {
                // TODO: set Studio i application/contact URL here
                const studioIUrl = 'https://studio-i.org';
                console.log('Navigating to Studio i application/contact URL:', studioIUrl);
                try {
                    window.open(studioIUrl, '_blank');
                } catch (e) {
                    console.log('Opened Studio i link');
                }
            });
        }

        const audioToggleBtn = document.getElementById('btn-toggle-audio');
        if (audioToggleBtn) {
            audioToggleBtn.addEventListener('click', () => {
                // Fix #7: Call soundManager.init() before toggleMute() to ensure AudioContext is initialized
                if (window.soundManager) {
                    window.soundManager.init();
                    const muted = window.soundManager.toggleMute();
                    audioToggleBtn.innerText = muted ? '🔇 Muted' : '🔊 Audio';
                }
            });
        }
    }

    validateNameInput() {
        if (!this.nameInput || !this.startBtn) return;
        const name = this.nameInput.value.trim();
        if (name.length >= 1) {
            this.startBtn.removeAttribute('disabled');
            this.startBtn.classList.remove('btn-disabled');
        } else {
            this.startBtn.setAttribute('disabled', 'true');
            this.startBtn.classList.add('btn-disabled');
        }
    }

    renderLeaderboard(containerId, list, highlightName = '', highlightScore = -1) {
        const el = document.getElementById(containerId);
        if (!el) return;
        el.innerHTML = '';
        list.forEach((item, idx) => {
            const li = document.createElement('li');
            li.className = 'leaderboard-row';
            if (item.name === highlightName && item.score === highlightScore) {
                li.classList.add('highlight-row');
            }
            li.innerHTML = `
                <span class="lb-rank">#${idx + 1}</span>
                <span class="lb-name">${this.escapeHTML(item.name)}</span>
                <span class="lb-score">${String(item.score).padStart(6, '0')}</span>
            `;
            el.appendChild(li);
        });
    }

    escapeHTML(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    updateHUD(playerName, score, coins, world, time, lives) {
        if (this.playerNameEl) this.playerNameEl.innerText = playerName ? playerName.toUpperCase() : 'MARIO';
        if (this.scoreEl) this.scoreEl.innerText = String(score).padStart(6, '0');
        if (this.coinsEl) this.coinsEl.innerText = `x${String(coins).padStart(2, '0')}`;
        if (this.worldEl) this.worldEl.innerText = world;
        if (this.timeEl) this.timeEl.innerText = String(Math.max(0, Math.ceil(time))).padStart(3, '0');
        if (this.livesEl) this.livesEl.innerText = `x${lives}`;
    }

    showStartScreen(savedName = '', leaderboard = []) {
        this.hideAllScreens();
        if (this.nameInput) {
            this.nameInput.value = savedName;
            this.validateNameInput();
        }
        this.renderLeaderboard('start-leaderboard-list', leaderboard);
        if (this.startScreen) this.startScreen.classList.remove('hidden');
    }

    hideStartScreen() {
        if (this.startScreen) this.startScreen.classList.add('hidden');
    }

    showGameOver(playerName, score, isNewHighScore, leaderboard) {
        this.hideAllScreens();
        const titleEl = document.getElementById('gameover-personalized-title');
        if (titleEl) {
            titleEl.innerText = `NICE RUN, ${playerName.toUpperCase() || 'PLAYER'}!`;
        }
        const scoreEl = document.getElementById('gameover-final-score');
        if (scoreEl) scoreEl.innerText = String(score);

        const badge = document.getElementById('gameover-high-score-badge');
        if (badge) {
            if (isNewHighScore) badge.classList.remove('hidden');
            else badge.classList.add('hidden');
        }

        this.renderLeaderboard('gameover-leaderboard-list', leaderboard, playerName, score);
        if (this.gameOverScreen) this.gameOverScreen.classList.remove('hidden');
    }

    showVictory(playerName, finalScore, isNewHighScore, leaderboard) {
        this.hideAllScreens();
        const scoreVal = document.getElementById('victory-final-score');
        if (scoreVal) scoreVal.innerText = String(finalScore);

        const badge = document.getElementById('victory-high-score-badge');
        if (badge) {
            if (isNewHighScore) badge.classList.remove('hidden');
            else badge.classList.add('hidden');
        }

        const nameMsg = document.getElementById('victory-player-message');
        if (nameMsg) {
            nameMsg.innerText = `CONGRATULATIONS, ${playerName.toUpperCase() || 'FOUNDER'}!`;
        }

        this.renderLeaderboard('victory-leaderboard-list', leaderboard, playerName, finalScore);
        if (this.victoryScreen) this.victoryScreen.classList.remove('hidden');
    }

    showPause(paused) {
        if (this.pauseScreen) {
            if (paused) this.pauseScreen.classList.remove('hidden');
            else this.pauseScreen.classList.add('hidden');
        }
    }

    hideAllScreens() {
        if (this.startScreen) this.startScreen.classList.add('hidden');
        if (this.gameOverScreen) this.gameOverScreen.classList.add('hidden');
        if (this.victoryScreen) this.victoryScreen.classList.add('hidden');
        if (this.pauseScreen) this.pauseScreen.classList.add('hidden');
    }

    openVentureModal(ventureKey) {
        const data = VENTURE_DATA[ventureKey];
        if (!data) return;

        this.isModalOpen = true;
        if (this.modalEl) this.modalEl.classList.remove('hidden');

        const rawImg = window.spriteManager.rawImages[data.imgKey];
        if (rawImg && this.modalImg) {
            this.modalImg.src = rawImg.src;
        }

        if (this.modalTitle) {
            this.modalTitle.innerText = data.title;
        }

        if (this.modalText) {
            this.modalText.innerText = '';
            if (this.typewriterInterval) clearInterval(this.typewriterInterval);

            let charIdx = 0;
            const fullText = data.text;
            this.typewriterInterval = setInterval(() => {
                if (charIdx < fullText.length) {
                    this.modalText.innerText += fullText[charIdx];
                    charIdx++;
                } else {
                    clearInterval(this.typewriterInterval);
                }
            }, 10);
        }
    }

    closeModal() {
        this.isModalOpen = false;
        if (this.typewriterInterval) clearInterval(this.typewriterInterval);
        if (this.modalEl) this.modalEl.classList.add('hidden');
        
        // Fix #6: Clear justPressed and jump buffer so modal dismissal with Space doesn't trigger a jump
        if (window.inputHandler) {
            window.inputHandler.clearJustPressed();
        }
        if (window.gameInstance && window.gameInstance.player) {
            window.gameInstance.player.jumpBufferTimer = 0;
        }

        if (window.gameInstance) {
            window.gameInstance.resumeFromModal();
        }
    }
}

window.uiManager = new UIManager();
