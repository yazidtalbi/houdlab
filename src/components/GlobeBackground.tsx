import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Lat/long globe (front hemisphere only), flipped tilt, slow rotation.
 * Squares inside are bigger by reducing the number of parallels/meridians.
 */
export default function GlobeBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current!;
    const W = mount.clientWidth;
    const H = mount.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H);
    renderer.setClearAlpha(0);
    mount.appendChild(renderer.domElement);

    // Scene / Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 100);
    camera.position.set(0, 0, 8);

    // Rig (parent) + Globe (child)
    const rig = new THREE.Group();
    scene.add(rig);

    const globe = new THREE.Group();
    rig.add(globe);

    const radius = 2.0;

    // Invisible depth prepass sphere → hides back hemisphere lines
    const depthGeo = new THREE.SphereGeometry(radius - 0.01, 96, 96);
    const depthMat = new THREE.MeshBasicMaterial({ depthWrite: true });
    depthMat.colorWrite = false; // invisible but writes depth
    globe.add(new THREE.Mesh(depthGeo, depthMat));

    // Line material (front only due to depthTest)
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x3a3a3a,
      opacity: 0.65,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });

    // ===== Grid density (FEWER lines -> BIGGER squares) =====
    const latSteps = 16; // parallels (was 28)
    const lonSteps = 28; // meridians (was 36)
    const segsPerCircle = 256;
    const poleEpsilon = 0.03; // trim near poles to avoid collapsing

    // Parallels
    for (let i = 1; i < latSteps; i++) {
      const phi = (i / latSteps) * Math.PI;
      const r = Math.sin(phi) * radius;
      const y = Math.cos(phi) * radius;

      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= segsPerCircle; s++) {
        const theta = (s / segsPerCircle) * Math.PI * 2;
        pts.push(
          new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta))
        );
      }
      globe.add(
        new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints(pts),
          lineMat
        )
      );
    }

    // Meridians
    for (let j = 0; j < lonSteps; j++) {
      const theta = (j / lonSteps) * Math.PI * 2;

      const pts: THREE.Vector3[] = [];
      for (let s = 0; s <= segsPerCircle; s++) {
        const phi =
          poleEpsilon + (s / segsPerCircle) * (Math.PI - 2 * poleEpsilon);
        const r = Math.sin(phi) * radius;
        const y = Math.cos(phi) * radius;
        pts.push(
          new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta))
        );
      }
      globe.add(
        new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat)
      );
    }

    // Pose (flipped diagonal)
    rig.rotation.z = THREE.MathUtils.degToRad(24); // lean
    rig.rotation.x = THREE.MathUtils.degToRad(-20); // pitch
    globe.rotation.y = THREE.MathUtils.degToRad(10); // small phase

    // Animation
    let raf = 0;
    const tick = () => {
      globe.rotation.y += 0.0012; // slow spin
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    // Resize
    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      globe.traverse((obj) => {
        const g = (obj as THREE.Line).geometry as
          | THREE.BufferGeometry
          | undefined;
        if (g) g.dispose();
      });
      lineMat.dispose();
      depthGeo.dispose();
      depthMat.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  // Position/size behind chat
  return (
    <div
      ref={mountRef}
      className="
        pointer-events-none absolute -z-10
        left-[-5vw] top-[0vh]
        w-[80vmin] h-[80vmin]
        opacity-70
      "
    />
  );
}
