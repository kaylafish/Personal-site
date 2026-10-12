import React from 'react';
import { RESUME_FILENAME, RESUME_URL } from '../site.js';
import {
  CONTROLS, DEFAULT_MODE, MECHANISMS, MODES, SHOP_PHOTOS, STATS, SUBSYSTEMS,
} from '../data/rebuilt.js';
import { ProgressBar } from './home.jsx';
import { clamp, useGlassTheme, useScrollFrame } from './motion.jsx';
import { PageLink } from './pagelink.jsx';
import '../research.css';
import '../rebuilt.css';

// /projects/frc-rebuilt: Claude Design's "REBUILT Page v2". A 3D tour of the
// robot pinned at the top, then the numbers, the master sketch, the robot's
// software and how it was made. Its nav, side dots and progress bar are the
// research page's (research.css). Copy that isn't a paragraph is in
// data/rebuilt.js.

// three.js only loads on this page.
const RobotExplode = React.lazy(() => import('./robotexplode.jsx'));
const MODEL = '/models/rebuilt.glb';

// If the viewer's code can't load (offline, a stale deploy), the page goes
// on without the model.
class SkipOnError extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
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
// Progress of a section coming into view: 0 as its top enters the viewport,
// 1 once it's 70% of a screen in.
const enterProgress = (el) => {
  const vh = window.innerHeight;
  return clamp((vh - el.getBoundingClientRect().top) / (vh * 0.7));
};

function jumpTo(id) {
  return (e) => {
    if (e) e.preventDefault();
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (id === 'rb-cad' ? 0 : 80), behavior: 'smooth' });
  };
}

const CHAPTERS = [
  ['rb-cad', 'The robot'], ['rb-stats', 'Numbers'], ['rb-sketch', 'Master sketch'], ['rb-code', 'Software'],
  ['rb-ladder', 'State machine'], ['rb-drive', 'Driving it'], ['rb-aim', 'Aiming'], ['rb-make', 'Making it'],
];

function Nav() {
  return (
    <nav className="g-rs-nav" aria-label="Site">
      <div className="g-rs-nav-left">
        <PageLink to="/" className="g-rs-nav-name">Mikayla Fisher</PageLink>
        <div className="g-rs-crumb">
          <span>/</span><PageLink to="/#projects">Projects</PageLink><span>/</span><span>REBUILT</span>
        </div>
      </div>
      <div className="g-rs-nav-right">
        <PageLink to="/#projects" className="g-rs-nav-link is-all"><span>←</span>All projects</PageLink>
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
// 1. The robot: hero, then the subsystems exploded, then one tour stop per
// subsystem. Scroll picks the state; the model eases to it on its own.
// ---------------------------------------------------------------------------

const N = SUBSYSTEMS.length;
const HERO = 0.12; // the hero holds until here, then the robot comes apart
const EXP = 0.22;  // the tour starts here
const EXPLODED = -1;
const ASSEMBLED = -2;

function CadTour({ narrow }) {
  const ref = React.useRef(null);
  const hero = React.useRef(null);
  const cue = React.useRef(null);
  const exploded = React.useRef(null);
  // ASSEMBLED, EXPLODED, or the index of the subsystem on tour.
  const [stage, setStage] = React.useState(ASSEMBLED);
  // Written straight to the DOM: this runs every frame of the first screens.
  useScrollFrame(() => {
    const p = pinProgress(ref.current);
    hero.current.style.opacity = 1 - smooth(p / (HERO * 0.6));
    hero.current.style.transform = `translateY(${-60 * smooth(p / HERO)}px)`;
    cue.current.style.opacity = 1 - smooth(p / 0.03);
    exploded.current.style.opacity = smooth((p - HERO * 0.7) / (HERO * 0.3)) * (1 - smooth((p - EXP + 0.03) / 0.03));
    setStage(p >= EXP ? Math.min(N - 1, Math.floor(clamp((p - EXP) / (1 - EXP)) * N))
      : p >= HERO * 0.7 ? EXPLODED : ASSEMBLED);
  });

  // Arriving from the home page's story, its photo has grown to fill the
  // top of the screen (see projects.jsx). Fade it out to reveal the robot.
  React.useEffect(() => {
    const overlay = document.querySelector('.g-expand');
    if (!overlay) return;
    overlay.style.transition = 'opacity .5s ease';
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 520);
  }, []);

  const touring = stage >= 0;
  const sub = SUBSYSTEMS[Math.max(0, stage)];
  return (
    <section id="rb-cad" ref={ref} className="g-rs-pin" style={{ height: `${(2 + N) * 100 + 60}vh` }}>
      <div className="g-rs-sticky g-rb-cad">
        <SkipOnError>
          <React.Suspense fallback={null}>
            <RobotExplode
              className="g-rb-robot"
              src={MODEL}
              subsystems={SUBSYSTEMS}
              explode={stage === EXPLODED ? 1 : 0}
              focus={touring ? sub.node : ''}
              spin={touring ? 0.18 : 0.1}
              shift={!narrow && touring ? 0.14 : 0}
              lift={narrow && touring ? 0.2 : 0}
            />
          </React.Suspense>
        </SkipOnError>
        <div className="g-rb-cad-fade" />

        {/* Behind the transparent canvas, so the robot stands in front of it. */}
        <div ref={hero} className="g-rb-hero">
          <span className="g-rs-eyebrow" data-build="" style={{ '--b': 0 }}>FRC 4255 · 2026 · REBUILT</span>
          <h1 data-pt-title="">FRC <em>REBUILT</em></h1>
          <div data-build="" style={{ '--b': 1 }}>
            <span className="g-rb-hero-note">2026 FRC season · I worked on CAD, software and machining</span>
          </div>
          <div className="g-rb-chips" data-build="" style={{ '--b': 2 }}>
            <span>Onshape</span>
            <span>Java · WPILib · AdvantageKit</span>
            <span>CNC-machined plate</span>
          </div>
        </div>
        <div ref={cue} className="g-rb-cue"><span>Scroll to explore</span><span>↓</span></div>

        <div ref={exploded} className="g-rb-exploded" style={{ opacity: 0 }}>
          <span className="g-rs-eyebrow">Five subsystems</span>
          <h2>The robot by <em>subsystem.</em></h2>
        </div>

        <div className={`g-rb-sub ${touring ? 'is-on' : ''}`} aria-live="polite">
          <div className="g-rb-sub-head">
            <span className="g-rs-eyebrow">0{Math.max(0, stage) + 1} / 0{N}</span>
            <div className="g-rb-sub-dots">
              {SUBSYSTEMS.map((s, k) => (
                <span key={s.node} className={`${k <= stage ? 'is-lit' : ''} ${k === stage ? 'is-now' : ''}`} />
              ))}
            </div>
          </div>
          <h3>{sub.title}</h3>
          <p>{sub.body}</p>
          <div className="g-rb-specs">
            {sub.specs.map((s) => (
              <div key={s.label}><span>{s.label}</span><span className={s.todo ? 'is-todo' : ''}>{s.value}</span></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 2–4. Numbers, master sketch, software
// ---------------------------------------------------------------------------

function Stats() {
  const ref = React.useRef(null);
  const [e, setE] = React.useState(0);
  useScrollFrame(() => setE(Math.round(smooth(enterProgress(ref.current)) * 1000) / 1000));
  return (
    <section id="rb-stats" ref={ref} className="g-rb-stats">
      {STATS.map((s) => (
        <div key={s.label} className="g-rb-stat">
          <span>{s.label}</span>
          <span className="g-rb-stat-num">
            {Math.round(s.value * e)}{s.attached && s.unit}
            {!s.attached && <small> {s.unit}</small>}
          </span>
        </div>
      ))}
    </section>
  );
}

function Sketch() {
  return (
    <section id="rb-sketch" className="g-rb-sketch">
      <span className="g-rs-eyebrow">Onshape · master sketch</span>
      <h2 className="g-rb-display">Master <em>sketch.</em></h2>
      <p>Before any parts existed, the whole robot was laid out in a single side-view sketch: the intake path, the rotor, the turret and hood geometry, and the frame they all sit in.</p>
      <div className="g-rb-frame">
        <img src="/assets/rebuilt/master-sketch.webp" alt="Onshape master sketch of the robot in side view" loading="lazy" />
      </div>
    </section>
  );
}

function Software() {
  return (
    <section id="rb-code" className="g-rb-code">
      <span className="g-rs-eyebrow">Software</span>
      <h2 className="g-rb-display is-big">Robot <em>software.</em></h2>
      <p>Java on WPILib, logged with AdvantageKit. A swerve drivetrain, an intake that deploys itself, a spindexer, and a turret, hood and flywheel that aim from a global pose estimate built on AprilTags.</p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 5. The Supervisor's priority ladder. On wider screens it's pinned and the
// active mode follows the scroll; on phones you tap a mode.
// ---------------------------------------------------------------------------

function Ladder({ narrow }) {
  const ref = React.useRef(null);
  const [scrolled, setScrolled] = React.useState(0);
  const [picked, setPicked] = React.useState(DEFAULT_MODE);
  useScrollFrame(() => {
    if (!narrow) setScrolled(Math.min(MODES.length - 1, Math.floor(pinProgress(ref.current) * 7.6)));
  }, [narrow]);
  const at = narrow ? picked : scrolled;
  const mode = MODES[at];
  const Row = narrow ? 'button' : 'div';
  return (
    <section id="rb-ladder" ref={ref} className={`g-rb-ladder ${narrow ? '' : 'is-pinned'}`}>
      <div className="g-rb-ladder-inner">
        <div className="g-rb-ladder-text">
          <span className="g-rs-eyebrow">The Supervisor · every 20 ms</span>
          <h3 className="g-rb-hand">Supervisor state machine</h3>
          <p>One subsystem owns the intake, spindexer, hood and flywheel in teleop. It walks a fixed priority ladder and takes the first check that passes, so conflicting buttons always have a defined result: shoot plus intake shoots, and unjam beats everything. Every mode sets all four mechanisms, every loop.</p>
          <div className="g-rb-readout">
            {MECHANISMS.map((m, j) => (
              <div key={m}>
                <span>{m}</span>
                <span className={j > 0 && /stop|stow|off/.test(mode.does[j]) ? 'is-rest' : ''}>{mode.does[j]}</span>
              </div>
            ))}
          </div>
          <span className="g-rb-ladder-note">{mode.note}</span>
        </div>
        <div className="g-rb-modes">
          {MODES.map((m, k) => (
            <Row
              key={m.name}
              {...(narrow ? { type: 'button', onClick: () => setPicked(k), 'aria-pressed': k === at } : {})}
              className={`g-rb-mode ${k === at ? 'is-on' : k < at ? 'is-past' : ''}`}
            >
              <span className="g-rb-mode-n">{k + 1}</span>
              <span className="g-rb-mode-name"><span style={{ background: m.color }} />{m.name}</span>
              <span className="g-rb-mode-when">{m.when}</span>
            </Row>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 6–7. Driver controls, aiming
// ---------------------------------------------------------------------------

function Controls() {
  return (
    <section id="rb-drive" className="g-rb-drive">
      <span className="g-rs-eyebrow">Driving it</span>
      <h2 className="g-rb-display is-mid">Driver <em>controls.</em></h2>
      <p>Two joysticks and four buttons cover a match. The Supervisor and the targeting logic handle the rest.</p>
      <div className="g-rb-controls">
        {CONTROLS.map((c) => (
          <div key={c.key} className={c.stick ? 'is-stick' : ''}>
            <span className="g-rb-key">{c.key}</span>
            <span><span>{c.title}</span><span>{c.detail}</span></span>
          </div>
        ))}
      </div>
      <span className="g-rb-small">X ejects and Y unjams, for when something goes wrong.</span>
    </section>
  );
}

// A chart under its text; clicking it opens the full-size image.
function Chart({ id, eyebrow, title, src, alt, children }) {
  return (
    <div id={id} className="g-rb-chart">
      <div className="g-rb-chart-text">
        <span className="g-rs-eyebrow">{eyebrow}</span>
        <h3 className="g-rb-hand">{title}</h3>
        {children}
      </div>
      <a href={src} target="_blank" rel="noreferrer" className="g-rb-chart-img">
        <img src={src} alt={alt} loading="lazy" />
      </a>
    </div>
  );
}

function Aiming() {
  return (
    <section className="g-rb-aim">
      <Chart id="rb-aim" eyebrow="Hub or shuttle · same button" title="Hub or shuttle targeting"
        src="/assets/rebuilt/hub-or-shuttle.webp"
        alt="Field map showing where the robot aims: hub, default corner, alternate corner, or nothing">
        <p>Inside its own alliance zone (x ≤ 5 m) the turret aims at the hub using the shot table. Past that line, the same button lobs fuel back to a corner of its own alliance wall at fixed settings (hood 27°, 4000 RPM), choosing whichever corner the hub isn't in the way of. If the hub blocks both, nothing fires until the robot moves.</p>
        <p className="g-rb-aside">A cycles auto, force hub and force shuttle, for when the pose estimate is off.</p>
      </Chart>
      <Chart eyebrow="Turret · 380° of travel" title="Turret unwrap"
        src="/assets/rebuilt/turret-unwrap.webp" alt="Turret angle over time, unwinding 360° at the travel limit">
        <p>The turret runs from −370° to +10°. Each loop the code tests every copy of the target bearing (θ + k·360°) and takes the nearest one still inside the limits. When the robot spins, the turret tracks until it hits the stop, unwinds a full turn at up to 720°/s, and picks the hub back up.</p>
      </Chart>
      <Chart eyebrow="Shot table · 4 measured shots" title="Shot table"
        src="/assets/rebuilt/shot-table.webp" alt="Hood angle, flywheel RPM and flight time against distance">
        <p>Four shots on the field between 1.35 m and 2.81 m, each giving a hood angle and flywheel speed. Between them the code interpolates linearly; outside that range it holds the nearest value. The spindexer only feeds once the flywheel is within 200 RPM of its target.</p>
      </Chart>
      <Chart eyebrow="Shooting while moving" title="Shooting while moving"
        src="/assets/rebuilt/shoot-on-fly.webp" alt="Vector diagram and charts for shooting while moving">
        <p>A ball leaves with the shooter's velocity plus the robot's. The solver leads the turret to cancel the sideways part and changes flywheel speed so the ground speed matches a standing shot. It's closed form (a quadratic in muzzle speed squared) and falls back to the nearest possible shot.</p>
        <span className="g-rb-badge">BUILT AND TESTED IN ISOLATION · NOT USED IN MATCHES YET</span>
      </Chart>
      <p className="g-rb-small">Several flywheel, turret and hood PID and feedforward gains are still being tuned. Click any chart to open it full size. The moving-shot chart uses example inputs (2400 RPM standing shot, 20° launch pitch).</p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 8. Manufacturing and lessons
// ---------------------------------------------------------------------------

function Making() {
  return (
    <section id="rb-make" className="g-rb-make">
      <div className="g-rb-make-inner">
        <div className="g-rb-make-text">
          <span className="g-rs-eyebrow">Making it · what I'd change</span>
          <h2 className="g-rb-display">Manufacturing and <em>lessons.</em></h2>
          <p>Looking back, I overdesigned this robot. A lot of the parts asked more of our shop than we had, so I machined many of them myself on the CNC router. Once it was built it was robust, modular and easy to fix, but those weeks went into making parts instead of driving and tuning. Next time I'd design for what the team can actually build.</p>
        </div>
        <div className="g-rb-gallery">
          {SHOP_PHOTOS.map((p) => (
            <img key={p.src} src={p.src} alt={p.alt} loading="lazy" style={p.position ? { objectPosition: p.position } : undefined} />
          ))}
        </div>
      </div>
    </section>
  );
}

function RebuiltPage() {
  useGlassTheme();
  const narrow = useNarrow();
  return (
    <div className="glass g-rs g-rb">
      <div className="g-rs-glow" aria-hidden="true" />
      <Nav />
      <Rail />
      <main data-pt-page="">
        <CadTour narrow={narrow} />
        <Stats />
        <Sketch />
        <Software />
        <Ladder narrow={narrow} />
        <Controls />
        <Aiming />
        <Making />
        <footer className="g-rb-foot">
          <PageLink to="/#projects">← All projects</PageLink>
          <span>© 2026 Mikayla Fisher</span>
        </footer>
      </main>
      <ProgressBar />
    </div>
  );
}

export default RebuiltPage;
