import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

import { CONFIG } from '../config/constants.js';
import { MathUtils } from '../math/MathUtils.js';
import { GlacialAudioEngine } from '../audio/GlacialAudioEngine.js';
import { GroundPedestal } from '../entities/GroundPedestal.js';
import { IglooModel } from '../entities/IglooModel.js';
import { IglooCage } from '../entities/IglooCage.js';
import { PlexusHUD } from '../ui/PlexusHUD.js';
import { TelemetryUI } from '../ui/TelemetryUI.js';

/**
 * Main 3D Application Orchestrator
 * Coordinates Three.js WebGL rendering, interaction planes,
 * entity subsystems, physics simulation, and audio engine.
 */
export class App3DIgloo {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;

    // Interaction & Animation State
    this.clock = new THREE.Clock();
    this.mouse = new THREE.Vector2(-999, -999);
    this.mouseTargetPlanePos = new THREE.Vector3(0, 0, 0);
    this.mousePlanePos = new THREE.Vector3(0, 0, 0);
    this.interactionPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.raycaster = new THREE.Raycaster();

    // Subsystems
    this.audio = new GlacialAudioEngine();
    this.ground = new GroundPedestal();
    this.igloo = new IglooModel();
    this.cage = new IglooCage();
    this.plexus = new PlexusHUD();
    this.telemetryUI = new TelemetryUI();

    // Intro Wave State
    this.introActive = true;
    this.introStartTime = 0;
    this.introDuration = CONFIG.INTRO_DURATION;

    // Loaders
    this.dracoLoader = null;
    this.ktx2Loader = null;
    this.exrLoader = null;

    this.init();
  }

  async init() {
    this.setupRenderer();
    this.setupLoaders();
    this.setupCameraAndControls();
    this.setupLighting();

    await this.ground.load(this.scene, this.ktx2Loader, this.dracoLoader);
    await this.igloo.load(this.scene, this.ktx2Loader);
    await this.cage.load(this.scene);

    this.plexus.create(this.scene);
    this.setupEvents();

    // Start intro sequence
    this.replayIntro();

    // Start render loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x050811, 1.0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050811, 0.018);
  }

  setupLoaders() {
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('/assets/libs/draco/');

    this.ktx2Loader = new KTX2Loader();
    this.ktx2Loader.setTranscoderPath('/assets/libs/basis/');
    this.ktx2Loader.detectSupport(this.renderer);

    this.exrLoader = new EXRLoader();
  }

  setupCameraAndControls() {
    this.camera = new THREE.PerspectiveCamera(
      CONFIG.CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      CONFIG.CAMERA_NEAR,
      CONFIG.CAMERA_FAR
    );
    this.camera.position.copy(CONFIG.CANONICAL_CAMERA_POSITION);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = CONFIG.CONTROLS_DAMPING_FACTOR;
    this.controls.target.copy(CONFIG.CANONICAL_CAMERA_TARGET);
    this.controls.minDistance = CONFIG.CONTROLS_MIN_DISTANCE;
    this.controls.maxDistance = CONFIG.CONTROLS_MAX_DISTANCE;
    this.controls.maxPolarAngle = CONFIG.CONTROLS_MAX_POLAR_ANGLE;
    this.controls.autoRotate = false;
    this.controls.update();
  }

  setupLighting() {
    // 1. Polar environment HDR reflection map
    this.exrLoader.load('/assets/images/cubes_env.exr', (texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      this.scene.environment = texture;
    });

    // 2. Directional Sun (Nordic sunlight across polar landscape)
    const sunLight = new THREE.DirectionalLight(0xe4f4ff, 2.5);
    sunLight.position.set(-16, 22, 14);
    sunLight.castShadow = false;
    this.scene.add(sunLight);

    // 3. Cyan Glacial Secondary Fill Light (Polar ice bounce from floor)
    const fillLight = new THREE.DirectionalLight(0x4296ca, 1.2);
    fillLight.position.set(15, 10, -15);
    this.scene.add(fillLight);

    // 4. Deep Ambient Polar Sky Light
    const ambLight = new THREE.AmbientLight(0x0a1628, 1.8);
    this.scene.add(ambLight);
  }

  setupEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Setup camera-facing interaction plane passing through igloo center
    const updatePlane = () => {
      const camDir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
      this.interactionPlane.setFromNormalAndCoplanarPoint(camDir, this.controls.target);
    };

    const handlePointerMove = (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      updatePlane();
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const p = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.interactionPlane, p)) {
        this.mouseTargetPlanePos.copy(p);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('mousemove', handlePointerMove);

    document.addEventListener('mouseleave', (e) => {
      if (!e.relatedTarget && (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight)) {
        this.mouse.set(-999, -999);
      }
    });

    // Brick Click: Glacial shockwave ripple
    window.addEventListener('click', (e) => {
      if (e.target.closest('#hud-overlay button')) return;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hits = this.raycaster.intersectObjects(this.igloo.brickMeshes);
      if (hits.length > 0) {
        const hit = hits[0].object.userData.brickData;
        if (hit) {
          this.igloo.triggerShockwave(hit.centroid);
          this.audio.playBeep(1200, 0.08);
        }
      }
    });

    // Bind UI HUD buttons
    this.telemetryUI.bindEvents({
      onAudioToggle: () => {
        const nextState = !this.audio.isMuted;
        this.audio.setMuted(nextState);
        return nextState;
      },
      onReplay: () => {
        this.replayIntro();
        this.audio.playBeep(660, 0.08);
      },
      onReset: () => {
        this.camera.position.copy(CONFIG.CANONICAL_CAMERA_POSITION);
        this.controls.target.copy(CONFIG.CANONICAL_CAMERA_TARGET);
        this.controls.update();
        this.audio.playBeep(980, 0.05);
      }
    });
  }

  replayIntro() {
    this.introActive = true;
    this.introStartTime = this.clock.getElapsedTime();
  }

  animate() {
    requestAnimationFrame(this.animate);

    const time = this.clock.getElapsedTime();
    this.controls.update();

    // 1. Smooth 3D mouse position (responsive tracking with 0.18 lerp)
    this.mousePlanePos.lerp(this.mouseTargetPlanePos, CONFIG.MOUSE_LERP_FACTOR);

    // 2. Intro wave cascade calculations
    let waveY = 999;
    let introProgress = 1.0;
    if (this.introActive) {
      const elapsed = time - this.introStartTime;
      const progress = Math.min(1.0, elapsed / this.introDuration);
      this.cage.update(this.introActive, progress);

      introProgress = Math.min(1.0, elapsed / (this.introDuration * 0.75));
      waveY = MathUtils.lerp(4.2, -0.6, introProgress);

      if (elapsed >= this.introDuration) {
        this.introActive = false;
        this.cage.update(false, 1.0);
      }
    }

    // 3. Update ground pedestal shader uniforms
    this.ground.update(time, this.mousePlanePos, introProgress);

    // 4. Update igloo masonry block physics
    const { peakDisp, displacedCount } = this.igloo.updatePhysics(
      time,
      this.mousePlanePos,
      this.introActive,
      waveY,
      introProgress
    );

    // 5. Update Plexus holographic telemetry HUD (R3, P3, D3)
    const activePlexusCount = this.plexus.update(
      time,
      this.mousePlanePos,
      this.igloo.objects,
      this.introActive,
      this.camera,
      window.innerWidth,
      window.innerHeight
    );

    // 6. Update Audio resonance & HUD telemetry metrics
    const iglooActiveRatio = displacedCount > 0 ? Math.min(1.0, displacedCount / 6.0) : 0;
    this.audio.setIglooVolume(iglooActiveRatio);
    this.audio.update();

    this.telemetryUI.updateMetrics(
      displacedCount,
      this.igloo.objects.length,
      peakDisp,
      activePlexusCount
    );

    // 7. Render frame
    this.renderer.render(this.scene, this.camera);
  }
}
