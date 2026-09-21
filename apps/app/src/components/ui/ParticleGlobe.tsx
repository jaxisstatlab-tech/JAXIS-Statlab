"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { globeScrollState } from "@/lib/globeState";

// ─── Tuning ───────────────────────────────────────────────────────────────────
const SPHERE_RADIUS = 2.4;
const HOTSPOT_COUNT = 36;    // Number of particles illuminated in hover cone

const REST_DIR = new THREE.Vector3(0, 0, 1).normalize();

// ─── Luminous Blue Palette (Exact from apps/web) ──────────────────────────────
const COL_NORMAL_NEAR = new THREE.Color(0x7dd3fc);   // Front face: crisp electric ice-blue
const COL_NORMAL_FAR  = new THREE.Color(0x06182c);   // Back face: deep sapphire navy
const COL_HOT_CORE    = new THREE.Color(0xf0f9ff);   // Interactive hover core: glowing brilliant white-cyan
const COL_HOT_EDGE    = new THREE.Color(0x0284c7);   // Interactive rim: vibrant azure blue

// ─── Texture factories ────────────────────────────────────────────────────────

/** Sharp core dot — crisp inner luminous center */
function makeCoreGlowTex(size = 128): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const half = size / 2;
  const g = ctx.createRadialGradient(half, half, 0, half, half, half);
  g.addColorStop(0,    "rgba(255,255,255,1.0)");
  g.addColorStop(0.22, "rgba(255,255,255,0.95)");
  g.addColorStop(0.50, "rgba(255,255,255,0.30)");
  g.addColorStop(0.80, "rgba(255,255,255,0.04)");
  g.addColorStop(1,    "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/** Wide feathered halo — soft diffused atmospheric bloom */
function makeHaloTex(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const half = size / 2;
  const g = ctx.createRadialGradient(half, half, 0, half, half, half);
  g.addColorStop(0,    "rgba(255,255,255,0.55)");
  g.addColorStop(0.20, "rgba(255,255,255,0.28)");
  g.addColorStop(0.50, "rgba(255,255,255,0.09)");
  g.addColorStop(0.80, "rgba(255,255,255,0.015)");
  g.addColorStop(1,    "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// ─── Geometry helper: Fibonacci Sphere ───────────────────────────────────────
function fibonacciSphere(count: number, radius: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const t = phi * i;
    pts.push(new THREE.Vector3(Math.cos(t) * r * radius, y * radius, Math.sin(t) * r * radius));
  }
  return pts;
}

export interface ParticleGlobeProps {
  className?: string;
  style?: React.CSSProperties;
  transparent?: boolean;
  /**
   * "center": Centered spherical starfield (standard landing page Hero mode)
   * "auth-crescent": Large right-anchored crescent spanning top-to-bottom with left gap (exact auth layout spec)
   */
  layout?: "center" | "auth-crescent";
  pointCount?: number;
  /** Set to true to enable mouse hover interaction and parallax tilt (defaults to false) */
  interactive?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ParticleGlobe({
  className,
  style,
  transparent = false,
  layout = "center",
  pointCount,
  interactive = false,
}: ParticleGlobeProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    // ── Renderer ─────────────────────────────────────────────────────────────
    let isWebGLSupported = false;
    try {
      const testCanvas = document.createElement("canvas");
      isWebGLSupported = !!(
        window.WebGLRenderingContext &&
        (testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl"))
      );
    } catch {
      isWebGLSupported = false;
    }

    if (!isWebGLSupported) {
      console.warn("WebGL not supported, falling back to no-globe.");
      return;
    }

    const initW = container.clientWidth || window.innerWidth;
    const initH = container.clientHeight || window.innerHeight;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(initW, initH);
      if (transparent) {
        renderer.setClearColor(0x000000, 0);
      } else {
        renderer.setClearColor(0x010114, 1);
      }
      container.appendChild(renderer.domElement);
    } catch {
      console.warn("WebGL renderer failed to initialize.");
      return;
    }

    // ── Scene & Camera ────────────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, initW / initH, 0.1, 100);
    camera.position.set(0, 0, 7.5);

    // ── Geometry Generation ───────────────────────────────────────────────────
    const count = pointCount ?? (layout === "auth-crescent" ? 850 : 700);
    const positions = fibonacciSphere(count, SPHERE_RADIUS);
    const normals   = positions.map(p => p.clone().normalize());

    // ── Dynamic Buffers ───────────────────────────────────────────────────────
    const hsTarget  = REST_DIR.clone();
    const hsCurrent = REST_DIR.clone();
    let   isPointerOver = false;
    let   hoverStrength = 0; // Continuous float: 0.0 (rest) to 1.0 (hovered)

    // Dynamic position buffer (allows smooth micro-forcefield particle displacement)
    const posBuf  = new Float32Array(count * 3);
    positions.forEach((p, i) => {
      posBuf[i * 3 + 0] = p.x;
      posBuf[i * 3 + 1] = p.y;
      posBuf[i * 3 + 2] = p.z;
    });
    const posAttr = new THREE.BufferAttribute(posBuf, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    posAttr.needsUpdate = true;

    // Shared colour buffer
    const colBuf  = new Float32Array(count * 3);
    const colAttr = new THREE.BufferAttribute(colBuf, 3);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    colAttr.needsUpdate = true;

    // ── Layer 1: sharp core dots ──────────────────────────────────────────────
    const coreGeo = new THREE.BufferGeometry();
    coreGeo.setAttribute("position", posAttr);
    coreGeo.setAttribute("color", colAttr);

    const coreTex = makeCoreGlowTex(128);
    const coreMat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      map: coreTex,
      alphaTest: 0.001,
    });
    const coreMesh = new THREE.Points(coreGeo, coreMat);

    // ── Layer 2: wide halo bloom ──────────────────────────────────────────────
    const haloGeo = new THREE.BufferGeometry();
    haloGeo.setAttribute("position", posAttr);
    haloGeo.setAttribute("color", colAttr);

    const haloTex = makeHaloTex(256);
    const haloMat = new THREE.PointsMaterial({
      size: 0.65,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      map: haloTex,
      alphaTest: 0.001,
    });
    const haloMesh = new THREE.Points(haloGeo, haloMat);

    // ── Group (Pure Dots only) ────────────────────────────────────────────────
    const group = new THREE.Group();
    group.add(haloMesh, coreMesh);
    scene.add(group);

    // ── Layout Metric Calculations ────────────────────────────────────────────
    function getLayoutMetrics(aspect: number) {
      const vH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * 2;
      const vW = vH * aspect;

      if (layout === "auth-crescent") {
        // Visual radius scaled so vertical diameter spans top to bottom of screen with generous arc
        const visualRadius = (vH / 2) * 1.34;
        const scale = visualRadius / SPHERE_RADIUS;
        // Left margin from auth panel (calibrated to move globe more to the left)
        const leftMargin = vW * 0.25;
        const crestX = -vW / 2 + leftMargin;
        const posX = crestX + visualRadius;
        return { posX, posY: 0, scale };
      } else {
        return { posX: 0, posY: 0, scale: 1.0 };
      }
    }

    // ── Particle & Color Updates with Zero-Allocation Pre-Allocated Buffers ───
    const invQuat    = new THREE.Quaternion();
    const localDir   = new THREE.Vector3();
    const camDir     = new THREE.Vector3(0, 0, 1);
    const camLocal   = new THREE.Vector3();
    const tmpCNormal = new THREE.Color();
    const tmpCHot    = new THREE.Color();
    const tmpLocalHit = new THREE.Vector3();

    const hotDotArray   = new Float32Array(count);
    const depthDotArray = new Float32Array(count);
    const particleIndices = new Int32Array(count);
    const hotRankArray  = new Int32Array(count);
    for (let i = 0; i < count; i++) {
      particleIndices[i] = i;
    }

    function updateParticles(t: number) {
      camDir.subVectors(camera.position, group.position).normalize();
      invQuat.copy(group.quaternion).invert();
      camLocal.copy(camDir).applyQuaternion(invQuat).normalize();

      if (interactive && hoverStrength > 0.005) {
        localDir.copy(hsCurrent).applyQuaternion(invQuat).normalize();

        // Compute dot products into flat Float32 buffers
        for (let i = 0; i < count; i++) {
          const n = normals[i]!;
          hotDotArray[i] = n.dot(localDir);
          depthDotArray[i] = n.dot(camLocal);
          particleIndices[i] = i;
        }

        // Sort index buffer in-place without creating objects
        particleIndices.sort((a, b) => (hotDotArray[b] ?? 0) - (hotDotArray[a] ?? 0));

        hotRankArray.fill(-1);
        for (let r = 0; r < HOTSPOT_COUNT; r++) {
          const idx = particleIndices[r];
          if (idx !== undefined) {
            hotRankArray[idx] = r;
          }
        }

        // Update positions & colors with seamless continuous decay
        for (let i = 0; i < count; i++) {
          const p = positions[i]!;
          const n = normals[i]!;
          const depthDot = depthDotArray[i] ?? 0;
          const rank     = hotRankArray[i] ?? -1;
          const hotDot   = hotDotArray[i] ?? 0;

          // Smooth continuous displacement with zero snapping on exit
          let displacement = 0;
          if (hoverStrength > 0.005 && hotDot > 0.45) {
            const intensity = Math.min(1, Math.max(0, (hotDot - 0.45) / 0.55));
            displacement = intensity * hoverStrength * (0.16 + Math.sin(t * 4.5 + hotDot * 6) * 0.03);
          }

          posBuf[i * 3 + 0] = p.x + n.x * displacement;
          posBuf[i * 3 + 1] = p.y + n.y * displacement;
          posBuf[i * 3 + 2] = p.z + n.z * displacement;

          // Base natural blue depth gradient
          const depthFactor = Math.pow(Math.max(0, depthDot), 1.25);
          tmpCNormal.lerpColors(COL_NORMAL_FAR, COL_NORMAL_NEAR, depthFactor);

          // Smooth color crossfade based on hoverStrength
          if (rank >= 0 && hoverStrength > 0.005) {
            const rankT = rank / (HOTSPOT_COUNT - 1);
            const spotDepth = 0.72 + 0.28 * Math.max(0, depthDot);
            tmpCHot.lerpColors(COL_HOT_CORE, COL_HOT_EDGE, rankT).multiplyScalar(spotDepth);

            const blend = hoverStrength * (1 - rankT * 0.65);
            tmpCNormal.lerp(tmpCHot, blend);
          }

          // Atmospheric particle shimmer (organic life at rest)
          const shimmer = 0.88 + Math.sin(t * 1.6 + i * 0.35) * 0.12;

          colBuf[i * 3 + 0] = tmpCNormal.r * shimmer;
          colBuf[i * 3 + 1] = tmpCNormal.g * shimmer;
          colBuf[i * 3 + 2] = tmpCNormal.b * shimmer;
        }

        posAttr.needsUpdate = true;
      } else {
        // Pure spin: Natural blue depth gradient + organic atmospheric shimmer (zero displacement, zero hotspot)
        for (let i = 0; i < count; i++) {
          const n = normals[i]!;
          const depthDot = n.dot(camLocal);

          const depthFactor = Math.pow(Math.max(0, depthDot), 1.25);
          tmpCNormal.lerpColors(COL_NORMAL_FAR, COL_NORMAL_NEAR, depthFactor);

          const shimmer = 0.88 + Math.sin(t * 1.6 + i * 0.35) * 0.12;

          colBuf[i * 3 + 0] = tmpCNormal.r * shimmer;
          colBuf[i * 3 + 1] = tmpCNormal.g * shimmer;
          colBuf[i * 3 + 2] = tmpCNormal.b * shimmer;
        }
      }

      colAttr.needsUpdate = true;
    }

    // ── Mouse & Pointer tracking (only if interactive) ────────────────────────
    let onPointerMove: ((e: MouseEvent) => void) | null = null;
    let onPointerLeave: (() => void) | null = null;
    const mouseTarget = new THREE.Vector2(0, 0);
    const mouseSmooth = new THREE.Vector2(0, 0);

    if (interactive) {
      const raycaster   = new THREE.Raycaster();
      const sphereObj   = new THREE.Sphere(new THREE.Vector3(0, 0, 0), SPHERE_RADIUS);
      const rayTarget   = new THREE.Vector3();

      onPointerMove = (e: MouseEvent) => {
        if ((globeScrollState.interactiveWeight ?? 1) < 0.05) {
          isPointerOver = false;
          return;
        }

        const rect = container.getBoundingClientRect();
        const isSubContainer = rect.width < window.innerWidth || rect.height < window.innerHeight;

        if (isSubContainer) {
          const isInside = (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          );
          if (!isInside) {
            isPointerOver = false;
            mouseTarget.set(0, 0);
            hsTarget.lerp(REST_DIR, 0.04).normalize();
            return;
          }
          mouseTarget.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          mouseTarget.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        } else {
          mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
          mouseTarget.y = -(e.clientY / window.innerHeight) * 2 + 1;
        }

        sphereObj.center.copy(group.position);
        sphereObj.radius = SPHERE_RADIUS * Math.max(0.1, group.scale.x) * 1.15;

        raycaster.setFromCamera(mouseTarget, camera);
        const hit = raycaster.ray.intersectSphere(sphereObj, rayTarget);
        if (hit) {
          isPointerOver = true;
          tmpLocalHit.copy(rayTarget).sub(group.position).normalize();
          hsTarget.lerp(tmpLocalHit, 0.28).normalize();
        } else {
          isPointerOver = false;
          hsTarget.lerp(REST_DIR, 0.04).normalize();
        }
      };

      onPointerLeave = () => {
        isPointerOver = false;
        mouseTarget.set(0, 0);
        hsTarget.lerp(REST_DIR, 0.04).normalize();
      };

      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.addEventListener("mouseleave", onPointerLeave, { passive: true });
    }

    // ── Animation loop ────────────────────────────────────────────────────────
    let animId: number;
    const clock = new THREE.Clock();

    const FADE_DURATION     = 1.8;
    const HALO_BASE_OPACITY = 0.35;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Smooth intro fade
      const introProgress = Math.min(1, t / FADE_DURATION);
      const eased = 1 - Math.pow(1 - introProgress, 3);

      // Smooth continuous hover strength transition (only when interactive)
      if (interactive) {
        const interactiveWeight = Math.max(0, Math.min(1, globeScrollState.interactiveWeight ?? 1));
        const targetHover = (isPointerOver && interactiveWeight > 0.05) ? 1.0 : 0.0;
        hoverStrength += (targetHover - hoverStrength) * 0.07;
        mouseSmooth.x += (mouseTarget.x * interactiveWeight - mouseSmooth.x) * 0.06;
        mouseSmooth.y += (mouseTarget.y * interactiveWeight - mouseSmooth.y) * 0.06;
      }

      // Halo opacity smoothly increases with hoverStrength
      const currentHaloOpacity = HALO_BASE_OPACITY + (interactive ? hoverStrength * 0.16 : 0);

      // Scroll-driven warp opacity
      const scrollOpacity = globeScrollState.opacity !== undefined ? globeScrollState.opacity : 1;
      const globeScale = (globeScrollState.scale !== undefined && globeScrollState.scale > 0) ? globeScrollState.scale : 1;

      coreMat.opacity = Math.max(0, Math.min(1, eased * scrollOpacity));
      haloMat.opacity = Math.max(0, Math.min(1, eased * (currentHaloOpacity + Math.sin(t * 1.2) * 0.03) * scrollOpacity));

      // Dynamic layout positioning & scaling
      const metrics = getLayoutMetrics(camera.aspect);

      // Continuous natural spin (zero pointer interaction)
      const mouseX = interactive ? mouseSmooth.x * 0.20 : 0;
      const mouseY = interactive ? mouseSmooth.y * 0.14 : 0;
      group.rotation.x = Math.sin(t * 0.05) * 0.06 - mouseY;
      group.rotation.y = t * 0.09 + (globeScrollState.offset || 0) + mouseX;

      group.position.x = metrics.posX + (globeScrollState.xOffset || 0);
      group.position.y = metrics.posY + (globeScrollState.yOffset || 0);

      // Subtle breathing scale (natural organic pulse)
      const hoverBoost = interactive ? hoverStrength * 0.025 : 0;
      const breathe = (1 + Math.sin(t * 0.8) * 0.01) * (1 + hoverBoost);
      group.scale.setScalar(metrics.scale * breathe * globeScale);

      if (interactive) {
        hsCurrent.lerp(hsTarget, 0.10).normalize();
      }

      updateParticles(t);
      renderer.render(scene, camera);
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      coreMat.opacity = 1;
      haloMat.opacity = HALO_BASE_OPACITY;
      group.rotation.y = 0;
      const metrics = getLayoutMetrics(camera.aspect);
      group.scale.setScalar(metrics.scale);
      group.position.x = metrics.posX;
      group.position.y = metrics.posY;
      updateParticles(0);
      renderer.render(scene, camera);
    } else {
      animate();
    }

    // ── Resize ────────────────────────────────────────────────────────────────
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => onResize())
      : null;
    if (resizeObserver) {
      resizeObserver.observe(container);
    }

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      if (resizeObserver) resizeObserver.disconnect();
      if (onPointerMove) window.removeEventListener("pointermove", onPointerMove);
      if (onPointerLeave) document.removeEventListener("mouseleave", onPointerLeave);
      renderer.dispose();
      coreGeo.dispose(); coreMat.dispose(); coreTex.dispose();
      haloGeo.dispose(); haloMat.dispose(); haloTex.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [transparent, layout, pointCount, interactive]);

  return (
    <div
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}

export { ParticleGlobe };
