import React from 'react';
import { RESUME_FILENAME, RESUME_URL } from '../site.js';
import {
  COG_FACTS, GRAPH_NOTES, GRAPH_STATS, HOPS, IDLE, MEMORIAL, MORE, ROBIN_PHOTOS, STATUS, TEAM_PHOTO, TOUR,
} from '../data/coyneinator.js';
import { getProject } from '../data/projects.js';
import { ProgressBar } from './home.jsx';
import { clamp, easeInOutCubic, prefersReducedMotion, useGlassTheme, useScrollFrame } from './motion.jsx';
import { ModelFallback, SkipOnError } from './modelfallback.jsx';
import { PageLink } from './pagelink.jsx';
import { goBackTo, whenSettled } from '../transitions.js';
import '../research.css';
import '../coyneinator.css';

// /projects/frc-coyneinator: Claude Design's "Coyneinator Page", opening
// on a tribute to Robin Coyne, who the robot is named for. Then a pinned 3D
// tour of the 2025 robot, the centre of gravity, the arm's state graph, a
// route walked joint by joint, the control stack, the code's status and the
// team at the 2025 San Francisco Regional. Its nav, side dots and progress
// bar are the research page's (research.css). Copy that isn't a paragraph is
// in data/coyneinator.js.

// three.js only loads on this page.
const CoyneView = React.lazy(() => import('./coyneview.jsx'));
const MODEL = '/models/coyneinator.glb';
const COVER = getProject('frc-coyneinator');

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
  ['cy-tribute', 'In memory'], ['cy-robot', 'The robot'], ['cy-cog', 'Centre of gravity'], ['cy-graph', 'State graph'],
  ['cy-route', 'Walking a route'], ['cy-stack', 'Control stack'], ['cy-more', 'Status'], ['cy-team', 'The team'],
];

// Back to /projects with the reverse of the card-opening transition.
const toAll = (e) => { e.preventDefault(); goBackTo('/projects'); };

function Nav() {
  return (
    <nav className="g-rs-nav" aria-label="Site">
      <div className="g-rs-nav-left">
        <PageLink to="/" className="g-rs-nav-name">Mikayla Fisher</PageLink>
        <div className="g-rs-crumb">
          <span>/</span><a href="/projects" onClick={toAll}>Projects</a><span>/</span><span>Coyneinator</span>
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
// 1. Hero + robot tour. The hero holds the first slice of the scroll, then
// one stop per subsystem. Open a pill to re-focus the model.
// ---------------------------------------------------------------------------

const STOPS = TOUR.length + 1; // the hero, then each subsystem
const pad2 = (n) => String(n).padStart(2, '0');

// The elevator slider: Idle to Score L4 Back, using the code's setpoints.
function PoseSlider({ pose, setPose }) {
  const drag = React.useRef(false);
  const at = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPose(clamp((e.clientX - r.left - 32) / Math.max(1, r.width - 64)));
  };
  const deg = 5 + 81 * pose;
  const ext = 0.93 * Math.max(0, (deg - 65) / 21);
  const name = Math.abs(deg - 65) < 1.5 ? 'Idle' : pose > 0.98 ? 'Score L4 Back' : pose < 0.02 ? 'Lowered' : 'moving';
  const key = (e) => {
    const d = { ArrowLeft: -0.02, ArrowDown: -0.02, ArrowRight: 0.02, ArrowUp: 0.02 }[e.key];
    if (d) { e.preventDefault(); setPose(clamp(pose + d)); }
  };
  return (
    <div className="g-cy-slider">
      <p><b>Pivot and extend.</b> Idle to Score L4 Back, using the setpoints from the code.</p>
      <span className="g-cy-slider-hint">Move the slider to raise the arm.</span>
      <div
        className="g-cy-track"
        role="slider" tabIndex={0} aria-label="Elevator pivot"
        aria-valuemin={5} aria-valuemax={86} aria-valuenow={Math.round(deg)} aria-valuetext={`${Math.round(deg)}°, ${name}`}
        onKeyDown={key}
        onPointerDown={(e) => { drag.current = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) { /* fine */ } at(e); }}
        onPointerMove={(e) => { if (drag.current) at(e); }}
        onPointerUp={() => { drag.current = false; }}
        onPointerCancel={() => { drag.current = false; }}
      >
        <div className="g-cy-track-bg" />
        <div className="g-cy-track-fill" style={{ width: `${pose * 100}%` }} />
        <div className="g-cy-thumb" style={{ left: `calc(${pose * 100}% - ${pose * 64}px)` }}>‹›</div>
      </div>
      <div className="g-cy-slider-read">
        <span>Pivot {Math.round(deg)}°</span><span>Extension {ext.toFixed(2)} m</span><span className="is-accent">{name}</span>
      </div>
    </div>
  );
}

function Feature({ f, on, toggle }) {
  return (
    <button type="button" onClick={toggle} aria-expanded={on} className={`g-cy-feat ${on ? 'is-on' : ''}`}>
      <span className="g-cy-feat-head"><span className="g-cy-feat-ic">+</span>{f.title}</span>
      <span className="g-cy-feat-body">
        <span>
          <span className="g-cy-feat-text">{f.body}</span>
          {f.note && <span className="g-cy-feat-note">{f.note}</span>}
        </span>
      </span>
    </button>
  );
}

function Tour({ narrow }) {
  const ref = React.useRef(null);
  const [p, setP] = React.useState(0);
  useScrollFrame(() => setP(Math.round(pinProgress(ref.current) * 1000) / 1000));
  const [sel, setSel] = React.useState({});
  const [pose, setPose] = React.useState(IDLE);
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
  const stop = TOUR[ti];
  const picked = stop && sel[ti] != null ? stop.feats[sel[ti]] : null;
  const focus = !stop ? '' : picked ? picked.focus : stop.focus;
  const usePose = stop && stop.slider && !picked ? pose : IDLE;

  const goStep = (d) => () => {
    const el = ref.current;
    const h = el.offsetHeight - window.innerHeight;
    const t = Math.max(0, Math.min(STOPS - 1, si + d));
    window.scrollTo({ top: el.offsetTop + h * (t + 0.5) / STOPS, behavior: 'smooth' });
  };

  return (
    <section id="cy-robot" ref={ref} className="g-rs-pin g-cy-tour">
      <div className="g-rs-sticky g-cy-tour-sticky">
        {modelFailed ? <ModelFallback className="g-cy-model" src={COVER.cover} alt={COVER.coverAlt} />
          : settled && <SkipOnError onError={onModelError}>
          <React.Suspense fallback={null}>
            <CoyneView
              onError={onModelError}
              className="g-cy-model"
              src={MODEL}
              focus={focus}
              pose={usePose}
              yaw={0.6 + p * 1.6}
              shift={narrow || si === 0 ? 0 : 0.18}
              onProgress={setLd}
              onLoaded={() => setLoaded(true)}
            />
          </React.Suspense>
        </SkipOnError>}

        <div className={`g-cy-hero ${si === 0 ? '' : 'is-off'}`}>
          <span className="g-rs-eyebrow">FRC Team 4255 · 2025 Reefscape robot</span>
          <h1><em>Coyneinator.</em></h1>
          <p>A swerve robot with a pivoting elevator, a coaxial differential wrist and a five-joint arm that only ever moves along safe paths.</p>
          <span className="g-cy-hero-note">1.4 ft tall folded, 7 ft fully up</span>
        </div>
        <div className={`g-cy-cue ${si === 0 ? '' : 'is-off'}`}>Scroll for the tour ↓</div>

        <div className="g-cy-steps">
          {TOUR.map((s, i) => (
            <div key={s.kicker} className={`g-cy-step ${i === ti ? 'is-on' : i < ti ? 'is-past' : ''}`} aria-hidden={i !== ti}>
              <span className="g-rs-eyebrow">{pad2(i + 1)} · {s.kicker}</span>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
              {s.slider && <PoseSlider pose={pose} setPose={setPose} />}
              {s.feats.length > 0 && (
                <div className="g-cy-feats">
                  {s.feats.map((f, j) => (
                    <Feature key={f.focus} f={f} on={sel[i] === j}
                      toggle={() => setSel((m) => ({ ...m, [i]: m[i] === j ? null : j }))} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={`g-cy-chev ${si === 0 ? 'is-off' : ''}`}>
          <button type="button" onClick={goStep(-1)} aria-label="Previous part">⌃</button>
          <button type="button" onClick={goStep(1)} aria-label="Next part">⌄</button>
        </div>
        <div className={`g-cy-dots ${si === 0 ? 'is-off' : ''}`}>
          {TOUR.map((s, i) => <span key={s.kicker} className={i === ti ? 'is-on' : ''} />)}
        </div>
        {settled && !loaded && !modelFailed && (
          <div className="g-cy-loading">
            <span>Loading the CAD · {Math.round(ld * 100)}%</span>
            <span className="g-cy-loading-bar"><span style={{ width: `${ld * 100}%` }} /></span>
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 2–6. Centre of gravity, state graph, a route, the control stack, status
// ---------------------------------------------------------------------------

// A figure that opens full size when clicked.
function Fig({ src, alt, caption }) {
  return (
    <figure className="g-cy-fig">
      <a href={src} target="_blank" rel="noreferrer"><img src={src} alt={alt} loading="lazy" decoding="async" /></a>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function Cog() {
  return (
    <section id="cy-cog" className="g-cy-band">
      <div className="g-cy-cog">
        <div className="g-cy-cog-num">
          <span className="g-rs-eyebrow">Centre of gravity · elevator at full extension</span>
          <span className="g-cy-big">14<em> in</em></span>
        </div>
        <div className="g-cy-cog-text">
          <h2 className="g-cy-h2">Seven feet tall, <em>still planted.</em></h2>
          <p className="g-cy-lede">A tall robot tips when the weight goes up with it. So the top is heavily lightened, and anything heavy is kept low: the wrist’s gearboxes ride in the last elevator stage instead of at the tip, and the intake’s motor sits down near the frame on a zombie axle.</p>
          <div className="g-cy-chips">
            {COG_FACTS.map((f) => <span key={f.k}><span className="g-cy-k">{f.k}</span><span>{f.v}</span></span>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function Graph() {
  return (
    <section id="cy-graph" className="g-cy-wrap g-cy-graph">
      <div className="g-cy-head is-center">
        <span className="g-rs-eyebrow">Software · arm control</span>
        <h2 className="g-cy-display is-wide">Never straight <em>to the goal.</em></h2>
        <p>The arm has five joints, and most ways of moving them all at once would drive it into the robot or the reef. So the code never sends the arm straight to a target. Every useful pose is a named node in a graph, and the edges are the moves known to be safe. Routes between every pair of poses are worked out ahead of time and shipped to the robot as a table. Asking for "Score L4 Back" becomes a lookup that returns a short list of waypoints, and the arm steps through them, moving on only when every joint has arrived.</p>
        <span className="g-cy-note">driver code thinks in pose names; the graph handles the rest</span>
      </div>
      <div className="g-cy-stats">
        {GRAPH_STATS.map((s) => (
          <div key={s.k}><span className="g-cy-k">{s.k}</span><span className="g-cy-stat-v">{s.v}</span><span>{s.d}</span></div>
        ))}
      </div>
      <div className="g-cy-lookup">
        <div className="g-cy-lookup-text">
          <span className="g-rs-eyebrow">Route lookup on the robot</span>
          <span className="g-cy-o1">O(<em>1</em>)</span>
          <p>The search never runs during a match. <code>PathCreator.py</code> runs a breadth-first search from every pose to every other pose once, offline, and writes all 625 routes into a JSON file. The robot loads it at startup, so asking for a route is a single table lookup: constant time, no matter how big the graph gets.</p>
          <span className="g-cy-note is-small">all the work happens before the robot turns on</span>
        </div>
        <div className="g-cy-code">
          <div>
            <span className="is-c">// offline · once · BFS over 25 poses</span>
            <span>graph_data.json → 625 routes</span>
          </div>
          <div className="is-live">
            <span className="is-c">// on the robot · every request</span>
            <span className="is-nw">route = table[<em>"Ground Intake"</em>][<em>"Score L4 Back"</em>]</span>
            <span className="is-c is-nw">→ Handoff › Waiting to Score › L4 Back Intermediate › Score L4 Back</span>
          </div>
        </div>
      </div>
      <Fig
        src="/assets/coyneinator/1-state-graph.webp"
        alt="State graph of the arm: 25 named poses grouped into coral, algae and climb, with arrows for the 47 allowed moves and the route from Ground Intake to Score L4 Back traced in four numbered steps"
        caption="Drawn from the robot’s deploy file. Tap to open full size."
      />
      <div className="g-cy-notes">
        {GRAPH_NOTES.map((n) => <div key={n.t}><h3 className="g-cy-hand">{n.t}</h3><p>{n.b}</p></div>)}
      </div>
      <p className="g-cy-aside">Routes come from a breadth-first search over every pair of poses, so "shortest" means fewest moves, not least time: Idle → Waiting to Score goes through Lollipop Intake even though HP Intake is the same number of hops and physically closer.</p>
    </section>
  );
}

function Route() {
  return (
    <section id="cy-route" className="g-cy-band">
      <div className="g-cy-wrap">
        <div className="g-cy-split">
          <div className="g-cy-head">
            <span className="g-rs-eyebrow">Walking a route</span>
            <h2 className="g-cy-display">The slowest joint <em>sets the pace.</em></h2>
          </div>
          <p className="g-cy-body">Every 20 ms the route walker reads all five joints and sends them to the current waypoint. When every joint is inside its tolerance it moves on. After the last one, the arm has to stay inside tolerance for a hold time before it reports settled. Loose transit tolerances let the arm flow through the in-between poses instead of stopping at each.</p>
        </div>
        <div className="g-cy-hops">
          {HOPS.map((h) => (
            <div key={h.k} className={h.accent ? 'is-accent' : ''}>
              <span className="g-cy-k">{h.k}</span><span className="g-cy-hop-v">{h.v}</span><span>{h.d}</span>
            </div>
          ))}
        </div>
        <span className="g-cy-badge">Simulated from the code’s limits · not a robot log</span>
        <Fig
          src="/assets/coyneinator/2-route-walk.webp"
          alt="Five side views of the robot from Ground Intake to Score L4 Back, with the joint values that change at each waypoint"
          caption="Arm geometry and reef heights come from the code; the chassis, end-effector and intake outlines are schematic."
        />
        <Fig
          src="/assets/coyneinator/3-route-timeline.webp"
          alt="Simulated timeline of the five joints over the four waypoints, settling at 3.82 seconds"
          caption="The elevator stretch is longest because its 2 m/s² acceleration limit is the most conservative in the code."
        />
      </div>
    </section>
  );
}

function Stack() {
  return (
    <section id="cy-stack" className="g-cy-wrap g-cy-stack">
      <div className="g-cy-split">
        <div className="g-cy-head">
          <span className="g-rs-eyebrow">The control stack</span>
          <h2 className="g-cy-display">Pose names above, <em>volts below.</em></h2>
        </div>
        <p className="g-cy-body">Five layers, each with one job. Every joint runs the same pattern underneath: a trapezoid profile turns a jump in target into a smooth ramp, a P controller corrects against that ramp, and feedforward supplies the voltage the move should need. Each subsystem talks to a real or simulated hardware layer, chosen once at startup, so the whole stack runs on a laptop.</p>
      </div>
      <Fig
        src="/assets/coyneinator/4-control-stack.webp"
        alt="The five software layers from command to hardware, and a table of the five joint loops with speed and acceleration limits, gains, feedforward and tolerances"
      />
      <div className="g-cy-eqs">
        <div>
          <h3 className="g-cy-hand is-big">Gravity that follows the arm</h3>
          <p>The elevator rides on the pivoting arm, so gravity pulls along it by sin(pivot angle): nothing when flat, full weight when vertical. Its holding voltage is 0.35 V × sin(angle) from the live pivot angle. The pivot is the mirror image, 0.18 V × cos(angle).</p>
          <div className="g-cy-eq">
            <span>V<sub>elev</sub> = k<sub>S</sub>·sgn(v) + k<sub>G</sub>·sin θ + k<sub>V</sub>·v + k<sub>A</sub>·a</span>
            <span>V<sub>pivot</sub> = k<sub>S</sub>·sgn(ω) + k<sub>G</sub>·cos θ + k<sub>V</sub>·ω + k<sub>A</sub>·α</span>
            <span className="g-cy-eq-key">θ = live pivot angle · k<sub>G</sub> = 0.35 V (elevator), 0.18 V (pivot)</span>
          </div>
        </div>
        <div>
          <h3 className="g-cy-hand is-big">Mixing the differential</h3>
          <p>One controller for pitch, one for roll, then mix: left = pitch + roll, right = pitch − roll. Reading back uses the same sum and difference on the two encoders.</p>
          <div className="g-cy-eq"><span>pitch = (L + R) / 2 · roll = (L − R) / 2</span></div>
        </div>
      </div>
      <Fig
        src="/assets/coyneinator/5-control-details.webp"
        alt="Left: gravity feedforward voltage against pivot angle for the pivot and elevator motors. Right: pitch and roll controllers mixed into left and right wrist motor voltages"
      />
    </section>
  );
}

function More() {
  return (
    <section id="cy-more" className="g-cy-wrap g-cy-more">
      <div className="g-cy-more-list">
        <span className="g-rs-eyebrow">Also in the code</span>
        <div>
          {MORE.map((m) => <div key={m.t}><span>{m.t}</span><span>{m.b}</span></div>)}
        </div>
      </div>
      <div className="g-cy-status">
        <span className="g-rs-eyebrow">Status · offseason branch</span>
        <h3 className="g-cy-hand is-status">Built vs. wired up</h3>
        <div>
          {STATUS.map((s) => (
            <div key={s.k}><span className={`g-cy-k is-${s.tone || 'off'}`}>{s.k}</span><span>{s.b}</span></div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 7–8. The team at the regional, and Robin
// ---------------------------------------------------------------------------

function Team() {
  return (
    <section id="cy-team" className="g-cy-band">
      <div className="g-cy-wrap g-cy-team">
        <div className="g-cy-head is-center">
          <span className="g-rs-eyebrow">2025 San Francisco Regional · Winner</span>
          <h2 className="g-cy-display">The <em>team.</em></h2>
        </div>
        <figure className="g-cy-team-photo">
          <img src={TEAM_PHOTO.src} alt={TEAM_PHOTO.alt} width={TEAM_PHOTO.w} height={TEAM_PHOTO.h} loading="lazy" decoding="async" />
          <figcaption>FRC Team 4255 with the winner’s banner at the 2025 San Francisco Regional.</figcaption>
        </figure>
      </div>
    </section>
  );
}

// Scrolling down anywhere above the robot's hero glides straight to it,
// so the tribute hands over to the robot in one move. Wheel, swipe and
// keys all count; while the glide runs, further input is swallowed so it
// isn't fought by trackpad momentum. Scrolling up is left alone.
const GLIDE_MS = 900;
function glideTo(y) {
  if (prefersReducedMotion()) { window.scrollTo(0, y); return GLIDE_MS / 4; }
  const y0 = window.scrollY, t0 = performance.now();
  const step = (now) => {
    const t = clamp((now - t0) / GLIDE_MS);
    window.scrollTo(0, y0 + (y - y0) * easeInOutCubic(t));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  return GLIDE_MS;
}
function useTributeGlide(targetId) {
  const busy = React.useRef(0);
  const go = React.useCallback(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    busy.current = performance.now() + glideTo(el.getBoundingClientRect().top + window.scrollY) + 150;
  }, [targetId]);
  React.useEffect(() => {
    const target = () => {
      const el = document.getElementById(targetId);
      return el ? el.getBoundingClientRect().top + window.scrollY : 0;
    };
    const gliding = () => performance.now() < busy.current;
    const above = () => window.scrollY < target() - 4;
    const onWheel = (e) => {
      if (gliding()) { e.preventDefault(); return; }
      if (e.deltaY > 0 && Math.abs(e.deltaY) > Math.abs(e.deltaX) && above()) { e.preventDefault(); go(); }
    };
    let y0 = null;
    const onTouchStart = (e) => { y0 = e.touches.length === 1 ? e.touches[0].clientY : null; };
    const onTouchMove = (e) => {
      if (gliding()) { e.preventDefault(); return; }
      if (y0 == null || !above()) return;
      if (y0 - e.touches[0].clientY > 8) { e.preventDefault(); y0 = null; go(); }
    };
    const onKey = (e) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target;
      if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName) || t.getAttribute?.('role') === 'slider')) return;
      const down = e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey);
      if (!down) return;
      if (gliding()) { e.preventDefault(); return; }
      if (above()) { e.preventDefault(); go(); }
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('keydown', onKey);
    };
  }, [targetId, go]);
  return go;
}

// The page opens on the tribute: the robot is named for Robin Coyne. Quiet
// on purpose: the photos sit still; only the scroll cue's arrow moves.
function Tribute() {
  const [before, after] = MEMORIAL.split('Robin Coyne');
  const glide = useTributeGlide('cy-robot');
  return (
    <section id="cy-tribute" className="g-cy-tribute" aria-labelledby="cy-tribute-text">
      <div className="g-cy-tribute-inner">
        <p id="cy-tribute-text" data-build="" style={{ '--b': 1 }}>{before}<em>Robin Coyne</em>{after}</p>
        <div className="g-cy-prints" data-build="" style={{ '--b': 2 }}>
          {ROBIN_PHOTOS.map((ph) => (
            <figure key={ph.src}>
              <img src={ph.src} alt={ph.alt} width={ph.w} height={ph.h} decoding="async" />
            </figure>
          ))}
        </div>
      </div>
      <a href="#cy-robot" onClick={(e) => { e.preventDefault(); glide(); }} className="g-cy-named" data-build="" style={{ '--b': 3 }}>
        <span>Our 2025 Reefscape robot, named:</span>
        <span className="g-cy-named-arrow" aria-hidden="true">↓</span>
      </a>
    </section>
  );
}

function CoyneinatorPage() {
  useGlassTheme();
  const narrow = useNarrow();
  return (
    <div className="glass g-rs g-cy">
      <div className="g-cy-glow" aria-hidden="true" />
      <Nav />
      <Rail />
      <main data-pt-page="">
        <Tribute />
        <Tour narrow={narrow} />
        <Cog />
        <Graph />
        <Route />
        <Stack />
        <More />
        <Team />
        <footer className="g-cy-foot">
          <a href="/projects" onClick={toAll}>← All projects</a>
          <span>© 2026 Mikayla Fisher</span>
        </footer>
      </main>
      <ProgressBar />
    </div>
  );
}

export default CoyneinatorPage;
