import React from 'react';
import { RESUME_FILENAME, RESUME_URL } from '../site.js';
import {
  AUTO_FIG, CONE, CUBE, INTAKE_FACTS, LAYERS, LIMITS, PHOTOS, PRESETS, RESULTS, STAGGER, STATES, STATS, TABLE, TOUR,
} from '../data/quetzy.js';
import { getProject } from '../data/projects.js';
import { ProgressBar } from './home.jsx';
import { Rv, clamp, prefersReducedMotion, useGlassTheme, useScrollFrame } from './motion.jsx';
import { ModelFallback, SkipOnError } from './modelfallback.jsx';
import { PageLink } from './pagelink.jsx';
import { goBackTo, whenSettled } from '../transitions.js';
import '../research.css';
import '../quetzy.css';

// /projects/frc-charged-up: Claude Design's "Quetzy Page", the software for
// FRC 4255's 2023 Charged Up robot. A pinned 3D tour of the robot, then the
// software at a glance, an arm preset playground, intake sensing, the
// RobotState machine, autonomous, fault handling and photos. Its nav, side
// dots and progress bar are the research page's (research.css). Copy that
// isn't a paragraph is in data/quetzy.js.

// three.js only loads on this page.
const QuetzyView = React.lazy(() => import('./quetzyview.jsx'));
const MODEL = '/models/quetzy.glb';
const COVER = getProject('frc-charged-up');

const NARROW = '(max-width: 759px)';
function useNarrow() {
  const [narrow, setNarrow] = React.useState(() => window.matchMedia(NARROW).matches);
  React.useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

// Progress through a pinned section: 0 when its top reaches the top of the
// viewport, 1 when its bottom reaches the bottom.
const pinProgress = (el) => {
  const r = el.getBoundingClientRect();
  return clamp(-r.top / Math.max(1, r.height - window.innerHeight));
};

function jumpTo(id) {
  return (e) => {
    if (e) e.preventDefault();
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
  };
}

const CHAPTERS = [
  ['qz-robot', 'Robot'], ['qz-glance', 'Software'], ['qz-arm', 'Arm'], ['qz-intake', 'Intake'],
  ['qz-state', 'RobotState'], ['qz-auto', 'Autonomous'], ['qz-safe', 'Fail-safe'], ['qz-photos', 'Photos'],
];

// Back to /projects with the reverse of the card-opening transition.
const toAll = (e) => { e.preventDefault(); goBackTo('/projects'); };

function Nav() {
  return (
    <nav className="g-rs-nav" aria-label="Site">
      <div className="g-rs-nav-left">
        <PageLink to="/" className="g-rs-nav-name">Mikayla Fisher</PageLink>
        <div className="g-rs-crumb">
          <span>/</span><a href="/projects" onClick={toAll}>Projects</a><span>/</span><span>Quetzy</span>
        </div>
      </div>
      <div className="g-rs-nav-right">
        <a href="/projects" onClick={toAll} className="g-rs-nav-link is-all"><span>←</span>All projects</a>
        <a href={RESUME_URL} download={RESUME_FILENAME} className="g-rs-nav-cta is-wide">Résumé ↗</a>
      </div>
    </nav>
  );
}

// Vertical dots on the right edge, one per chapter.
function Rail() {
  const [on, setOn] = React.useState(CHAPTERS[0][0]);
  useScrollFrame(() => {
    let at = CHAPTERS[0][0];
    for (const [id] of CHAPTERS) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top < window.innerHeight * 0.45) at = id;
    }
    setOn(at);
  });
  return (
    <div className="g-rs-rail">
      {CHAPTERS.map(([id, label]) => (
        <a key={id} href={`#${id}`} onClick={jumpTo(id)} aria-label={label} className={id === on ? 'is-on' : ''}>
          <span className="g-rs-rail-dot" />
          <span className="g-rs-rail-label">{label}</span>
        </a>
      ))}
    </div>
  );
}

const pad2 = (n) => String(n).padStart(2, '0');

// A stat that counts up from zero the first time it scrolls into view.
// Whatever surrounds the number ("~", "rd", " A", "%") stays put.
function CountUp({ value, className, style }) {
  const ref = React.useRef(null);
  // Ranks ("3rd") stay as they are: "0rd" on the way up reads wrong.
  const m = /^(\D*)([\d,]+)(?![\d,]|st|nd|rd|th)(.*)$/.exec(value);
  React.useEffect(() => {
    const el = ref.current;
    if (!m || !el || prefersReducedMotion() || !('IntersectionObserver' in window)) return undefined;
    const [, pre, num, post] = m;
    const target = Number(num.replace(/,/g, ''));
    const show = (n) => { el.textContent = pre + Math.round(n).toLocaleString('en-US') + post; };
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now(), dur = 1400;
      const step = (now) => {
        const t = clamp((now - t0) / dur);
        show(target * (1 - Math.pow(1 - t, 3)));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.3 });
    // Below the fold, start from zero so the count is seen.
    if (el.getBoundingClientRect().top > window.innerHeight * 0.9) show(0);
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value]);
  return <span ref={ref} className={className} style={style}>{value}</span>;
}

// Section heading: eyebrow and display title, with an optional paragraph
// beside it.
function Head({ eyebrow, title, em, children }) {
  return (
    <div className="g-qz-split">
      <Rv className="g-qz-head">
        <span className="g-rs-eyebrow">{eyebrow}</span>
        <h2 className="g-qz-display">{title} <em>{em}</em></h2>
      </Rv>
      {children && <Rv delay={120}>{children}</Rv>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Hero + subsystems. The hero holds the first slice of the scroll, then
// one stop per subsystem: it stays solid while the others fade.
// ---------------------------------------------------------------------------

const STOPS = TOUR.length + 1;

function Tour({ narrow }) {
  const ref = React.useRef(null);
  const [p, setP] = React.useState(0);
  useScrollFrame(() => setP(Math.min(0.9999, Math.round(pinProgress(ref.current) * 1000) / 1000)));
  const [ld, setLd] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);

  // The model loads once the opening transition has landed: loading
  // three.js mid-flight would freeze the motion.
  const [settled, setSettled] = React.useState(false);
  // No WebGL, or the model or viewer failed to load: show the cover photo.
  const [modelFailed, setModelFailed] = React.useState(false);
  const onModelError = React.useCallback(() => setModelFailed(true), []);
  React.useLayoutEffect(() => whenSettled(() => setSettled(true)), []);

  const si = Math.min(STOPS - 1, Math.floor(p * STOPS));
  const ti = si - 1;
  const hero = si === 0;

  return (
    <section id="qz-robot" ref={ref} className="g-rs-pin g-qz-tour">
      <div className="g-rs-sticky g-qz-tour-sticky">
        {modelFailed ? <ModelFallback className="g-qz-model" src={COVER.cover} alt={COVER.coverAlt} />
          : settled && <SkipOnError onError={onModelError}>
          <React.Suspense fallback={null}>
            <QuetzyView
              onError={onModelError}
              className="g-qz-model"
              src={MODEL}
              focus={hero ? '' : TOUR[ti].focus}
              yaw={0.8 + p * 2.4}
              shift={narrow || hero ? 0 : 0.18}
              lift={narrow && !hero ? 0.2 : 0}
              onProgress={setLd}
              onLoaded={() => setLoaded(true)}
            />
          </React.Suspense>
        </SkipOnError>}

        <div className={`g-qz-hero ${hero ? '' : 'is-off'}`}>
          <span className="g-rs-eyebrow">FRC Team 4255 · 2023 Charged Up · Robot software</span>
          <h1>Quetzy, <em>robot software</em></h1>
        </div>
        <div className={`g-qz-cue ${hero ? '' : 'is-off'}`}>
          {settled && !loaded && !modelFailed && <span>Loading the CAD · {Math.round(ld * 100)}%</span>}
          <span>Scroll for the subsystems</span>
        </div>

        <div className="g-qz-steps">
          {TOUR.map((s, i) => (
            <div key={s.focus} className={`g-qz-step ${i === ti ? 'is-on' : i < ti ? 'is-past' : ''}`} aria-hidden={i !== ti}>
              <span className="g-rs-eyebrow is-accent">{pad2(i + 1)} · {s.kicker}</span>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
              <div className="g-qz-chips">
                {s.facts.map(([k, v]) => <span key={k}><span className="g-qz-k">{k}</span><span>{v}</span></span>)}
              </div>
            </div>
          ))}
        </div>

        <div className={`g-qz-dots ${hero ? 'is-off' : ''}`}>
          {TOUR.map((s, i) => <span key={s.focus} className={i === ti ? 'is-on' : ''} />)}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 2. Software overview
// ---------------------------------------------------------------------------

function Glance() {
  return (
    <section id="qz-glance" className="g-qz-band">
      <div className="g-qz-wrap is-narrow">
        <Head eyebrow="The software" title="Software" em="overview">
          <p className="g-qz-lede">Quetzy is a swerve robot with a two-joint arm that scores cones and cubes on all three rows. I wrote its software: about 2,750 lines of Java. One driver runs the robot from one Xbox controller, every arm pose is one button, and the LEDs show the robot’s mode.</p>
        </Head>
        <div className="g-qz-cards is-results">
          {RESULTS.map((s, i) => (
            <Rv key={s.k} delay={i * 90}><span className="g-rs-eyebrow">{s.k}</span><CountUp className="g-qz-big" value={s.v} /><span>{s.d}</span></Rv>
          ))}
        </div>
        <div className="g-qz-cards">
          {STATS.map((s, i) => (
            <Rv key={s.k} delay={i * 90}><span className="g-rs-eyebrow">{s.k}</span><CountUp className="g-qz-big is-stat" value={s.v} /><span>{s.d}</span></Rv>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 3. Arm and wrist presets. Each joint follows its own trapezoid profile from
// the code's limits; the staggered joint waits STAGGER seconds. The SVGs are
// updated directly each frame while a move runs.
// ---------------------------------------------------------------------------

// A trapezoid (or triangle) profile from p0 to p1 that starts after `delay`.
function profile(p0, p1, vMax, aMax, delay) {
  const d = Math.abs(p1 - p0), s = Math.sign(p1 - p0) || 1;
  let ta = vMax / aMax, tc;
  if (aMax * ta * ta > d) { ta = Math.sqrt(d / aMax); tc = 0; } else tc = (d - aMax * ta * ta) / vMax;
  const vp = aMax * ta, T = 2 * ta + tc;
  const at = (t) => {
    t -= delay;
    if (t <= 0) return [0, 0];
    if (t >= T) return [d, 0];
    if (t < ta) return [0.5 * aMax * t * t, aMax * t];
    if (t < ta + tc) return [0.5 * aMax * ta * ta + vp * (t - ta), vp];
    const u = T - t;
    return [d - 0.5 * aMax * u * u, aMax * u];
  };
  return { T: T + delay, delay, pos: (t) => p0 + s * at(t)[0], vel: (t) => s * at(t)[1] };
}

// Plot scales: joint space (arm → x, wrist → y) and the velocity chart.
const AX = (a) => 40 + (a + 1.6) / 2.2 * 344;
const WY = (w) => 266 - (w + 0.1) / 1.6 * 250;
const TX = (t) => 40 + t / 1.6 * 344;
const VY = (v) => 85 - v / 3.2 * 70;
const sgn = (x) => (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(2);
const velLine = (P) => {
  if (!P) return '';
  const o = [];
  for (let i = 0; i <= 80; i++) { const t = i / 80 * 1.6; o.push(`${TX(t).toFixed(1)},${VY(P.vel(t)).toFixed(1)}`); }
  return o.join(' ');
};
const STOW = TABLE.cone.stow;
const LABEL = Object.fromEntries(PRESETS);

function Arm() {
  const [mode, setMode] = React.useState('cone');
  const [at, setAt] = React.useState('stow');
  const [mv, setMv] = React.useState(null);
  const [note, setNote] = React.useState('Press a preset');
  const pose = React.useRef(STOW);
  const trail = React.useRef([]);
  const r = {
    arm: React.useRef(null), wr: React.useRef(null), pc: React.useRef(null), wj: React.useRef(null),
    ta: React.useRef(null), tw: React.useRef(null), dot: React.useRef(null), trail: React.useRef(null), head: React.useRef(null),
  };

  const draw = React.useCallback((t) => {
    const [a, w] = pose.current;
    const ex = 200 + 110 * Math.cos(a), ey = 120 - 110 * Math.sin(a);
    const wx = ex + 52 * Math.cos(w), wy = ey - 52 * Math.sin(w);
    const set = (ref, o) => { const e = ref.current; if (e) for (const k in o) e.setAttribute(k, o[k]); };
    set(r.arm, { x2: ex.toFixed(1), y2: ey.toFixed(1) });
    set(r.wr, { x1: ex.toFixed(1), y1: ey.toFixed(1), x2: wx.toFixed(1), y2: wy.toFixed(1) });
    set(r.wj, { cx: ex.toFixed(1), cy: ey.toFixed(1) });
    set(r.pc, { cx: wx.toFixed(1), cy: wy.toFixed(1) });
    set(r.dot, { cx: AX(a).toFixed(1), cy: WY(w).toFixed(1) });
    const L = trail.current;
    set(r.trail, { d: L.length > 1 ? 'M' + L.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' L') : '' });
    const hx = TX(Math.min(1.6, t)).toFixed(1);
    set(r.head, { x1: hx, x2: hx });
    if (r.ta.current) r.ta.current.textContent = sgn(a);
    if (r.tw.current) r.tw.current.textContent = sgn(w);
  }, []);

  // Run the move frame by frame until the playhead reaches the chart's end.
  React.useEffect(() => {
    if (!mv) { draw(0); return undefined; }
    let raf = 0;
    const step = () => {
      const t = (performance.now() - mv.t0) / 1000;
      const a = mv.A.pos(t), w = mv.W.pos(t);
      pose.current = [a, w];
      const L = trail.current, last = L[L.length - 1];
      if (t <= mv.T + 0.05 && (!last || Math.hypot(AX(a) - last[0], WY(w) - last[1]) > 2)) L.push([AX(a), WY(w)]);
      draw(t);
      if (t < Math.max(1.6, mv.T)) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [mv, draw]);

  const go = (k) => {
    const tg = TABLE[mode][k], [a0, w0] = pose.current;
    if (Math.abs(tg[0] - a0) < 1e-3 && Math.abs(tg[1] - w0) < 1e-3) { setAt(k); return; }
    // Going up, the arm leads; coming down, the wrist tucks first.
    const up = tg[0] > a0 + 1e-3;
    const A = profile(a0, tg[0], ...LIMITS.arm, up ? 0 : STAGGER);
    const W = profile(w0, tg[1], ...LIMITS.wrist, up ? STAGGER : 0);
    trail.current = [[AX(a0), WY(w0)]];
    setAt(k);
    setNote(up ? 'Going up: the arm leads, the wrist follows 0.4 s later' : 'Coming down: the wrist tucks first, the arm follows 0.4 s later');
    setMv({ t0: performance.now(), A, W, T: Math.max(A.T, W.T), up });
  };

  const led = mode === 'cone' ? CONE : CUBE;
  const stagger = mv ? (mv.up ? mv.W.delay : mv.A.delay) : 0;
  // Every preset of both tables; the other mode's sit back.
  const pts = [];
  Object.keys(TABLE.cone).forEach((k) => ['cone', 'cube'].forEach((md) => {
    if (k === 'stow' && md === 'cube') return;
    const [a, w] = TABLE[md][k], x = AX(a), y = WY(w), on = md === mode || k === 'stow';
    pts.push({
      key: k + md, x, y, on, label: on ? LABEL[k] : '',
      rx: md === 'cube' ? 2 : k === 'stow' ? 6 : 1, rot: md === 'cone' && k !== 'stow' ? 45 : 0,
      c: k === 'stow' ? 'var(--g-text-2)' : md === 'cone' ? CONE : CUBE,
    });
  }));

  return (
    <section id="qz-arm" className="g-qz-sec">
      <div className="g-qz-wrap">
        <Head eyebrow="Interactive · press a preset" title="Arm and wrist" em="presets">
          <p className="g-qz-body">Every preset is an (arm, wrist) angle pair, and cone or cube mode picks which table a button reads from. Each joint follows its own trapezoid profile, feedforward supplies the voltage, and a P controller cleans up. Going up, the arm leads and the wrist follows 0.4 s later. Coming down, the wrist tucks first.</p>
        </Head>
        <Rv className="g-qz-play">
          <div className="g-qz-controls">
            <div className="g-qz-presets">
              {PRESETS.map(([k, l]) => (
                <button key={k} type="button" onClick={() => go(k)} className={k === at ? 'is-on' : ''} aria-pressed={k === at}>{l}</button>
              ))}
            </div>
            <div className="g-qz-modes">
              <button type="button" onClick={() => setMode('cone')} className={`is-cone ${mode === 'cone' ? 'is-on' : ''}`} aria-pressed={mode === 'cone'}>
                <span>Y</span>Cone
              </button>
              <button type="button" onClick={() => setMode('cube')} className={`is-cube ${mode === 'cube' ? 'is-on' : ''}`} aria-pressed={mode === 'cube'}>
                <span>X</span>Cube
              </button>
            </div>
          </div>

          <div className="g-qz-panes">
            <div className="g-qz-pane">
              <div className="g-qz-pane-head">
                <span>Side view · schematic</span>
                <span className="g-qz-led">LEDs<span style={{ background: led, boxShadow: `0 0 14px ${led}` }} /></span>
              </div>
              <svg viewBox="0 0 400 300" role="img" aria-label="Side view of the arm and wrist">
                <line x1="20" y1="268" x2="380" y2="268" stroke="#2e3a4b" strokeWidth="2" />
                <rect x="120" y="236" width="160" height="26" rx="8" fill="#141c29" stroke="#2e3a4b" />
                <circle cx="140" cy="266" r="10" fill="#0b111b" stroke="#2e3a4b" strokeWidth="2" />
                <circle cx="260" cy="266" r="10" fill="#0b111b" stroke="#2e3a4b" strokeWidth="2" />
                <path d="M184 236 L196 120 L204 120 L216 236 Z" fill="#141c29" stroke="#2e3a4b" />
                <line ref={r.arm} x1="200" y1="120" x2="200" y2="230" stroke="#8fb8f7" strokeWidth="12" strokeLinecap="round" />
                <line ref={r.wr} x1="200" y1="230" x2="250" y2="230" stroke="#eef1f5" strokeWidth="9" strokeLinecap="round" />
                <circle ref={r.pc} cx="250" cy="230" r="11" fill={led} opacity=".9" />
                <circle cx="200" cy="120" r="7" fill="#0b111b" stroke="#8fb8f7" strokeWidth="3" />
                <circle ref={r.wj} cx="200" cy="230" r="5" fill="#0b111b" stroke="#eef1f5" strokeWidth="2.5" />
              </svg>
              <div className="g-qz-pane-read">
                <span>arm <span ref={r.ta} className="is-arm">−1.38</span> rad</span>
                <span>wrist <span ref={r.tw}>+1.29</span> rad</span>
              </div>
            </div>

            <div className="g-qz-pane">
              <div className="g-qz-pane-head"><span>Joint space · {mode} table</span></div>
              <svg viewBox="0 0 400 300" className="is-mono" role="img" aria-label={`Every preset in the ${mode} table, plotted as arm angle against wrist angle`}>
                {[-1.5, -1, -0.5, 0, 0.5].map((v) => (
                  <g key={v}>
                    <line x1={AX(v)} y1="16" x2={AX(v)} y2="266" stroke="#1a2230" />
                    <text x={AX(v)} y="286" textAnchor="middle" fontSize="11" fill="#8d97a6">{String(v).replace('-', '−')}</text>
                  </g>
                ))}
                {[0, 0.5, 1, 1.5].map((v) => (
                  <g key={v}>
                    <line x1="40" y1={WY(v)} x2="384" y2={WY(v)} stroke="#1a2230" />
                    <text x="32" y={WY(v) + 4} textAnchor="end" fontSize="11" fill="#8d97a6">{v}</text>
                  </g>
                ))}
                <path ref={r.trail} d="" fill="none" stroke="#8fb8f7" strokeWidth="2" strokeDasharray="3 4" opacity=".7" />
                {pts.map((q) => (
                  <g key={q.key} opacity={q.on ? 1 : 0.22} style={{ transition: 'opacity .3s' }}>
                    <rect x={q.x - 6} y={q.y - 6} width="12" height="12" rx={q.rx} fill={q.c} transform={`rotate(${q.rot} ${q.x} ${q.y})`} />
                    <text x={q.x} y={q.y - 12} textAnchor="middle" fontSize="11" fill="#eef1f5">{q.label}</text>
                  </g>
                ))}
                <circle ref={r.dot} cx="0" cy="0" r="7" fill="none" stroke="#fff" strokeWidth="2.5" />
              </svg>
              <div className="g-qz-pane-read is-mute">
                <span>x: arm angle (0 = horizontal)</span><span>y: wrist angle</span>
              </div>
            </div>
          </div>

          <div className="g-qz-panes">
            <div className="g-qz-pane">
              <div className="g-qz-pane-head is-wrap">
                <span>Velocity setpoints · last press</span>
                <span className="g-qz-legend">
                  <span className="is-arm">— arm {mv ? mv.A.T.toFixed(2) : '–'} s</span>
                  <span>— wrist {mv ? mv.W.T.toFixed(2) : '–'} s</span>
                </span>
              </div>
              <svg viewBox="0 0 400 170" className="is-mono" role="img" aria-label="Arm and wrist velocity setpoints for the last move">
                <line x1="40" y1="85" x2="384" y2="85" stroke="#2e3a4b" />
                {[0, 0.4, 0.8, 1.2, 1.6].map((t) => (
                  <g key={t}>
                    <line x1={TX(t)} y1="10" x2={TX(t)} y2="150" stroke="#1a2230" />
                    <text x={TX(t)} y="166" textAnchor="middle" fontSize="11" fill="#8d97a6">{t} s</text>
                  </g>
                ))}
                <text x="32" y="22" textAnchor="end" fontSize="11" fill="#8d97a6">+3</text>
                <text x="32" y="152" textAnchor="end" fontSize="11" fill="#8d97a6">−3</text>
                <text x="32" y="89" textAnchor="end" fontSize="11" fill="#8d97a6">0</text>
                <rect x="40" y="10" width={TX(stagger) - 40} height="140" fill="rgba(255,255,255,.04)" />
                <polyline points={velLine(mv?.A)} fill="none" stroke="#8fb8f7" strokeWidth="2.5" strokeLinejoin="round" />
                <polyline points={velLine(mv?.W)} fill="none" stroke="#eef1f5" strokeWidth="2.5" strokeLinejoin="round" />
                <line ref={r.head} x1="40" y1="10" x2="40" y2="150" stroke="#8fb8f7" strokeWidth="1.5" opacity=".6" />
              </svg>
              <span className="g-qz-small">rad/s against seconds since the press. Shaded: the staggered joint waiting 0.4 s.</span>
            </div>
            <div className="g-qz-move">
              <span className="g-qz-hand" aria-live="polite">{note}</span>
              <p>Limits: arm 3.5 rad/s and 4.25 rad/s², wrist 3 rad/s and 3.75 rad/s². Stow to high node with a cone takes the arm 1.26 s at a 2.69 rad/s peak, where feedforward asks for 8.4 V, and 0.43 V holds it at the top.</p>
              <p className="g-qz-small">Setpoints computed from the limits and presets in the code, not logged sensor data. Changing mode applies on the next press, like on the robot. Wrist angle is absolute. Link lengths are schematic.</p>
            </div>
          </div>
        </Rv>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 4. Game piece detection
// ---------------------------------------------------------------------------

function Intake() {
  return (
    <section id="qz-intake" className="g-qz-band">
      <div className="g-qz-wrap is-narrow g-qz-intake">
        <Rv className="g-qz-head">
          <span className="g-rs-eyebrow">Intake</span>
          <h2 className="g-qz-display">Game piece <em>detection</em></h2>
          <p className="g-qz-body">One roller spins one way for cubes and the other for cones. There is no beam break: the code watches the roller motor’s stator current, and past 50 A it rumbles the driver’s controller. After the button is released, the roller keeps a 7% hold in the right direction for that piece.</p>
        </Rv>
        <div className="g-qz-cards is-intake">
          {INTAKE_FACTS.map((f, i) => (
            <Rv key={f.k} delay={i * 90}><span className="g-rs-eyebrow">{f.k}</span><CountUp className="g-qz-big is-stat" style={f.c ? { color: f.c } : undefined} value={f.v} /><span>{f.d}</span></Rv>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 5. RobotState: tap a state to see its LED pattern and the ways out of it.
// ---------------------------------------------------------------------------

const exitColor = (to) => {
  if (to === 'ENCODER_DISCONNECTED') return '#e5484d';
  if (to === 'BALANCED') return 'var(--g-text)';
  const led = STATES.find((s) => s.id === to)?.led || '';
  return led.startsWith('#') ? led : 'var(--rs-italic)';
};

function State() {
  const [st, setSt] = React.useState('CONE');
  const cur = STATES.find((s) => s.id === st) || STATES[0];
  const strip = { background: cur.led, boxShadow: `0 0 28px ${cur.glow}` };
  return (
    <section id="qz-state" className="g-qz-sec">
      <div className="g-qz-wrap">
        <Head eyebrow="RobotState · tap a state" title="Robot" em="state">
          <p className="g-qz-body">Every subsystem shares one state value, and every state carries its own LED pattern. Changing state is one call: it sets both LED strips and appends the state to the on-robot log. Presets resolve against the current state, so the same button gives a cone or cube pose.</p>
        </Head>
        <div className="g-qz-state">
          <Rv className="g-qz-states">
            {STATES.map((s) => (
              <button key={s.id} type="button" onClick={() => setSt(s.id)} className={s.id === st ? 'is-on' : ''} aria-pressed={s.id === st}>
                <span className="g-qz-swatch" style={{ background: s.led }} />
                <span><span className="g-qz-state-id">{s.id}</span><span>{s.when}</span></span>
              </button>
            ))}
            <span className="g-qz-small">Declared but never entered on main: HAS_OBJECT, CAN_BUS_ERROR, PROGRAMMERS_R_DUMB.</span>
          </Rv>
          <Rv className="g-qz-state-card" delay={120} aria-live="polite">
            <div className="g-qz-strips">
              <div key={`a${cur.id}`} className={cur.anim && `is-${cur.anim}`} style={strip} />
              <div key={`b${cur.id}`} className={cur.anim && `is-${cur.anim}`} style={strip} />
            </div>
            <div className="g-qz-state-title"><span>{cur.id}</span><span>LED {cur.code} · {cur.pat}</span></div>
            <p>{cur.does}</p>
            <div className="g-qz-exits">
              <span className="g-rs-eyebrow">{cur.next.length ? 'Leaves when' : 'No exit: motors stay stopped'}</span>
              {cur.next.map(([why, to]) => (
                <button key={why} type="button" onClick={() => setSt(to)} className={to === 'ENCODER_DISCONNECTED' ? 'is-fault' : ''}>
                  <span>{why}</span><span style={{ color: exitColor(to) }}>→ {to}</span>
                </button>
              ))}
            </div>
          </Rv>
        </div>
        <div className="g-qz-notes">
          {LAYERS.map((l, i) => <Rv key={l.t} delay={i * 90}><h3 className="g-qz-hand is-title">{l.t}</h3><p>{l.b}</p></Rv>)}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 6–8. Autonomous, fault handling, photos
// ---------------------------------------------------------------------------

function Auto() {
  return (
    <section id="qz-auto" className="g-qz-band">
      <div className="g-qz-wrap">
        <Head eyebrow="Autonomous" title="Autonomous" em="routines">
          <p className="g-qz-body">The routines reuse the teleop commands (high node, stow, run intake) and chain them alongside PathPlanner trajectories, mirrored for the red alliance. The three-piece routine scores the preloaded cone high, then drives 25.9 m of path to collect and score two cubes.</p>
        </Head>
        <Rv as="figure" className="g-qz-fig">
          <a href={AUTO_FIG.src} target="_blank" rel="noreferrer">
            <img src={AUTO_FIG.src} alt={AUTO_FIG.alt} width={AUTO_FIG.w} height={AUTO_FIG.h} loading="lazy" decoding="async" />
          </a>
          <figcaption>Drawn from the PathPlanner files the robot follows. Field landmarks are approximate. A fourth routine, 2P, is 2PE without the charge station run.</figcaption>
        </Rv>
        <div className="g-qz-notes is-two">
          <Rv><h3 className="g-qz-hand is-title">Auto-balance</h3><p>On the charge station, two PD loops read pitch and roll from the gyro and drive the robot uphill until both are within 2.5°. The LEDs turn white when it is level.</p></Rv>
          <Rv delay={90}><h3 className="g-qz-hand is-title">Starting mode</h3><p>Three of the four routines start in IDLE, which reads the cone table, score the preloaded cone, and only then switch to CUBE for the pieces they pick up off the floor.</p></Rv>
        </div>
      </div>
    </section>
  );
}

function Safe() {
  return (
    <section id="qz-safe" className="g-qz-sec">
      <div className="g-qz-wrap is-narrow is-last">
        <Rv className="g-qz-head is-measure">
          <span className="g-rs-eyebrow">When things go wrong</span>
          <h2 className="g-qz-display">Fault <em>handling</em></h2>
          <p className="g-qz-body">If the arm or wrist absolute encoder comes unplugged, that joint’s position control switches off, its motors stop, new moves are refused and the LEDs strobe red. A second check catches the encoder wrapping past a full turn and corrects for it. State changes, encoder health and the wrap correction all go to the on-robot data log.</p>
        </Rv>
        <div className="g-qz-notes is-two">
          <Rv><h3 className="g-qz-hand is-title">What I would change</h3><p>RobotState is a shared flag, not a strict transition table, and mode shares one variable with status. I would split the two so a fault cannot overwrite cone or cube, drive the declared HAS_OBJECT state from the current spike that already exists, and finish the Limelight alignment left on the Vision branch.</p></Rv>
          <Rv delay={90}><h3 className="g-qz-hand is-title">Credits</h3><p>The swerve drive is built on Team 364’s open-source BaseFalconSwerve template, and trajectories use PathPlanner. The arm, wrist, intake, state machine, autonomous routines and auto-balance were written for Quetzy.</p></Rv>
        </div>
        <span className="g-qz-source">From frc4255/2023_Quetzy · main · last commit 28 Oct 2023</span>
      </div>
    </section>
  );
}

function Photos() {
  return (
    <section id="qz-photos" className="g-qz-band is-end">
      <div className="g-qz-wrap is-photos">
        <Rv className="g-qz-head">
          <span className="g-rs-eyebrow">2023 season</span>
          <h2 className="g-qz-display">Quetzy <em>in person</em></h2>
        </Rv>
        <div className="g-qz-masonry">
          {PHOTOS.map((ph, i) => (
            <Rv as="figure" key={ph.src} delay={(i % 3) * 90}>
              <a href={ph.src} target="_blank" rel="noreferrer">
                <img src={ph.src} alt={ph.alt} width={ph.w} height={ph.h} loading="lazy" decoding="async" />
              </a>
              <figcaption>{ph.cap}</figcaption>
            </Rv>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuetzyPage() {
  useGlassTheme();
  const narrow = useNarrow();
  return (
    <div className="glass g-rs g-qz">
      <div className="g-qz-glow" aria-hidden="true" />
      <Nav />
      <Rail />
      <main data-pt-page="">
        <Tour narrow={narrow} />
        <Glance />
        <Arm />
        <Intake />
        <State />
        <Auto />
        <Safe />
        <Photos />
        <footer className="g-qz-foot">
          <a href="/projects" onClick={toAll}>← All projects</a>
          <span>© 2026 Mikayla Fisher</span>
        </footer>
      </main>
      <ProgressBar />
    </div>
  );
}

export default QuetzyPage;
