import * as THREE from 'three';
import { groundVertexShader, groundFragmentShader } from '../shaders/groundShaders.js';

/**
 * Authentic Polar Ground Pedestal (y3)
 * Loads procedural terrain geometry and renders dynamic wind drift,
 * mouse proximity surface glow, and intro shockwave pulses.
 */
export class GroundPedestal {
  constructor() {
    this.mesh = null;
    this.material = null;
  }

  async load(scene, ktx2Loader, dracoLoader) {
    try {
      const [groundColorTex, groundGlowTex, windTex, trianglesTex, noiseTex] = await Promise.all([
        ktx2Loader.loadAsync('/assets/images/igloo/ground_color.ktx2'),
        ktx2Loader.loadAsync('/assets/images/igloo/ground_glow.ktx2'),
        ktx2Loader.loadAsync('/assets/images/wind_noise.ktx2'),
        ktx2Loader.loadAsync('/assets/images/igloo/triangles_tiling.ktx2'),
        ktx2Loader.loadAsync('/assets/images/mosaic.ktx2')
      ]);

      windTex.wrapS = windTex.wrapT = THREE.RepeatWrapping;
      trianglesTex.wrapS = trianglesTex.wrapT = THREE.RepeatWrapping;
      noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;

      let geo;
      try {
        geo = await dracoLoader.loadAsync('/assets/geometries/ground.drc');
      } catch (err) {
        console.warn('Ground DRC load fallback to plane:', err);
        geo = new THREE.PlaneGeometry(80, 80, 64, 64);
        geo.rotateX(-Math.PI / 2);
      }

      this.material = new THREE.ShaderMaterial({
        uniforms: {
          tMap: { value: groundColorTex },
          tGroundGlow: { value: groundGlowTex },
          tWind: { value: windTex },
          tTriangles: { value: trianglesTex },
          tNoise: { value: noiseTex },
          uMousePos: { value: new THREE.Vector3(0, 0, 0) },
          uTime: { value: 0 },
          uAlpha: { value: 1.0 },
          uProgress: { value: 1.0 },
          uProgress2: { value: 1.0 }
        },
        vertexShader: groundVertexShader,
        fragmentShader: groundFragmentShader,
        transparent: true,
        depthWrite: false
      });

      this.mesh = new THREE.Mesh(geo, this.material);
      this.mesh.renderOrder = 2;
      this.mesh.receiveShadow = false;
      scene.add(this.mesh);

      console.log('Authentic ground pedestal loaded with polar terrain shader!');
    } catch (err) {
      console.error('Failed to create base pedestal:', err);
    }
  }

  update(time, mousePlanePos, introProgress) {
    if (!this.material || !this.material.uniforms) return;
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uMousePos.value.copy(mousePlanePos);
    this.material.uniforms.uProgress.value = introProgress;
    this.material.uniforms.uProgress2.value = introProgress;
  }
}
