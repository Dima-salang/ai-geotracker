
"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// --- GLSL SHADERS ---
// The Vertex Shader handles the 3D geometry
const vertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// The Fragment Shader calculates the Bayer matrix dithering per-pixel on a custom grid scale
const fragmentShader = `
  varying vec3 vNormal;
  uniform vec3 uColorDark;
  uniform vec3 uColorLight;

  // 4x4 Bayer Dither Matrix for that structured retro pixel look
  const int bayerMatrix[16] = int[](
      0,  8,  2, 10,
     12,  4, 14,  6,
      3, 11,  1,  9,
     15,  7, 13,  5
  );

  void main() {
      // 1. Calculate directional lighting
      vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
      float lightIntensity = dot(vNormal, lightDir) * 0.5 + 0.5;

      // 2. Downscale the coordinates internally in the shader to make the dithering extremely chunky and visible
      float pixelScale = 6.0;
      vec2 pixelatedCoord = floor(gl_FragCoord.xy / pixelScale);

      // 3. Get screen-space pixel coordinates relative to the blocky grid
      int x = int(mod(pixelatedCoord.x, 4.0));
      int y = int(mod(pixelatedCoord.y, 4.0));
      
      // 4. Look up the threshold from the matrix
      int index = x + y * 4;
      float ditherThreshold = float(bayerMatrix[index]) / 16.0;

      // 5. Compare the light intensity to the threshold
      vec3 finalColor = (lightIntensity > ditherThreshold) ? uColorLight : uColorDark;

      gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const EarthSphere = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Memoize the uniforms using the classic high-contrast stark black and white
  const uniforms = useMemo(
    () => ({
      uColorDark: { value: new THREE.Color("#000000") }, // Stark Black
      uColorLight: { value: new THREE.Color("#ffffff") }, // Crisp White
    }),
    []
  );

  // Rotate the sphere automatically (significantly faster and more dynamic)
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.65; // Faster spin for extra kinetic energy
      meshRef.current.rotation.x += delta * 0.15; // Multi-axis rotation to keep it lively
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* 64x64 segments is plenty smooth for a stylized dithered globe */}
      <sphereGeometry args={[2.0, 64, 64]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
};

export default function DitheredEarth() {
  return (
    // By using position: absolute and inset: 0, the Canvas fits perfectly
    // inside the parent's aspect-square container (w-full aspect-square relative)
    // without collapsing to 0 height. The background: transparent lets the
    // beautiful electric blue glow of the .neon-aura shine through perfectly!
    <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%", background: "transparent" }}>
      <Canvas
        camera={{ position: [0, 0, 5] }}
        style={{
          imageRendering: "pixelated",
          background: "transparent",
        }}
      >
        <EarthSphere />
      </Canvas>
    </div>
  );
}


