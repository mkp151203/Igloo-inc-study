# Igloo Inc. // 3D Interactive Model Deconstruction

An interactive WebGL2 / Three.js 3D reconstruction of the signature deconstructed ice dome inspired by [igloo.inc](https://igloo.inc/). This project demonstrates real-time procedural physics, harmonic dual-stage low-pass filtering, dynamic shader lightmap transitions, and a holographic telemetry HUD.

---

## ⚖️ Copyright & Disclaimer Notice

> [!IMPORTANT]
> This project is created strictly for **educational, non-commercial, and technical research purposes** to demonstrate advanced WebGL, Three.js, GLSL shader techniques, and interactive physics simulation.
>
> All original brand names, visual trademarks, and aesthetic concepts belong to their respective owners ([Igloo Inc.](https://igloo.inc/)).
> 
> **If this project or any asset included herein violates your copyright or intellectual property rights, please contact me directly at [mehulkumar2003@gmail.com](mailto:mehulkumar2003@gmail.com), and the relevant content will be removed promptly.**

---

## 🏛️ Repository Architecture

The project is structured into focused, single-responsibility ES modules under `src/`:

```
├── index.html                   # HTML5 shell & telemetry overlay layout
├── style.css                    # IBM Plex Mono styling, HUD panels & reticle badges
├── app.js                       # Root entry point alias (delegates to src/main.js)
├── .gitignore                   # Excludes all non-webpage assets, scratch scripts & build artifacts
├── package.json                 # Dependencies and Vite scripts
└── src/
    ├── main.js                  # Application bootstrap entry point
    │
    ├── config/
    │   └── constants.js         # Camera framing, dome radii, interaction envelopes & thresholds
    │
    ├── math/
    │   └── MathUtils.js         # FPS-calibrated exponential damping (lerpFPS), smoothstep, fit
    │
    ├── shaders/
    │   ├── iglooShaders.js      # U3 vertex & fragment shaders (exploded lightmaps & ice emission)
    │   └── groundShaders.js     # y3 vertex & fragment shaders (wind drift & world-space mouse glow)
    │
    ├── audio/
    │   └── GlacialAudioEngine.js# Web Audio synthesizer, ambient wind loop & crystalline resonance
    │
    ├── entities/
    │   ├── IglooModel.js        # 70 curved ashlar blocks, binary loader & 3D torquing physics
    │   ├── GroundPedestal.js    # Infinite polar terrain geometry & dynamic shader uniforms
    │   └── IglooCage.js         # w3 holographic coordinate wireframe cage for intro sequence
    │
    ├── ui/
    │   ├── PlexusHUD.js         # R3 hairline lines, P3 rotating diamonds, D3 screen badges
    │   └── TelemetryUI.js       # Live HUD readouts, audio controls & reset/replay handlers
    │
    └── core/
        └── App3DIgloo.js        # Central Three.js orchestrator, interaction plane & render loop
```

---

## 🔬 Core Technical Systems

### 1. Ashlar Masonry Geometry & Shader Pipeline (`src/entities/IglooModel.js`)
* **70 Curved Masonry Blocks**: Parsed from custom binary buffer (`igloo_blocks.bin`) with centroid vectors, vertex positions, normals, UVs, and masonry edge emission attributes.
* **Dual Lightmap PBR Blending (`src/shaders/iglooShaders.js`)**: Dynamically interpolates between resting `igloo_color.ktx2` and exploded `igloo_exploded_color.ktx2` lightmaps driven by real-time block displacement.
* **Dynamic Rim & Subsurface Scattering**: Edge emission squares with displacement force, illuminated by polar ambient sky reflections and simulated sunlight SSS.

### 2. Dual-Stage Virtual Inertia Physics (`src/entities/IglooModel.js`)
* **Harmonic Low-Pass Filters**: Every block independently filters displacement through a dual-stage pipeline (`targetBounce1` -> `targetBounce2` -> `bounce` at `0.05` and `targetDisplacement1` -> `targetDisplacement2` -> `displacement` at `0.06`).
* **Continuous 3.8m Repulsion Radius**: A generous spherical interaction envelope with cubic Hermite falloff (`smoothstep(0.8, 3.8, dist)`). This accounts for the `+0.8m` outward push of displaced blocks and high-speed cursor swipes without edge clipping or dropped frames.
* **Outward Normal Translation**: Blocks push outward along their normalized centroid vectors:
  $$\vec{p} = \vec{p}_{\text{base}} + \hat{n}_{\text{centroid}} \cdot (\text{displacement} \times 1.25)$$
* **3-Axis Dynamic Torquing**: Blocks twist asynchronously along X, Y, and Z axes using quaternions modulated by harmonic sine frequencies and unique pseudo-random seeds.

### 3. Holographic Telemetry HUD (`src/ui/PlexusHUD.js`)
* **R3 Hairline Connecting Lines**: Ultra-fine segments (`THREE.LineSegments`, `0.22` opacity, additive blending) dynamically linking up to 2 nearest neighbor blocks. Line endpoints smoothly grow and contract using `lerp(p1, p2, anim)`.
* **P3 Diamond Reticles**: Compact wireframe octahedra (`0.035m` radius, `0.32` opacity) rotating synchronously at block UI anchors.
* **D3 Distance Badges**: 2-digit distance metrics projected into 2D screen coordinates with graceful CSS opacity fading.
* **Node Stability Hysteresis**: Active nodes receive a 20% distance affinity bonus, preventing nearest neighbors from flickering or swapping during micro-movements.

### 4. Glacial Audio Engine (`src/audio/GlacialAudioEngine.js`)
* Decodes and loops ambient audio tracks (`wind.ogg` and `igloo.ogg`).
* Built-in procedural pink-noise arctic wind and crystal harmonic drone oscillators with low-pass filtering as a native Web Audio API fallback.
* Resonance volume scales dynamically with the number of displaced blocks.

---

## 🚀 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* npm (bundled with Node.js)

### Installation
```bash
# Clone repository
git clone https://github.com/your-username/igloo-deconstruction.git
cd igloo-deconstruction

# Install dependencies
npm install
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:5173/](http://localhost:5173/) in your browser.

### Production Build
```bash
npm run build
```
Generates optimized static assets in the `dist/` directory.

---

## 🕹️ Controls & Interactions

| Action | Control | Description |
|---|---|---|
| **Hover / Swipe** | Mouse / Trackpad | Displaces faceted ice blocks with low-pass inertia |
| **Orbit** | Left-Click + Drag | Rotates camera around the igloo in 3D |
| **Glacial Shockwave** | Click on any block | Triggers a radial pulse ripple through the masonry joints |
| **Toggle Audio** | Audio Button | Toggles spatial polar wind and crystalline drone resonance |
| **Replay Intro** | Replay Button | Triggers the cascading intro wave materialize sequence |
| **Reset Camera** | Reset Cam Button | Smoothly reframes to canonical 30° isometric perspective |

---

## 📬 Contact

For inquiries, feedback, or copyright takedown requests:
* **Email**: [mehulkumar2003@gmail.com](mailto:mehulkumar2003@gmail.com)
