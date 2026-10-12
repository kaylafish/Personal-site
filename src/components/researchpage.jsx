import React from 'react';
import { RESUME_FILENAME, RESUME_URL } from '../site.js';
import {
  ARCH_PILLS, ARCH_STEPS, COMPARE, CURVE, CURVE_STAGES, HEADLINE, HERO_PHOTO, STATEMENT, STATS,
} from '../data/research.js';
import { ProgressBar } from './home.jsx';
import { clamp, lerp, useGlassTheme, useScrollFrame } from './motion.jsx';
import { PageLink } from './pagelink.jsx';
import { goBackTo } from '../transitions.js';
import '../research.css';

// /projects/canard-roll-reversal: a scroll-driven story (pinned sections that
// animate as you scroll through them) followed by the full write-up.
// Copy and numbers for the story are in data/research.js.

const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const narrow = () => window.innerWidth < 760;

// Progress through a pinned section: 0 when its top reaches the top of the
// viewport, 1 when its bottom reaches the bottom.
const pinProgress = (el) => {
  const r = el.getBoundingClientRect();
  return clamp(-r.top / Math.max(1, r.height - window.innerHeight));
};
// Progress of a section coming into view: 0 as its top enters the viewport,
// 1 once it's 70% of a screen in.
const enterProgress = (el) => {
  const vh = window.innerHeight;
  return clamp((vh - el.getBoundingClientRect().top) / (vh * 0.7));
};

// Re-renders only when the measured value actually changes.
function useProgress(ref, measure, round = (v) => v) {
  const [v, setV] = React.useState(0);
  useScrollFrame(() => { if (ref.current) setV(round(measure(ref.current))); });
  return v;
}

function jumpTo(id) {
  return (e) => {
    if (e) e.preventDefault();
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
  };
}

const CHAPTERS = [
  ['rs-hero', 'Intro'], ['rs-words', 'The problem'], ['rs-curve', 'The curve'],
  ['rs-stats', 'In numbers'], ['rs-dots', 'Before / after'], ['rs-eq', 'The physics'],
  ['rs-arch', 'The system'], ['rs-next', 'What’s next'], ['ds', 'Write-up'],
];

// Back to /projects with the reverse of the card-opening transition.
const toAll = (e) => { e.preventDefault(); goBackTo('/projects'); };

function Nav() {
  return (
    <nav className="g-rs-nav" aria-label="Site">
      <div className="g-rs-nav-left">
        <PageLink to="/" className="g-rs-nav-name">Mikayla Fisher</PageLink>
        <div className="g-rs-crumb">
          <span>/</span><a href="/projects" onClick={toAll}>Projects</a><span>/</span><span>Canard roll reversal</span>
        </div>
      </div>
      <div className="g-rs-nav-right">
        <PageLink to="/" className="g-rs-nav-link is-wide">Home</PageLink>
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

function Hero() {
  const ref = React.useRef(null);
  const text = React.useRef(null);
  const card = React.useRef(null);
  const cap = React.useRef(null);
  // Written straight to the DOM: this runs every frame of the first screen.
  useScrollFrame(() => {
    const p = pinProgress(ref.current);
    const t = smooth((p - 0.1) / 0.75);
    text.current.style.opacity = 1 - smooth((p - 0.1) / 0.3);
    text.current.style.transform = `translateY(${-140 * smooth(p / 0.45)}px)`;
    Object.assign(card.current.style, {
      bottom: `${lerp(-50, 0, t)}vh`,
      width: `${lerp(narrow() ? 86 : 62, 100, t)}vw`,
      height: `${lerp(62, 100, t)}vh`,
      borderRadius: `${lerp(32, 0, t)}px`,
    });
    cap.current.style.opacity = smooth((p - 0.8) / 0.15);
  });
  return (
    <section id="rs-hero" ref={ref} className="g-rs-pin" style={{ height: '170vh' }}>
      <div className="g-rs-sticky g-rs-hero">
        <div ref={text} className="g-rs-hero-text" data-build="" style={{ '--b': 0 }}>
          <span className="g-rs-eyebrow">Research · Active · Simulation</span>
          <h1>{HEADLINE[0]}<br /><em>{HEADLINE[1]}</em></h1>
          <p>Keeping a canard-steered rocket in control when its roll authority peaks, then reverses.</p>
          <span className="g-rs-note">(it fights back)</span>
        </div>
        <div ref={card} className="g-rs-hero-card" data-pt-hero="">
          {HERO_PHOTO.src && !HERO_PHOTO.drawing && <img src={HERO_PHOTO.src} alt={HERO_PHOTO.alt} />}
          {HERO_PHOTO.src && HERO_PHOTO.drawing && (
            <div className="g-rs-hero-empty is-drawing"><img src={HERO_PHOTO.src} alt={HERO_PHOTO.alt} /></div>
          )}
          {!HERO_PHOTO.src && <div className="g-rs-hero-empty"><span className="is-todo">[Photo: the rocket on the rail, or a canard close-up]</span></div>}
          <div ref={cap} className="g-rs-hero-cap">
            <span>The vehicle</span>
            <span>104 inches. Four canards. 30–130 m/s.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

const WORDS = STATEMENT.split(' ');
function Statement() {
  const ref = React.useRef(null);
  const p = useProgress(ref, pinProgress);
  return (
    <section id="rs-words" ref={ref} className="g-rs-pin" style={{ height: '150vh' }}>
      <div className="g-rs-sticky g-rs-words">
        <p>
          {WORDS.map((w, i) => (
            <span key={i} style={{ opacity: i / WORDS.length < p * 1.2 - 0.05 ? 1 : 0.16 }}>{w}</span>
          ))}
        </p>
      </div>
    </section>
  );
}

// Chart space: x is 0–12° across 70..970, y is +4.5..−3.5 across 40..500.
const xm = (x) => 70 + (900 * x) / 12;
const ym = (v) => 40 + ((4.5 - v) / 8) * 460;

function Curve() {
  const ref = React.useRef(null);
  const pc = useProgress(ref, pinProgress);
  // How far along the curve to draw (in 0.1° samples): up to 4°, then the
  // peak region to 5.6°, then on to 12°.
  const idx = pc < 0.25 ? lerp(0, 40, smooth(pc / 0.22))
    : pc < 0.45 ? lerp(40, 56, smooth((pc - 0.25) / 0.15))
      : lerp(56, 120, smooth((pc - 0.45) / 0.2));
  const n = Math.floor(idx), f = idx - n;
  let d = `M${xm(0)},${ym(0)}`;
  for (let i = 1; i <= n; i++) d += ` L${xm(i / 10).toFixed(1)},${ym(CURVE[i]).toFixed(1)}`;
  const ty = n < 120 ? lerp(CURVE[n], CURVE[n + 1], f) : CURVE[120];
  const tx = (n + f) / 10;
  d += ` L${xm(tx).toFixed(1)},${ym(ty).toFixed(1)}`;
  const stage = pc < 0.25 ? 0 : pc < 0.45 ? 1 : pc < 0.7 ? 2 : 3;
  const o = {
    lin: smooth((pc - 0.04) / 0.1), peak: smooth((pc - 0.3) / 0.06), fall: smooth((pc - 0.32) / 0.1),
    zero: smooth((pc - 0.55) / 0.06), rev: smooth((pc - 0.56) / 0.1), cap: smooth((pc - 0.72) / 0.08),
    hand: smooth((pc - 0.6) / 0.08),
  };
  return (
    <section id="rs-curve" ref={ref} className="g-rs-pin" style={{ height: '300vh' }}>
      <div className="g-rs-sticky g-rs-curve">
        <div className="g-rs-curve-head">
          <div className="g-rs-stage-dots">
            {CURVE_STAGES.map((_, i) => <span key={i} className={i <= stage ? 'is-on' : ''} />)}
          </div>
          <h2 className="g-rs-hand-title">{CURVE_STAGES[stage][0]}</h2>
          <p>{CURVE_STAGES[stage][1]}</p>
        </div>
        <div className="g-rs-chart">
          <svg viewBox="0 0 1000 560" role="img" aria-label="Net roll against canard incidence: it rises, peaks near 5°, crosses zero near 7°, then reverses">
            <rect x="445" y="40" width="150" height="460" fill="#d9a441" fillOpacity=".13" opacity={o.fall} />
            <rect x="595" y="40" width="375" height="460" fill="#e0605a" fillOpacity=".12" opacity={o.rev} />
            {[-3, -2, -1, 0, 1, 2, 3, 4].map((v) => (
              <g key={v}>
                <line x1="70" x2="970" y1={ym(v)} y2={ym(v)} stroke={v === 0 ? '#4a5668' : '#1a2331'} strokeWidth="1" />
                <text x="54" y={ym(v) + 5} className="g-rs-svg-mono" textAnchor="end">{v}</text>
              </g>
            ))}
            {[0, 2, 4, 6, 8, 10, 12].map((v) => (
              <text key={v} x={xm(v)} y="528" className="g-rs-svg-mono" textAnchor="middle">{v}</text>
            ))}
            <text x="520" y="556" fill="#8d97a6" fontSize="15" textAnchor="middle">Effective incidence of one canard (°)</text>
            <text x="520" y="482" className="g-rs-svg-mono" fill="#d9a441" fontSize="15" textAnchor="middle" opacity={o.fall}>falling</text>
            <text x="782" y="482" className="g-rs-svg-mono" fill="#e0605a" fontSize="15" textAnchor="middle" opacity={o.rev}>reversed</text>
            <text x="700" y="200" fill="#c9d3e0" fontSize="34" className="g-rs-svg-hand" transform="rotate(-6 700 200)" opacity={o.hand}>nope, wrong way →</text>
            <line x1="70" y1="298.75" x2="420" y2="22" stroke="#b9c2cf" strokeWidth="2" strokeDasharray="6 7" opacity={o.lin} />
            <text x="300" y="70" fill="#b9c2cf" fontSize="15" textAnchor="end" opacity={o.lin}>what a standard controller assumes</text>
            <line x1="295" y1="40" x2="295" y2="500" stroke="#eef1f5" strokeWidth="2" strokeDasharray="4 6" opacity={o.cap} />
            <text x="283" y="380" className="g-rs-svg-mono" fill="#eef1f5" textAnchor="end" opacity={o.cap}>3° cap</text>
            <path d={d} fill="none" stroke="#5b9cf5" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={xm(tx)} cy={ym(ty)} r="7" fill="#5b9cf5" stroke="#0b111b" strokeWidth="3" />
            <circle cx="445" cy="83.1" r="8" fill="#0b111b" stroke="#eef1f5" strokeWidth="3" opacity={o.peak} />
            <text x="460" y="66" fill="#eef1f5" fontSize="17" fontWeight="600" opacity={o.peak}>peak ≈ 5°</text>
            <circle cx="595" cy="298.75" r="8" fill="#0b111b" stroke="#eef1f5" strokeWidth="3" opacity={o.zero} />
            <text x="612" y="285" fill="#eef1f5" fontSize="17" fontWeight="600" opacity={o.zero}>zero ≈ 7°</text>
          </svg>
          <span className="g-rs-chart-cap">Only the 5° and 7° angles are data (team CFD, 130 m/s). Curve height and shape are placeholders.</span>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const ref = React.useRef(null);
  const e = smooth(useProgress(ref, enterProgress));
  return (
    <section id="rs-stats" ref={ref} className="g-rs-stats">
      {STATS.map((s) => (
        <div key={s.label} className="g-rs-stat">
          <span>{s.label}</span>
          <span className="g-rs-stat-num">
            {s.format(lerp(s.from ?? 0, s.to, e), e > 0.99)}
            {s.unit && <small>{s.unit}</small>}
          </span>
        </div>
      ))}
    </section>
  );
}

function Dots() {
  const ref = React.useRef(null);
  const t = useProgress(ref, (el) => smooth((pinProgress(el) - 0.2) / 0.45), (v) => Math.round(v * 100) / 100);
  const count = Math.round(lerp(COMPARE.before, COMPARE.after, t));
  return (
    <section id="rs-dots" ref={ref} className="g-rs-pin" style={{ height: '190vh' }}>
      <div className="g-rs-sticky g-rs-dots">
        <div className="g-rs-dots-text">
          <span className="g-rs-eyebrow">Before → after</span>
          <h2 className="g-rs-display">Limit it.<br /><em>Don’t flip it.</em></h2>
          <div className="g-rs-swap">
            <div style={{ opacity: 1 - t }}><span>Before</span><span>{COMPARE.beforeLabel}</span></div>
            <div style={{ opacity: t }}><span className="is-after">After</span><span>{COMPARE.afterLabel}</span></div>
          </div>
          <div className="g-rs-dots-count"><span>{count}</span><span>of {COMPARE.n} held roll</span></div>
          <p className="g-rs-dots-note">{COMPARE.note}</p>
          <span className="g-rs-note">each dot is one simulated flight</span>
        </div>
        <div className="g-rs-dot-grid" aria-label={`${count} of ${COMPARE.n} simulated flights held roll`} role="img">
          {Array.from({ length: COMPARE.n }, (_, i) => <span key={i} className={i < count ? 'is-on' : ''} />)}
        </div>
      </div>
    </section>
  );
}

function Equation() {
  return (
    <div className="g-rs-band">
      <section id="rs-eq" className="g-rs-eq">
        <span className="g-rs-eyebrow">The roll channel</span>
        <div className="g-rs-eq-main">ṗ = a p + b G + d</div>
        <div className="g-rs-eq-sub">G = ¼ Σ<sub>i</sub> g(δ<sub>i</sub> − a<sub>i</sub>)</div>
        <div className="g-rs-eq-terms">
          <div><span>g</span><span>the peaked curve, unknown except two points</span></div>
          <div><span>δ<sub>i</sub> − a<sub>i</sub></span><span>effective incidence: deflection minus the local flow angle</span></div>
          <div><span>a &lt; 0</span><span>roll damping; d is gusts and fin cant</span></div>
        </div>
      </section>
    </div>
  );
}

// Block diagram cells: [grid-area, title, detail, extra].
const ARCH_BLOCKS = [
  ['2/1/3/2', 'LQR', '10 states, scheduled on airspeed'],
  ['2/2/3/3', 'INDI roll loop', 'cancels steady roll moments'],
  ['2/3/3/4', 'Allocator', 'roll first, then pitch/yaw', 'down'],
  ['2/4/3/5', '4 servos', '±10° stop, ~30 ms lag'],
  ['2/5/3/6', 'Rocket', 'reversal curve per canard, wind, fin cant', 'up'],
];

function Architecture() {
  const ref = React.useRef(null);
  const step = useProgress(ref, (el) => Math.min(6, Math.floor(pinProgress(el) * 7.2)));
  const cls = (k) => [step >= k ? 'is-lit' : '', step === k ? 'is-now' : ''].join(' ');
  return (
    <section id="rs-arch" ref={ref} className="g-rs-pin" style={{ height: '300vh' }}>
      <div className="g-rs-sticky g-rs-arch">
        <div className="g-rs-arch-head">
          <span className="g-rs-eyebrow">Architecture · {step + 1} / 7</span>
          <h2 className="g-rs-hand-title is-left">{ARCH_STEPS[step][0]}</h2>
          <p>{ARCH_STEPS[step][1]}</p>
        </div>
        <div className="g-rs-arch-pills">
          {ARCH_PILLS.map((l, k) => (
            <span key={l} className={`${cls(k)} ${k === 6 ? 'is-design' : ''}`}><small>{k + 1}</small>{l}</span>
          ))}
        </div>
        <div className="g-rs-arch-scroll">
          <div className="g-rs-arch-grid">
            {['1/3/2/4', '1/5/2/6'].map((area, i) => (
              <div key={area} className={`g-rs-blk is-design ${cls(6)}`} style={{ gridArea: area }}>
                <b>{i ? 'Wind-aware AoA' : 'Per-canard peak finder'}</b>
                <span>{i ? 'each canard’s flow angle' : '8 Hz dither, slope per canard, limit = peak − margin'}</span>
                <span className="g-rs-blk-tag">In design</span>
              </div>
            ))}
            {ARCH_BLOCKS.map(([area, title, detail, extra], k) => (
              <div key={title} className={`g-rs-blk ${k === 4 ? 'is-plant' : ''} ${cls(k)}`} style={{ gridArea: area }}>
                <b>{title}</b>
                <span>{detail}</span>
                {k < 4 && <span className={`g-rs-arrow ${step > k ? 'is-on' : ''}`}>→</span>}
                {extra && <span className={`g-rs-arrow-v ${step >= 6 ? 'is-on' : ''}`}>{extra === 'down' ? '↓' : '↑'}</span>}
              </div>
            ))}
            <div className={`g-rs-blk g-rs-blk-sensors ${cls(5)}`} style={{ gridArea: '3/2/4/5' }}>
              <span className="g-rs-back">←</span>
              <span><b>Sensors</b><span>rates, attitude, servo angles → back to LQR and INDI</span></span>
              <span className="g-rs-back">←</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Next() {
  const ref = React.useRef(null);
  const v = useProgress(ref, (el) => Math.round(95 * smooth(enterProgress(el))));
  return (
    <div className="g-rs-band">
      <section id="rs-next" ref={ref} className="g-rs-next">
        <span className="g-rs-eyebrow">What’s next</span>
        <h2 className="g-rs-display">The prize is <em>{v}%.</em></h2>
        <p>An oracle that knew each canard’s true flow angle and peak kept 95% of fin-cant conditions within 5°. Today’s controller keeps 88%. The per-canard extremum seeker, now in design, is meant to close that gap by finding each peak online.</p>
        <span className="g-rs-note">(working on it!)</span>
        <a href="#ds" onClick={jumpTo('ds')} className="g-rs-cta">Read the full write-up <span>↓</span></a>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The write-up ("datasheet")
// ---------------------------------------------------------------------------

const TOC = [
  ['ds-problem', 'The problem'], ['ds-vehicle', 'Vehicle and model'], ['ds-approach', 'Approach'],
  ['ds-results', 'Results'], ['ds-tried', 'What was tried'], ['ds-limits', 'Limitations'],
  ['ds-next', 'Next steps'], ['ds-refs', 'References'],
];

const Fig = ({ n, alt }) => <img src={`/assets/research/${n}.webp`} alt={alt} loading="lazy" />;

function Writeup() {
  const [sec, setSec] = React.useState('');
  useScrollFrame(() => {
    let at = '';
    for (const [id] of TOC) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top < window.innerHeight * 0.35) at = id;
    }
    setSec(at);
  });
  return (
    <section id="ds" className="g-rs-ds">
      <div className="g-rs-ds-inner">
        <header className="g-rs-ds-head">
          <span className="g-rs-note">the long version ↓</span>
          <span className="g-rs-eyebrow">Research write-up · paper in preparation</span>
          <h2>Robust roll control under canard-induced roll reversal via per-canard extremum seeking</h2>
        </header>
        <div className="g-rs-ds-facts">
          <div><span>Status</span><span>Active · simulation only</span></div>
          <div><span>Method</span><span>LQR · INDI · extremum seeking</span></div>
          <div><span>Tools</span><span>Python · RocketPy · OpenRocket</span></div>
        </div>

        <div className="g-rs-ds-cols">
          <aside className="g-rs-toc" aria-label="Contents">
            <span>Contents</span>
            {TOC.map(([id, label], i) => (
              <a key={id} href={`#${id}`} onClick={jumpTo(id)} className={sec === id ? 'is-on' : ''}>
                <small>{String(i + 1).padStart(2, '0')}</small>{label}
              </a>
            ))}
          </aside>

          <div className="g-rs-ds-body">
            <div id="ds-problem">
              <h3>The problem</h3>
              <p>Four servo-driven canards near the nose control pitch, yaw and roll. On this vehicle each canard’s tip vortex reaches the much larger tail fins and twists them the other way. Net roll peaks when a canard meets the air at about 5°, falls to zero near 7°, then reverses. A standard controller assumes more deflection means more roll; past the peak that becomes positive feedback, and it ends in a spin.</p>
              <p>Three things make it harder. Only the 5° and 7° landmarks are known, so the controller has to work across a whole family of curves. Wind and angle of attack add flow angle to one canard and subtract it from the opposite one. And dynamic pressure changes about 19-fold between rail exit and top speed.</p>
              <Fig n="fig2" alt="400 test curves at 130 and 30 m/s" />
              <span className="g-rs-cap">The 400 held-out curves. All pass through the 130 m/s data; at 30 m/s the peaks spread from 3.5° to 7.9°.</span>
            </div>

            <div id="ds-vehicle">
              <h3>Vehicle and model</h3>
              <dl className="g-rs-rows">
                <dt>Length · diameter</dt><dd>≈104 in · 4 in airframe</dd>
                <dt>Speed range</dt><dd>30–130 m/s (Mach ≤ 0.38)</dd>
                <dt>Canards</dt><dd>4 at 90° spacing, ±10° stop, ~30 ms lag</dd>
                <dt>Roll inertia</dt><dd>0.00700 kg·m² (OpenRocket)</dd>
                <dt>Data</dt><dd>Peak 5°, zero 7° at 130 m/s (team CFD)</dd>
                <dt>Placeholder</dt><dd>Curve height and shape, gusts, servo lag, damping</dd>
              </dl>
            </div>

            <div id="ds-approach">
              <h3>Approach</h3>
              <p>A discrete, servo-aware, gain-scheduled LQR holds attitude. An INDI roll loop (after Smeur, Chu &amp; de Croon, 2016) cancels steady moments from measured roll acceleration. A roll-priority allocator fits roll first inside each canard’s limit, which today is a fixed 3°. The adaptive layer in design borrows from anti-lock braking, where extremum seeking finds the peak of tyre friction online.</p>
              <Fig n="fig4" alt="Control architecture block diagram" />
              <Fig n="fig3" alt="Flow angle per canard and best deflection" />
              <span className="g-rs-cap">With uncertain flow angle, the deflection that gives the most average roll sits below the peak: 4.15° at ±1°, 3.23° at ±2°.</span>
            </div>

            <div id="ds-results">
              <h3>Results</h3>
              <p><b>Sign-flipping fails on a curve that peaks.</b> In 864 RocketPy flights, literature laws that detect reversal and flip the command reversed in 29–42 of 60 runs, about as often as no protection (42). Magnitude limiters reversed in 4–25.</p>
              <Fig n="fig7" alt="Sign flipping vs magnitude limiting" />
              <p><b>Adaptation lost, and the reason points forward.</b> Adaptive caps measured deflection, but reversal depends on each canard’s incidence. In all 154 held-out runs where the 3° cap reversed, flow angle, not deflection, pushed the canard past the peak.</p>
              <p><b>INDI is the largest single gain.</b> With fin cant up to ±0.1°, held roll rose from 201 to 263 of 300; median final error fell from 3.25° to 0.05°.</p>
              <Fig n="fig6" alt="Final roll error distribution with and without INDI" />
            </div>

            <div id="ds-tried">
              <h3>What was tried</h3>
              <div className="g-rs-tried">
                {[
                  ['Sign flipping, sliding mode, Lyapunov', 'Reversed 29–42 of 60', 'Dropped'],
                  ['Fixed 4.5° cap', 'Reversed 25 of 60', 'Too high'],
                  ['Adaptive cap', 'Cap grew past the peak', 'Idea kept'],
                  ['Whole-vehicle ESC', 'Hit the 10° stop in 402 of 2,640 runs', 'Per canard next'],
                  ['Still-air AoA estimate', 'Held 142 vs 259 of 300', 'Needs wind'],
                  ['Fixed 3° + roll priority + INDI', '64–2 paired over fixed cap', 'Front-runner'],
                ].map(([what, result, verdict], i, all) => (
                  <React.Fragment key={what}>
                    <span>{what}</span><span>{result}</span>
                    <span className={i === all.length - 1 ? 'is-best' : ''}>{verdict}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div id="ds-limits">
              <h3>Limitations</h3>
              <p>Simulation only; nothing has flown or been in a wind tunnel. Two data points define the curve. Sensing is idealized (0.5°/s white gyro noise, no vibration). Gain-scheduling margins are frozen-point diagnostics, not proof of stability. No controller yet holds pitch and yaw tightly in low-speed crosswind.</p>
            </div>

            <div id="ds-next">
              <h3>Next steps</h3>
              <p>Test INDI with caps of 3.0, 3.5 and 4.0° to recover high fin-cant cases; run one held-out decision set plus a RocketPy subset; then build the per-canard extremum seeker, holding each canard at its own peak minus a margin set by measured uncertainty. The target to beat is the oracle bound.</p>
            </div>

            <div id="ds-refs" className="g-rs-refs">
              <h3>References</h3>
              <span>Smeur, Chu &amp; de Croon. Adaptive INDI for attitude control of micro air vehicles. JGCD 39(3), 2016.</span>
              <span>Silton &amp; Coyle. Effect of canard deflection for roll control on fin performance. AIAA 2016-0309.</span>
              <span>Silton &amp; Fresconi. Effect of canard interactions on aerodynamic performance. JSR 52(5), 2015.</span>
              <span>Mirzaei. Roll reversal phenomenon control in flight vehicles. Aerospace Sci. &amp; Tech. 79, 2018.</span>
              <span>Code: <a href="https://github.com/kaylafish/voyager-controller-rocketpy" target="_blank" rel="noreferrer">kaylafish/voyager-controller-rocketpy</a></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ResearchPage() {
  useGlassTheme();
  return (
    <div className="glass g-rs">
      <div className="g-rs-glow" aria-hidden="true" />
      <Nav />
      <Rail />
      <main data-pt-page="">
        <Hero />
        <Statement />
        <Curve />
        <Stats />
        <Dots />
        <Equation />
        <Architecture />
        <Next />
        <Writeup />
      </main>
      <ProgressBar />
    </div>
  );
}

export default ResearchPage;
