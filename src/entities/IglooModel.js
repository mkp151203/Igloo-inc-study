import * as THREE from 'three';
import { MathUtils } from '../math/MathUtils.js';
import { CONFIG } from '../config/constants.js';
import { iglooVertexShader, iglooFragmentShader } from '../shaders/iglooShaders.js';

/**
 * Authentic Igloo Model Subsystem (U3)
 * Manages 70 curved ashlar masonry ice blocks extracted from production assets.
 * Implements dual-stage virtual inertia physics, outward normal translation,
 * dynamic 3D torquing, and authentic dual-lightmap PBR ice shaders.
 */
export class IglooModel {
  constructor() {
    this.group = new THREE.Group();
    this.objects = [];
    this.brickMeshes = [];
  }

  async load(scene, ktx2Loader) {
    scene.add(this.group);

    try {
      const [iglooColorTex, iglooExplodedTex, trianglesTex, perlinNoiseTex] = await Promise.all([
        ktx2Loader.loadAsync('/assets/images/igloo/igloo_color.ktx2'),
        ktx2Loader.loadAsync('/assets/images/igloo/igloo_exploded_color.ktx2'),
        ktx2Loader.loadAsync('/assets/images/igloo/triangles_tiling.ktx2'),
        ktx2Loader.loadAsync('/assets/images/perlin-datatexture.ktx2')
      ]);

      trianglesTex.wrapS = trianglesTex.wrapT = THREE.RepeatWrapping;
      perlinNoiseTex.wrapS = perlinNoiseTex.wrapT = THREE.RepeatWrapping;

      const res = await fetch('/assets/geometries/igloo_blocks.bin');
      const buffer = await res.arrayBuffer();
      const dv = new DataView(buffer);

      const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
      if (magic !== 'IGLO') {
        throw new Error('Invalid magic in igloo_blocks.bin: ' + magic);
      }

      const numBlocks = dv.getUint32(4, true);
      let offset = 8;

      this.objects = [];
      this.brickMeshes = [];

      for (let b = 0; b < numBlocks; b++) {
        const blockId = dv.getUint32(offset, true);
        const cx = dv.getFloat32(offset + 4, true);
        const cy = dv.getFloat32(offset + 8, true);
        const cz = dv.getFloat32(offset + 12, true);
        const rx = dv.getFloat32(offset + 16, true);
        const ry = dv.getFloat32(offset + 20, true);
        const rz = dv.getFloat32(offset + 24, true);
        const numVerts = dv.getUint32(offset + 28, true);
        const numIndices = dv.getUint32(offset + 32, true);
        offset += 36;

        const positions = new Float32Array(buffer, offset, numVerts * 3).slice();
        offset += numVerts * 3 * 4;

        const normals = new Float32Array(buffer, offset, numVerts * 3).slice();
        offset += numVerts * 3 * 4;

        const uvs = new Float32Array(buffer, offset, numVerts * 2).slice();
        offset += numVerts * 2 * 4;

        const emissions = new Float32Array(buffer, offset, numVerts).slice();
        offset += numVerts * 4;

        const indices = new Uint16Array(buffer, offset, numIndices).slice();
        offset += numIndices * 2;
        const pad = (4 - ((numIndices * 2) % 4)) % 4;
        offset += pad;

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        geo.setAttribute('emission', new THREE.BufferAttribute(emissions, 1));
        geo.setIndex(new THREE.BufferAttribute(indices, 1));

        // Authentic Pure Glacial Ice Shader Material (U3) with dual resting/exploded lightmaps
        const mat = new THREE.ShaderMaterial({
          uniforms: {
            tMap: { value: iglooColorTex },
            tMapExploded: { value: iglooExplodedTex },
            tTriangles: { value: trianglesTex },
            tNoise: { value: perlinNoiseTex },
            uDisplacement: { value: 0 },
            uBounce: { value: 0 },
            uTime: { value: 0 },
            uIntroMaterialize: { value: 1.0 }
          },
          vertexShader: iglooVertexShader,
          fragmentShader: iglooFragmentShader,
          transparent: false
        });

        const mesh = new THREE.Mesh(geo, mat);
        const centroid = new THREE.Vector3(cx, cy, cz);
        mesh.position.copy(centroid);
        this.group.add(mesh);

        const normal = centroid.clone().normalize();
        const rand = new THREE.Vector3(rx, ry, rz);

        const brickData = {
          mesh,
          geo,
          mat,
          centroid: centroid.clone(),
          basePosition: centroid.clone(),
          baseQuaternion: mesh.quaternion.clone(),
          normal,
          rand,
          displacement: 0,
          targetDisplacement1: 0,
          targetDisplacement2: 0,
          bounce: 0,
          targetBounce1: 0,
          targetBounce2: 0,
          pieceIndex: blockId,
          plexusAnimation: 0,
          uiPos: new THREE.Vector3()
        };

        mesh.userData.brickData = brickData;
        this.objects.push(brickData);
        this.brickMeshes.push(mesh);
      }

      console.log(`Loaded ${this.objects.length} authentic ashlar masonry blocks with original shaders and lightmaps!`);
    } catch (err) {
      console.error('Failed to load authentic igloo model:', err);
    }
  }

  /**
   * Run low-pass virtual inertia physics & update 3D translations/rotations
   */
  updatePhysics(time, mousePlanePos, introActive, waveY, introProgress) {
    let peakDisp = 0;
    let displacedCount = 0;

    this.objects.forEach((brick) => {
      // 1. Idle resting breathing wave (micro-oscillation so ice blocks feel alive)
      let l = 0.28;
      l *= Math.sin(-time * 1.8 + brick.centroid.x) * 0.5 + 0.5;
      l *= Math.cos(-time * 1.0) * 0.5 + 0.5;
      l *= MathUtils.lerp(0.5, 2.0, brick.rand.z);
      l *= 0.35;

      // 2. Initial intro wave animation
      if (introActive) {
        const distToWave = Math.abs(brick.centroid.y - waveY);
        if (distToWave < 1.1) {
          const wavePhase = 1.0 - distToWave / 1.1;
          const openDisplacement = Math.sin(wavePhase * Math.PI) * 0.58;
          l = Math.max(l, openDisplacement);
        }
      } else {
        // Continuous cursor proximity repulsion field matching authentic REA U3 specification
        // Generous 3.8m interaction envelope accounts for outward displaced brick radius (+0.8m)
        const dist = brick.centroid.distanceTo(mousePlanePos);
        if (dist < CONFIG.INTERACTION_RADIUS) {
          const c = Math.sin(time + brick.rand.x * 12.342) * brick.rand.y;
          const smoothD = MathUtils.smoothstep(0.8, CONFIG.INTERACTION_RADIUS, dist);
          const h = MathUtils.fit(smoothD, 0.0, 1.0, 0.58 + 0.28 * c, 0.0);
          l = Math.max(l, h);
        }
      }

      // 3. Dual-stage Bounce filtering (lerpFPS 0.05)
      brick.targetBounce1 = l;
      brick.targetBounce2 = MathUtils.lerpFPS(brick.targetBounce2, brick.targetBounce1, CONFIG.PHYSICS_LERP_BOUNCE);
      brick.bounce = MathUtils.lerpFPS(brick.bounce, brick.targetBounce2, CONFIG.PHYSICS_LERP_BOUNCE);

      // 4. Dual-stage Displacement filtering (dampened near ground)
      const groundDamp = MathUtils.smoothstep(0.2, 0.6, brick.centroid.y);
      l *= groundDamp;
      l = Math.max(0, l);

      brick.targetDisplacement1 = l;
      brick.targetDisplacement2 = MathUtils.lerpFPS(brick.targetDisplacement2, brick.targetDisplacement1, CONFIG.PHYSICS_LERP_DISPLACEMENT);
      brick.displacement = MathUtils.lerpFPS(brick.displacement, brick.targetDisplacement2, CONFIG.PHYSICS_LERP_DISPLACEMENT);

      if (brick.displacement > peakDisp) {
        peakDisp = brick.displacement;
      }
      if (brick.displacement > 0.08) {
        displacedCount++;
      }

      // 5. Position Translation along Outward Normal
      brick.mesh.position.copy(brick.basePosition).addScaledVector(brick.centroid, brick.displacement * 1.25);

      // 6. Dynamic 3D Torquing / Rotation relative to Base Orientation (from REA U3)
      const aX = brick.rand.x * -0.6 * brick.displacement;
      const aY = brick.rand.y * -0.6 * brick.displacement;
      const aZ = brick.rand.z * -0.6 * brick.displacement;

      const qY = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        Math.cos(brick.displacement * 2.0 + brick.rand.z * 30.0) * brick.displacement * 0.5 + aY
      );
      const qZ = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, 1),
        Math.cos(brick.displacement * 2.0 + brick.rand.x * 30.0) * brick.displacement * 0.5 + aZ
      );
      const qX = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        Math.cos(brick.displacement * 2.0 + brick.rand.y * 30.0) * brick.displacement * 0.5 + aX
      );

      brick.mesh.quaternion.copy(brick.baseQuaternion).multiply(qY).multiply(qZ).multiply(qX);

      // 7. Update Authentic Shader Uniforms (U3)
      if (brick.mat && brick.mat.uniforms) {
        brick.mat.uniforms.uDisplacement.value = brick.displacement;
        brick.mat.uniforms.uBounce.value = brick.bounce;
        brick.mat.uniforms.uTime.value = time;
        brick.mat.uniforms.uIntroMaterialize.value = introProgress;
      }

      // Store UI Anchor for Plexus lifted slightly above the brick surface
      brick.uiPos.copy(brick.mesh.position).addScaledVector(brick.normal, 0.28);
    });

    return { peakDisp, displacedCount };
  }

  triggerShockwave(origin) {
    this.objects.forEach((brick) => {
      const dist = brick.centroid.distanceTo(origin);
      if (dist < 4.5) {
        const delay = dist * 45;
        setTimeout(() => {
          brick.targetDisplacement1 = Math.max(0, 0.65 * (1.0 - dist / 4.5));
          setTimeout(() => {
            brick.targetDisplacement1 = 0;
          }, 240);
        }, delay);
      }
    });
  }
}
