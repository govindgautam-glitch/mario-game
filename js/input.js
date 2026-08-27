/**
 * Input Handler
 * Handles keyboard input, virtual touch controls, and frame-based key transitions.
 */
class InputHandler {
    constructor() {
        this.keys = {};
        this.justPressed = {};
        this.justReleased = {};

        // Virtual Touch State
        this.touchLeft = false;
        this.touchRight = false;
        this.touchJump = false;
        this.touchSprint = false;

        this.initKeyboard();
        this.initTouchControls();
    }

    initKeyboard() {
        window.addEventListener('keydown', (e) => {
            const code = e.code;
            if (!this.keys[code]) {
                this.justPressed[code] = true;
            }
            this.keys[code] = true;

            // Prevent page scrolling on gaming keys
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
                e.preventDefault();
            }

            // Audio context unlock on first user gesture
            if (window.soundManager) {
                window.soundManager.init();
            }
        });

        window.addEventListener('keyup', (e) => {
            const code = e.code;
            this.keys[code] = false;
            this.justReleased[code] = true;
        });

        window.addEventListener('blur', () => {
            this.keys = {};
            this.justPressed = {};
            this.justReleased = {};
            this.touchLeft = false;
            this.touchRight = false;
            this.touchJump = false;
            this.touchSprint = false;
        });
    }

    initTouchControls() {
        const bindTouch = (id, onStart, onEnd) => {
            const el = document.getElementById(id);
            if (!el) return;
            const startHandler = (e) => {
                e.preventDefault();
                if (window.soundManager) window.soundManager.init();
                onStart();
            };
            const endHandler = (e) => {
                e.preventDefault();
                onEnd();
            };
            el.addEventListener('touchstart', startHandler, { passive: false });
            el.addEventListener('touchend', endHandler, { passive: false });
            el.addEventListener('touchcancel', endHandler, { passive: false });
            el.addEventListener('mousedown', startHandler);
            el.addEventListener('mouseup', endHandler);
            el.addEventListener('mouseleave', endHandler);
        };

        bindTouch('btn-left', () => { this.touchLeft = true; }, () => { this.touchLeft = false; });
        bindTouch('btn-right', () => { this.touchRight = true; }, () => { this.touchRight = false; });
        bindTouch('btn-jump', () => {
            this.touchJump = true;
            this.justPressed['Space'] = true;
        }, () => {
            this.touchJump = false;
            this.justReleased['Space'] = true;
        });
        bindTouch('btn-sprint', () => { this.touchSprint = true; }, () => { this.touchSprint = false; });
    }

    isLeft() {
        return this.keys['ArrowLeft'] || this.keys['KeyA'] || this.touchLeft;
    }

    isRight() {
        return this.keys['ArrowRight'] || this.keys['KeyD'] || this.touchRight;
    }

    isJump() {
        return this.keys['Space'] || this.keys['ArrowUp'] || this.keys['KeyW'] || this.keys['KeyK'] || this.touchJump;
    }

    isJumpJustPressed() {
        return (
            this.justPressed['Space'] ||
            this.justPressed['ArrowUp'] ||
            this.justPressed['KeyW'] ||
            this.justPressed['KeyK']
        );
    }

    isJumpJustReleased() {
        return (
            this.justReleased['Space'] ||
            this.justReleased['ArrowUp'] ||
            this.justReleased['KeyW'] ||
            this.justReleased['KeyK']
        );
    }

    isCrouch() {
        return this.keys['ArrowDown'] || this.keys['KeyS'];
    }

    isSprint() {
        return this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['KeyJ'] || this.touchSprint;
    }

    isPauseJustPressed() {
        return this.justPressed['KeyP'] || this.justPressed['Escape'];
    }

    isActionJustPressed() {
        return (
            this.justPressed['Space'] ||
            this.justPressed['Enter'] ||
            this.justPressed['KeyZ'] ||
            this.justPressed['KeyX']
        );
    }

    clearJustPressed() {
        this.justPressed = {};
        this.justReleased = {};
    }
}

window.inputHandler = new InputHandler();
