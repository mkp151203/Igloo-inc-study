import { MathUtils } from '../math/MathUtils.js';

/**
 * Glacial Audio Synthesizer & Track Player
 * Handles ambient arctic wind, resonant crystalline drone,
 * dynamic displacement modulation, and HUD telemetry beeps.
 */
export class GlacialAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = true;
    this.windGain = null;
    this.iglooGain = null;
    this.windBuffer = null;
    this.iglooBuffer = null;
    this.windSource = null;
    this.iglooSource = null;
    this.targetIglooVolume = 0;
    this.currentIglooVolume = 0;
  }

  async init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(this.isMuted ? 0 : 0.22, this.ctx.currentTime);
    this.windGain.connect(this.ctx.destination);

    this.iglooGain = this.ctx.createGain();
    this.iglooGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.iglooGain.connect(this.ctx.destination);

    // Try loading authentic audio tracks from public assets
    try {
      const [windRes, iglooRes] = await Promise.all([
        fetch('/assets/audio/wind.ogg'),
        fetch('/assets/audio/igloo.ogg')
      ]);

      if (windRes.ok && iglooRes.ok) {
        const [windArr, iglooArr] = await Promise.all([
          windRes.arrayBuffer(),
          iglooRes.arrayBuffer()
        ]);

        this.windBuffer = await this.ctx.decodeAudioData(windArr);
        this.iglooBuffer = await this.ctx.decodeAudioData(iglooArr);

        this.startLoopSources();
      } else {
        this.startProceduralFallback();
      }
    } catch (_) {
      this.startProceduralFallback();
    }
  }

  startLoopSources() {
    if (!this.ctx || !this.windBuffer || !this.iglooBuffer) return;

    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = this.windBuffer;
    this.windSource.loop = true;
    this.windSource.connect(this.windGain);
    this.windSource.start(0);

    this.iglooSource = this.ctx.createBufferSource();
    this.iglooSource.buffer = this.iglooBuffer;
    this.iglooSource.loop = true;
    this.iglooSource.connect(this.iglooGain);
    this.iglooSource.start(0);
  }

  startProceduralFallback() {
    if (!this.ctx) return;

    // Procedural Arctic Wind (Pink noise generator)
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(360, this.ctx.currentTime);
    filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.windGain);
    whiteNoise.start();

    // Procedural Crystalline Drone
    const freqs = [110, 164.81, 220, 329.63];
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(f, this.ctx.currentTime);
      const subGain = this.ctx.createGain();
      subGain.gain.setValueAtTime(0.2 / (idx + 1), this.ctx.currentTime);
      osc.connect(subGain);
      subGain.connect(this.iglooGain);
      osc.start();
    });
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (!this.ctx) {
      if (!muted) this.init();
      return;
    }
    if (this.ctx.state === 'suspended' && !muted) {
      this.ctx.resume();
    }
    const t = this.ctx.currentTime;
    if (this.windGain) {
      this.windGain.gain.setTargetAtTime(muted ? 0 : 0.22, t, 0.1);
    }
    if (this.iglooGain && muted) {
      this.iglooGain.gain.setTargetAtTime(0, t, 0.1);
    }
  }

  setIglooVolume(vol) {
    this.targetIglooVolume = vol;
  }

  playBeep(freq = 880, duration = 0.05) {
    if (this.isMuted || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (_) {}
  }

  update() {
    if (this.isMuted || !this.ctx || !this.iglooGain) return;
    this.currentIglooVolume = MathUtils.lerpFPS(this.currentIglooVolume, this.targetIglooVolume, 0.1);
    const targetGain = this.currentIglooVolume * 0.42;
    this.iglooGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.06);
  }
}
