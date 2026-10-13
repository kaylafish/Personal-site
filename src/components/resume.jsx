import React from 'react';
import { ResumeLink } from './glassbar.jsx';
import { Rv, go, useScrollFrame } from './motion.jsx';

// ============================================================================
// RESUME — EDIT THIS WHEN SOMETHING CHANGES
// ----------------------------------------------------------------------------
// Each group becomes a jump chip and a list section; each item gets a row and
// a card in the sticky detail panel. `image` is optional (the panel shows an
// empty well without one). Mark unfinished rows with placeholder:true so they
// render dimmed. Source: the résumé PDF in /public.
// ============================================================================
const RESUME = [
  { id: 'experience', name: 'Experience', items: [
    { when: 'Summer 2026', title: 'Mechanical Engineering Intern', org: 'Johnson & Johnson MedTech · Santa Clara, CA',
      desc: 'Intern on the Haptic Interface Device team, doing R&D on the OTTAVA Surgical System. Built an electromechanical fixture to characterize friction and hysteresis in HID subassemblies, with a low-cost custom data acquisition setup, signal processing, and statistical validation. Also designed 10 manufacturing fixtures to improve repeatability and assembly speed.',
      image: '/assets/jnj.webp'},
    { when: '2026 – present', title: 'GNC Experimental Hardware & Software', org: 'WPI High Powered Rocketry Club · Worcester, MA',
      desc: 'Lead researcher on robust roll control under canard-induced roll reversal. Developing an LQR-based control strategy that uses online extremum seeking to stay robust when reversal occurs, for the team\'s experimental rocket launch.' },
    { when: '2022 – 2026', title: 'President & Director of Engineering', org: 'FRC Team 4255, The Robodores · Monterey, CA',
      desc: 'Took over full leadership after the founding mentor passed, rebuilding the program in one season with no adult oversight. Membership grew from 10 to 30, and I recruited 5+ mentors from zero, including an Apple engineer whose partnership brought $100K in support. Built an in-house pose localization stack from AprilTag detection, extended to a GTSAM factor-graph estimator, and implemented shoot-on-the-move. Sole mechanical designer of the 2025 robot. FIRST Dean\'s List Semi-Finalist (2×).',
      image: '/assets/quetzy.webp', alt: 'FRC 4255 robot at the MHS Open House' },
  ] },
  { id: 'education', name: 'Education', items: [
    { when: '2026 – 2030', title: 'B.S. Aerospace Engineering', org: 'Worcester Polytechnic Institute',
      desc: 'Expected May 2030. Varsity field hockey, High-Powered Rocketry, AIAA, and SWE.' },
    { when: '2022 – 2026', title: 'IB Diploma', org: 'Monterey High School · Ranked 16 of 350',
      desc: '4.6 weighted GPA. IB HL: Math AA, Physics, Chemistry, and English A. Varsity field hockey (captain), FIRST Robotics, Monterey Academy of Oceanographic Science. Summa Cum Laude.' },
  ] },
  { id: 'volunteering', name: 'Volunteering', items: [
    { when: '2024 – present', title: 'Founder, Interim President & Secretary', org: 'Robodores Foundation',
      desc: 'Founded and incorporated a 501(c)(3) nonprofit supporting STEM education in Monterey County. Responsible for board meetings and documentation.' },
  ] },
];

// Flat list with a running index, so rows, images and detail cards line up.
let n = 0;
const GROUPS = RESUME.map((g, gi) => ({
  ...g,
  num: `0${gi + 1}`,
  items: g.items.map((r) => ({ ...r, i: n++, group: g.name, g: gi })),
}));
const ENTRIES = GROUPS.flatMap((g) => g.items);
const pad2 = (v) => String(v).padStart(2, '0');

function Resume() {
  const rowRefs = React.useRef([]);
  const [scrolled, setScrolled] = React.useState(0);
  const [hovered, setHovered] = React.useState(null);

  // Without a hover, the active row is the one nearest 45% of the viewport.
  useScrollFrame(() => {
    const line = window.innerHeight * 0.45;
    let best = Infinity, at = 0;
    rowRefs.current.forEach((el, i) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - line);
      if (d < best) { best = d; at = i; }
    });
    setScrolled(at);
  });

  const active = hovered != null ? hovered : scrolled;
  const activeGroup = ENTRIES[active].g;

  return (
    <section id="work" className="g-resume">
      <Rv className="g-resume-head">
        <h2 className="g-h2">Resume</h2>
        <ResumeLink className="g-resume-pdf">Download PDF ↗</ResumeLink>
      </Rv>

      <Rv className="g-chips">
        {GROUPS.map((g, gi) => (
          <a key={g.id} href={`#${g.id}`} onClick={go(g.id)} className={`g-chip ${gi === activeGroup ? 'is-on' : ''}`}>
            <span>{g.name}</span>
            <span className="g-chip-count">{pad2(g.items.length)}</span>
          </a>
        ))}
      </Rv>

      <div className="g-resume-cols">
        <div className="g-resume-list" onMouseLeave={() => setHovered(null)}>
          {GROUPS.map((g) => (
            <Rv key={g.id} id={g.id} className="g-resume-group">
              <div className="g-resume-group-head">
                <span className="g-resume-group-num">{g.num}</span>
                <h3>{g.name}</h3>
              </div>
              {g.items.map((r) => (
                <div
                  key={r.i}
                  ref={(el) => { rowRefs.current[r.i] = el; }}
                  className={`g-row ${r.i === active ? 'is-on' : ''} ${r.placeholder ? 'is-placeholder' : ''}`}
                  onMouseEnter={() => setHovered(r.i)}
                >
                  <span className="g-row-bar" />
                  <div className="g-row-body">
                    <span className="g-row-when">{r.when}</span>
                    <span className="g-row-title">{r.title}</span>
                    <span className="g-row-org">{r.org}</span>
                    <p className="g-row-desc">{r.desc}</p>
                  </div>
                </div>
              ))}
            </Rv>
          ))}
        </div>

        <div className="g-detail">
          <div className="g-detail-media">
            {ENTRIES.map((r) => (
              <div key={r.i} className={`g-detail-img ${r.i === active ? 'is-on' : ''}`}>
                {r.image && <img src={r.image} alt={r.i === active ? r.alt : ''} loading="lazy" />}
              </div>
            ))}
            <div className="g-detail-count">{`${pad2(active + 1)} / ${pad2(ENTRIES.length)}`}</div>
          </div>
          <div className="g-detail-progress">
            <div style={{ width: `${((active + 1) / ENTRIES.length) * 100}%` }} />
          </div>
          <div className="g-detail-text">
            {ENTRIES.map((r) => (
              <div
                key={r.i}
                className={`g-detail-card ${r.i === active ? 'is-on' : r.i < active ? 'is-before' : 'is-after'}`}
                aria-hidden={r.i !== active}
              >
                <span className="g-detail-meta">{r.group} · {r.when}</span>
                <span className="g-detail-title">{r.title}</span>
                <span className="g-detail-org">{r.org}</span>
                <p>{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Resume;
