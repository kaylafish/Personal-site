import React from 'react';
import { Reveal } from './reveal.jsx';
import Sprite from './sprites.jsx';

const EXPERIENCE = [
  {
    year: 'Summer 2026',
    role: <>Research Intern</>,
    org: 'Naval Postgraduate School',
    desc: 'Incoming @ NPS',
    tag: 'Research',
  },
  {
    year: '2022 — 2026',
    role: <>FIRST Robotics Team <em>President</em></>,
    org: 'FRC 4255, The Robodores',
    desc: "As President and Team Lead, I rebuilt a program on the verge of collapse — founding a 501(c)(3) nonprofit, securing a landmark Apple partnership, and growing the team from the ground up after losing its founding mentor. On the technical side, I self-taught controls and computer vision to fill a mentorship gap, shipping an AprilTag library still in production use today.",
    tag: 'Leadership',
  },
];

function Experience() {
  return (
    <section className="section" id="experience">
      <Reveal>
        <div className="section-head">
          <div className="section-meta">
            <span className="num">01</span>
            <span className="eyebrow">Experience</span>
          </div>
          <h2>Experiences</h2>
          <Sprite kind="rocket" className="sprite-adorn drift" />
        </div>
      </Reveal>

      <div className="xp-list">
        {EXPERIENCE.map((x, i) => (
          <Reveal key={i} delay={i * 80}>
            <div className="xp-row">
              <div className="yr">{x.year}</div>
              <div>
                <div className="role">{x.role}</div>
                <div className="mono" style={{ marginTop: 6, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>
                  {x.org}
                </div>
              </div>
              <div className="desc">{x.desc}</div>
              <div className="tag">{x.tag}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export default Experience;
