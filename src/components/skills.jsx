import React from 'react';
import { Reveal } from './reveal.jsx';
import Sprite from './sprites.jsx';

function Skills() {
  const cols = [
    {
      title: 'Languages',
      items: [
        ['Python', 'Fluent'],
        ['MATLAB', 'Working'],
        ['C / C++', 'Fluent'],
        ['Java', 'Fluent'],
        ['LaTeX', 'Fluent'],
      ],
    },
    {
      title: 'Tools',
      items: [
        ['Simulink', 'Working'],
        ['SolidWorks & Onshape', 'Fluent'],
        ['OpenRocket', 'Fluent'],
        ['Git / GitHub', 'Fluent'],
        ['Linux', 'Working'],
      ],
    }
  ];

  return (
    <section className="section" id="skills">
      <Reveal>
        <div className="section-head">
          <div className="section-meta">
            <span className="num">04</span>
            <span className="eyebrow">Tooling</span>
          </div>
          <h2>Skills &amp; <em>instruments</em>.</h2>
          <Sprite kind="asterisk" className="sprite-adorn twinkle" />
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="skills">
          {cols.map((col, i) => (
            <div key={i} className="skill-col">
              <h3>{col.title}</h3>
              <ul>
                {col.items.map(([name, lvl], j) => (
                  <li key={j}>
                    <span>{name}</span>
                    <span className="lvl">— {lvl}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export default Skills;
