"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Particle terrain — the HackB4 "airfield at night".
 * All elevation math runs in the vertex shader, so the CPU
 * only advances a clock. Renders one static frame when the
 * user prefers reduced motion.
 */
export default function HeroScene({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      });
    } catch {
      return; // no WebGL — the page stays perfectly usable without it
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 3.4, 13.5);
    camera.lookAt(0, -0.5, 0);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    // ── geometry: flat grid, displaced in the shader ──────────
    const COLS = 220;
    const ROWS = 120;
    const WIDTH = 46;
    const DEPTH = 26;
    const count = COLS * ROWS;

    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    let i = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = (c / (COLS - 1) - 0.5) * WIDTH;
        const z = (r / (ROWS - 1) - 0.5) * DEPTH;
        positions[i * 3] = x;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = z;
        seeds[i] = Math.random();
        i++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSize: {
          value: 2.1 * renderer.getPixelRatio(),
        },
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uSize;
        attribute float aSeed;
        varying float vGlow;
        varying float vFade;

        float terrain(vec2 p, float t) {
          float h = 0.0;
          h += sin(p.x * 0.32 + t * 0.85) * 0.45;
          h += sin(p.y * 0.41 - t * 0.62) * 0.38;
          h += sin((p.x + p.y) * 0.14 + t * 0.4) * 0.85;
          // sharp ridges that catch the acid light
          float ridge = sin(p.x * 0.09 + t * 0.22) * sin(p.y * 0.12 - t * 0.18);
          h += pow(max(ridge, 0.0), 3.0) * 2.6;
          return h;
        }

        void main() {
          vec3 p = position;
          float t = uTime;
          float h = terrain(p.xz, t);
          // per-point jitter keeps the field grainy, not banded
          h += (aSeed - 0.5) * 0.55;
          p.y = h;

          vGlow = smoothstep(-0.6, 2.6, h);

          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * (1.0 + vGlow * 1.6) * (10.0 / -mv.z);

          // fade into the dark with distance
          vFade = 1.0 - smoothstep(16.0, 34.0, -mv.z);
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vGlow;
        varying float vFade;

        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          if (d > 0.5) discard;
          float softness = smoothstep(0.5, 0.12, d);

          // dim bone at the valleys, full acid at the peaks
          vec3 valley = vec3(0.30, 0.29, 0.26);
          vec3 peak = vec3(0.847, 1.0, 0.243);
          vec3 color = mix(valley, peak, vGlow);

          float alpha = softness * (0.16 + vGlow * 0.85) * vFade;
          gl_FragColor = vec4(color, alpha);
        }
      `,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // ── interaction: gentle camera parallax ───────────────────
    let targetX = 0;
    let targetY = 0;
    const onPointer = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetX = nx * 0.55;
      targetY = ny * 0.25;
    };
    if (!reducedMotion) {
      window.addEventListener("pointermove", onPointer, { passive: true });
    }

    // ── resize ─────────────────────────────────────────────────
    const resize = () => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    // ── loop ───────────────────────────────────────────────────
    const clock = new THREE.Clock();
    let raf = 0;
    let running = true;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!running) return;

      material.uniforms.uTime.value = clock.getElapsedTime();

      camera.position.x += (targetX - camera.position.x) * 0.03;
      camera.position.y += (3.4 + targetY - camera.position.y) * 0.03;
      camera.lookAt(0, -0.5, 0);

      renderer.render(scene, camera);
    };

    if (reducedMotion) {
      // single settled frame, no loop
      material.uniforms.uTime.value = 12.0;
      renderer.render(scene, camera);
    } else {
      const onVisibility = () => {
        running = document.visibilityState === "visible";
        if (running) clock.getDelta(); // swallow the paused gap
      };
      document.addEventListener("visibilitychange", onVisibility);
      tick();

      // ── teardown ─────────────────────────────────────────────
      return () => {
        cancelAnimationFrame(raf);
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("pointermove", onPointer);
        ro.disconnect();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      ro.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className={className} aria-hidden />;
}
