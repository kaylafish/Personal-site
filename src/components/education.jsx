import React from 'react';
import { Reveal } from './reveal.jsx';
import Sprite from './sprites.jsx';

function Education() {
  const courses = [
  ];

  return (
    <section className="section" id="education">
      <Reveal>
        <div className="section-head">
          <div className="section-meta">
            <span className="num">03</span>
            <span className="eyebrow">Education</span>
          </div>
          <h2>Where I'm <em>learning</em>.</h2>
          <Sprite kind="star" className="sprite-adorn twinkle" />
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div className="edu-banner">
          <img src="/assets/campus.jpg" alt="WPI campus aerial" loading="lazy" />
          <div className="caption">Worcester Polytechnic Institute · Campus</div>
          <div className="sprite-float"><Sprite kind="ring" /></div>
        </div>
      </Reveal>

      <Reveal delay={150}>
        <div className="edu-card">
          <div>
            <div className="school">
              Worcester Polytechnic <em>Institute</em>
            </div>
            <div className="degree">
              B.S. Aerospace Engineering · Class of 2030
            </div>
            <div className="mono" style={{ marginTop: 16, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-mute)' }}>
            Incoming Fall '26
            </div>
          </div>

          <div className="stats">
            <div className="stat">
              <div className="label">GPA</div>
              <div className="val"><em>---</em> / 4.0</div>
            </div>
            <div className="stat">
              <div className="label">Class of</div>
              <div className="val">2030</div>
            </div>
            <div className="stat">
              <div className="label"></div>
              <div className="val serif"></div>
            </div>
          </div>

          <div className="coursework">
            {courses.map((c, i) => <span key={i} className="chip">{c}</span>)}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export default Education;
