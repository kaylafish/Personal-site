import React from 'react';
import { RESUME_FILENAME, RESUME_URL } from '../site.js';
import {
  CALIBRATION, CHAIN, DROPS, FIXES, PHOTOS, RIG_STEPS, STATS, TRIALS, WHY,
} from '../data/hydro.js';
import { ProgressBar } from './home.jsx';
import { clamp, prefersReducedMotion, useGlassTheme, useScrollFrame } from './motion.jsx';
import { PageLink } from './pagelink.jsx';
import { goBackTo, whenSettled } from '../transitions.js';
import '../research.css';
import '../hydro.css';

// /projects/hydro-generator: Claude Design's "Hydro Page". The rig in 3D,
// pinned at the top, then the theory, the Kₑ calibration, the results with a
// height slider, the evaluation and the write-up, and photos of the build.
// Its nav, side dots and progress bar are the research page's
// (research.css). Copy that isn't a paragraph is in data/hydro.js.

// three.js only loads on this page.
const HydroView = React.lazy(() => import('./hydroview.jsx'));
const MODEL = '/models/hydro.glb';

// If the viewer's code can't load (offline, a stale deploy), the page goes
// on without the model.
class SkipOnError extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

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
  ['hy-rig', 'The rig'], ['hy-theory', 'Theory'], ['hy-calib', 'Calibration'], ['hy-results', 'Results'],
  ['hy-why', 'Evaluation'], ['hy-next', 'Next time'], ['hy-writeup', 'Write-up'], ['hy-photos', 'Photos'],
];
const TOC = [
  ['wu-intro', 'Introduction'], ['wu-theory', 'Theory'], ['wu-method', 'Method'],
  ['wu-analysis', 'Data and analysis'], ['wu-eval', 'Evaluation'], ['wu-conclusion', 'Conclusion'],
];

// Back to /projects with the reverse of the card-opening transition.
const toAll = (e) => { e.preventDefault(); goBackTo('/projects'); };

function Nav() {
  return (
    <nav className="g-rs-nav" aria-label="Site">
      <div className="g-rs-nav-left">
        <PageLink to="/" className="g-rs-nav-name">Mikayla Fisher</PageLink>
        <div className="g-rs-crumb">
          <span>/</span><a href="/projects" onClick={toAll}>Projects</a><span>/</span><span>Hydro generator</span>
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
// 1. Hero + rig. The rig assembles itself on load; scroll then steps through
// the wheel, the drive and the drop.
// ---------------------------------------------------------------------------

function Rig({ narrow }) {
  const ref = React.useRef(null);
  const [p, setP] = React.useState(0);
  useScrollFrame(() => setP(Math.round(pinProgress(ref.current) * 1000) / 1000));

  // Arriving from the home page's story, its photo has grown to fill the
  // top of the screen (see projects.jsx). Fade it out to reveal the rig.
  React.useEffect(() => {
    const overlay = document.querySelector('.g-expand');
    if (!overlay) return;
    overlay.style.transition = 'opacity .5s ease';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 520);
  }, []);

  // The model loads once the opening transition has landed: loading
  // three.js mid-flight would freeze the motion.
  const [settled, setSettled] = React.useState(false);
  React.useLayoutEffect(() => whenSettled(() => setSettled(true)), []);

  const step = Math.min(3, Math.floor(p * 4));
  const sub = clamp(p * 4 - step);
  const drop = DROPS[Math.min(2, Math.floor(sub * 3))];
  const view = [
    { focus: '', w: 0 },
    { focus: 'wheel', w: 0 },
    { focus: 'drive', w: 5 },
    { focus: '', w: 4 * Math.sqrt(drop[0] / 0.35) }, // wheel speed scales with √h
  ][step];
  const heroOn = step === 0 && sub < 0.55;

  return (
    <section id="hy-rig" ref={ref} className="g-rs-pin" style={{ height: '520vh' }}>
      <div className="g-rs-sticky g-hy-rig">
        {settled && <SkipOnError>
          <React.Suspense fallback={null}>
            <HydroView
              className="g-hy-model"
              src={MODEL}
              focus={view.focus}
              w={view.w}
              marks={step === 3 ? 1 : 0}
              hsel={drop[0]}
              yaw={0.75 + p * 0.9}
              shift={narrow || step === 0 ? 0 : 0.2}
            />
          </React.Suspense>
        </SkipOnError>}

        <div className={`g-hy-hero ${heroOn ? '' : 'is-off'}`}>
          <span className="g-rs-eyebrow" data-build="" style={{ '--b': 0 }}>IB Physics HL Internal Assessment · May 2026</span>
          <h1 data-pt-title="">Height, <em>in volts.</em></h1>
          <p data-build="" style={{ '--b': 1 }}>How does the height of a water source above a wheel change the voltage a CIM motor generates through a 1.5:1 pulley, and does it follow V ∝ √h?</p>
          <span className="g-hy-hero-note" data-build="" style={{ '--b': 2 }}>a miniature pumped-hydro plant, cut on the team's new CNC</span>
          <span className="g-rs-eyebrow g-hy-cue" data-build="" style={{ '--b': 3 }}>Scroll to put it together ↓</span>
        </div>

        <div className="g-hy-steps" aria-live="polite">
          {RIG_STEPS.map((s, i) => s && (
            <div key={s.kicker} className={`g-hy-step ${i === step ? 'is-on' : i < step ? 'is-past' : ''}`} aria-hidden={i !== step}>
              <span className="g-rs-eyebrow">{s.kicker}</span>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
              {i === 3 && (
                <span className="g-hy-step-meas">
                  <span><span>h </span>{drop[1]}</span>
                  <span><span>mean peak </span>{drop[2]}</span>
                  <span>measured</span>
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="g-hy-dots" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <span key={i} className={i === step ? 'is-on' : ''} />)}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 2–3. Theory, calibration
// ---------------------------------------------------------------------------

function Theory() {
  return (
    <section id="hy-theory" className="g-hy-band">
      <div className="g-hy-inner">
        <div className="g-hy-head is-center">
          <span className="g-rs-eyebrow">Theory</span>
          <h2 className="g-hy-display">From height <em>to volts.</em></h2>
          <p>Four steps, each from a law covered in class. Ignoring friction and turbulence, every one of them is exact.</p>
        </div>
        <div className="g-hy-cards is-chain">
          {CHAIN.map((c) => (
            <div key={c.n} className="g-hy-card">
              <span className="g-hy-card-k">{c.n} · {c.kind}</span>
              <span className="g-hy-card-eq">{c.eq}</span>
              <h3 className="g-hy-hand">{c.title}</h3>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
        <div className="g-hy-formula">
          <span className="g-rs-eyebrow">Put together</span>
          <div className="g-hy-formula-eq">V = <em>1.5 K<sub>e</sub> √(2g) / r</em> · √h = k√h</div>
          <span>So V against √h should be a straight line through the origin, and its gradient k gives K<sub>e</sub> back.</span>
        </div>
      </div>
    </section>
  );
}

function Calibration() {
  return (
    <section id="hy-calib" className="g-hy-inner g-hy-calib">
      <div className="g-hy-head">
        <span className="g-rs-eyebrow">Before the water</span>
        <h2 className="g-hy-display">Measure K<sub>e</sub> <em>first.</em></h2>
        <p>The manufacturer's constant is measured at stall, nothing like this rig. So a second motor with an encoder, commanded over CAN from a laptop, spun the CIM at a known speed through a 20T → 36T belt.</p>
      </div>
      <div className="g-hy-chain">
        {CALIBRATION.map((c) => (
          <div key={c.label} className={c.accent ? 'is-accent' : ''}>
            <span className="g-hy-card-k">{c.label}</span>
            <span className="g-hy-chain-v">{c.value}</span>
            <span>{c.detail}</span>
          </div>
        ))}
      </div>
      <div className="g-hy-predict">
        <span className="g-hy-hand">so the prediction is</span>
        <em>k = 1.5 × 0.031 × 4.429 / 0.1048 ≈ 1.97 V·m<sup>−½</sup></em>
        <span>Computed before the water data were analysed.</span>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 4. Results: the chart with its height slider, the raw data and the fit.
// ---------------------------------------------------------------------------

// Chart coordinates: √h from 0.5 to 1.0 across, V from 0 to 2 up.
const cx = (s) => 70 + ((s - 0.5) / 0.5) * 470;
const cy = (v) => 340 - v * 150;
const GRID_V = [0, 0.5, 1, 1.5, 2];
const GRID_S = [0.5, 0.6, 0.7, 0.8, 0.9, 1];
// The three measured means and their ± half-ranges, at √h.
const POINTS = [[0.35, 0.334, 0.010], [0.6, 0.544, 0.010], [0.85, 0.768, 0.040]];

function Chart() {
  const [h, setH] = React.useState(0.6);
  const s = Math.sqrt(h);
  const vT = 1.965 * s, vF = 1.309 * s - 0.45;
  const inRange = h >= 0.35 && h <= 0.85;
  const mx = cx(s);
  return (
    <div className="g-hy-chart">
      <svg viewBox="0 0 560 400" role="img" aria-label="Peak voltage against the square root of drop height: three measured points, the theory line 1.965√h and the fit 1.309√h − 0.450">
        {GRID_V.map((v) => (
          <g key={v}>
            <line x1="70" x2="540" y1={cy(v)} y2={cy(v)} stroke={v === 0 ? '#3a4658' : '#1a2331'} />
            <text x="58" y={cy(v) + 5} className="g-hy-tick" textAnchor="end">{v.toFixed(1)}</text>
          </g>
        ))}
        {GRID_S.map((x) => <text key={x} x={cx(x)} y="366" className="g-hy-tick" textAnchor="middle">{x.toFixed(1)}</text>)}
        <path d={`M70 ${cy(1.965 * 0.5)} L540 ${cy(1.965)} L540 ${cy(1.309 - 0.45)} L70 ${cy(1.309 * 0.5 - 0.45)} Z`} fill="#8fb8f7" fillOpacity=".05" />
        <line x1="70" y1={cy(1.965 * 0.5)} x2="540" y2={cy(1.965)} stroke="#8fb8f7" strokeWidth="2" strokeDasharray="7 7" />
        <line x1="70" y1={cy(1.309 * 0.5 - 0.45)} x2="540" y2={cy(1.309 - 0.45)} stroke="#eef1f5" strokeWidth="2.5" />
        <line x1={mx} x2={mx} y1="40" y2="340" stroke="#2e3a4b" strokeWidth="1.5" />
        <circle cx={mx} cy={cy(vT)} r="6" fill="#0b111b" stroke="#8fb8f7" strokeWidth="2.5" />
        <circle cx={mx} cy={cy(Math.max(0, vF))} r="6" fill="#0b111b" stroke="#eef1f5" strokeWidth="2.5" />
        {POINTS.map(([ph, v, e]) => {
          const x = cx(Math.sqrt(ph)), wide = e > 0.02;
          return (
            <g key={ph}>
              <line x1={x} x2={x} y1={cy(v + e)} y2={cy(v - e)} stroke="#eef1f5" strokeWidth="2" />
              {wide && <>
                <line x1={x - 5.7} x2={x + 5.7} y1={cy(v + e)} y2={cy(v + e)} stroke="#eef1f5" strokeWidth="2" />
                <line x1={x - 5.7} x2={x + 5.7} y1={cy(v - e)} y2={cy(v - e)} stroke="#eef1f5" strokeWidth="2" />
              </>}
              <circle cx={x} cy={cy(v)} r="7.5" fill="#eef1f5" stroke="#0b111b" strokeWidth="2.5" />
            </g>
          );
        })}
        <text x="305" y="394" className="g-hy-axis" textAnchor="middle">√h (m<tspan baselineShift="super" fontSize="10">½</tspan>)</text>
        <text x="80" y="30" className="g-hy-axis">peak voltage V (V)</text>
        <line x1="300" x2="328" y1="26" y2="26" stroke="#8fb8f7" strokeWidth="2" strokeDasharray="6 5" />
        <text x="334" y="31" className="g-hy-legend">theory, 1.965√h</text>
        <line x1="300" x2="328" y1="48" y2="48" stroke="#eef1f5" strokeWidth="2.5" />
        <text x="334" y="53" className="g-hy-legend">fit, 1.309√h − 0.450</text>
      </svg>
      <label className="g-hy-slider">
        <span><span>Drop height h</span><span>{h.toFixed(2)} m</span></span>
        <input type="range" min="0.2" max="1" step="0.01" value={h} onChange={(e) => setH(+e.target.value)} />
      </label>
      <div className="g-hy-readout">
        <span><span>theory </span><span className="is-accent">{vT.toFixed(3)} V</span></span>
        <span><span>fit </span>{vF < 0 ? '—' : `${vF.toFixed(3)} V`}</span>
        <span><span>voltage ratio </span>{vF > 0 ? `${Math.round((vF / vT) * 100)}%` : '—'}</span>
      </div>
      <span className={`g-hy-chart-note ${inRange ? '' : 'is-warn'}`}>
        {inRange
          ? 'The voltage ratio includes the fit’s −0.45 V offset, so it’s lower than the 67%, which compares gradients. Measured points are the three dots.'
          : 'Outside 0.35–0.85 m the fit is an extrapolation, not data.'}
      </span>
    </div>
  );
}

function Results() {
  return (
    <section id="hy-results" className="g-hy-inner g-hy-results">
      <div className="g-hy-results-top">
        <div className="g-hy-head">
          <span className="g-rs-eyebrow">Results</span>
          <h2 className="g-hy-display">Two-thirds <em>of ideal.</em></h2>
          <p>Voltage climbed from 0.334 V to 0.768 V as the drop went from 0.35 m to 0.85 m, so the null hypothesis is out. But the measured gradient is 33% below the predicted one: by gradient, the rig delivers about two-thirds of what a lossless one would.</p>
        </div>
        <div className="g-hy-stats">
          {STATS.map((s) => (
            <div key={s.label}>
              <span className="g-hy-card-k">{s.label}</span>
              <span className={`g-hy-stat-v ${s.accent ? 'is-accent' : ''}`}>{s.value}</span>
              <span>{s.detail}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="g-hy-results-body">
        <Chart />
        <div className="g-hy-data">
          <div className="g-hy-table" role="table" aria-label="Raw peak voltages">
            <div role="row" className="is-head">
              <span role="columnheader">h (m)</span><span role="columnheader">T1</span><span role="columnheader">T2</span>
              <span role="columnheader">T3</span><span role="columnheader">Mean (V)</span>
            </div>
            {TRIALS.map((r) => (
              <div role="row" key={r.h}>
                <span role="cell">{r.h}</span>
                {r.t.map((t, i) => <span role="cell" key={i} className="is-dim">{t}</span>)}
                <span role="cell" className={r.wide ? 'is-warn' : ''}>{r.mean}</span>
              </div>
            ))}
          </div>
          <span className="g-hy-small">Raw peak voltages, three trials per height. Uncertainty is half the range; the 0.85 m spread (±0.040 V) is four times the others. Heights ±0.005 m.</span>
          <div className="g-hy-fit">
            <span className="g-hy-card-k">Fit quality</span>
            <span className="g-hy-fit-v">R² = 0.807</span>
            <span>About 81% of the variance is explained by √h. The −0.450 V intercept is the part the ideal model can't explain.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 5–6. Evaluation, next time
// ---------------------------------------------------------------------------

function Why() {
  return (
    <section id="hy-why" className="g-hy-band">
      <div className="g-hy-inner">
        <div className="g-hy-head is-center">
          <span className="g-rs-eyebrow">Evaluation</span>
          <h2 className="g-hy-display">Where the <em>third went.</em></h2>
        </div>
        <div className="g-hy-cards is-why">
          {WHY.map((w) => (
            <div key={w.title} className="g-hy-card">
              <span className="g-hy-why-v">{w.value}</span>
              <h3 className="g-hy-hand">{w.title}</h3>
              <p>{w.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Next() {
  return (
    <section id="hy-next" className="g-hy-inner g-hy-next">
      <div className="g-hy-head">
        <span className="g-rs-eyebrow">Next time</span>
        <h3 className="g-hy-hand is-big">What I'd change</h3>
      </div>
      <div className="g-hy-fixes">
        {FIXES.map((f) => (
          <div key={f.limit}><span>{f.limit}</span><span>{f.fix}</span></div>
        ))}
      </div>
      <p className="g-hy-ext"><b>Extension:</b> hold the height fixed and swap pulley pairs to test V ∝ ω<sub>motor</sub> directly. Adding a known load resistor would give electrical power, P = V²/R<sub>L</sub>, to compare against the gravitational power in, ṁgh: a real efficiency for the generator, and the same question pumped-hydro plants answer at scale.</p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 7. Write-up
// ---------------------------------------------------------------------------

function WriteUp() {
  const go = (id) => jumpTo(id);
  return (
    <section id="hy-writeup" className="g-hy-wu">
      <div className="g-hy-wu-inner">
        <div className="g-hy-wu-head">
          <span className="g-rs-eyebrow">Write-up · IB Physics HL Internal Assessment</span>
          <h2>The effect of water source height on voltage generation in a miniaturised hydroelectric generator</h2>
        </div>
        <div className="g-hy-wu-cols">
          <aside className="g-hy-toc">
            <span className="g-hy-card-k">Contents</span>
            {TOC.map(([id, label], i) => (
              <a key={id} href={`#${id}`} onClick={go(id)}><span>{String(i + 1).padStart(2, '0')}</span>{label}</a>
            ))}
          </aside>
          <div className="g-hy-wu-body">
            <div id="wu-intro">
              <h3>Introduction</h3>
              <p>Pumped-storage hydropower pumps water uphill when there's spare electricity and lets it fall back through turbines when demand rises. Modern plants recover 70–80% of the energy, which makes it the dominant form of grid-scale storage. Learning about it in class made me wonder whether the link between height and electrical output is as direct as the energy equations suggest, and whether I could test it at small scale.</p>
              <p>Our robotics team had just acquired a CNC machine and more 3D printers, and we wanted a project that would really test them. A miniature hydroelectric generator needed CNC-machined polycarbonate plates, printed wheel and motor-mount parts, and a CIM motor we already had. I wanted to see whether the hand-built rig would confirm the theory, and whether the CIM's back-EMF equation would still hold when water, not electronics, drove it.</p>
            </div>
            <div id="wu-theory">
              <h3>Theory</h3>
              <p>With friction and turbulence neglected, water released from height h reaches the wheel at v = √(2gh) and turns it at ω = v/r. A DC motor driven mechanically is a generator: a coil of N turns and area A rotating in a field B has flux Φ = NBA cos ωt, so by Faraday's law it induces ε = NBAω sin ωt. The commutator rectifies this to a DC output V = K<sub>e</sub>ω, where K<sub>e</sub> = NBA.</p>
              <p>K<sub>e</sub> is purely geometric, so it's the same constant whether the machine runs as a motor (V<sub>supply</sub> = K<sub>e</sub>ω + IR) or as an open-circuit generator (V = K<sub>e</sub>ω). The 36T → 24T belt spins the motor 1.5 times faster than the wheel, giving V = (1.5 K<sub>e</sub>√(2g)/r)√h.</p>
            </div>
            <div id="wu-method">
              <h3>Method</h3>
              <p>Two CNC-machined polycarbonate plates (48 × 12 × ¼ in) form the frame. The 3D-printed wheel (r = 0.1048 m) sits on a 7.5 in hex shaft between two flanged bearings, and a printed holder aligns the CIM so a 120T HTD belt links the pulleys. A printed ramp below the wheel carries water away from the bearings.</p>
              <ul>
                <li><b>Independent variable:</b> jug-base height above the wheel centre, 0.35, 0.60 and 0.85 m (±0.005 m).</li>
                <li><b>Dependent variable:</b> peak DC voltage across the CIM terminals (±0.001 V).</li>
                <li><b>Controlled:</b> half a gallon (≈ 1.89 L) every trial, the same wheel, pulleys, belt and motor, the cap pulled off fully and at once by a second person, and one room in one session.</li>
              </ul>
              <p>K<sub>e</sub> was measured first: an encoder motor at 17 rev/s (106.81 rad/s) drove the CIM through 20T → 36T, so the CIM turned at 59.34 rad/s and read 1.84 V, giving K<sub>e</sub> = 0.031 V·s/rad.</p>
            </div>
            <div id="wu-analysis">
              <h3>Data and analysis</h3>
              <p>Mean voltages were 0.334 ± 0.010, 0.544 ± 0.010 and 0.768 ± 0.040 V. Plotted against √h (uncertainty δh/2√h), a least-squares fit gives k = 1.309 V·m<sup>−½</sup>, and the max/min gradient lines (1.377 and 1.250) give k = 1.31 ± 0.06 V·m<sup>−½</sup>.</p>
              <p>From the measured K<sub>e</sub>, the predicted gradient is 1.97 V·m<sup>−½</sup>. The experiment falls 33% short, so the rig delivers about 67% of the ideal voltage. R² = 0.807, and the fit's intercept is −0.450 V rather than zero.</p>
            </div>
            <div id="wu-eval">
              <h3>Evaluation</h3>
              <p>The negative intercept suggests a threshold speed: below it, armature resistance and bearing static friction absorb most of the power before any useful EMF appears, which drags low-height readings down disproportionately. The 33% shortfall is the net of several effects: water missing the buckets or hitting at an angle, belt and bearing friction, and an effective impact radius smaller than the outer radius (which on its own would partly offset the losses).</p>
              <p>Strengths: three trials per height, a K<sub>e</sub> measured independently so the test is a genuine prediction, and tight-tolerance CNC and printed parts used throughout. Limitations: only three heights, a flow rate that falls as the jug drains, peak voltage read by eye, an assumed impact radius, and a single-speed K<sub>e</sub> calibration.</p>
            </div>
            <div id="wu-conclusion">
              <h3>Conclusion</h3>
              <p>Voltage rises strongly with height, rejecting the null hypothesis, and V ∝ √h holds qualitatively (R² = 0.807). But the ideal model over-predicts the output by a third: k<sub>exp</sub> = 1.31 ± 0.06 against k<sub>theory</sub> = 1.97 V·m<sup>−½</sup>. The research hypothesis is partly supported, and the losses are large enough that a fuller treatment should model them explicitly.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 8. Photos of the build (not in the Design handoff; added at the bottom).
// ---------------------------------------------------------------------------

// The carousel drifts slowly to the left on its own. It stops while the
// pointer is over it, while it has focus, and for a few seconds after anyone
// scrolls, swipes or clicks an arrow; at the end it glides back to the start.
const DRIFT_SPEED = 24; // px per second
const DRIFT_IDLE = 4000; // ms after an interaction before it moves again
function useDrift(ref) {
  const s = React.useRef({ hover: false, focus: false, until: 0, visible: false, x: 0, rewind: 0 });
  React.useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const el = ref.current;
    const st = s.current;
    const io = new IntersectionObserver(([e]) => { st.visible = e.isIntersecting; });
    io.observe(el);
    let raf = 0, last = performance.now(), wasOn = false;
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const max = el.scrollWidth - el.clientWidth;
      const go = st.visible && !document.hidden && !st.hover && !st.focus && now > st.until && max > 0;
      if (go !== wasOn) { wasOn = go; st.x = el.scrollLeft; }
      // Scrolled some other way (a scrollbar, a trackpad): pick up from there.
      if (go && !st.rewind && Math.abs(el.scrollLeft - st.x) > 2) { st.x = el.scrollLeft; }
      if (go) {
        if (st.x >= max - 1) {
          // At the end: pause, then glide back to the first photo.
          if (!st.rewind) st.rewind = now + 1500;
          else if (now > st.rewind) {
            st.rewind = 0;
            st.until = now + 2000;
            st.x = 0;
            el.scrollTo({ left: 0, behavior: 'smooth' });
          }
        } else {
          st.x = Math.min(max, st.x + DRIFT_SPEED * dt);
          el.scrollLeft = st.x;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [ref]);
  const hold = () => { s.current.until = performance.now() + DRIFT_IDLE; s.current.rewind = 0; };
  return {
    hold,
    handlers: {
      onPointerEnter: (e) => { if (e.pointerType === 'mouse') s.current.hover = true; },
      onPointerLeave: () => { s.current.hover = false; hold(); },
      onPointerDown: hold,
      onTouchStart: hold,
      onWheel: hold,
      onFocus: () => { s.current.focus = true; },
      onBlur: () => { s.current.focus = false; hold(); },
    },
  };
}

function Photos() {
  const row = React.useRef(null);
  const [ends, setEnds] = React.useState([true, false]);
  const measure = () => {
    const el = row.current;
    if (el) setEnds([el.scrollLeft < 4, el.scrollLeft + el.clientWidth > el.scrollWidth - 4]);
  };
  React.useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  const drift = useDrift(row);
  const step = (dir) => () => {
    const el = row.current;
    drift.hold();
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };
  return (
    <section id="hy-photos" className="g-hy-photos">
      <div className="g-hy-photos-head">
        <div className="g-hy-head">
          <span className="g-rs-eyebrow">The build</span>
          <h3 className="g-hy-hand is-big">From the shop</h3>
        </div>
        <div className="g-hy-arrows">
          <button type="button" onClick={step(-1)} disabled={ends[0]} aria-label="Previous photos">←</button>
          <button type="button" onClick={step(1)} disabled={ends[1]} aria-label="Next photos">→</button>
        </div>
      </div>
      <div
        ref={row}
        className="g-hy-carousel"
        onScroll={measure}
        tabIndex={0}
        aria-label="Build photos"
        {...drift.handlers}
      >
        {PHOTOS.map((p) => (
          <figure key={p.src} style={{ '--ar': p.w / p.h }}>
            <a href={p.src} target="_blank" rel="noreferrer">
              <img src={p.src} alt={p.alt} width={p.w} height={p.h} loading="lazy" decoding="async" />
            </a>
            <figcaption>{p.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function HydroPage() {
  useGlassTheme();
  const narrow = useNarrow();
  return (
    <div className="glass g-rs g-hy">
      <div className="g-hy-glow" aria-hidden="true" />
      <Nav />
      <Rail />
      <main data-pt-page="">
        <Rig narrow={narrow} />
        <Theory />
        <Calibration />
        <Results />
        <Why />
        <Next />
        <WriteUp />
        <Photos />
        <footer className="g-hy-foot">
          <a href="/projects" onClick={toAll}>← All projects</a>
          <span>© 2026 Mikayla Fisher</span>
        </footer>
      </main>
      <ProgressBar />
    </div>
  );
}

export default HydroPage;
