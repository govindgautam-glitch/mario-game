/**
 * Studio i Mario Game — Mobile & Touch Controller Manager
 * Detects touch devices, handles responsive orientation warnings,
 * and binds high-performance multitouch game controls.
 */
class MobileManager {
    constructor() {
        this.isTouch = false;
        this.isPortrait = false;
        this.init();
    }

    init() {
        this.checkDevice();
        this.setupOrientation();
        this.setupTouchBindings();
        
        window.addEventListener('resize', () => this.onResize());
        window.addEventListener('orientationchange', () => this.onResize());
        document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
    }

    onDOMReady() {
        this.checkDevice();
        this.setupTouchBindings();
    }

    checkDevice() {
        this.isTouch = ('ontouchstart' in window) ||
                       (navigator.maxTouchPoints > 0) ||
                       (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

        if (this.isTouch) {
            document.body.classList.add('is-touch-device');
        }
        this.checkOrientation();
    }

    checkOrientation() {
        const isLandscape = window.innerWidth > window.innerHeight;
        this.isPortrait = !isLandscape && (this.isTouch || window.innerWidth <= 900);
        
        const overlay = document.getElementById('rotate-device-overlay');
        if (overlay) {
            if (this.isPortrait) {
                overlay.classList.remove('hidden');
                overlay.classList.add('show-portrait-warning');
            } else {
                overlay.classList.add('hidden');
                overlay.classList.remove('show-portrait-warning');
            }
        }
    }

    onResize() {
        this.checkOrientation();
        if (window.gameInstance) {
            window.gameInstance.resize();
        }
    }

    setupOrientation() {
        if (window.screen && window.screen.orientation && window.screen.orientation.addEventListener) {
            window.screen.orientation.addEventListener('change', () => this.onResize());
        }
    }

    setupTouchBindings() {
        const bindTouchBtn = (id, onStart, onEnd) => {
            const btn = document.getElementById(id);
            if (!btn || btn.dataset.touchBound === 'true') return;
            btn.dataset.touchBound = 'true';

            const handleStart = (e) => {
                if (e.cancelable) e.preventDefault();
                btn.classList.add('touch-active');
                if (window.soundManager) window.soundManager.init();
                onStart();
            };

            const handleEnd = (e) => {
                if (e.cancelable) e.preventDefault();
                btn.classList.remove('touch-active');
                onEnd();
            };

            btn.addEventListener('touchstart', handleStart, { passive: false });
            btn.addEventListener('touchend', handleEnd, { passive: false });
            btn.addEventListener('touchcancel', handleEnd, { passive: false });
        };

        bindTouchBtn('btn-left',
            () => { if (window.inputHandler) window.inputHandler.touchLeft = true; },
            () => { if (window.inputHandler) window.inputHandler.touchLeft = false; }
        );

        bindTouchBtn('btn-down',
            () => { if (window.inputHandler) window.inputHandler.touchDown = true; },
            () => { if (window.inputHandler) window.inputHandler.touchDown = false; }
        );

        bindTouchBtn('btn-right',
            () => { if (window.inputHandler) window.inputHandler.touchRight = true; },
            () => { if (window.inputHandler) window.inputHandler.touchRight = false; }
        );

        bindTouchBtn('btn-jump',
            () => {
                if (window.inputHandler) {
                    window.inputHandler.touchJump = true;
                    window.inputHandler.justPressed['Space'] = true;
                }
            },
            () => {
                if (window.inputHandler) {
                    window.inputHandler.touchJump = false;
                    window.inputHandler.justReleased['Space'] = true;
                }
            }
        );

        bindTouchBtn('btn-sprint',
            () => { if (window.inputHandler) window.inputHandler.touchSprint = true; },
            () => { if (window.inputHandler) window.inputHandler.touchSprint = false; }
        );

        // Continue Button on Venture Lore Modal — fast touch tap handling
        const closeBtn = document.getElementById('modal-close-btn');
        if (closeBtn && closeBtn.dataset.touchBound !== 'true') {
            closeBtn.dataset.touchBound = 'true';
            closeBtn.addEventListener('touchend', (e) => {
                if (e.cancelable) e.preventDefault();
                if (window.uiManager) window.uiManager.closeModal();
            }, { passive: false });
        }
    }
}

// Initialize Mobile Manager Instance
window.mobileManager = new MobileManager();
