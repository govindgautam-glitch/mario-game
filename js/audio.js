/**
 * Web Audio API Chiptune & Sound Generator
 * Generates retro 8-bit sound effects and background music dynamically.
 */
class SoundManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.musicPlaying = false;
        this.musicGain = null;
        this.sfxGain = null;
        this.musicInterval = null;
        this.currentZone = 'day';
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
            this.sfxGain.connect(this.masterGain);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
            this.musicGain.connect(this.masterGain);
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.35, this.ctx.currentTime);
        }
        return this.muted;
    }

    playTone(freq, duration, type = 'square', gainVal = 0.5, slideTo = null) {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        if (slideTo) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(10, slideTo), now + duration);
        }

        gain.gain.setValueAtTime(gainVal, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + duration);
    }

    playNoise(duration, gainVal = 0.5) {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(50, now + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(gainVal, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(now);
    }

    // Sound FX
    playJump() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.16);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.16);
    }

    playCoin() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(987.77, now); // B5
        osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6

        gain1.gain.setValueAtTime(0.4, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gain1);
        gain1.connect(this.sfxGain);

        osc1.start(now);
        osc1.stop(now + 0.35);
    }

    playBlockBump() {
        this.playTone(260, 0.1, 'triangle', 0.5, 120);
    }

    playPipe() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(140, now + 0.28);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.28);
    }

    playPowerupAppear() {
        if (this.muted) return;
        this.init();
        const notes = [330, 392, 659, 523, 587, 784];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 0.07, 'triangle', 0.4);
            }, i * 50);
        });
    }

    playPowerupCollect() {
        if (this.muted) return;
        this.init();
        const notes = [330, 392, 659, 523, 587, 784, 880, 1046];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 0.08, 'sine', 0.45);
            }, i * 45);
        });
    }

    playStomp() {
        this.playTone(240, 0.12, 'square', 0.5, 60);
        this.playNoise(0.08, 0.4);
    }

    playHurt() {
        this.playTone(400, 0.25, 'sawtooth', 0.6, 80);
    }

    playGameOver() {
        if (this.muted) return;
        this.init();
        const notes = [500, 470, 440, 392, 330, 260];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playTone(freq, 0.18, 'sawtooth', 0.45);
            }, i * 140);
        });
    }

    playFlagpole() {
        if (this.muted) return;
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(200, now + 1.0);

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 1.0);
    }

    playVictory() {
        if (this.muted) return;
        this.init();
        const notes = [
            { f: 523.25, d: 0.12, t: 0 },
            { f: 659.25, d: 0.12, t: 130 },
            { f: 783.99, d: 0.12, t: 260 },
            { f: 1046.50, d: 0.22, t: 390 },
            { f: 783.99, d: 0.12, t: 620 },
            { f: 1046.50, d: 0.45, t: 750 },
        ];
        notes.forEach(n => {
            setTimeout(() => {
                this.playTone(n.f, n.d, 'triangle', 0.5);
            }, n.t);
        });
    }

    // Dynamic 8-bit Mario Chiptune Melody Loop
    startMusic(zone = 'day') {
        this.currentZone = zone;
        if (this.musicPlaying) return;
        this.init();
        this.musicPlaying = true;

        const dayMelody = [
            // Note, duration (in 16th steps)
            { f: 659.25, d: 1 }, { f: 659.25, d: 1 }, { f: 0, d: 1 }, { f: 659.25, d: 1 },
            { f: 0, d: 1 }, { f: 523.25, d: 1 }, { f: 659.25, d: 2 },
            { f: 783.99, d: 2 }, { f: 0, d: 2 }, { f: 392.00, d: 2 }, { f: 0, d: 2 },
            { f: 523.25, d: 2 }, { f: 0, d: 1 }, { f: 392.00, d: 2 }, { f: 0, d: 1 },
            { f: 329.63, d: 2 }, { f: 0, d: 1 }, { f: 440.00, d: 1 }, { f: 493.88, d: 1 },
            { f: 466.16, d: 1 }, { f: 440.00, d: 2 }, { f: 392.00, d: 1.5 }, { f: 659.25, d: 1.5 },
            { f: 783.99, d: 1 }, { f: 880.00, d: 2 }, { f: 698.46, d: 1 }, { f: 783.99, d: 1 },
            { f: 0, d: 1 }, { f: 659.25, d: 2 }, { f: 523.25, d: 1 }, { f: 587.33, d: 1 }, { f: 493.88, d: 2 }
        ];

        const nightMelody = [
            { f: 261.63, d: 1 }, { f: 523.25, d: 1 }, { f: 246.94, d: 1 }, { f: 493.88, d: 1 },
            { f: 233.08, d: 1 }, { f: 466.16, d: 1 }, { f: 220.00, d: 2 },
            { f: 329.63, d: 2 }, { f: 311.13, d: 2 }, { f: 293.66, d: 2 }, { f: 0, d: 2 },
            { f: 220.00, d: 1 }, { f: 261.63, d: 1 }, { f: 293.66, d: 1 }, { f: 329.63, d: 2 },
            { f: 392.00, d: 1 }, { f: 349.23, d: 1 }, { f: 329.63, d: 1 }, { f: 293.66, d: 2 },
            { f: 261.63, d: 2 }, { f: 246.94, d: 2 }, { f: 220.00, d: 4 }
        ];

        let step = 0;
        const tempo = 135; // ms per step

        this.musicInterval = setInterval(() => {
            if (!this.musicPlaying || this.muted) return;
            const melody = this.currentZone === 'night' ? nightMelody : dayMelody;
            const note = melody[step % melody.length];
            if (note.f > 0) {
                const dur = (note.d * tempo) / 1000;
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = this.currentZone === 'night' ? 'sawtooth' : 'square';
                osc.frequency.setValueAtTime(note.f, now);

                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + dur * 0.95);

                osc.connect(gain);
                gain.connect(this.musicGain);

                osc.start(now);
                osc.stop(now + dur);
            }
            step++;
        }, tempo);
    }

    setZone(zone) {
        this.currentZone = zone;
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    }
}

window.soundManager = new SoundManager();
