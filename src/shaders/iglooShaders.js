/**
 * Authentic Glacial Ice Masonry Shader (U3)
 * Reverse-engineered from canonical App3D-d68cb154.js
 * Features:
 * - Dual resting/exploded lightmaps blended via displacement
 * - Displacement-driven emission along masonry edges
 * - SSS sunlight gradient and polar sky ambient glow
 * - Ground bounce coloring
 */

export const iglooVertexShader = `
  attribute float emission;

  varying vec2 vUv;
  varying vec3 vPos;
  varying float vEmission;

  void main() {
    vUv = uv;
    vEmission = emission;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const iglooFragmentShader = `
  precision highp float;

  varying vec2 vUv;
  varying vec3 vPos;
  varying float vEmission;

  uniform sampler2D tMap;
  uniform sampler2D tMapExploded;
  uniform sampler2D tTriangles;
  uniform sampler2D tNoise;

  uniform float uDisplacement;
  uniform float uBounce;
  uniform float uTime;
  uniform float uIntroMaterialize;

  float falloffsmooth(float pos, float p1, float p2, float smoothVal, float progress) {
    float r = smoothVal * sign(p2 - p1);
    float a = mix(p1 - r, p2, progress);
    float t = clamp((pos - (a + r)) / (-r), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
  }

  void main() {
    vec3 color = texture2D(tMap, vUv).rgb;
    vec3 exploded = texture2D(tMapExploded, vUv).rgb + 0.05;
    vec3 blue = vec3(0.5, 0.7, 1.0);

    // Fade between 'together' lightmap and 'exploded' lightmap based on displacement
    float textureMix = clamp(5.0 * uDisplacement, 0.0, 1.0);
    color = mix(color, exploded, textureMix);

    // Intro wave materialize animation
    if (uIntroMaterialize < 1.0) {
      float introEmissive = 1.0 - falloffsmooth(vPos.y, 3.95, -0.4, 1.5, uIntroMaterialize);
      if (introEmissive > 0.9999) discard;

      float triangles = texture2D(tTriangles, vUv * 5.0).r;
      introEmissive += clamp(introEmissive * triangles * 13.0, 0.0, 1.0);

      color += introEmissive * blue;
    }

    // Add emission based on displacement
    color += pow(vEmission, 2.0) * clamp(1.0 * uDisplacement, 0.0, 1.0) * blue;

    // Add idle emission (subtle pulse)
    vec3 powEmission = pow(vEmission, 8.0) * blue * 0.5;
    color += powEmission * (sin(vPos.x - uTime * 1.0 + 3.2) * 0.5 + 0.5);

    // Make inside of igloo glow on faces furthest from camera
    color += max(0.0, smoothstep(0.0, 2.0, vPos.x * 0.5 - vPos.z * 0.5)) * powEmission;

    // Add fake SSS from sunlight (sideways gradient, kept dark near ground)
    color += (vPos.x * 0.1 + 0.4) * 0.3 * min(vPos.y + 0.5, 1.0) * 0.5;

    // Color safety
    color = clamp(color, vec3(0.0), vec3(1.0));

    // Add ground bounce
    color += (1.0 - smoothstep(-1.5, 1.0, vPos.y)) * uBounce * vec3(0.8, 0.9, 1.0) * 0.25;

    gl_FragColor = vec4(color, 1.0);
  }
`;
