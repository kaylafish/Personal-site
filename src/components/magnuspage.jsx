import React from 'react';
import { RESUME_FILENAME, RESUME_URL } from '../site.js';
import { BALL, CHAPTERS, CL_FIT, FACTS, RESULTS, STEPS, TOUR } from '../data/magnus.js';
import { ProgressBar } from './home.jsx';
import { clamp, useGlassTheme, useScrollFrame } from './motion.jsx';
import { PageLink } from './pagelink.jsx';
import { goBackTo, whenSettled } from '../transitions.js';
import '../research.css';
import '../magnus.css';

// /projects/magnus-effect: Claude Design's "Magnus Page". The IB Physics
// Extended Essay: a live flight model, the launcher in 3D, then setup,
// method, results and the condensed write-up. Its nav, side dots and
// progress bar are the research page's (research.css). Copy that isn't a
// paragraph is in data/magnus.js.

// three.js only loads on this page.
const LauncherView = React.lazy(() => import('./launcherview.jsx'));
const MODEL = '/models/launcher.glb';

// If the viewer's code can't load (offline, a stale deploy), the page goes
// on without the model.
class SkipOnError extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

function jumpTo(id) {
  return (e) => {
    if (e) e.preventDefault();
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
  };
}

// Back to /projects with the reverse of the card-opening transition.
const toAll = (e) => { e.preventDefault(); goBackTo('/projects'); };

const BACKSPIN = '#5b9cf5';
const TOPSPIN = '#eb8a5a';
const AMBER = '#d9a441';

// ---------------------------------------------------------------------------
// The flight model: Design's fly(), as-is. RK4 at Δt = 1/2400 s from a
// horizontal launch until the ball reaches the wall. Returns sampled points
// and the height at the wall (m, relative to launch).
// ---------------------------------------------------------------------------

const R = BALL.D / 2, A = Math.PI * R * R, K = BALL.rho * A / (2 * BALL.m);
const G = BALL.g, CD = BALL.CD, WALL = BALL.wall;
const cl = (S) => (Math.abs(S) < 1e-6 ? 0 : CL_FIT.slope * Math.abs(S) + CL_FIT.intercept);
function fly(v0, S) {
  const c = cl(S), sg = Math.sign(S);
  let x = 0, y = 0, vx = v0, vy = 0;
  const dt = 1 / 2400, pts = [[0, 0]];
  const f = (vx, vy) => { const v = Math.hypot(vx, vy); return [-K * CD * v * vx + sg * K * c * v * (-vy), -G - K * CD * v * vy + sg * K * c * v * vx]; };
  for (let i = 0; i < 20000 && x < WALL; i++) {
    const a1 = f(vx, vy), a2 = f(vx + a1[0] * dt / 2, vy + a1[1] * dt / 2), a3 = f(vx + a2[0] * dt / 2, vy + a2[1] * dt / 2), a4 = f(vx + a3[0] * dt, vy + a3[1] * dt);
    const nx = x + dt * (vx + 2 * (vx + a1[0] * dt / 2) + 2 * (vx + a2[0] * dt / 2) + (vx + a3[0] * dt)) / 6;
    const ny = y + dt * (vy + 2 * (vy + a1[1] * dt / 2) + 2 * (vy + a2[1] * dt / 2) + (vy + a3[1] * dt)) / 6;
    vx += dt * (a1[0] + 2 * a2[0] + 2 * a3[0] + a4[0]) / 6;
    vy += dt * (a1[1] + 2 * a2[1] + 2 * a3[1] + a4[1]) / 6;
    if (nx >= WALL) { const t = (WALL - x) / (nx - x); y = y + (ny - y) * t; x = WALL; pts.push([x, y]); break; }
    x = nx; y = ny;
    if (i % 24 === 0) pts.push([x, y]);
  }
  return { pts, y };
}

const Y0 = 0.25, Y1 = -0.6;
const px = (x) => 60 + x / WALL * 840;
const py = (y) => 20 + (Y0 - y) / (Y0 - Y1) * 320;
const path = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + px(p[0]).toFixed(1) + ',' + py(p[1]).toFixed(1)).join(' ');

// ---------------------------------------------------------------------------
// Chrome: nav and side dots
// ---------------------------------------------------------------------------

function Nav() {
  return (
    <nav className="g-rs-nav" aria-label="Site">
      <div className="g-rs-nav-left">
        <PageLink to="/" className="g-rs-nav-name">Mikayla Fisher</PageLink>
        <div className="g-rs-crumb">
          <span>/</span><a href="/projects" onClick={toAll}>Projects</a><span>/</span><span>Magnus effect</span>
        </div>
      </div>
      <div className="g-rs-nav-right">
        <a href="/projects" onClick={toAll} className="g-rs-nav-link is-all"><span>←</span>All projects</a>
        <a href={RESUME_URL} download={RESUME_FILENAME} className="g-rs-nav-cta is-wide">Résumé ↗</a>
      </div>
    </nav>
  );
}

function Rail() {
  const [on, setOn] = React.useState(CHAPTERS[0][0]);
  useScrollFrame(() => {
    let at = CHAPTERS[0][0];
    for (const [id] of CHAPTERS) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top < window.innerHeight * 0.5) at = id;
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

// ---------------------------------------------------------------------------
// 1. Hero and the live flight model
// ---------------------------------------------------------------------------

function FlightModel() {
  const [s, setS] = React.useState(0.2);
  const [v, setV] = React.useState(10);
  const base = React.useMemo(() => fly(v, 0), [v]);
  const spin = React.useMemo(() => fly(v, s), [v, s]);
  const d = (spin.y - base.y) * 1000;
  const col = s > 0 ? BACKSPIN : s < 0 ? TOPSPIN : '#eef1f5';
  const sTxt = (s > 0 ? '+' : '') + s.toFixed(2) + (s > 0 ? ' backspin' : s < 0 ? ' topspin' : '');
  return (
    <div className="g-mg-model">
      <div className="g-mg-model-head">
        <span className="g-mg-label">Flight model · uses the fitted C<sub>D</sub> and C<sub>L</sub>(S)</span>
        <span className="g-mg-readout">At the wall: <b style={{ color: col }}>{(d >= 0 ? '+' : '') + d.toFixed(0)} mm</b> vs no spin</span>
      </div>
      <svg viewBox="0 0 1000 380" className="g-mg-svg" role="img" aria-label="Ball path with spin against the no-spin path">
        <line x1="60" x2="900" y1="38.8" y2="38.8" stroke="#1a2331" strokeWidth="1" /><text x="48" y="43.8" fill="#8d97a6" fontSize="14" textAnchor="end" fontFamily="Geist Mono">0.2</text>
        <line x1="60" x2="900" y1="114.1" y2="114.1" stroke="#3a4658" strokeWidth="1" /><text x="48" y="119.1" fill="#8d97a6" fontSize="14" textAnchor="end" fontFamily="Geist Mono">0.0</text>
        <line x1="60" x2="900" y1="189.4" y2="189.4" stroke="#1a2331" strokeWidth="1" /><text x="48" y="194.4" fill="#8d97a6" fontSize="14" textAnchor="end" fontFamily="Geist Mono">-0.2</text>
        <line x1="60" x2="900" y1="264.7" y2="264.7" stroke="#1a2331" strokeWidth="1" /><text x="48" y="269.7" fill="#8d97a6" fontSize="14" textAnchor="end" fontFamily="Geist Mono">-0.4</text>
        <line x1="60" x2="900" y1="340" y2="340" stroke="#1a2331" strokeWidth="1" /><text x="48" y="345" fill="#8d97a6" fontSize="14" textAnchor="end" fontFamily="Geist Mono">-0.6</text>
        <text x="60" y="368" fill="#8d97a6" fontSize="14" textAnchor="middle" fontFamily="Geist Mono">0</text>
        <text x="340" y="368" fill="#8d97a6" fontSize="14" textAnchor="middle" fontFamily="Geist Mono">1</text>
        <text x="620" y="368" fill="#8d97a6" fontSize="14" textAnchor="middle" fontFamily="Geist Mono">2</text>
        <text x="900" y="368" fill="#8d97a6" fontSize="14" textAnchor="middle" fontFamily="Geist Mono">3</text>
        <rect x="900" y="20" width="16" height="320" fill="#2e3a4b" />
        <text x="908" y="14" fill="#8d97a6" fontSize="13" textAnchor="middle" fontFamily="Geist Mono">wall</text>
        <rect x="20" y={py(0) - 9} width="40" height="18" rx="4" fill="#3a4658" />
        <path d={path(base.pts)} fill="none" stroke="#8d97a6" strokeWidth="2" strokeDasharray="5 7" />
        <path d={path(spin.pts)} fill="none" stroke={col} strokeWidth="4" strokeLinecap="round" />
        <circle cx="900" cy={py(spin.y)} r="9" fill={col} stroke="#0b111b" strokeWidth="3" />
        <text x="476" y="368" fill="#8d97a6" fontSize="13" textAnchor="middle" fontFamily="Geist">distance from launcher (m) · height relative to launch (m)</text>
      </svg>
      <div className="g-mg-sliders">
        <label>
          <span className="g-mg-slider-head"><span>Spin ratio S</span><span>{sTxt}</span></span>
          <input type="range" min="-0.31" max="0.31" step="0.01" value={s} onChange={(e) => setS(+e.target.value)} />
          <span className="g-mg-slider-ends"><span>topspin</span><span>no spin</span><span>backspin</span></span>
        </label>
        <label>
          <span className="g-mg-slider-head"><span>Launch speed v₀</span><span>{v.toFixed(1)} m/s</span></span>
          <input type="range" min="8" max="12" step="0.1" value={v} onChange={(e) => setV(+e.target.value)} />
          <span className="g-mg-slider-ends"><span>8 m/s</span><span>12 m/s</span></span>
        </label>
      </div>
      <span className="g-mg-small">This is the fitted model (C<sub>D</sub> = 0.444, C<sub>L</sub> = 0.92 S + 0.003), not raw data. Spin is held constant over the flight, as in the essay.</span>
    </div>
  );
}

function Hero() {
  // Arriving from the home page's story, its photo has grown to fill the
  // top of the screen (see projects.jsx). Fade it out to reveal the page.
  React.useEffect(() => {
    const overlay = document.querySelector('.g-expand');
    if (!overlay) return;
    overlay.style.transition = 'opacity .5s ease';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 520);
  }, []);
  return (
    <section id="ch-top" className="g-mg-hero">
      <span className="g-rs-eyebrow" data-build="" style={{ '--b': 0 }}>IB Physics Extended Essay · May 2026</span>
      <h1 data-pt-title="">The Magnus <em>effect.</em></h1>
      <p data-build="" style={{ '--b': 1 }}>How does the lift coefficient C<sub>L</sub> of a smooth foam ball depend on its spin ratio S = ωR/v? I built a two-wheel launcher, filmed 50 shots at 240 fps, and fitted a numerical flight model to the results.</p>
      <div data-build="" style={{ '--b': 2, width: '100%' }}>
        <FlightModel />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 2. The experiment: the launcher in 3D, pinned for four scroll steps
// ---------------------------------------------------------------------------

function Launcher() {
  const ref = React.useRef(null);
  const [step, setStep] = React.useState(0);
  // What the model eases toward; written every scroll frame, read by the
  // viewer every animation frame.
  const view = React.useRef({ ...TOUR[0].view, yaw: 0.55, shift: 0 });
  useScrollFrame(() => {
    const r = ref.current.getBoundingClientRect();
    const sp = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
    const si = Math.min(TOUR.length - 1, Math.floor(sp * TOUR.length));
    Object.assign(view.current, TOUR[si].view, { yaw: 0.55 + sp * 2.4 });
    setStep(si);
  });

  // The model loads once the opening transition has landed: loading
  // three.js mid-flight would freeze the motion.
  const [settled, setSettled] = React.useState(false);
  React.useLayoutEffect(() => whenSettled(() => setSettled(true)), []);

  return (
    <section id="ch-setup" ref={ref} className="g-rs-pin g-mg-launcher">
      <div className="g-rs-sticky">
        {settled && <SkipOnError>
          <React.Suspense fallback={null}>
            <LauncherView className="g-mg-launcher-canvas" src={MODEL} view={view} />
          </React.Suspense>
        </SkipOnError>}
        <div className="g-mg-tour">
          <div className="g-mg-tour-cards" aria-live="polite">
            {TOUR.map((s, i) => (
              <div key={s.k} className="g-mg-tour-card" aria-hidden={i !== step}
                style={{ opacity: i === step ? 1 : 0, transform: `translateY(${i === step ? 0 : i < step ? -16 : 16}px)` }}>
                <span className="g-rs-eyebrow">{s.k}</span>
                <h2>{s.t}</h2>
                <p>{s.b}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="g-mg-tour-dots">
          {TOUR.map((s, i) => <span key={s.k} className={i === step ? 'is-on' : ''} />)}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 3. Setup facts
// ---------------------------------------------------------------------------

function Setup() {
  return (
    <section className="g-mg-setup">
      <div className="g-mg-facts">
        {FACTS.map((f) => (
          <div key={f.k} className="g-mg-fact">
            <span className="g-mg-label">{f.k}</span>
            <span className="g-mg-fact-v">{f.v}</span>
            <span>{f.d}</span>
          </div>
        ))}
      </div>
      <figure className="g-mg-figure">
        <div><img src="/assets/magnus/launch-frame.webp" alt="240 fps video frame of the foam ball passing the meterstick after launch" loading="lazy" /></div>
        <figcaption>A 240 fps frame at launch. Launch speed comes from the number of frames the ball takes to cross 0.9 m of the meterstick.</figcaption>
      </figure>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 4. Method
// ---------------------------------------------------------------------------

function Method() {
  return (
    <section id="ch-method" className="g-mg-method">
      <div className="g-mg-method-inner">
        <div className="g-mg-center-head">
          <span className="g-rs-eyebrow">Method</span>
          <h2 className="g-mg-display">Measure, model, <em>fit.</em></h2>
        </div>
        <div className="g-mg-steps">
          {STEPS.map((s) => (
            <div key={s.n} className="g-mg-step">
              <span>{s.n}</span>
              <h3 className="g-mg-hand">{s.t}</h3>
              <p>{s.b}</p>
            </div>
          ))}
        </div>
        <div className="g-mg-eq">
          <div className="g-mg-eq-main">m <b>v̇</b> = m<b>g</b> + <b>F</b><sub>D</sub> + <b>F</b><sub>L</sub></div>
          <div className="g-mg-eq-sub">F<sub>D</sub> = ½ρC<sub>D</sub>Av² · F<sub>L</sub> = ½ρC<sub>L</sub>Av² · S = ωR/v</div>
          <span>Drag acts against the velocity and lift acts perpendicular to it. There’s no closed-form solution, so each flight is stepped forward numerically with RK4.</span>
        </div>
        <div className="g-mg-rk4">
          <div className="g-mg-rk4-text">
            <span className="g-rs-eyebrow">What RK4 does</span>
            <h3 className="g-mg-hand is-big">Four looks per step</h3>
            <p>The forces change as the ball moves, so the model can’t just multiply by time. It advances in tiny steps, and at each step the fourth-order Runge–Kutta method checks the slope (how fast position and velocity are changing) four times: at the start, twice at the midpoint, and at the end. It then moves forward by a weighted average of the four, with the middle two counting double. That is far more accurate than using only the slope at the start (Euler’s method).</p>
            <p>Each step is Δt = 1/2400 s, ten times finer than the camera, so numerical error stays under 0.1 mm.</p>
          </div>
          <svg viewBox="0 0 460 260" className="g-mg-svg" role="img" aria-label="Diagram of the four RK4 slope samples across one step">
            <path d="M30 220 C150 210 260 150 430 40" fill="none" stroke="#3a4658" strokeWidth="2" strokeDasharray="4 6" />
            <line x1="60" y1="216" x2="400" y2="216" stroke="#222c3a" />
            <line x1="60" y1="216" x2="60" y2="232" stroke="#8d97a6" />
            <line x1="400" y1="216" x2="400" y2="232" stroke="#8d97a6" />
            <text x="230" y="250" fill="#8d97a6" fontSize="14" textAnchor="middle" fontFamily="Geist Mono">one step, Δt</text>
            <line x1="60" y1="216" x2="230" y2="200" stroke="#8d97a6" strokeWidth="2.5" />
            <line x1="230" y1="178" x2="320" y2="148" stroke="#8fb8f7" strokeWidth="2.5" />
            <line x1="230" y1="172" x2="320" y2="138" stroke="#5b9cf5" strokeWidth="2.5" />
            <line x1="400" y1="104" x2="440" y2="80" stroke="#eef1f5" strokeWidth="2.5" />
            <circle cx="60" cy="216" r="6" fill="#8d97a6" />
            <circle cx="230" cy="178" r="6" fill="#8fb8f7" />
            <circle cx="230" cy="172" r="6" fill="#5b9cf5" />
            <circle cx="400" cy="104" r="6" fill="#eef1f5" />
            <text x="60" y="198" fill="#b9c2cf" fontSize="15" fontFamily="Geist" textAnchor="middle">k₁</text>
            <text x="214" y="160" fill="#b9c2cf" fontSize="15" fontFamily="Geist" textAnchor="end">k₂ k₃</text>
            <text x="400" y="88" fill="#b9c2cf" fontSize="15" fontFamily="Geist" textAnchor="end">k₄</text>
            <text x="30" y="34" fill="#eef1f5" fontSize="17" fontFamily="Instrument Serif" fontStyle="italic">next = now + Δt · (k₁ + 2k₂ + 2k₃ + k₄) / 6</text>
          </svg>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 5. Results
// ---------------------------------------------------------------------------

const cx = (S) => 70 + S / 0.35 * 470;
const cy = (c) => 340 - c / 0.4 * 300;

function Results() {
  return (
    <section id="ch-results" className="g-mg-results">
      <div className="g-mg-results-head">
        <span className="g-rs-eyebrow">Results</span>
        <h2 className="g-mg-display">Lift grows <em>with spin.</em></h2>
        <p>Across 0.11 ≤ S ≤ 0.31, C<sub>L</sub> rises roughly linearly, C<sub>L</sub> ≈ 0.92 S + 0.003, within the 0.5–1.0 slope typical of published smooth-sphere data. Backspin and topspin agree at matched |S|, and there’s no sign of the curve flattening yet in this range.</p>
      </div>
      <div className="g-mg-results-grid">
        <div className="g-mg-chart">
          <svg viewBox="0 0 560 400" className="g-mg-svg" role="img" aria-label="Lift coefficient against spin ratio, with error bars and a linear fit">
            <line x1="70" x2="540" y1="340" y2="340" stroke="#1a2331" /><text x="58" y="345" fill="#8d97a6" fontSize="15" textAnchor="end" fontFamily="Geist Mono">0.0</text>
            <line x1="70" x2="540" y1="265" y2="265" stroke="#1a2331" /><text x="58" y="270" fill="#8d97a6" fontSize="15" textAnchor="end" fontFamily="Geist Mono">0.1</text>
            <line x1="70" x2="540" y1="190" y2="190" stroke="#1a2331" /><text x="58" y="195" fill="#8d97a6" fontSize="15" textAnchor="end" fontFamily="Geist Mono">0.2</text>
            <line x1="70" x2="540" y1="115" y2="115" stroke="#1a2331" /><text x="58" y="120" fill="#8d97a6" fontSize="15" textAnchor="end" fontFamily="Geist Mono">0.3</text>
            <line x1="70" x2="540" y1="40" y2="40" stroke="#1a2331" /><text x="58" y="45" fill="#8d97a6" fontSize="15" textAnchor="end" fontFamily="Geist Mono">0.4</text>
            <text x="70.0" y="368" fill="#8d97a6" fontSize="15" textAnchor="middle" fontFamily="Geist Mono">0.0</text>
            <text x="204.3" y="368" fill="#8d97a6" fontSize="15" textAnchor="middle" fontFamily="Geist Mono">0.1</text>
            <text x="338.6" y="368" fill="#8d97a6" fontSize="15" textAnchor="middle" fontFamily="Geist Mono">0.2</text>
            <text x="472.9" y="368" fill="#8d97a6" fontSize="15" textAnchor="middle" fontFamily="Geist Mono">0.3</text>
            <line x1={cx(0)} y1={cy(CL_FIT.intercept)} x2={cx(0.35)} y2={cy(CL_FIT.slope * 0.35 + CL_FIT.intercept)} stroke="#8d97a6" strokeWidth="2" strokeDasharray="6 7" />
            {RESULTS.map((r) => {
              const c = r.sign > 0 ? BACKSPIN : TOPSPIN;
              return (
                <g key={r.name}>
                  <line x1={cx(r.S)} x2={cx(r.S)} y1={cy(r.CL - r.sigma)} y2={cy(r.CL + r.sigma)} stroke={c} strokeWidth="2" />
                  <circle cx={cx(r.S)} cy={cy(r.CL)} r="8" fill={c} stroke="#0b111b" strokeWidth="2.5" />
                </g>
              );
            })}
            <text x="305" y="394" fill="#b9c2cf" fontSize="15" textAnchor="middle" fontFamily="Geist">spin ratio S</text>
            <text x="80" y="36" fill="#b9c2cf" fontSize="15" fontFamily="Geist">lift coefficient C<tspan baselineShift="sub" fontSize="11">L</tspan></text>
            <circle cx="330" cy="32" r="6" fill={BACKSPIN} /><text x="342" y="37" fill="#b9c2cf" fontSize="14" fontFamily="Geist">backspin</text>
            <circle cx="430" cy="32" r="6" fill={TOPSPIN} /><text x="442" y="37" fill="#b9c2cf" fontSize="14" fontFamily="Geist">topspin</text>
          </svg>
        </div>
        <div className="g-mg-results-side">
          <div className="g-mg-table" role="table" aria-label="Table 2: fitted lift coefficients">
            <span role="columnheader">Condition</span>
            <span role="columnheader">S</span>
            <span role="columnheader">C<sub>L</sub></span>
            <span role="columnheader">χ²<sub>red</sub></span>
            {RESULTS.map((r) => (
              <React.Fragment key={r.name}>
                <span role="cell">{r.name}</span>
                <span role="cell" className="is-num">{r.S.toFixed(3)}</span>
                <span role="cell" className="is-num">{r.CL.toFixed(3)}</span>
                <span role="cell" className="is-num" style={r.chi > 2 ? { color: AMBER } : undefined}>{r.chi.toFixed(2)}</span>
              </React.Fragment>
            ))}
          </div>
          <div className="g-mg-baseline">
            <span className="g-mg-label">No-spin baseline · drag</span>
            <span className="g-mg-baseline-v">C<sub>D</sub> = 0.444 ± 0.107</span>
            <span>χ²<sub>red</sub> = 1.07 over 10 trials. Consistent with C<sub>D</sub> ≈ 0.4–0.5 for a smooth sphere at Re ≈ 10⁵.</span>
          </div>
          <span className="g-mg-small">C<sub>L</sub> uncertainties are ±0.021–0.022 (Δχ² = 1). Ten trials per condition.</span>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 6. Limitations and next steps
// ---------------------------------------------------------------------------

function Limits() {
  return (
    <section id="ch-limits" className="g-mg-limits">
      <div>
        <span className="g-rs-eyebrow">Limitations</span>
        <h3 className="g-mg-hand is-mid">What limits it</h3>
        <ul>
          <li>Launch speed (±0.34 m/s from frame counting) is the largest uncertainty.</li>
          <li>Over only 3 m, the endpoint barely depends on C<sub>D</sub>, so drag is loosely constrained.</li>
          <li>High backspin fit worse (χ²<sub>red</sub> = 2.81), likely from more variable spin.</li>
          <li>C<sub>D</sub> and C<sub>L</sub> are treated as constants, with no spin decay over the flight.</li>
        </ul>
      </div>
      <div>
        <span className="g-rs-eyebrow">Next time</span>
        <h3 className="g-mg-hand is-mid">What I’d change</h3>
        <ul>
          <li>Measure v₀ with a light gate or chronograph instead of frame counting.</li>
          <li>Fly the ball farther, so drag shows up clearly in the endpoint.</li>
          <li>Push past S = 0.5 to see whether C<sub>L</sub> levels off.</li>
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 7. Write-up
// ---------------------------------------------------------------------------

const WRITEUP = [
  ['wu-intro', 'Introduction'], ['wu-theory', 'Theory'], ['wu-method', 'Apparatus and measurements'],
  ['wu-fit', 'Data processing'], ['wu-discussion', 'Discussion'], ['wu-limits', 'Validity and limitations'],
  ['wu-conclusion', 'Conclusion'],
];

function Part({ id, children }) {
  const title = WRITEUP.find(([k]) => k === id)[1];
  return (
    <div id={id} className="g-mg-part">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

function Writeup() {
  return (
    <section id="ch-writeup" className="g-mg-writeup">
      <div className="g-mg-writeup-inner">
        <div className="g-mg-writeup-head">
          <span className="g-rs-eyebrow">Write-up · IB Physics Extended Essay</span>
          <h2>Quantifying the Magnus effect on a smooth spherical foam ball</h2>
        </div>
        <div className="g-mg-writeup-body">
          <aside className="g-mg-contents" aria-label="Contents">
            <span className="g-mg-label">Contents</span>
            {WRITEUP.map(([id, label], i) => (
              <a key={id} href={`#${id}`} onClick={jumpTo(id)}><span>{String(i + 1).padStart(2, '0')}</span>{label}</a>
            ))}
          </aside>
          <div className="g-mg-parts">
            <Part id="wu-intro">
              <p>Introductory projectile motion treats gravity as the only force. For a ball moving through air that’s often wrong: drag slows it, and spin adds a sideways or upward force, the Magnus effect, that bends the path. How strong that force is depends on the ball’s size, surface, speed and flow regime, so published values for textured or dimpled balls can’t simply be reused for a smooth foam sphere.</p>
              <p>This essay extracts the lift coefficient C<sub>L</sub>(S) empirically, by fitting a numerical projectile model to measured launch and endpoint values. Predicting C<sub>L</sub> from first principles would mean solving the Navier–Stokes equations for a rotating sphere, which is beyond the scope of an IB essay.</p>
            </Part>
            <Part id="wu-theory">
              <p>Because of the no-slip condition, the layer of air touching the ball moves with its surface. On a spinning ball one side drags the air along with the oncoming flow and the other side opposes it, so the flow is deflected and the ball feels a force perpendicular to its velocity.</p>
              <p>Drag and lift are both modelled as ½ρCAv², with drag opposite the velocity and lift perpendicular to it. Because both scale with v² and turn with the velocity, the equations of motion are nonlinear with no closed-form solution, so each trajectory is integrated numerically. To compare trials with different speed and spin, the analysis uses the dimensionless spin ratio S = ωR/v.</p>
            </Part>
            <Part id="wu-method">
              <p>A single smooth foam sphere (D = 150 mm, m = 0.227 kg) was launched horizontally, 2 m above the floor, from independently driven top and bottom wheels. Wheel speeds for each condition were found by trial and error, then held fixed for that condition’s ten trials.</p>
              <ul>
                <li><b>Launch speed:</b> a 240 fps camera filmed the ball crossing 0.9 m of a meterstick fixed at the launcher exit.</li>
                <li><b>Spin:</b> frames counted for a Sharpie mark on the ball to complete one rotation, from the same footage.</li>
                <li><b>Endpoint:</b> a second 240 fps camera at the wall, 3.0 m away, read the height of first contact against a meterstick.</li>
              </ul>
              <p>Five conditions were run, ten trials each, for 50 trials: no spin, low and high backspin, and low and high topspin.</p>
            </Part>
            <Part id="wu-fit">
              <p>Each trial was simulated with the fourth-order Runge–Kutta method (RK4) at Δt = 1/2400 s, ten times finer than the camera frame interval, until it reached the wall. RK4 samples the rate of change four times across each step and averages them, so its error shrinks much faster with step size than a simple Euler step. The predicted height was then compared with the measured one. The fit used χ² = Σ((y<sub>model</sub> − y<sub>final</sub>)/σ)², with σ<sub>y,eff</sub> = 15 mm.</p>
              <p>C<sub>D</sub> was fitted first from the no-spin trials. Holding it fixed, C<sub>L</sub> was then fitted separately for each spin condition. Each 1σ uncertainty is where χ² rises by 1, and the reduced χ² checks the scatter against the assumed uncertainty.</p>
            </Part>
            <Part id="wu-discussion">
              <p>C<sub>D</sub> = 0.444 ± 0.107 matches published smooth-sphere values in the subcritical regime. Its large uncertainty reflects how little a 3 m endpoint depends on drag, not a poor fit. C<sub>L</sub> ≈ 0.92 S, with an intercept near zero, falls within the 0.5–1.0 slope reported for smooth spheres. Backspin and topspin agree at matched |S|. The small high-spin asymmetry (ΔC<sub>L</sub> ≈ 0.05) is within the spread caused by spin variability.</p>
              <p>At the highest spin (ω ≈ 40 rad/s, S ≈ 0.30), the Magnus force at launch is about 294 mN. That compares with 2225 mN of gravity and 473 mN of drag, so lift is roughly 13% of gravity and 62% of drag: noticeable, but not dominant. Over 3 m, high backspin raises the impact point by about +60 mm and high topspin lowers it by about −61 mm, both well above the 15 mm measurement uncertainty.</p>
            </Part>
            <Part id="wu-limits">
              <p>The dominant limitation is launch-speed scatter: σ<sub>v₀</sub> ≈ 0.34 m/s propagates to about 31 mm at the wall. The fit uses each trial’s measured v₀, but any systematic error in that measurement would bias C<sub>L</sub>. In the high-spin conditions ω ranged from 35.6 to 45.5 rad/s, yet each condition used a single mean ω. The planar model also ignores out-of-plane drift and spin-axis tilt, and treats C<sub>D</sub> and C<sub>L</sub> as constant while the ball slows by 5–10%.</p>
            </Part>
            <Part id="wu-conclusion">
              <p>Over 0.11 ≤ S ≤ 0.31, the lift coefficient of a smooth foam sphere rises approximately linearly with spin ratio, C<sub>L</sub> ≈ 0.92 S. Fitted values run from 0.092–0.108 at low spin to 0.254–0.306 at high spin. The result is consistent with published smooth-sphere behaviour and symmetric between backspin and topspin. Whether C<sub>L</sub> eventually levels off at higher spin is still open; that needs S above 0.5, a longer flight and per-trial speed and spin sensors.</p>
            </Part>
          </div>
        </div>
      </div>
    </section>
  );
}

function MagnusPage() {
  useGlassTheme();
  return (
    <div className="glass g-rs g-mg">
      <div className="g-rs-glow" aria-hidden="true" />
      <Nav />
      <Rail />
      <main data-pt-page="">
        <Hero />
        <Launcher />
        <Setup />
        <Method />
        <Results />
        <Limits />
        <Writeup />
        <footer className="g-mg-foot">
          <a href="/projects" onClick={toAll}>← All projects</a>
          <span>© 2026 Mikayla Fisher</span>
        </footer>
      </main>
      <ProgressBar />
    </div>
  );
}

export default MagnusPage;
