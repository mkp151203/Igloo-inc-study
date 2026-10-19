import * as THREE from 'three';

/**
 * Centralized Configuration Constants
 * Reverse-engineered from canonical igloo.inc specifications.
 */
export const CONFIG = {
  // Canonical camera framing (isometric polar angle)
  CANONICAL_CAMERA_POSITION: new THREE.Vector3(-13.5, 5.0, 13.5),
  CANONICAL_CAMERA_TARGET: new THREE.Vector3(0, 1.4, 0),
  CAMERA_FOV: 30,
  CAMERA_NEAR: 0.1,
  CAMERA_FAR: 120,

  // Orbit controls constraints
  CONTROLS_MIN_DISTANCE: 6.0,
  CONTROLS_MAX_DISTANCE: 38.0,
  CONTROLS_MAX_POLAR_ANGLE: Math.PI / 2 + 0.02,
  CONTROLS_DAMPING_FACTOR: 0.05,

  // Geometric dome dimensions
  DOME_CENTER: new THREE.Vector3(0, 1.1, 0),
  DOME_BASE_RADIUS: 2.5,
  DOME_MAX_HEIGHT: 2.85,

  // Interaction & Physics field envelope
  INTERACTION_RADIUS: 3.8,       // Accounts for outward displaced blocks (+0.8m)
  HOVER_DETECTION_RADIUS: 4.2,   // Broad 3D ray-sphere boundary for fast swipes
  MOUSE_LERP_FACTOR: 0.18,       // Fast responsive pointer tracking
  PHYSICS_LERP_BOUNCE: 0.05,     // Virtual harmonic bounce filter rate
  PHYSICS_LERP_DISPLACEMENT: 0.06, // Virtual displacement filter rate

  // Intro wave animation
  INTRO_DURATION: 3.2,           // Total seconds for introductory materialize cascade

  // Plexus HUD Subsystem (R3, P3, D3)
  PLEXUS: {
    MAX_POINTS: 5,
    MAX_LINES: 10,
    CANDIDATE_SEARCH_RADIUS: 3.8,
    HYSTERESIS_ACTIVE_BONUS: 0.8, // 20% distance affinity bonus to prevent node swapping
    LINE_OPACITY: 0.22,           // Hairline delicacy
    POINT_OPACITY: 0.32,
    POINT_RADIUS: 0.035,
    FADE_IN_RATE: 0.12,
    FADE_OUT_RATE: 0.045
  }
};
