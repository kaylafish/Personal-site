import React from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { disposeTree, toFloat } from './threeutil.js';

// The Magnus launcher for its pinned scroll section (magnuspage.jsx), on a
// transparent canvas. Ported from Claude Design's launcher-view.js. Loaded
// lazily, so three.js stays out of the main bundle.
//
// The page writes what it wants into the `view` ref every scroll frame; the
// model eases toward it on its own:
//   explode   0–1, parts move out from the middle
//   focus     'wheels' eases the camera in on the wheels and ball and fades
//             the rest to ~18%; '' for the whole launcher
//   top, bottom   wheel speeds in rad/s (the ball spins with the difference)
//   yaw       camera angle around the launcher, radians
//   shift     moves the launcher right by this share of the width
//
// Performance (keep these): each top-level part's meshes are merged per
// material on load (4,124 → ~60 draw calls); wheels and ball stay separate
// parts so they can spin. Opacity only updates when focus changes, frames
// that wouldn't change anything aren't drawn, and pixel ratio is ≤ 1.5.
//
// The GLB is the Onshape export (Z-up), recompressed with meshopt.

// Polycarbonate side plates, wheels and the ball, by Onshape part name.
const POLY = /part.?1[0-2]$/i;
const WHEEL = /colson.?performa.?wheel/i;
const BALL = /game.?piece/i;


class LauncherStage {
  constructor(host, src, view) {
    this.host = host;
    this.view = view;
    this.c = { explode: 1, yaw: 0.6, shift: 0, fo: 0, top: 0, bottom: 0 };

    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    r.outputColorSpace = THREE.SRGBColorSpace;
    // Neutral keeps the CAD colours' hues; exposure and lights are well
    // below Design's original so the white parts don't blow out (same
    // approach as the REBUILT robot, a little darker).
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 0.75;
    r.domElement.style.cssText = 'width:100%;height:100%;display:block';
    host.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(r);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.envMap;
    this.scene.environmentIntensity = 0.5;
    const key = new THREE.DirectionalLight(0xdfe9ff, 0.9);
    key.position.set(3, 5, 4);
    this.scene.add(key);
    this.scene.add(new THREE.HemisphereLight(0x9bb8ff, 0x0b111b, 0.25));
    this.cam = new THREE.PerspectiveCamera(30, 1, 0.01, 100);

    this.ro = new ResizeObserver(() => this.size());
    this.ro.observe(host);
    this.size();

    // Only draw while the canvas is on screen and the tab is visible.
    this.visible = true;
    this.io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; this.wake(); });
    this.io.observe(host);
    this.onVis = () => this.wake();
    document.addEventListener('visibilitychange', this.onVis);

    new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).load(src, (g) => {
      if (this.dead) disposeTree(g.scene);
      else this.setup(g.scene);
    }, undefined, (err) => console.warn('Launcher model failed to load', err));

    this.raf = 0;
    this.last = 0;
    this.wake();
  }

  wake() {
    if (this.dead || this.raf || !this.visible || document.hidden) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  tick = (now) => {
    this.raf = 0;
    if (this.dead || !this.visible || document.hidden) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.frame(dt);
    this.raf = requestAnimationFrame(this.tick);
  };

  size() {
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
    this.sig = '';
  }

  setup(root) {
    const hold = this.hold = new THREE.Group();
    root.rotation.x = -Math.PI / 2;
    hold.add(root);
    this.scene.add(hold);
    hold.updateMatrixWorld(true);
    let main = root;
    while (main.children.length === 1 && !main.isMesh) main = main.children[0];
    const box = new THREE.Box3().setFromObject(main);
    const C = box.getCenter(new THREE.Vector3()), S = box.getSize(new THREE.Vector3());
    hold.position.sub(C);
    hold.updateMatrixWorld(true);
    this.R = Math.max(S.x, S.y, S.z);
    this.merge(main);

    const wc = (n) => new THREE.Box3().setFromObject(n).getCenter(new THREE.Vector3());
    const ballN = main.children.find((n) => BALL.test(n.name || ''));
    const ballC = ballN ? wc(ballN) : new THREE.Vector3();
    let axisW = null;
    this.parts = main.children.map((n) => {
      const p = n.parent, c = wc(n), sz = new THREE.Box3().setFromObject(n).getSize(new THREE.Vector3());
      const dir = c.clone();
      if (dir.length() < this.R * 0.05) dir.set(0, 1, 0);
      dir.normalize();
      const toL = (w) => p.worldToLocal(w.clone());
      const off = toL(c.clone().addScaledVector(dir, this.R * 0.55)).sub(toL(c));
      const o = { n, p0: n.position.clone(), q0: n.quaternion.clone(), off, wheel: WHEEL.test(n.name || ''), ball: BALL.test(n.name || '') };
      if (o.wheel || o.ball) {
        // Wheels spin about their thinnest dimension.
        if (o.wheel && !axisW) {
          const m = Math.min(sz.x, sz.y, sz.z);
          axisW = new THREE.Vector3(sz.x === m ? 1 : 0, sz.y === m && sz.x !== m ? 1 : 0, sz.z === m && sz.x !== m && sz.y !== m ? 1 : 0);
        }
        o.pivot = toL(c);
        o.isTop = c.y > ballC.y;
      }
      return o;
    });
    axisW = axisW || new THREE.Vector3(1, 0, 0);
    const wb = new THREE.Box3();
    main.children.forEach((n) => { if (WHEEL.test(n.name || '') || BALL.test(n.name || '')) wb.expandByObject(n); });
    this.wC = wb.isEmpty() ? new THREE.Vector3() : wb.getCenter(new THREE.Vector3());
    this.wR = wb.isEmpty() ? this.R : Math.max(...wb.getSize(new THREE.Vector3()).toArray());
    this.parts.forEach((o) => {
      if (!o.pivot) return;
      const p = o.n.parent;
      o.axis = p.worldToLocal(axisW.clone()).sub(p.worldToLocal(new THREE.Vector3())).normalize();
      o.ang = 0;
    });

    this.meshes = [];
    main.traverse((m) => {
      if (!m.isMesh) return;
      m.material = m.material.clone();
      m.userData.hl = false;
      // Onshape's near-white parts read as aluminum instead of glowing.
      const { r, g, b } = m.material.color;
      if (Math.min(r, g, b) > 0.6 && Math.max(r, g, b) - Math.min(r, g, b) < 0.1) {
        m.material.color.set(0xb4bbc4);
        m.material.metalness = 0.55;
        m.material.roughness = 0.45;
      }
      this.meshes.push(m);
    });
    this.parts.forEach((o) => {
      if (o.wheel || o.ball) o.n.traverse((m) => { if (m.isMesh) m.userData.hl = true; });
      // Polycarbonate: faint clear blue, both sides, no depth write.
      if (POLY.test(o.n.name || '')) {
        o.n.traverse((m) => {
          if (!m.isMesh) return;
          Object.assign(m.userData, { poly: true });
          m.material.color.set(0xcfe0f5);
          m.material.roughness = 0.05;
          m.material.metalness = 0;
          m.material.side = THREE.DoubleSide;
          m.material.transparent = true;
          m.material.depthWrite = false;
          m.renderOrder = 2;
        });
      }
    });
    this.root = root;
    this.c.explode = 1;
  }

  // Each top-level part's meshes become one mesh per material.
  merge(main) {
    main.updateMatrixWorld(true);
    main.children.forEach((part) => {
      const inv = new THREE.Matrix4().copy(part.matrixWorld).invert();
      const groups = new Map(), drop = [];
      part.traverse((m) => {
        if (!m.isMesh || !m.geometry || m.isInstancedMesh) return;
        const src = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', toFloat(src.attributes.position));
        if (src.attributes.normal) g.setAttribute('normal', toFloat(src.attributes.normal));
        else g.computeVertexNormals();
        if (src !== m.geometry) src.dispose();
        g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
        const key = m.material.uuid;
        if (!groups.has(key)) groups.set(key, { mat: m.material, gs: [] });
        groups.get(key).gs.push(g);
        drop.push(m);
      });
      if (!drop.length) return;
      const merged = [];
      for (const { mat, gs } of groups.values()) {
        const g = gs.length > 1 ? mergeGeometries(gs, false) : gs[0];
        if (!g) return;
        if (gs.length > 1) gs.forEach((x) => x.dispose());
        const mm = new THREE.Mesh(g, mat);
        mm.name = part.name;
        merged.push(mm);
      }
      drop.forEach((m) => { m.geometry.dispose(); m.parent?.remove(m); });
      [...part.children].forEach((k) => part.remove(k));
      merged.forEach((mm) => part.add(mm));
    });
  }

  frame(dt) {
    const v = this.view.current, c = this.c;
    const k = 1 - Math.pow(0.02, dt), kx = 1 - Math.pow(0.12, dt);
    c.explode += (v.explode - c.explode) * kx;
    if (Math.abs(c.explode - v.explode) < 0.001) c.explode = v.explode;
    c.yaw += (v.yaw - c.yaw) * k;
    c.shift += (v.shift - c.shift) * k;
    c.fo += ((v.focus === 'wheels' ? 1 : 0) - c.fo) * k;
    c.top += (v.top - c.top) * k;
    c.bottom += (v.bottom - c.bottom) * k;

    if (this.parts) {
      const q = new THREE.Quaternion(), tmp = new THREE.Vector3();
      this.parts.forEach((o) => {
        o.n.position.copy(o.p0);
        o.n.quaternion.copy(o.q0);
        if (o.pivot) {
          const w = o.ball ? (c.top - c.bottom) * 0.6 : (o.isTop ? -c.top : c.bottom);
          o.ang += w * dt;
          q.setFromAxisAngle(o.axis, o.ang);
          tmp.copy(o.p0).sub(o.pivot).applyQuaternion(q).add(o.pivot);
          o.n.position.copy(tmp);
          o.n.quaternion.premultiply(q);
        }
        o.n.position.addScaledVector(o.off, c.explode);
      });
      const fo = Math.round(c.fo * 50) / 50;
      if (fo !== this.lastFo) {
        this.lastFo = fo;
        this.meshes.forEach((m) => {
          const op = m.userData.poly ? 0.14 * (1 - fo * 0.5) : m.userData.hl ? 1 : 1 - fo * 0.82;
          const tr = m.userData.poly || op < 0.99;
          if (m.material.transparent !== tr) { m.material.transparent = tr; m.material.needsUpdate = true; }
          m.material.opacity = op;
          if (!m.userData.poly) m.material.depthWrite = !tr;
        });
      }
    }

    const R = this.R || 1, f = c.fo * c.fo * (3 - 2 * c.fo);
    let dist = R * 3.9 * (1 - f) + (this.wR || R) * 3.2 * f;
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    // Portrait screens pull back so the launcher still fits across.
    if (w < h) dist *= Math.pow(h / w, 0.75);
    const pitch = 0.38;
    const tg = this.wC ? new THREE.Vector3().lerp(this.wC, f) : new THREE.Vector3();
    this.cam.position.set(Math.sin(c.yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Math.cos(c.yaw) * Math.cos(pitch) * dist).add(tg);
    this.cam.lookAt(tg);
    this.cam.setViewOffset(w, h, -c.shift * w, h * 0.17, w, h);

    // Skip the draw when nothing on screen would change.
    const sig = [c.explode, c.yaw, c.shift, c.fo, c.top, c.bottom, w, h].map((x) => x.toFixed(4)).join();
    if (sig === this.sig && !c.top && !c.bottom && this.parts) return;
    this.sig = sig;
    this.renderer.render(this.scene, this.cam);
  }

  dispose() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    document.removeEventListener('visibilitychange', this.onVis);
    if (this.root) disposeTree(this.root);
    this.envMap.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

function LauncherView({ src, view, className }) {
  const host = React.useRef(null);
  React.useEffect(() => {
    let s;
    // No WebGL (blocked, or an old device): the page still works without
    // the model.
    try { s = new LauncherStage(host.current, src, view); } catch (err) {
      console.warn('Launcher model unavailable', err);
      return undefined;
    }
    return () => s.dispose();
  }, [src, view]);
  return <div ref={host} className={className} aria-hidden="true" />;
}

export default LauncherView;
