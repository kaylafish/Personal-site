import React from 'react';
import { getProject, projectModel, projectPath } from '../data/projects.js';
import { MOBILE_QUERY, Rv, prefersReducedMotion, useScrollFrame } from './motion.jsx';
import { useOpenProject } from './projectcard.jsx';
import { heroHeight } from './projectpage.jsx';

// three.js only loads when someone presses "View in 3D".
const ModelViewer = React.lazy(() => import('./modelviewer.jsx'));

// ============================================================================
// PROJECT CHAPTERS — EDIT THIS LIST TO CHANGE THE STORY
// ----------------------------------------------------------------------------
// Each chapter scrolls past the sticky photo panel on the left. `slug` ties
// it to a project in data/projects.js, which supplies the photo, the 3D
// model (if it has one) and the page "Read the full build" opens.
// ============================================================================
const CHAPTERS = [
  {
    slug: 'canard-roll-reversal',
    eyebrow: '2026 · Active research',
    title: <>More canard, <em>less roll.</em></>,
    body: 'Canards steer a rocket from the nose, but on this one their wake hits the tail fins. Past about 5° the roll they make shrinks, and past 7° it reverses. My research, in simulation, is how to keep the rocket in roll control through that.',
    tags: ['Python', 'RocketPy', 'LQR', 'INDI'],
  },
  {
    slug: 'frc-rebuilt',
    eyebrow: '2026 · FRC REBUILT',
    title: <>REBUILT</>,
    body: 'I was responsible for the design, modeling, and manufacturing: a rack-and-pinion intake, a rotor for serializing game pieces, and a variable-hood shooter on a turret.',
    tags: ['CAD/CAM', 'Machining', 'FEA', 'Simulation'],
  },
  {
    slug: 'frc-coyneinator',
    eyebrow: '2025 · FRC Reefscape',
    title: <>Coyneinator</>,
    body: 'Our San Francisco Regional winner, named for my late mentor, Robin Coyne. A swerve robot with a pivoting elevator, a coaxial differential wrist and a five-joint arm that only ever moves along safe paths.',
    tags: ['Mechanical design', 'Swerve', 'Elevator', 'Differential wrist'],
  },
  {
    slug: 'magnus-effect',
    eyebrow: '2026 · IB Extended Essay',
    title: <>The Magnus <em>effect</em></>,
    body: 'How the lift on a smooth foam ball grows with its spin. I built a two-wheel launcher, filmed 50 shots at 240 fps, and fitted a numerical flight model to the results.',
    tags: ['RK4', 'χ² fit', 'High-speed video', 'CAD'],
  },
  {
    slug: 'hydro-generator',
    eyebrow: '2026 · IB Physics HL',
    title: <>Hydro <em>generator</em></>,
    body: 'A miniature hydroelectric generator: does a CIM motor’s voltage follow V ∝ √h as the water drops further? The fit gave k = 1.31 ± 0.06, 67% of the ideal, and the write-up explains where the rest went.',
    tags: ['CNC', '3D printing', 'Data analysis'],
  },
  {
    slug: 'frc-charged-up',
    eyebrow: '2023 · FRC Charged Up!',
    title: <>Quetzy</>,
    body: 'As a freshman I took on programming the entire robot. It gave me my foundation in controls: a finite state machine, 2-DOF arm feedforward, and PID.',
    tags: ['Java', 'Swerve', 'PathPlanner'],
  },
];

// The pinned photo grows into the project page's hero, then the route
// changes underneath it. projectpage.jsx fades the photo out on arrival.
function expandInto(fromEl, src, done) {
  if (!fromEl || prefersReducedMotion()) { done(); return; }
  const r = fromEl.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'g-expand';
  el.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;`
    + `border-radius:${getComputedStyle(fromEl).borderRadius};background-image:url("${src}")`;
  document.body.appendChild(el);
  el.getBoundingClientRect(); // commit the start frame before animating
  Object.assign(el.style, { left: '0px', top: '0px', width: '100vw', height: `${heroHeight()}px`, borderRadius: '0px' });
  el.classList.add('is-open');
  setTimeout(done, 820);
  setTimeout(() => el.remove(), 4000); // safety net if the page never claims it
}

function Projects() {
  const chapterRefs = React.useRef([]);
  const panelRef = React.useRef(null);
  const [active, setActive] = React.useState(0);
  const [view3d, setView3d] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  const openProject = useOpenProject();
  const chapters = CHAPTERS.map((c) => ({ ...c, project: getProject(c.slug) }));

  // A chapter takes over once its top passes 55% of the viewport height.
  useScrollFrame(() => {
    const line = window.innerHeight * 0.55;
    let ch = 0;
    chapterRefs.current.forEach((el, i) => {
      if (el && el.getBoundingClientRect().top < line) ch = i;
    });
    setActive(ch);
  });

  const model = projectModel(chapters[active].project);
  const canView3d = !!model;
  const show3d = canView3d && view3d;

  const readMore = (i) => (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let new-tab clicks through
    e.preventDefault();
    if (leaving) return;
    const { project } = chapters[i];
    // On phones the photo sits inside the chapter instead of the pinned panel.
    const from = window.matchMedia(MOBILE_QUERY).matches
      ? chapterRefs.current[i].querySelector('.g-chapter-img')
      : panelRef.current;
    setLeaving(true);
    expandInto(from, project.cover, () => openProject(project.slug, { transition: false }));
  };

  return (
    <section className={`g-projects ${leaving ? 'is-leaving' : ''}`}>
      <Rv className="g-sec-head">
        <span className="g-eyebrow">Projects</span>
        <h2 className="g-h2">Things I've <em>built.</em></h2>
        <span className="g-hand-note g-projects-note">(and broken)</span>
      </Rv>

      <div className="g-story">
        <div ref={panelRef} className="g-story-panel">
          {chapters.map((c, i) => (
            <img key={c.slug} src={c.project.cover} alt={c.project.coverAlt} loading="lazy"
              className={`${i === active ? 'is-on' : ''} ${c.project.coverFit === 'contain' ? 'is-drawing' : ''}`} />
          ))}
          {show3d && (
            <React.Suspense fallback={null}>
              <ModelViewer key={chapters[active].slug} {...model} />
            </React.Suspense>
          )}
          {canView3d && (
            <button type="button" className="g-3d-toggle" onClick={() => setView3d((v) => !v)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinejoin="round">
                <path d="M12 2l9 5v10l-9 5-9-5V7z" />
                <path d="M12 22V12M21 7l-9 5-9-5" />
              </svg>
              <span>{view3d ? 'Show photo' : 'View in 3D'}</span>
            </button>
          )}
          {!show3d && (
            <div className="g-story-dots" aria-hidden="true">
              {chapters.map((c, i) => <span key={c.slug} className={i === active ? 'is-on' : ''} />)}
            </div>
          )}
        </div>

        <div id="projects" className="g-chapters">
          {chapters.map((c, i) => (
            <article key={c.slug} ref={(el) => { chapterRefs.current[i] = el; }} className="g-chapter">
              <img src={c.project.cover} alt={c.project.coverAlt} loading="lazy"
                className={`g-chapter-img ${c.project.coverFit === 'contain' ? 'is-drawing' : ''}`} />
              <span className="g-chapter-eyebrow">{c.eyebrow}</span>
              <h3 className="g-chapter-title">{c.title}</h3>
              <p className="g-chapter-body">{c.body}</p>
              <div className="g-tags">
                {c.tags.map((t) => <span key={t}>{t}</span>)}
              </div>
              <a href={projectPath(c.slug)} onClick={readMore(i)} className="g-glass-pill g-chapter-cta">
                Read the full build <span>→</span>
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Projects;
