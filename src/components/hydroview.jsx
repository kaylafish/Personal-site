import React from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { prefersReducedMotion } from './motion.jsx';
import { disposeTree, partKey as key, toFloat } from './threeutil.js';

// The hydro generator rig for the top of its project page (hydropage.jsx),
// on a transparent canvas. Ported from Claude Design's hydro-view.js; loaded
// lazily, so three.js stays out of the main bundle.
//
// The page drives it with props; it eases to each new state on its own:
//   focus   '' (whole rig), 'wheel' or 'drive': the camera moves there and
//           the other parts fade
//   w       wheel speed, rad/s; the motor pulley turns 1.5× the other way
//   marks   0 or 1: the three drop-height markers above the wheel
//   hsel    the drop height (m) whose marker is lit
//   yaw     camera angle around the rig
//   shift   moves the rig right by this share of the width
// On load the rig starts exploded and assembles itself.
//
// The GLB is the Onshape export (Z-up), meshopt-compressed. Parts are the
// assembly's children and are sorted by name and colour at load.

// Turn with the wheel: its shaft, the 36T pulley and the parts on the shaft
// (the wheel itself is the yellow material).
const SHAFT = /12thunderhex75|36thtd|3dpadapter|acetalspacer|spacerstack/;
// Turn with the motor.
const MSPIN = /24thtd|8mmto12in/;
// Lit with the drive, along with everything that turns.
const DRIVE = /cimmotor|belt/;
// The three drop heights, in metres above the wheel centre.
const HEIGHTS = [0.35, 0.6, 0.85];

// One mesh per material in each part, so a few hundred draw calls become a
// few dozen.
function mergeParts(main) {
  main.updateMatrixWorld(true);
  main.children.forEach((part) => {
    const inv = new THREE.Matrix4().copy(part.matrixWorld).invert();
    const groups = new Map();
    const drop = [];
    part.traverse((m) => {
      if (!m.isMesh || !m.geometry || m.isInstancedMesh) return;
      const mat = m.material;
      const src = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', toFloat(src.attributes.position));
      if (src.attributes.normal) g.setAttribute('normal', toFloat(src.attributes.normal));
      else g.computeVertexNormals();
      if (src !== m.geometry) src.dispose();
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
      if (!groups.has(mat.uuid)) groups.set(mat.uuid, { mat, gs: [] });
      groups.get(mat.uuid).gs.push(g);
      drop.push(m);
    });
    if (!drop.length) return;
    const merged = [];
    for (const { mat, gs } of groups.values()) {
      const g = gs.length > 1 ? mergeGeometries(gs, false) : gs[0];
      if (!g) return; // attributes didn't line up: leave this part as it was
      merged.push(new THREE.Mesh(g, mat));
    }
    drop.forEach((m) => m.geometry.dispose());
    [...part.children].forEach((k) => part.remove(k));
    merged.forEach((mm) => part.add(mm));
  });
}

class RigStage {
  constructor(host, src, onError) {
    this.host = host;
    this.want = { focus: '', w: 0, marks: 0, hsel: 0.35, yaw: 0.8, shift: 0 };
    this.cur = { explode: prefersReducedMotion() ? 0 : 1, yaw: 0.8, shift: 0, f: [1, 0, 0], w: 0, marks: 0, hs: 0.35 };

    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    r.outputColorSpace = THREE.SRGBColorSpace;
    // Neutral keeps the CAD colours' hues; set darker than the REBUILT
    // page's robot so the rig doesn't glare on the dark page.
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 0.75;
    r.domElement.style.cssText = 'width:100%;height:100%;display:block';
    host.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(r);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.envMap;
    this.scene.environmentIntensity = 0.55;
    const kl = new THREE.DirectionalLight(0xdfe9ff, 0.9);
    kl.position.set(3, 5, 4);
    this.scene.add(kl);
    this.scene.add(new THREE.HemisphereLight(0x9bb8ff, 0x0b111b, 0.3));
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
    }, undefined, (err) => { console.warn('Hydro model failed to load', err); onError(); });

    this.raf = 0;
    this.last = 0;
    this.wake();
  }

  set(next) { Object.assign(this.want, next); }

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
    this.sig = null;
  }

  setup(root) {
    const hold = this.root = new THREE.Group();
    root.rotation.x = -Math.PI / 2; // Onshape exports Z-up
    hold.add(root);
    this.scene.add(hold);
    hold.updateMatrixWorld(true);
    let main = root;
    while (main.children.length === 1 && !main.isMesh) main = main.children[0];
    const box = new THREE.Box3().setFromObject(main);
    const size = box.getSize(new THREE.Vector3());
    hold.position.sub(box.getCenter(new THREE.Vector3()));
    hold.updateMatrixWorld(true);
    const R = Math.max(size.x, size.y, size.z);

    const info = main.children.map((n) => {
      let yellow = false;
      n.traverse((m) => {
        if (!m.isMesh) return;
        const c = m.material.color;
        if (c.r > 0.9 && c.g > 0.4 && c.g < 0.8 && c.b < 0.05) yellow = true;
      });
      const k = key(n.name);
      const bb = new THREE.Box3().setFromObject(n);
      const sz = bb.getSize(new THREE.Vector3());
      // The polycarbonate plates: thin and long, plus the spray guard.
      const poly = (Math.min(sz.x, sz.y, sz.z) < 0.012 && Math.max(sz.x, sz.y, sz.z) > 0.9) || /sprayprotector/.test(k);
      return { n, k, yellow, poly, bb };
    });
    mergeParts(main);

    const centre = (re) => {
      const b = new THREE.Box3();
      info.forEach((o) => { if (re.test(o.k)) b.union(o.bb); });
      return b.isEmpty() ? null : b.getCenter(new THREE.Vector3());
    };
    const wheelP = centre(/36thtd/) || new THREE.Vector3();
    const motorP = centre(/24thtd/) || new THREE.Vector3();
    const axisW = new THREE.Vector3(1, 0, 0);

    this.parts = info.map((o) => {
      const n = o.n, p = n.parent, c = o.bb.getCenter(new THREE.Vector3());
      const toLocal = (v) => p.worldToLocal(v.clone());
      // Explode: straight out from the middle, flattened vertically.
      const dir = c.clone();
      dir.y *= 0.3;
      if (dir.length() < R * 0.03) dir.set(0, 0, 1);
      dir.normalize();
      const off = toLocal(c.clone().addScaledVector(dir, R * 0.5)).sub(toLocal(c));
      const wheel = o.yellow || SHAFT.test(o.k), mot = MSPIN.test(o.k);
      const part = {
        n, p0: n.position.clone(), q0: n.quaternion.clone(), off, wheel, mot,
        drive: wheel || mot || DRIVE.test(o.k), poly: o.poly, ang: 0,
      };
      if (wheel || mot) {
        part.pivot = toLocal(wheel ? wheelP : motorP);
        part.axis = toLocal(axisW).sub(toLocal(new THREE.Vector3())).normalize();
      }
      return part;
    });

    // Camera framings: the whole rig, the wheel, the drive.
    const bounds = (test) => {
      const b = new THREE.Box3();
      info.forEach((o, i) => { if (test(this.parts[i])) b.union(o.bb); });
      return b;
    };
    this.frames = [bounds(() => true), bounds((o) => o.wheel && !o.poly), bounds((o) => o.drive && !o.poly)]
      .map((b) => ({ c: b.getCenter(new THREE.Vector3()), s: b.getSize(new THREE.Vector3()) }));

    this.meshes = [];
    this.parts.forEach((o) => o.n.traverse((m) => {
      if (!m.isMesh) return;
      m.material = m.material.clone();
      m.userData.o = o;
      this.meshes.push(m);
      if (o.poly) {
        m.material.color.set(0xcfe0f5);
        m.material.roughness = 0.05;
        m.material.metalness = 0;
        m.material.side = THREE.DoubleSide;
        m.material.transparent = true;
        m.material.depthWrite = false;
        m.renderOrder = 2;
      }
    }));

    // Drop-height markers: a design overlay, not CAD parts.
    this.marks = HEIGHTS.map((h) => {
      const mm = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.004, 0.3),
        new THREE.MeshBasicMaterial({ color: 0x8fb8f7, transparent: true, opacity: 0, depthWrite: false }),
      );
      mm.position.set(0, wheelP.y + h, wheelP.z);
      mm.renderOrder = 3;
      mm.userData.h = h;
      this.scene.add(mm);
      return mm;
    });
    this.sig = null;
  }

  frame(dt) {
    const { want: v, cur: c } = this;
    // Frame-rate independent eases: the camera, and the slower assembly.
    const k = 1 - Math.pow(0.02, dt), kx = 1 - Math.pow(0.35, dt);
    if (this.parts) {
      c.explode += (0 - c.explode) * kx;
      if (c.explode < 0.001) c.explode = 0;
    }
    c.yaw += (v.yaw - c.yaw) * k;
    c.shift += (v.shift - c.shift) * k;
    c.w += (v.w - c.w) * k;
    c.marks += (v.marks - c.marks) * k;
    c.hs += (v.hsel - c.hs) * k;
    const tf = [v.focus === '' ? 1 : 0, v.focus === 'wheel' ? 1 : 0, v.focus === 'drive' ? 1 : 0];
    c.f = c.f.map((x, i) => x + (tf[i] - x) * k);
    const fade = c.f[1] + c.f[2];

    if (this.parts) {
      const q = new THREE.Quaternion(), tmp = new THREE.Vector3();
      this.parts.forEach((o) => {
        o.n.position.copy(o.p0);
        o.n.quaternion.copy(o.q0);
        if (o.pivot) {
          o.ang += (o.wheel ? -c.w : c.w * 1.5) * dt;
          q.setFromAxisAngle(o.axis, o.ang);
          tmp.copy(o.p0).sub(o.pivot).applyQuaternion(q).add(o.pivot);
          o.n.position.copy(tmp);
          o.n.quaternion.premultiply(q);
        }
        o.n.position.addScaledVector(o.off, c.explode);
      });
      // Opacity only changes in steps, so materials aren't touched every frame.
      const fk = [c.f[1], c.f[2]].map((x) => Math.round(x * 40) / 40).join();
      if (fk !== this.lastF) {
        this.lastF = fk;
        this.meshes.forEach((m) => {
          const o = m.userData.o;
          const lit = o.wheel * c.f[1] + o.drive * c.f[2];
          const op = o.poly ? 0.16 * (1 - fade * 0.6) : Math.min(1, 1 - fade * 0.85 + lit * 0.85);
          const tr = o.poly || op < 0.99;
          if (m.material.transparent !== tr) { m.material.transparent = tr; m.material.needsUpdate = true; }
          m.material.opacity = op;
          if (!o.poly) m.material.depthWrite = !tr;
        });
      }
      this.marks.forEach((mm) => {
        const on = Math.max(0, 1 - Math.abs(mm.userData.h - c.hs) / 0.12);
        mm.material.opacity = c.marks * (0.18 + 0.6 * on);
      });
    }

    // Camera: a weighted blend of the three framings.
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1, asp = w / h;
    const th = Math.tan(15 * Math.PI / 180);
    const tg = new THREE.Vector3();
    let dist = 1;
    if (this.frames) {
      const ws = c.f.reduce((a, b) => a + b, 0) || 1;
      dist = 0;
      this.frames.forEach((fr, i) => {
        const wt = c.f[i] / ws;
        tg.addScaledVector(fr.c, wt);
        const hz = Math.max(fr.s.x, fr.s.z);
        dist += wt * Math.max(fr.s.y / 2 / th, hz / 2 / (th * asp)) * (i ? 2.1 : 1.4);
      });
    }
    const pitch = 0.22 + fade * 0.14;
    this.cam.position.set(
      Math.sin(c.yaw) * Math.cos(pitch) * dist,
      Math.sin(pitch) * dist,
      Math.cos(c.yaw) * Math.cos(pitch) * dist,
    ).add(tg);
    this.cam.lookAt(tg);
    this.cam.setViewOffset(w, h, -c.shift * w, 0, w, h);

    // Skip the draw when nothing moved.
    const sig = [c.explode, c.yaw, c.shift, ...c.f, c.w, c.marks, c.hs, w, h].map((x) => x.toFixed(4)).join();
    if (sig === this.sig && Math.abs(c.w) < 0.001 && this.parts) return;
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
    (this.marks || []).forEach((mm) => { mm.geometry.dispose(); mm.material.dispose(); });
    this.envMap.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

function HydroView({ src, focus, w, marks, hsel, yaw, shift, onError, className }) {
  const host = React.useRef(null);
  const stage = React.useRef(null);
  const fail = React.useRef(onError);
  fail.current = onError;
  React.useEffect(() => {
    let s;
    // No WebGL (blocked, or an old device): the page still works without
    // the model.
    try { s = new RigStage(host.current, src, () => fail.current?.()); } catch (err) {
      console.warn('Hydro model unavailable', err);
      fail.current?.();
      return undefined;
    }
    stage.current = s;
    return () => { s.dispose(); stage.current = null; };
  }, [src]);
  React.useEffect(() => {
    stage.current?.set({ focus, w, marks, hsel, yaw, shift });
  }, [focus, w, marks, hsel, yaw, shift, src]);
  return <div ref={host} className={className} aria-hidden="true" />;
}

export default HydroView;
