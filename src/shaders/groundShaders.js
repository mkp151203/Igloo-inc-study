/**
 * Authentic Polar Ground Pedestal Shader (y3)
 * Reverse-engineered from canonical App3D-d68cb154.js
 * Features:
 * - Dynamic wind drifting procedural noise layers
 * - Mouse proximity surface glow in world space
 * - Intro shockwave expanding rings with triangle wireframe pulse
 * - Perimeter fade falloff
 */

export const groundVertexShader = `
  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vWorldPos;
  varying vec3 vMouseGlow;

  uniform vec3 uMousePos;

  void main() {
    vUv = uv;
    vPos = position;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;

    vMouseGlow = (1.0 - clamp(distance(uMousePos, vWorldPos.xyz * vec3(1.0, 0.0, 1.0)), 0.0, 5.0) / 5.0) * vec3(0.5, 0.7, 1.0) * smoothstep(-0.5, 2.0, uMousePos.y);
    vMouseGlow *= 1.0 - clamp(length(vWorldPos.xyz), 0.0, 9.0) / 9.0;
    vMouseGlow *= 2.0;

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const groundFragmentShader = `
  precision highp float;

  varying vec2 vUv;
  varying vec3 vPos;
  varying vec3 vWorldPos;
  varying vec3 vMouseGlow;

  uniform sampler2D tMap;
  uniform sampler2D tWind;
  uniform sampler2D tGroundGlow;
  uniform sampler2D tTriangles;
  uniform sampler2D tNoise;

  uniform vec3 uMousePos;
  uniform float uTime;
  uniform float uAlpha;
  uniform float uProgress;
  uniform float uProgress2;

  float _linstep(float begin, float end, float t) {
    return clamp((t - begin) / (end - begin), 0.0, 1.0);
  }

  float falloff(float _input, float start, float end, float margin, float progress) {
    float m = margin * sign(end - start);
    float p = mix(start - m, end, progress);
    return _linstep(p + m, p, _input);
  }

  float falloffsmooth(float _input, float start, float end, float margin, float progress) {
    float m = margin * sign(end - start);
    float p = mix(start - m, end, progress);
    return smoothstep(p + m, p, _input);
  }

  void main() {
    float alpha = 1.0;
    vec3 terrainColor = texture2D(tMap, vUv).rgb;

    // Ground glow based on mouse position
    vec3 glow = texture2D(tGroundGlow, vUv).rgb;
    float glowStrength = (sin(vPos.x - uTime * 1.0 + 3.2) * 0.5 + 0.5);
    terrainColor += glow * glowStrength * terrainColor.r;
    terrainColor += vMouseGlow * terrainColor.r;

    // Dynamic wind drift
    float t = uTime;
    float verticalGrad = (1.0 - clamp(vPos.y * 0.3 + 1.1, 0.0, 1.0));
    float wind = texture2D(tWind, vWorldPos.xz * 0.15 + vUv * 0.1 + vec2(-t * 0.15, -t * 0.15)).r;
    wind *= texture2D(tWind, vWorldPos.xz * 0.17 + vUv * 0.1 + vec2(-t * 0.15, -t * 0.15)).r;
    wind *= verticalGrad;
    terrainColor = mix(terrainColor, vec3(1.0), wind * 4.0);

    vec3 color = terrainColor;

    // Intro wave materialize
    if (uProgress2 < 1.0) {
      alpha *= 0.0;

      float noise = texture2D(tNoise, vWorldPos.xz * 0.07).r;
      float triangles = texture2D(tTriangles, vWorldPos.xz * 0.25).r;
      vec3 blue = vec3(0.3, 0.45, 1.0);
      float inputGradient = length(vWorldPos.xz) + noise * 3.5;

      // Terrain wave
      vec3 terrainShockwaveColor = vec3(0.0);
      float terrainShockwaveAlpha = 0.0;
      float terrainFalloff = 1.0 - falloffsmooth(inputGradient, 0.0, 32.0, 8.0, uProgress2);
      float terrainFalloff2 = 1.0 - falloffsmooth(inputGradient, 0.0, 32.0, 3.0, uProgress2);
      terrainShockwaveColor += terrainFalloff * triangles * blue * 3.0;
      terrainShockwaveColor += terrainFalloff2 * blue;
      terrainShockwaveAlpha += falloff(inputGradient, -0.1, 31.9, 0.1, uProgress2);

      // Triangles wave
      vec3 triangleShockwaveColor = vec3(0.0);
      float triangleShockwaveAlpha = 0.0;
      float triangleFalloff = 1.0 - falloffsmooth(inputGradient, 0.0, 32.0, 10.0, uProgress);
      triangleShockwaveColor += blue;
      triangleShockwaveAlpha += falloff(inputGradient, 1.0, 33.0, 0.1, uProgress);
      triangleShockwaveAlpha *= triangleFalloff * triangles;

      color += terrainShockwaveColor;
      alpha += terrainShockwaveAlpha;
      color += triangleShockwaveColor * (1.0 - terrainShockwaveAlpha);
      alpha += triangleShockwaveAlpha * (1.0 - terrainShockwaveAlpha);
    }

    // Fade smoothly at terrain perimeter
    alpha *= 1.0 - smoothstep(0.8, 1.0, length(vPos.xz) * 0.1085);

    // Color safety clamp
    alpha = clamp(alpha, 0.0, 1.0);
    color = clamp(color, vec3(0.0), vec3(1.0));

    alpha *= uAlpha;

    gl_FragColor = vec4(color, alpha);
  }
`;
