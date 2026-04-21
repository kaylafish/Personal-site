import React from 'react';
import { Reveal } from './reveal.jsx';

//{ num: '01', year: '2026', title: <>Attitude <em>Control Sim</em> for a CubeSat</>, desc: 'Six-DOF simulator for a 1U CubeSat — quaternion attitude propagation, reaction wheel control, magnetorquer detumbling.', tech: ['Python', 'NumPy', 'Control'], category: 'Aerospace' },
const ALL_PROJECTS = [
];

function AllProjects({ onBack }) {
  const [filter, setFilter] = React.useState('All');
  const cats = ['All', 'Aerospace', 'Software', 'Research'];
  const shown = filter === 'All' ? ALL_PROJECTS : ALL_PROJECTS.filter(p => p.category === filter);

  return (
    <div className="page" data-screen-label="All Projects">
      <header className="archive-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 24 }}>Archive · 2023 — 2026</div>
          <h1><Reveal>All</Reveal> <Reveal delay={100}><em>projects</em>.</Reveal></h1>
        </div>
        <div className="meta">
          <span className="big">{ALL_PROJECTS.length}</span>
          entries · indexed<br/>
          last updated 2026 · 04<br/>
          sorted ↓ by year
        </div>
      </header>

      <div className="archive-filter">
        <span className="filter-label">Filter ·</span>
        {cats.map(c => (
          <button key={c} className={`chip ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="archive-body">
        <div className="project-table">
          {shown.map((p, i) => (
            <Reveal key={p.num} delay={i * 40}>
              <div className="row">
                <div className="num">{p.num}</div>
                <div className="title">{p.title}</div>
                <div className="desc">{p.desc}</div>
                <div className="tech">{p.tech.map((t, j) => <span key={j}>{t}</span>)}</div>
                <div className="yr">{p.year}</div>
              </div>
            </Reveal>
          ))}
        </div>

        <button className="view-all" onClick={onBack}>
          <span className="arr">←</span> Back to home
        </button>
      </div>
    </div>
  );
}

export default AllProjects;
export { ALL_PROJECTS };
