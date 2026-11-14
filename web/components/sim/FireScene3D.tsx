"use client";
// SI-assisted: AI tool not recorded in the commit; see README "Use of AI (SI)".

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Scenario, SimResult } from "@/lib/sim/types";

/** A real-time, camera-based view of the existing one-zone engine trace.
 * It is intentionally a visualization: the engine remains the source of every
 * number, while this scene supplies depth, light, motion, and spatial context.
 */
export function FireScene3D({ sc, r, frame }: { sc: Scenario; r: SimResult | null; frame: number }) {
  const host = useRef<HTMLDivElement>(null);
  const state = r?.state[Math.min(frame, (r?.state.length ?? 1) - 1)];
  const q = state?.Q_W ?? 0;
  const qMax = r ? Math.max(1, ...r.state.map((x) => x.Q_W)) : 1;
  const fire = Math.max(0, Math.min(1, q / qMax));
  const smoke = state?.smoke_det ?? 0;
  const live = useRef({ fire, smoke, frame, hasRun: !!r });
  live.current = { fire, smoke, frame, hasRun: !!r };

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080b10);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
    const target = new THREE.Vector3(0, .78, -.1);
    let yaw = .42, pitch = .18, radius = 4.25;
    const aimCamera = () => {
      const cp = Math.cos(pitch);
      camera.position.set(target.x + Math.sin(yaw) * cp * radius, target.y + Math.sin(pitch) * radius, target.z + Math.cos(yaw) * cp * radius);
      camera.lookAt(target);
    };
    aimCamera();
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    el.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0x9fb6d8, 0x10131a, 1.15));
    const key = new THREE.DirectionalLight(0xd9e9ff, 2.2); key.position.set(-3, 5, 4); scene.add(key);
    const fireLight = new THREE.PointLight(0xff5a1f, 0, 7, 2); fireLight.position.set(0, .72, 0); scene.add(fireLight);

    const cabin = new THREE.Group(); scene.add(cabin);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(4.8, .08, 2.8), new THREE.MeshStandardMaterial({ color: 0x1b212b, metalness: .35, roughness: .72 }));
    floor.position.y = -.05; cabin.add(floor);
    const back = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.4, .06), new THREE.MeshStandardMaterial({ color: 0x252c37, metalness: .25, roughness: .8 }));
    back.position.set(0, 1.15, -1.38); cabin.add(back);
    // Enclosed module shell: translucent panels preserve visibility while
    // giving the scene a stable spatial boundary and believable reflections.
    const shell = new THREE.MeshStandardMaterial({ color: 0x384353, metalness: .15, roughness: .86, transparent: true, opacity: .18, side: THREE.DoubleSide });
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(4.8, .06, 2.8), shell); ceiling.position.y = 2.35; cabin.add(ceiling);
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(.06, 2.4, 2.8), shell); leftWall.position.x = -2.4; leftWall.position.y = 1.15; cabin.add(leftWall);
    const rightWall = leftWall.clone(); rightWall.position.x = 2.4; cabin.add(rightWall);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x677589, metalness: .6, roughness: .42 });
    for (const x of [-2.38, 2.38]) { const post = new THREE.Mesh(new THREE.BoxGeometry(.075, 2.4, .075), frameMat); post.position.set(x, 1.15, 1.35); cabin.add(post); }
    for (const y of [.08, 2.28]) { const beam = new THREE.Mesh(new THREE.BoxGeometry(4.8, .075, .075), frameMat); beam.position.set(0, y, 1.35); cabin.add(beam); }
    for (let i = -2; i <= 2; i++) {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(.62, 1.75, .34), new THREE.MeshStandardMaterial({ color: 0x3a424e, metalness: .25, roughness: .65 }));
      rack.position.set(i * .78, .86, -1.12); cabin.add(rack);
      for (let j = 0; j < 4; j++) {
        const seam = new THREE.Mesh(new THREE.BoxGeometry(.46, .012, .012), new THREE.MeshBasicMaterial({ color: 0x78869a }));
        seam.position.set(i * .78, .42 + j * .33, - .93); cabin.add(seam);
      }
    }

    const sampleLength = THREE.MathUtils.clamp(sc.items[0]?.length_m ?? 1.45, .5, 2.2);
    const sampleWidth = THREE.MathUtils.clamp(sc.items[0]?.width_m ?? .58, .25, 1.15);
    const sample = new THREE.Mesh(new THREE.BoxGeometry(sampleLength, .12, sampleWidth), new THREE.MeshStandardMaterial({ color: 0x5c6570, roughness: .82 }));
    sample.position.set(.65, .42, -.15); cabin.add(sample);

    const flame = new THREE.Group(); cabin.add(flame);
    const outer = new THREE.Mesh(new THREE.ConeGeometry(.48, 1.25, 20, 5), new THREE.MeshBasicMaterial({ color: 0xff4c18, transparent: true, opacity: .88, blending: THREE.AdditiveBlending, depthWrite: false }));
    outer.scale.set(.72, 1, .52); outer.position.set(.1, 1.08, -.12); flame.add(outer);
    const inner = new THREE.Mesh(new THREE.ConeGeometry(.25, .78, 16, 4), new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: .94, blending: THREE.AdditiveBlending, depthWrite: false }));
    inner.position.set(.08, .82, -.08); flame.add(inner);

    const count = 420;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = new Float32Array(count);
    for (let i = 0; i < count; i++) { const a = i / count; positions[i * 3] = (.1 + Math.sin(i * 17.3) * .42) * (a + .1); positions[i * 3 + 1] = .6 + (i % 31) / 31 * 1.25; positions[i * 3 + 2] = -.12 + Math.cos(i * 11.1) * .24; sizes[i] = .018 + (i % 7) * .004; velocities[i] = .25 + (i % 13) / 20; }
    const particleGeo = new THREE.BufferGeometry(); particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: 0x8b96a3, size: .055, transparent: true, opacity: 0, depthWrite: false, blending: THREE.NormalBlending }));
    cabin.add(particles);

    const resize = () => { const w = el.clientWidth, h = Math.max(240, el.clientHeight); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    const observer = new ResizeObserver(resize); observer.observe(el); resize();
    let down = false, px = 0, py = 0;
    const move = (e: PointerEvent) => { if (!down) return; yaw -= (e.clientX - px) * .006; pitch = THREE.MathUtils.clamp(pitch - (e.clientY - py) * .004, -.28, .52); px = e.clientX; py = e.clientY; aimCamera(); };
    const pointerDown = (e: PointerEvent) => { down = true; px = e.clientX; py = e.clientY; el.setPointerCapture(e.pointerId); };
    const pointerUp = () => { down = false; };
    const wheel = (e: WheelEvent) => { e.preventDefault(); radius = THREE.MathUtils.clamp(radius + e.deltaY * .003, 3.1, 6.2); aimCamera(); };
    el.addEventListener("pointerdown", pointerDown); el.addEventListener("pointermove", move); el.addEventListener("pointerup", pointerUp); el.addEventListener("wheel", wheel, { passive: false });
    const clock = new THREE.Clock(); let raf = 0;
    const tick = () => {
      const t = clock.getElapsedTime();
      const intensity = live.current.fire;
      flame.visible = intensity > .005; outer.scale.y = .72 + intensity * .45 + Math.sin(t * 13) * .035; outer.rotation.z = Math.sin(t * 8) * .035; inner.scale.y = .72 + intensity * .4 + Math.sin(t * 17) * .05;
      fireLight.intensity = intensity * 5.5; particles.material.opacity = Math.min(.62, live.current.smoke * 180000 + intensity * .12);
      const p = particleGeo.attributes.position.array as Float32Array;
      const flow = sc.cabin.flow_m_s;
      for (let i = 0; i < count; i++) { const y = p[i * 3 + 1] + velocities[i] * .008 * (0.3 + intensity); p[i * 3 + 1] = y > 2.25 ? .58 : y; p[i * 3] += Math.sin(t * .7 + i) * .0007 + flow * .0007; p[i * 3 + 2] += Math.cos(t * .45 + i) * .00025; }
      particleGeo.attributes.position.needsUpdate = true; renderer.render(scene, camera); raf = requestAnimationFrame(tick);
    }; tick();
    return () => { cancelAnimationFrame(raf); observer.disconnect(); el.removeEventListener("pointerdown", pointerDown); el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", pointerUp); el.removeEventListener("wheel", wheel); renderer.dispose(); particleGeo.dispose(); if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement); };
  }, []);

  return <div ref={host} className="relative h-full min-h-[320px] w-full overflow-hidden" data-testid="fire-scene-3d" aria-label="Interactive 3D cabin fire visualization">
    <div className="pointer-events-none absolute left-3 top-3 z-10 text-[11px] text-white/70">3D LIVE · drag to orbit · engine frame {r ? frame + 1 : "—"}</div>
    {!r && <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-white/60">Run the scenario to start the 3D trace</div>}
  </div>;
}
