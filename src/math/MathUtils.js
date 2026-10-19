/**
 * Mathematical Utilities
 * Reverse-engineered from `ie` in production App3D-d68cb154.js
 */
export const MathUtils = {
  TWO_PI: Math.PI * 2,

  clamp(val, min = 0, max = 1) {
    return Math.max(min, Math.min(max, val));
  },

  lerp(a, b, t) {
    return (1 - t) * a + t * b;
  },

  /**
   * Exponential moving average damping calibrated for 60 FPS
   * @param {number} current - Current value
   * @param {number} target - Target value
   * @param {number} factor - Smoothing factor per frame
   * @returns {number} Interpolated value
   */
  lerpFPS(current, target, factor) {
    return current + (target - current) * factor;
  },

  efit(x, a1, a2, b1, b2) {
    return b1 + ((x - a1) * (b2 - b1)) / (a2 - a1);
  },

  fit(x, a1, a2, b1, b2) {
    return this.efit(this.clamp(x, Math.min(a1, a2), Math.max(a1, a2)), a1, a2, b1, b2);
  },

  smoothstep(min, max, val) {
    const t = this.clamp((val - min) / (max - min), 0, 1);
    return t * t * (3 - 2 * t);
  },

  frictionFPS(friction) {
    return Math.pow(friction, 1.0);
  }
};

// Backwards-compatible alias
export const ie = MathUtils;
