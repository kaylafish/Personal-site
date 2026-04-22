import React from 'react';
import { Reveal } from './reveal.jsx';
import Sprite from './sprites.jsx';

const PROJECTS = [
  {
    num: '01',
    title: <>FRC 2026 <em>REBUILT</em> Robot</>,
    summary: 'I was responsible for the design, modeling, and manufacturing of this robot. It features a rack and pinion intake, dye-rotor for game piece serialization, and a variable-hood shooter on a turret.',
    tech: ['CAD/CAM', 'Machining', 'FEA', 'Simulation'],
    image: '/assets/rebuilt.webp',
    imageCaption: 'Robot undergoing testing'
  },
  {
    num: '02',
    title: <>Model Rocket - <em>R01</em></>,
    summary: 'My first model rocket design, using a G80 motor. It reached an apogee of 3000 feet. ',
    tech: ['C++', 'Rocket Design'],
    image: '/assets/project.webp',
    imageCaption: 'Rocketry Club fair',
  },
  {
    num: '03',
    title: <>FRC 2023 <em>Charged Up!</em></>,
    summary: 'My first introduction to engineering. As a High School Freshman, I took up the responsibility of programming the entire robot. Through this, I got my foundation in controls, implementing a Finite State Machine, 2-DOF arm feedforward, and PID Control. ',
    tech: ['Python', 'OpenCV', 'YOLO', 'ffmpeg'],
    image: '/assets/quetzy.webp',
    imageCaption: 'MHS Open House',

  },
];

function Projects({ cardStyle, onViewAll }) {
  return (
    <section className="section" id="projects">
      <Reveal>
        <div className="section-head">
          <div className="section-meta">
            <span className="num">02</span>
            <span className="eyebrow">Selected projects</span>
          </div>
          <h2>Things I've <em>built.</em></h2>
          <Sprite kind="satellite" className="sprite-adorn" />
        </div>
      </Reveal>

      <div className="projects" data-style={cardStyle}>
        {PROJECTS.map((p, i) => (
          <Reveal key={i} delay={i * 120}>
            <article className="project">
              <div className="num">{p.num}</div>
              <div>
                <h3 className="title">{p.title}</h3>
                <div className="meta">
                  {p.tech.map((t, j) => <span key={j}>{t}</span>)}
                </div>
              </div>
              <div className="body">
                <p>{p.summary}</p>
                {p.image ? (
                  <div className="placeholder has-img" title={p.imageCaption}>
                    <img src={p.image} alt={p.imageCaption || ''} loading="lazy" />
                  </div>
                ) : (
                  <div className="placeholder">◦ {p.placeholder} ◦</div>
                )}
              </div>
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal delay={200}>
        <button className="view-all" onClick={onViewAll} style={{ marginTop: 48 }}>
          View all projects <span className="arr">→</span>
        </button>
      </Reveal>
    </section>
  );
}

export default Projects;
