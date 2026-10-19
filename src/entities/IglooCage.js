import * as THREE from 'three';

/**
 * Holographic Coordinate Wireframe Cage (w3)
 * Displays a delicate geometric outline cage during the intro shockwave sequence.
 */
export class IglooCage {
  constructor() {
    this.mesh = null;
    this.material = null;
  }

  async load(scene) {
    try {
      const res = await fetch('/assets/geometries/igloo_cage.json');
      if (!res.ok) return;
      const cageData = await res.json();

      const cageGeo = new THREE.BufferGeometry();
      cageGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cageData.positions), 3));
      cageGeo.setIndex(cageData.indices);

      this.material = new THREE.LineBasicMaterial({
        color: 0x7ee8fa,
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      this.mesh = new THREE.LineSegments(new THREE.WireframeGeometry(cageGeo), this.material);
      this.mesh.visible = true;
      scene.add(this.mesh);
    } catch (err) {
      console.warn('Failed to load authentic cage geometry:', err);
    }
  }

  update(introActive, progress) {
    if (!this.mesh || !this.material) return;

    if (!introActive) {
      this.mesh.visible = false;
      this.material.opacity = 0.0;
      return;
    }

    this.mesh.visible = true;
    if (progress < 0.2) {
      this.material.opacity = (progress / 0.2) * 0.45;
    } else if (progress < 0.6) {
      this.material.opacity = 0.45;
    } else {
      const fadeOut = (progress - 0.6) / 0.4;
      this.material.opacity = Math.max(0, 0.45 * (1.0 - fadeOut));
    }
  }
}
