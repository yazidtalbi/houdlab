import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * ControllerBackground
 * Front-only wireframe look (like your globe) using a safe depth prepass.
 * Uses polygonOffset so lines aren't hidden.
 */
export default function ControllerBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current!;
    const W = mount.clientWidth || 600;
    const H = mount.clientHeight || 600;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H);
    renderer.setClearAlpha(0);
    mount.appendChild(renderer.domElement);

    // Scene / Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 100);
    camera.position.set(0, 0, 10);

    // Rig
    const rig = new THREE.Group();
    scene.add(rig);

    // Controller group
    const pad = new THREE.Group();
    rig.add(pad);

    // Depth prepass (slightly behind + a touch smaller)
    const depthGroup = new THREE.Group();
    depthGroup.position.z = -0.15; // push back so the front doesn’t occlude lines
    depthGroup.scale.setScalar(0.98); // shrink a hair
    pad.add(depthGroup);

    const depthMat = new THREE.MeshBasicMaterial({ depthWrite: true });
    depthMat.colorWrite = false;

    // Line material — pull toward camera so it wins the depth test
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x3a3a3a,
      opacity: 0.65,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    // Helpers
    const disposables: Array<THREE.Object3D> = [];
    const addPad = (obj: THREE.Object3D) => (
      pad.add(obj), disposables.push(obj), obj
    );
    const addDepth = (obj: THREE.Object3D) => (
      depthGroup.add(obj), disposables.push(obj), obj
    );

    const makeLineLoop = (pts: THREE.Vector3[]) =>
      new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(pts),
        lineMat
      );

    const circlePts = (r = 1, segs = 64) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= segs; i++) {
        const t = (i / segs) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(t) * r, Math.sin(t) * r, 0));
      }
      return pts;
    };

    const ellipsePts = (rx = 1, ry = 0.6, segs = 96) => {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= segs; i++) {
        const t = (i / segs) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(t) * rx, Math.sin(t) * ry, 0));
      }
      return pts;
    };

    // ===== Depth volumes (very rough “shells” to hide back lines) =====
    addDepth(
      new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.7, 0.8), depthMat)
    ).position.set(0, 0.2, 0);
    addDepth(
      new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.9), depthMat)
    ).position.set(-2.0, 0.8, 0);
    addDepth(
      new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.7, 0.9), depthMat)
    ).position.set(2.0, 0.8, 0);

    const gripGeo = new THREE.SphereGeometry(1.1, 32, 24);
    const lGrip = addDepth(new THREE.Mesh(gripGeo, depthMat));
    lGrip.position.set(-2.1, -0.7, 0.1);
    lGrip.scale.set(1.0, 1.2, 0.9);
    const rGrip = addDepth(new THREE.Mesh(gripGeo, depthMat));
    rGrip.position.set(2.1, -0.7, 0.1);
    rGrip.scale.set(1.0, 1.2, 0.9);

    const stickDepthGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.3, 24);
    const lStickDepth = addDepth(new THREE.Mesh(stickDepthGeo, depthMat));
    lStickDepth.position.set(-1.0, 0.05, 0.25);
    lStickDepth.rotation.x = Math.PI / 2;
    const rStickDepth = addDepth(new THREE.Mesh(stickDepthGeo, depthMat));
    rStickDepth.position.set(1.0, 0.05, 0.25);
    rStickDepth.rotation.x = Math.PI / 2;

    // ===== Line art (XY plane, slight +z so it’s “in front”) =====
    const z = 0.02;

    const body1 = makeLineLoop(ellipsePts(2.2, 0.85));
    body1.position.set(0, 0.2, z);
    addPad(body1);

    const body2 = makeLineLoop(ellipsePts(2.05, 0.7));
    body2.position.set(0, 0.2, z);
    addPad(body2);

    const lShoulder = makeLineLoop(ellipsePts(0.9, 0.35));
    lShoulder.position.set(-2.0, 0.8, z);
    addPad(lShoulder);

    const rShoulder = makeLineLoop(ellipsePts(0.9, 0.35));
    rShoulder.position.set(2.0, 0.8, z);
    addPad(rShoulder);

    const grip = (x: number) => {
      const e1 = makeLineLoop(ellipsePts(0.9, 0.55));
      e1.position.set(x, -0.6, z);
      e1.rotation.z = THREE.MathUtils.degToRad(x < 0 ? 18 : -18);
      addPad(e1);

      const e2 = makeLineLoop(ellipsePts(0.75, 0.4));
      e2.position.set(x, -0.9, z);
      e2.rotation.z = THREE.MathUtils.degToRad(x < 0 ? 22 : -22);
      addPad(e2);
    };
    grip(-2.1);
    grip(2.1);

    const stick = (x: number, y: number) => {
      const outer = makeLineLoop(circlePts(0.6));
      outer.position.set(x, y, z + 0.02);
      addPad(outer);
      const inner = makeLineLoop(circlePts(0.3));
      inner.position.set(x, y, z + 0.02);
      addPad(inner);
      const cap = makeLineLoop(ellipsePts(0.45, 0.18));
      cap.position.set(x, y + 0.05, z + 0.03);
      addPad(cap);
    };
    stick(-1.0, 0.05);
    stick(1.0, 0.05);

    const dLen = 0.55;
    const dpadH = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-dLen, 0, z + 0.02),
        new THREE.Vector3(dLen, 0, z + 0.02),
      ]),
      lineMat
    );
    const dpadV = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -dLen, z + 0.02),
        new THREE.Vector3(0, dLen, z + 0.02),
      ]),
      lineMat
    );
    const dpad = new THREE.Group();
    dpad.add(dpadH, dpadV);
    dpad.position.set(-2.0, 0.05, 0);
    addPad(dpad);

    const btn = (x: number, y: number) => {
      const b = makeLineLoop(circlePts(0.18));
      b.position.set(x, y, z + 0.02);
      addPad(b);
    };
    const bx = 2.0,
      by = 0.15,
      off = 0.38;
    btn(bx, by + off);
    btn(bx, by - off);
    btn(bx - off, by);
    btn(bx + off, by);

    const touch = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.9, 0.85, z + 0.02),
        new THREE.Vector3(0.9, 0.85, z + 0.02),
        new THREE.Vector3(0.9, 0.45, z + 0.02),
        new THREE.Vector3(-0.9, 0.45, z + 0.02),
      ]),
      lineMat
    );
    addPad(touch);

    // Pose + motion
    rig.rotation.z = THREE.MathUtils.degToRad(24);
    rig.rotation.x = THREE.MathUtils.degToRad(-16);
    pad.rotation.y = THREE.MathUtils.degToRad(8);

    let raf = 0;
    const tick = () => {
      pad.rotation.y += 0.0012;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    // Resize
    const onResize = () => {
      const w = mount.clientWidth || 600;
      const h = mount.clientHeight || 600;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      disposables.forEach((obj) => {
        // @ts-ignore
        obj.geometry?.dispose?.();
        // @ts-ignore
        const m = obj.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose?.());
        else m?.dispose?.();
      });
      depthMat.dispose();
      lineMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount)
        mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="
   
      "
    />
  );
}
