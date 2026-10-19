import { App3DIgloo } from './core/App3DIgloo.js';

// Instantiate 3D Igloo Application on DOM readiness
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App3DIgloo();
});

export { App3DIgloo };
