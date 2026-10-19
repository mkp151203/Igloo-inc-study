import * as THREE from 'three';
import { MathUtils } from '../math/MathUtils.js';
import { CONFIG } from '../config/constants.js';

/**
 * Holographic Plexus Telemetry HUD (R3, P3, D3)
 * Reverse-engineered from canonical App3D-d68cb154.js.
 * Renders:
 * - R3: Delicate hairline wire segments dynamically linking displaced blocks
 * - P3: Rotating octahedron reticle crosshairs at block centroids
 * - D3: Projected 2D screen coordinate telemetry distance badges
 */
export class PlexusHUD {
  constructor() {
    this.maxPoints = CONFIG.PLEXUS.MAX_POINTS;
    this.maxLines = CONFIG.PLEXUS.MAX_LINES;
    this.lineMesh = null;
    this.lineMat = null;
    this.pointMeshes = [];
    this.labelElements = [];
    this.hoverAlpha = 0.0;
    this.activeNodes = [];
    this.tempVec = new THREE.Vector3();
    this.tempVec2 = new THREE.Vector3();
  }

  create(scene) {
    // 1. R3: LineSegments Mesh - authentic hairline width with delicate opacity and additive blending
    const linePositions = new Float32Array(this.maxLines * 2 * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));

    this.lineMat = new THREE.LineBasicMaterial({
      color: 0xcae8ff,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false
    });

    this.lineMesh = new THREE.LineSegments(lineGeo, this.lineMat);
    this.lineMesh.frustumCulled = false;
    this.lineMesh.renderOrder = 999;
    this.lineMesh.visible = false;
    scene.add(this.lineMesh);

    // 2. P3: Diamond Point Markers - delicate compact crosshairs
    const pointGeo = new THREE.OctahedronGeometry(CONFIG.PLEXUS.POINT_RADIUS, 0);
    const pointMat = new THREE.MeshBasicMaterial({
      color: 0xcae8ff,
      wireframe: true,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false
    });

    for (let i = 0; i < this.maxPoints; i++) {
      const pm = new THREE.Mesh(pointGeo, pointMat.clone());
      pm.visible = false;
      pm.renderOrder = 1000;
      scene.add(pm);
      this.pointMeshes.push(pm);
    }

    // 3. D3: Screen HTML telemetry labels
    let hudContainer = document.getElementById('plexus-tags-container');
    if (!hudContainer) {
      hudContainer = document.createElement('div');
      hudContainer.id = 'plexus-tags-container';
      document.body.appendChild(hudContainer);
    }

    this.labelElements = [];
    for (let i = 0; i < this.maxPoints; i++) {
      const el = document.createElement('div');
      el.className = 'plexus-node-tag';
      el.style.display = 'none';
      el.style.opacity = '0';
      hudContainer.appendChild(el);
      this.labelElements.push(el);
    }
  }

  update(time, mousePlanePos, objects, introActive, camera, width, height) {
    if (!this.lineMesh) return 0;

    // Proximity candidates:
    // Check both current displacement AND target displacement within generous 3.8m radius
    // so displaced blocks (+0.8m) and fast swipes maintain unbroken continuity
    const candidates = objects.filter((b) => {
      const isTargetedOrDisplaced = b.displacement > 0.02 || b.targetDisplacement1 > 0.04;
      if (!isTargetedOrDisplaced) return false;
      return b.mesh.position.distanceTo(mousePlanePos) < CONFIG.PLEXUS.CANDIDATE_SEARCH_RADIUS;
    });

    // Score candidates with hysteresis: already-active nodes receive a 20% bonus
    // to prevent rapid swapping / glitching on microscopic mouse twitches
    candidates.sort((a, b) => {
      const bonusA = this.activeNodes.includes(a) ? CONFIG.PLEXUS.HYSTERESIS_ACTIVE_BONUS : 1.0;
      const bonusB = this.activeNodes.includes(b) ? CONFIG.PLEXUS.HYSTERESIS_ACTIVE_BONUS : 1.0;
      const da = a.mesh.position.distanceTo(mousePlanePos) * bonusA;
      const db = b.mesh.position.distanceTo(mousePlanePos) * bonusB;
      return da - db;
    });

    const activeNodes = candidates.slice(0, this.maxPoints);
    this.activeNodes = activeNodes;

    // Hover is active whenever blocks are targeted/displaced near cursor
    const targetHover = (!introActive && candidates.length >= 2) ? 1.0 : 0.0;
    this.hoverAlpha = MathUtils.lerpFPS(
      this.hoverAlpha,
      targetHover,
      targetHover > 0 ? CONFIG.PLEXUS.FADE_IN_RATE : CONFIG.PLEXUS.FADE_OUT_RATE
    );

    // Fade line material opacity gracefully with authentic hairline intensity
    this.lineMat.opacity = this.hoverAlpha * CONFIG.PLEXUS.LINE_OPACITY;

    if (this.hoverAlpha < 0.005) {
      this.lineMesh.visible = false;
      for (let i = 0; i < this.maxPoints; i++) {
        this.pointMeshes[i].visible = false;
        this.labelElements[i].style.display = 'none';
        this.labelElements[i].style.opacity = '0';
      }
      this.activeNodes = [];
      return 0;
    }

    // Gracefully animate per-node plexus progress
    objects.forEach((b) => {
      const targetAnim = activeNodes.includes(b) ? 1.0 : 0.0;
      b.plexusAnimation = MathUtils.lerpFPS(b.plexusAnimation || 0.0, targetAnim, targetAnim > 0 ? 0.12 : 0.08);
    });

    // 1. Update Diamond Points (P3)
    for (let i = 0; i < this.maxPoints; i++) {
      const pm = this.pointMeshes[i];
      if (i < activeNodes.length) {
        const node = activeNodes[i];
        const anim = (node.plexusAnimation || 0.0) * this.hoverAlpha;
        if (anim > 0.01) {
          pm.position.copy(node.uiPos);
          pm.rotation.y = time * 1.5;
          pm.rotation.z = Math.sin(time * 2.0) * 0.4;
          const baseScale = Math.min(1.0, node.displacement * 3.2);
          pm.scale.setScalar(Math.max(0.001, baseScale * anim));
          pm.material.opacity = anim * CONFIG.PLEXUS.POINT_OPACITY;
          pm.visible = true;
        } else {
          pm.visible = false;
        }
      } else {
        pm.visible = false;
      }
    }

    // 2. Update Lines (R3) - 2 nearest neighbors per node growing smoothly
    const linePosAttr = this.lineMesh.geometry.attributes.position;
    let lineIdx = 0;
    const connectedPairs = new Set();

    for (let i = 0; i < activeNodes.length; i++) {
      const nodeA = activeNodes[i];
      if ((nodeA.plexusAnimation || 0.0) < 0.02) continue;

      const neighbors = [];
      for (let j = 0; j < activeNodes.length; j++) {
        if (i !== j && (activeNodes[j].plexusAnimation || 0.0) > 0.02) {
          neighbors.push({
            j,
            node: activeNodes[j],
            dist: nodeA.uiPos.distanceTo(activeNodes[j].uiPos)
          });
        }
      }
      neighbors.sort((a, b) => a.dist - b.dist);

      for (let k = 0; k < Math.min(2, neighbors.length); k++) {
        const neighbor = neighbors[k];
        if (neighbor.dist > 3.2) continue;
        const pairKey = i < neighbor.j ? `${i}-${neighbor.j}` : `${neighbor.j}-${i}`;
        if (!connectedPairs.has(pairKey)) {
          connectedPairs.add(pairKey);
          if (lineIdx < this.maxLines) {
            const anim = Math.min(nodeA.plexusAnimation || 0, neighbor.node.plexusAnimation || 0);
            const p1 = nodeA.uiPos;
            const p2 = neighbor.node.uiPos;

            // Gracefully interpolate line end point as connection forms
            this.tempVec2.copy(p1).lerp(p2, anim);

            linePosAttr.array[lineIdx * 6 + 0] = p1.x;
            linePosAttr.array[lineIdx * 6 + 1] = p1.y;
            linePosAttr.array[lineIdx * 6 + 2] = p1.z;
            linePosAttr.array[lineIdx * 6 + 3] = this.tempVec2.x;
            linePosAttr.array[lineIdx * 6 + 4] = this.tempVec2.y;
            linePosAttr.array[lineIdx * 6 + 5] = this.tempVec2.z;
            lineIdx++;
          }
        }
      }
    }

    // Clear unused line vertices
    for (let k = lineIdx * 6; k < this.maxLines * 6; k++) {
      linePosAttr.array[k] = 0;
    }
    linePosAttr.needsUpdate = true;
    this.lineMesh.visible = lineIdx > 0 && this.hoverAlpha > 0.01;

    // 3. Update Displacement Numbers (D3)
    const halfW = width / 2;
    const halfH = height / 2;

    for (let i = 0; i < this.maxPoints; i++) {
      const el = this.labelElements[i];
      if (i < activeNodes.length) {
        const node = activeNodes[i];
        const anim = (node.plexusAnimation || 0.0) * this.hoverAlpha;
        if (anim > 0.02) {
          this.tempVec.copy(node.uiPos).project(camera);

          if (this.tempVec.z < 1.0) {
            const x = this.tempVec.x * halfW + halfW;
            const y = -this.tempVec.y * halfH + halfH;

            // 2-digit distance metric matching authentic REA D3 specification (e.g. 05, 12)
            const rawDist = node.centroid.distanceTo(node.mesh.position);
            let distCode = `${Math.floor(rawDist * 50)}`.slice(-2);
            if (distCode.length < 2) distCode = `0${distCode}`;

            el.textContent = distCode;
            el.style.left = `${x + 12}px`;
            el.style.top = `${y - 12}px`;
            el.style.opacity = anim.toFixed(3);
            el.style.display = 'block';
          } else {
            el.style.display = 'none';
          }
        } else {
          el.style.display = 'none';
        }
      } else {
        el.style.display = 'none';
      }
    }

    return Math.round(activeNodes.length * this.hoverAlpha);
  }
}
