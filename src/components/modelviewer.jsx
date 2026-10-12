import React from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { loadModel } from './threeutil.js';

// Interactive 3D model for the Projects panel. Loaded lazily (see
// projects.jsx), so three.js stays out of the main bundle.
//
// Give it a GLB with `src` and it sizes, centres and frames the model by
// itself, and builds the explode slider from the file's parts: each one slides
// away from the model's middle along its longest axis. A file with a single
// part just gets no slider.

// Files are optimized with meshopt (see the notes in projects.jsx).
async function loadGlb(src, up) {
  const gltf = await loadModel(src);
  const scene = gltf.scene;
  if (up === 'z') scene.rotation.x = -Math.PI / 2; // CAD tools are often Z-up

  // CAD exports come in any unit and origin: scale the longest side to 1
  // and centre it.
  const model = new THREE.Group();
  model.add(scene);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const k = 1 / Math.max(size.x, size.y, size.z, 1e-9);
  model.scale.setScalar(k);
  model.position.copy(box.getCenter(new THREE.Vector3())).multiplyScalar(-k);
  model.updateMatrixWorld(true);
  model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // Every mesh-holding node is its own part, however deep it sits in the
  // assembly, so each screw and spacer explodes on its own.
  const hasMesh = (o) => { let found = false; o.traverse((c) => { if (c.isMesh) found = true; }); return found; };
  const parts = [];
  const collect = (node) => {
    const kids = node.children.filter(hasMesh);
    if (kids.length === 0) { parts.push(node); return; }
    kids.forEach(collect);
  };
  collect(scene);
  if (parts.length < 2) return { model, parts: [] };

  const axis = ['x', 'y', 'z'].reduce((a, b) => (size[b] > size[a] ? b : a));
  parts.forEach((p) => {
    const c = new THREE.Box3().setFromObject(p).getCenter(new THREE.Vector3());
    // The model is centred on the origin, so c[axis] is the distance from
    // the middle. Convert that world-space push into the part's own parent space.
    const off = new THREE.Vector3();
    off[axis] = c[axis];
    off.applyMatrix3(new THREE.Matrix3().setFromMatrix4(p.parent.matrixWorld).invert());
    p.userData.base = p.position.clone();
    p.userData.off = off;
  });
  return { model, parts };
}

function disposeModel(model) {
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    [].concat(o.material).forEach((m) => {
      Object.values(m).forEach((v) => { if (v && v.isTexture) v.dispose(); });
      m.dispose();
    });
  });
}

// `hero` is the project-page variant: only the explode control, since the
// page already names it. Neither variant zooms on the wheel: the viewer sits
// in a scrolling page, and catching the wheel would stop the page scrolling.
function ModelViewer({ src, up, label, note, hero = false }) {
  const hostRef = React.useRef(null);
  const sliderRef = React.useRef(null);
  const explodeRef = React.useRef({ cur: 1, target: 0 });
  const applyRef = React.useRef(() => {});
  const [status, setStatus] = React.useState('loading'); // loading | ready | failed | nowebgl
  const [canExplode, setCanExplode] = React.useState(false);
  const [exploded, setExploded] = React.useState(false);

  React.useEffect(() => {
    const host = hostRef.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (err) {
      setStatus('nowebgl');
      return undefined;
    }
    setStatus('loading');
    setCanExplode(false);
    setExploded(false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 500);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enableZoom = false;
    // OrbitControls claims every touch; in the page hero, let vertical swipes
    // scroll the page and keep sideways drags for turning the model.
    if (hero) renderer.domElement.style.touchAction = 'pan-y';

    // Neutral studio: sky/ground wash, a shadow-casting key, a dim back fill.
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0002;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xfff4e6, 0.5);
    fill.position.set(-5, 3, -4);
    scene.add(fill);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.35 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Metal materials in CAD exports render black with nothing to reflect.
    let envMap;
    if (src) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
      scene.environment = envMap;
      scene.environmentIntensity = 0.6;
    }

    const fit = () => {
      const w = host.clientWidth || 1, h = host.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);

    // Slow turntable that resumes 3.5s after the visitor lets go.
    let idleT;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;
    controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(idleT); });
    controls.addEventListener('end', () => {
      clearTimeout(idleT);
      idleT = setTimeout(() => { controls.autoRotate = true; }, 3500);
    });

    let live = true;
    let loaded;
    let easeT;
    let easing = false;
    const ex = explodeRef.current;
    ex.cur = 1; ex.target = 0;

    loadGlb(src, up).then(({ model, parts }) => {
      if (!live) { disposeModel(model); return; }
      loaded = model;
      const apply = (t) => {
        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        parts.forEach((p) => p.position.copy(p.userData.base).addScaledVector(p.userData.off, e));
      };
      applyRef.current = apply;
      apply(1);
      scene.add(model);

      // Frame the camera on the exploded model so it never leaves the view.
      const box = new THREE.Box3().setFromObject(model);
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const dist = (sphere.radius / Math.tan((camera.fov * Math.PI) / 360)) * 1.35 * 1.02;
      const drop = sphere.radius * 0.15; // leave room for the controls below
      ground.position.y = box.min.y - sphere.radius * 0.003;
      controls.target.copy(sphere.center);
      camera.position.copy(sphere.center).add(new THREE.Vector3(1, 0.55, 1.25).normalize().multiplyScalar(dist));
      camera.position.y -= drop;
      controls.target.y -= drop;
      camera.near = Math.max(dist / 100, 0.01);
      camera.far = dist * 100;
      camera.updateProjectionMatrix();
      const span = sphere.radius * 3;
      Object.assign(key.shadow.camera, { left: -span, right: span, top: span, bottom: -span });
      key.shadow.camera.updateProjectionMatrix();
      controls.update();

      setCanExplode(parts.length > 0);
      setStatus('ready');
      // Opens exploded, then eases together after a beat.
      easeT = setTimeout(() => { easing = true; }, 600);
    }).catch(() => { if (live) setStatus('failed'); });

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.1);
      if (easing && Math.abs(ex.cur - ex.target) > 0.001) {
        ex.cur += (ex.target - ex.cur) * (1 - Math.pow(0.92, dt * 60));
        applyRef.current(ex.cur);
        if (sliderRef.current) sliderRef.current.value = ex.cur;
      }
      controls.update();
      renderer.render(scene, camera);
    });

    return () => {
      live = false;
      clearTimeout(idleT);
      clearTimeout(easeT);
      applyRef.current = () => {};
      renderer.setAnimationLoop(null);
      ro.disconnect();
      controls.dispose();
      if (loaded) disposeModel(loaded);
      if (envMap) envMap.dispose();
      ground.geometry.dispose();
      ground.material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [src, up, hero]);

  const onSlide = (e) => {
    const ex = explodeRef.current;
    ex.cur = ex.target = +e.target.value;
    applyRef.current(ex.cur);
    setExploded(ex.target > 0.5);
  };
  const onToggle = () => {
    const ex = explodeRef.current;
    ex.target = ex.target > 0.5 ? 0 : 1;
    setExploded(ex.target > 0.5);
  };

  const message = {
    loading: 'Loading model…',
    failed: "The 3D model didn't load.",
    nowebgl: 'The 3D view needs WebGL, which this browser has turned off.',
  }[status];

  return (
    <div className={`g-viewer ${hero ? 'is-hero' : ''}`}>
      <div ref={hostRef} className="g-viewer-stage" />
      {message && <div className="g-viewer-fail">{message}</div>}
      {status === 'ready' && (
        <>
          <div className="g-viewer-hint">Drag to orbit</div>
          <div className="g-viewer-ui">
            <div className="g-viewer-tag"><b>{label}</b>{note}</div>
            {canExplode && (
              <div className="g-viewer-ctl">
                <label htmlFor="g-explode">Explode</label>
                <input id="g-explode" ref={sliderRef} type="range" min="0" max="1" step="0.01" defaultValue="0" onInput={onSlide} />
                <button type="button" onClick={onToggle}>{exploded ? 'Assemble' : 'Explode'}</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ModelViewer;
