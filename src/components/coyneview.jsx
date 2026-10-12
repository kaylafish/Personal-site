import React from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { prefersReducedMotion } from './motion.jsx';
import { disposeTree, partKey as key, loadModel } from './threeutil.js';

// The 2025 Coyneinator for the top of its project page (coyneinatorpage.jsx),
// on a transparent canvas. Ported from Claude Design's coyne-view.js; loaded
// lazily, so three.js stays out of the main bundle.
//
// The page drives it with props; it eases to each new state on its own:
//   focus   a key of CFG below: the camera frames those parts, highlights
//           some in blue and fades or hides the rest; '' for the hero
//   pose    0–1: the elevator's pivot, 5° → 86°, extending past 65°
//   yaw     camera angle around the robot
//   shift   moves the robot right by this share of the width
// On load the robot starts exploded and assembles itself. onProgress gets
// the download as 0–1; onLoaded fires once it's on screen.
//
// The GLB is the Onshape export (Z-up, meshopt, GPU instancing).
// Subsystems are the top assembly's children (GROUP); the elevator is split
// into its pivoting stages at load.

const GROUP = { assembly11: 'drive', assembly12: 'elev', assembly21: 'wrist', assembly13: 'intake', assembly31: 'climb' };
// Focus configs:
//   g      groups shown          solo   hide every other group
//   hl     highlighted tags      dim    opacity of the rest of g
//   dimG   opacity per group     tube   opacity of the tubes
//   zoom   frame the tagged parts: zh / zg pick the tags and groups (else
//          hl and g), zd scales the distance
//   yaw / yawAbs, pitch, pan     camera adjustments
//   inside belts drawn inside a see-through tube
//   s3     extra offset (m) of the last stage and wrist
const CFG = {
  '': null,
  drive: { g: ['drive'], hl: ['mk4i'] },
  elev: { g: ['elev', 'wrist'], big: 1 },
  wrist: { g: ['wrist'] },
  diff: { g: ['wrist'], solo: 1, hl: ['bevel'], dim: 0.3, zoom: 1, yaw: Math.PI / 2 },
  belts: { g: ['wrist'], solo: 1, hl: ['belt'], dim: 0.3, tube: 0.7, inside: 1, zoom: 1, zd: 0.5, pitch: -0.55, yaw: Math.PI * 0.8 },
  gearbox: { g: ['wrist', 'elev'], solo: 1, hl: [], zh: ['wgb'], dimG: { elev: 0.25 }, s3: -0.1, yawAbs: Math.PI, zoom: 1, zg: ['wrist'], zd: 0.8 },
  pivotgb: { g: ['elev'], solo: 1, hl: ['pgb'], dim: 0.3 },
  elevbelt: { g: ['elev'], solo: 1, hl: ['belt', 'motor'], dim: 0.3 },
  intake: { g: ['intake'] },
  zombie: { g: ['intake'], solo: 1, hl: ['zpath'], dim: 0.35, zoom: 1, zd: 0.55, pitch: 0.95, pan: 0.1 },
  srpp: { g: ['intake'], solo: 1, hl: ['srpp'], dim: 0.35 },
  climb: { g: ['climb'] },
};
const FOCI = Object.keys(CFG);
const PIVOT = [0, 0.3, -0.265]; // pivot axis (x) through the big sector gear, model coords
const HL = new THREE.Color(0x3b86f0);

// Merge-ready copy of a geometry: indexed, float position/normal/uv only
// (meshopt stores them quantized).
function prep(geo) {
  const g = geo.clone();
  if (!g.index) {
    const n = g.attributes.position.count, ix = n > 65535 ? new Uint32Array(n) : new Uint16Array(n);
    for (let i = 0; i < n; i++) ix[i] = i;
    g.setIndex(new THREE.BufferAttribute(ix, 1));
  }
  Object.keys(g.attributes).forEach((a) => { if (a !== 'position' && a !== 'normal' && a !== 'uv') g.deleteAttribute(a); });
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  ['position', 'normal', 'uv'].forEach((a) => {
    const at = g.attributes[a];
    if (!at || !(at.normalized || at.isInterleavedBufferAttribute || !(at.array instanceof Float32Array))) return;
    const s = a === 'uv' ? 2 : 3, f = new Float32Array(at.count * s);
    for (let i = 0; i < at.count; i++) {
      f[i * s] = at.getX(i); f[i * s + 1] = at.getY(i);
      if (s === 3) f[i * s + 2] = at.getZ(i);
    }
    g.setAttribute(a, new THREE.BufferAttribute(f, s));
  });
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

// What a mesh is, for highlighting: the first match walking up its parents.
function tagOf(m, stop) {
  for (let n = m; n && n !== stop; n = n.parent) if (/mk4i/.test(key(n.name))) return 'mk4i';
  for (let n = m; n && n !== stop; n = n.parent) if (n.userData.tag) return n.userData.tag;
  for (let n = m; n && n !== stop; n = n.parent) {
    const k = key(n.name);
    if (/^\d*$/.test(k) && n.parent && key(n.parent.name) === 'assembly13') return 'motor';
    if (/belt/.test(k)) return 'belt';
    if (/^tube/.test(k)) return 'tube';
    if (/bevel|spiral/.test(k)) return 'bevel';
    if (/kraken|falcon|minion|neo|vortex|motor/.test(k)) return 'motor';
    if (/screw|bolt|nut|washer|rivet|shcs|bhcs|fhcs|nutstrip/.test(k)) return 'hw';
    if (/gear|pinion|pulley/.test(k)) return 'gear';
  }
  return '';
}

class CoyneStage {
  constructor(host, src, cb) {
    this.host = host;
    this.cb = cb;
    this.want = { focus: '', yaw: 0.7, shift: 0, pose: 0 };
    this.cur = { explode: 1, yaw: 0.7, shift: 0, pose: 0, s3: 0, po: 0, yo: 0, pn: 0, f: FOCI.map((x, i) => (i ? 0 : 1)) };

    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    r.outputColorSpace = THREE.SRGBColorSpace;
    // Neutral keeps the CAD colours' hues. Lit below the REBUILT and hydro
    // pages so the robot sits back on the dark page.
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 0.55;
    r.domElement.style.cssText = 'width:100%;height:100%;display:block';
    host.appendChild(r.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(r);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.envMap;
    this.scene.environmentIntensity = 0.45;
    const kl = new THREE.DirectionalLight(0xdfe9ff, 0.8);
    kl.position.set(3, 5, 4);
    this.scene.add(kl);
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

    loadModel(src, (f) => this.cb.onProgress?.(f)).then((g) => {
      if (this.dead) { disposeTree(g.scene); return; }
      this.setup(g.scene);
      if (prefersReducedMotion()) this.cur.explode = 0;
      this.cb.onLoaded?.();
    }, (err) => console.warn('Coyneinator model failed to load', err));

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
    const hold = this.hold = new THREE.Group();
    root.rotation.x = -Math.PI / 2; // Onshape exports Z-up
    hold.add(root);
    this.scene.add(hold);
    hold.updateMatrixWorld(true);
    let main = root;
    while (main.children.length === 1 && !main.isMesh) main = main.children[0];
    // Some parts sit beside the top assembly instead of in it.
    const named = main.children.find((c) => /assembly/i.test(c.name || '') && c.children.length > 1);
    let extras = [];
    if (named) { extras = main.children.filter((c) => c !== named); main = named; }
    const box = new THREE.Box3().setFromObject(root);
    const S = box.getSize(new THREE.Vector3());
    hold.position.sub(box.getCenter(new THREE.Vector3()));
    hold.position.y += S.y / 2;
    hold.updateMatrixWorld(true);
    this.R = Math.max(S.x, S.y, S.z);

    let bbs = main.children.map((n) => new THREE.Box3().setFromObject(n));
    this.adopt(main, extras, bbs);
    hold.updateMatrixWorld(true);
    bbs = main.children.map((n) => new THREE.Box3().setFromObject(n));
    this.merge(this.rig(main));

    const R = this.R;
    this.parts = main.children.map((n, i) => {
      const p = n.parent, c = bbs[i].getCenter(new THREE.Vector3()), toL = (w) => p.worldToLocal(w.clone());
      const grp = GROUP[key(n.name)] || 'misc';
      const dir = c.clone().sub(new THREE.Vector3(0, S.y * 0.35, 0));
      dir.y *= 0.6;
      if (dir.length() < R * 0.03) dir.set(0, 1, 0);
      dir.normalize();
      const mag = { drive: 0, elev: 0.45, wrist: 0.7, intake: 0.6, climb: 0.55, misc: 0.3 }[grp];
      const off = toL(c.clone().addScaledVector(dir, R * mag)).sub(toL(c));
      return { n, grp, p0: n.position.clone(), off };
    });
    const fb = (test) => {
      const b = new THREE.Box3();
      this.parts.forEach((o, i) => { if (test(o)) b.union(bbs[i]); });
      return b;
    };
    this.frames = FOCI.map((f) => {
      const cf = CFG[f];
      const b = cf ? fb((o) => cf.g.includes(o.grp)) : fb(() => true);
      if (cf && cf.big) { b.union(fb(() => true)); b.max.y += 0.9; }
      return { c: b.getCenter(new THREE.Vector3()), s: b.getSize(new THREE.Vector3()), solo: cf && cf.solo };
    });
    this.zf = {};
    this.meshes = [];
    this.parts.forEach((o) => o.n.traverse((m) => {
      if (!m.isMesh) return;
      m.material = m.material.clone();
      m.material.emissive = new THREE.Color(0);
      m.userData.c0 = m.material.color.clone();
      m.userData.o = o;
      this.meshes.push(m);
    }));
    this.wristPart = this.parts.find((o) => o.grp === 'wrist');
    if (this.wristPart) this.wristPart.n.matrixAutoUpdate = false;
    this.sig = null;
  }

  // Tag the parts the tour highlights that names alone don't find.
  preTag(main) {
    const hInv = new THREE.Matrix4().copy(this.hold.matrixWorld).invert();
    main.updateMatrixWorld(true);
    const ctr = (n) => new THREE.Box3().setFromObject(n).applyMatrix4(hInv).getCenter(new THREE.Vector3());
    const grp = (g) => main.children.find((n) => GROUP[key(n.name)] === g);
    const ik = grp('intake');
    if (ik) {
      const kids = ik.children.map((n) => ({ n, k: key(n.name), c: ctr(n) }));
      // The zombie axle is on the side away from the 70T belt.
      const ref = kids.find((o) => /^70t5m9mmwidebelt/.test(o.k));
      const sx = ref ? Math.sign(ref.c.x) || 1 : 1;
      kids.forEach((o) => {
        if (/^part(14|15)\d*$/.test(o.k)) o.n.userData.tag = 'srpp';
        else if (o.c.x * sx < -0.1 && /kraken|^\d+$/.test(o.k)) o.n.userData.tag = 'zpath';
        else if (o.c.x * sx < -0.1 && /belt|pulley|thunderhex|gear|^part3[12]\d*$/.test(o.k)) o.n.userData.tag = 'zpath';
      });
    }
    const wr = grp('wrist');
    if (wr) wr.traverse((n) => { if (n !== wr && /gear/.test(key(n.name)) && !/bevel|spiral/.test(key(n.name))) n.userData.tag = 'wgb'; });
  }

  // Split the elevator into a fixed base and pivoting stages s1–s3; returns
  // the units to merge.
  rig(main) {
    const hold = this.hold, units = [];
    this.preTag(main);
    const elev = main.children.find((n) => GROUP[key(n.name)] === 'elev');
    main.children.forEach((p) => { if (p !== elev) units.push(p); });
    if (!elev) return units;
    const hInv = new THREE.Matrix4().copy(hold.matrixWorld).invert();
    // The elevator's axis: the outer 27" tube's main direction (PCA).
    const tube = elev.children.find((c) => /x27"?$/i.test((c.name || '').replace(/_\d+$/, '')) || /tube2x1x27$/.test(key(c.name)));
    const a = new THREE.Vector3(0, 0.94, 0.34);
    if (tube) {
      const pts = [], v = new THREE.Vector3();
      tube.traverse((m) => {
        if (!m.isMesh) return;
        const pa = m.geometry.attributes.position, st = Math.max(1, Math.floor(pa.count / 3000));
        for (let i = 0; i < pa.count; i += st) pts.push(v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld).clone().applyMatrix4(hInv));
      });
      if (pts.length > 10) {
        const mu = new THREE.Vector3();
        pts.forEach((p) => mu.add(p));
        mu.divideScalar(pts.length);
        const M = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        pts.forEach((p) => {
          const d = [p.x - mu.x, p.y - mu.y, p.z - mu.z];
          for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) M[i * 3 + j] += d[i] * d[j];
        });
        let x = [0, 1, 0];
        for (let it = 0; it < 40; it++) {
          const y = [0, 1, 2].map((i) => M[i * 3] * x[0] + M[i * 3 + 1] * x[1] + M[i * 3 + 2] * x[2]);
          const n = Math.hypot(...y) || 1;
          x = y.map((q) => q / n);
        }
        a.set(0, x[1], x[2]);
        if (a.y < 0) a.negate();
        a.normalize();
      }
    }
    this.axis = a;
    this.phi0 = Math.atan2(a.y, a.z);
    const p0 = new THREE.Vector3(...PIVOT);
    const base = new THREE.Group(), P = new THREE.Group(), s1 = new THREE.Group(), s2 = new THREE.Group(), s3 = new THREE.Group();
    const kids = [...elev.children];
    elev.add(base); elev.add(P); P.add(s1); P.add(s2); P.add(s3);
    [P, s2, s3].forEach((o) => { o.matrixAutoUpdate = false; });
    elev.updateMatrixWorld(true);
    kids.forEach((c) => {
      const b = new THREE.Box3().setFromObject(c);
      if (b.isEmpty()) { base.attach(c); return; }
      const bh = b.clone().applyMatrix4(hInv), ctr = bh.getCenter(new THREE.Vector3());
      const along = (ctr.y - p0.y) * a.y + (ctr.z - p0.z) * a.z;
      const ext = Math.max(Math.abs(bh.min.x), Math.abs(bh.max.x));
      const isTube = /^tube/.test(key(c.name));
      let u;
      if (isTube && bh.min.y < 0.15) u = base;
      else if (along < 0.03 && !isTube) u = base;
      else if (along < 0.12 && !isTube) u = s1;
      else u = ext >= 0.12 ? s1 : ext >= 0.085 ? s2 : s3;
      // Low in the base: the pivot gearboxes.
      if (u === base && ctr.y < 0.16 && !isTube) {
        c.userData.tag = 'pgb';
        c.traverse((n) => { if (n !== c && n.userData.tag === 'wgb') delete n.userData.tag; });
      }
      u.attach(c);
    });
    this.E0 = new THREE.Matrix4().copy(hInv).multiply(elev.matrixWorld);
    this.E0i = this.E0.clone().invert();
    this.Mm = new THREE.Matrix4().copy(hInv).multiply(main.matrixWorld);
    this.Mmi = this.Mm.clone().invert();
    this.rigP = P; this.rigS2 = s2; this.rigS3 = s3; this.p0 = p0;
    units.push(base, s1, s2, s3);
    return units;
  }

  // Move parts that sit outside the top assembly into the subsystem they're
  // inside (or nearest to), splitting instanced meshes by instance.
  adopt(main, extras, bbs) {
    if (!extras.length) return;
    const vols = bbs.map((b) => { const s = b.getSize(new THREE.Vector3()); return s.x * s.y * s.z; });
    const ctrs = bbs.map((b) => b.getCenter(new THREE.Vector3()));
    const pick = (p) => {
      let best = -1, bv = Infinity;
      bbs.forEach((b, i) => { if (b.containsPoint(p) && vols[i] < bv) { bv = vols[i]; best = i; } });
      if (best < 0) {
        let bd = Infinity;
        ctrs.forEach((c, i) => { const d = c.distanceTo(p); if (d < bd) { bd = d; best = i; } });
      }
      return best;
    };
    const mw = new THREE.Matrix4(), im = new THREE.Matrix4(), p = new THREE.Vector3();
    extras.forEach((ex) => {
      ex.updateMatrixWorld(true);
      const list = [];
      ex.traverse((m) => { if (m.isMesh) list.push(m); });
      list.forEach((m) => {
        for (let n = m; n; n = n.parent) {
          const k = key(n.name);
          if (/gear/.test(k) && !/bevel|spiral/.test(k)) {
            let g = n;
            while (g.parent && g.parent.parent) g = g.parent;
            if (GROUP[key(g.name)] === 'wrist' || /v5assembly/.test(key(g.name))) m.userData.tag = 'wgb';
            break;
          }
          if (n === ex) break;
        }
      });
      list.forEach((m) => {
        if (m.isInstancedMesh) {
          const buckets = new Map();
          for (let i = 0; i < m.count; i++) {
            m.getMatrixAt(i, im);
            mw.multiplyMatrices(m.matrixWorld, im);
            p.setFromMatrixPosition(mw);
            const gi = pick(p);
            if (!buckets.has(gi)) buckets.set(gi, []);
            buckets.get(gi).push(mw.clone());
          }
          buckets.forEach((ms, gi) => {
            const part = main.children[gi];
            const inv = new THREE.Matrix4().copy(part.matrixWorld).invert();
            const nm = new THREE.InstancedMesh(m.geometry, m.material, ms.length);
            if (m.userData.tag) nm.userData.tag = m.userData.tag;
            ms.forEach((x, i) => nm.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(inv, x)));
            nm.instanceMatrix.needsUpdate = true;
            nm.computeBoundingSphere();
            part.add(nm);
          });
        } else {
          main.children[pick(new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()))].attach(m);
        }
      });
      ex.parent?.remove(ex);
    });
  }

  // One mesh per material and tag in each unit, skipping fasteners and
  // anything under 5 mm, so thousands of draw calls become a few dozen.
  merge(units) {
    units.forEach((u) => u.updateMatrixWorld(true));
    const isUnit = new Set(units);
    units.forEach((part) => {
      const inv = new THREE.Matrix4().copy(part.matrixWorld).invert(), groups = new Map();
      const add = (mat, tag, g) => {
        const k = mat.uuid + tag;
        if (!groups.has(k)) groups.set(k, { mat, tag, gs: [] });
        groups.get(k).gs.push(g);
      };
      const walk = (n) => {
        n.children.forEach((m) => {
          if (isUnit.has(m)) return;
          if (m.isMesh && m.geometry) {
            const tag = tagOf(m, part.parent);
            if (tag === 'hw') { walk(m); return; }
            if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
            if (m.geometry.boundingSphere.radius * m.matrixWorld.getMaxScaleOnAxis() < 0.005) return;
            const base = prep(m.geometry);
            if (m.isInstancedMesh) {
              const im = new THREE.Matrix4();
              for (let i = 0; i < m.count; i++) {
                m.getMatrixAt(i, im);
                const g = base.clone();
                g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld).multiply(im));
                add(m.material, tag, g);
              }
            } else {
              base.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
              add(m.material, tag, base);
            }
          }
          walk(m);
        });
      };
      walk(part);
      const merged = [];
      for (const { mat, tag, gs } of groups.values()) {
        const g = gs.length > 1 ? mergeGeometries(gs, false) : gs[0];
        if (!g) continue;
        const mm = new THREE.Mesh(g, mat);
        mm.userData.tag = tag;
        merged.push(mm);
      }
      // Drop the originals, keeping any group that holds another unit.
      const holdsUnit = (k) => k.isGroup && [...isUnit].some((u) => { for (let q = u; q; q = q.parent) if (q === k) return true; return false; });
      [...part.children].forEach((k) => { if (!isUnit.has(k) && !holdsUnit(k)) part.remove(k); });
      merged.forEach((mm) => part.add(mm));
    });
  }

  // Pivot the elevator and extend its stages for the current pose.
  articulate() {
    const c = this.cur;
    if (!this.rigP) return;
    const deg = 5 + 81 * c.pose, th = deg * Math.PI / 180, d = 0.93 * Math.max(0, (deg - 65) / 21);
    const p0 = this.p0, a = this.axis;
    const M = new THREE.Matrix4().makeTranslation(p0.x, p0.y, p0.z)
      .multiply(new THREE.Matrix4().makeRotationX(-(th - this.phi0)))
      .multiply(new THREE.Matrix4().makeTranslation(-p0.x, -p0.y, -p0.z));
    const Tr = (k, e = 0) => new THREE.Matrix4().makeTranslation(a.x * (d * k + e), a.y * (d * k + e), a.z * (d * k + e));
    const conj = (X) => this.E0i.clone().multiply(X).multiply(this.E0);
    this.rigP.matrix.copy(conj(M));
    this.rigS2.matrix.copy(conj(Tr(0.5)));
    this.rigS3.matrix.copy(conj(Tr(1, c.s3)));
    [this.rigP, this.rigS2, this.rigS3].forEach((o) => { o.matrixWorldNeedsUpdate = true; });
    const w = this.wristPart;
    if (w) {
      const n = w.n, L = new THREE.Matrix4().compose(n.position, n.quaternion, n.scale);
      n.matrix.copy(this.Mmi).multiply(M).multiply(Tr(1, c.s3)).multiply(this.Mm).multiply(L);
      n.matrixWorldNeedsUpdate = true;
    }
  }

  frame(dt) {
    const { want: v, cur: c } = this;
    // Frame-rate independent eases: camera and focus, assembly, the arm.
    const k = 1 - Math.pow(0.02, dt), kx = 1 - Math.pow(0.3, dt), kp = 1 - Math.pow(0.08, dt);
    const cfv = CFG[v.focus] || {};
    if (this.parts) {
      c.explode += (0 - c.explode) * kx;
      if (c.explode < 0.001) c.explode = 0;
    }
    c.yaw += (v.yaw - c.yaw) * k;
    c.shift += (v.shift - c.shift) * k;
    c.pose += (v.pose - c.pose) * kp;
    if (Math.abs(c.pose - v.pose) < 0.0005) c.pose = v.pose;
    const t3 = cfv.s3 || 0;
    c.s3 += (t3 - c.s3) * kp;
    if (Math.abs(c.s3 - t3) < 0.0003) c.s3 = t3;
    c.f = c.f.map((x, i) => {
      const t = FOCI[i] === v.focus ? 1 : 0, y = x + (t - x) * k;
      return Math.abs(y - t) < 0.002 ? t : y;
    });

    if (this.parts) {
      this.parts.forEach((o) => { o.n.position.copy(o.p0).addScaledVector(o.off, c.explode); });
      this.articulate();
      // Opacity and highlight only change in steps, so materials aren't
      // touched every frame.
      const fk = c.f.map((x) => Math.round(x * 50) / 50).join() + v.focus;
      if (fk !== this.lastF) {
        this.lastF = fk;
        const ins = cfv.inside;
        this.meshes.forEach((m) => {
          const o = m.userData.o, tag = m.userData.tag;
          let op = 0, hl = 0;
          FOCI.forEach((f, i) => {
            const wt = c.f[i];
            if (wt < 0.001) return;
            const cf = CFG[f];
            let oi = 1, hi = 0;
            if (cf) {
              if (cf.g.includes(o.grp)) {
                if (cf.hl && cf.hl.includes(tag)) hi = 1;
                else if (cf.tube && tag === 'tube') oi = cf.tube;
                else if (cf.dimG && cf.dimG[o.grp] != null) oi = cf.dimG[o.grp];
                else if (cf.dim) oi = cf.dim;
              } else oi = cf.solo ? 0 : 0.12;
            }
            op += wt * Math.max(oi, hi);
            hl += wt * hi;
          });
          op = Math.min(1, op);
          m.visible = op > 0.01;
          m.material.emissive.setRGB(0.06 * hl, 0.22 * hl, 0.6 * hl);
          m.material.color.copy(m.userData.c0).lerp(HL, hl * 0.85);
          const tr = op < 0.99 || hl > 0.5;
          if (m.material.transparent !== tr) { m.material.transparent = tr; m.material.needsUpdate = true; }
          const inTube = ins && cfv.g.includes(o.grp) && tag === 'tube';
          m.material.opacity = hl > 0.5 ? 1 : op;
          m.material.depthWrite = (!tr || hl > 0.5) && !inTube;
          m.material.depthTest = hl < 0.5 || !!(ins && cfv.g.includes(o.grp));
          m.renderOrder = inTube ? 6 : hl > 0.5 ? 5 : 0;
        });
      }
      // Close-up framings are measured once the robot has settled into the
      // pose they're seen in.
      if (cfv.zoom && !this.zf[v.focus] && c.explode < 0.01 && Math.abs(c.pose - v.pose) < 0.01) {
        const b = new THREE.Box3();
        this.meshes.forEach((m) => {
          if ((cfv.zg || cfv.g).includes(m.userData.o.grp) && (cfv.zh || cfv.hl).includes(m.userData.tag)) b.union(new THREE.Box3().setFromObject(m));
        });
        if (!b.isEmpty()) {
          const s = b.getSize(new THREE.Vector3()).max(new THREE.Vector3(0.12, 0.12, 0.12)).multiplyScalar(cfv.zd || 1);
          this.zf[v.focus] = { c: b.getCenter(new THREE.Vector3()), s, solo: 1 };
        }
      }
    }

    // Camera: a weighted blend of the focus framings.
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1, asp = w / h;
    const th = Math.tan(15 * Math.PI / 180);
    const tg = new THREE.Vector3();
    let dist = 1;
    if (this.frames) {
      const F = this.frames.map((fr, i) => this.zf[FOCI[i]] || fr);
      const ws = c.f.reduce((a, b) => a + b, 0) || 1;
      dist = 0;
      F.forEach((fr, i) => {
        const wt = c.f[i] / ws;
        if (!wt) return;
        tg.addScaledVector(fr.c, wt);
        const hz = Math.max(fr.s.x, fr.s.z);
        dist += wt * Math.max(fr.s.y / 2 / th, hz / 2 / (th * asp)) * (i ? (fr.solo ? 2.1 : 2.0) : 1.5 + c.explode * 0.8);
      });
    }
    c.po += ((cfv.pitch != null ? cfv.pitch - 0.3 : 0) - c.po) * k;
    const pitch = 0.3 + c.f[0] * 0.1 + c.po;
    const yoT = cfv.yawAbs != null ? cfv.yawAbs - c.yaw : (cfv.yaw || 0);
    c.yo += (yoT - c.yo) * k;
    const yaw = c.yaw + c.yo;
    c.pn += ((cfv.pan || 0) - c.pn) * k;
    this.cam.position.set(
      Math.sin(yaw) * Math.cos(pitch) * dist,
      Math.sin(pitch) * dist,
      Math.cos(yaw) * Math.cos(pitch) * dist,
    ).add(tg);
    this.cam.lookAt(tg);
    this.cam.setViewOffset(w, h, (c.pn - c.shift) * w, -h * 0.12 * c.f[0], w, h);

    // Skip the draw when nothing moved.
    const sig = [c.s3, c.explode, yaw + c.po + c.pn, c.shift, c.pose, ...c.f, w, h].map((x) => x.toFixed(4)).join();
    if (sig === this.sig && this.parts) return;
    this.sig = sig;
    this.renderer.render(this.scene, this.cam);
  }

  dispose() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.io.disconnect();
    document.removeEventListener('visibilitychange', this.onVis);
    if (this.hold) disposeTree(this.hold);
    this.envMap.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

function CoyneView({ src, focus, pose, yaw, shift, onProgress, onLoaded, className }) {
  const host = React.useRef(null);
  const stage = React.useRef(null);
  const cb = React.useRef({});
  cb.current.onProgress = onProgress;
  cb.current.onLoaded = onLoaded;
  React.useEffect(() => {
    let s;
    // No WebGL (blocked, or an old device): the page still works without
    // the model.
    try { s = new CoyneStage(host.current, src, cb.current); } catch (err) {
      console.warn('Coyneinator model unavailable', err);
      return undefined;
    }
    stage.current = s;
    return () => { s.dispose(); stage.current = null; };
  }, [src]);
  React.useEffect(() => {
    stage.current?.set({ focus, pose, yaw, shift });
  }, [focus, pose, yaw, shift, src]);
  return <div ref={host} className={className} aria-hidden="true" />;
}

export default CoyneView;
