import React from 'react';
import { SKILL_GROUPS } from '../data/projects.js';

// Skills shelf: one glass panel over a darkened photo, a row per category.
// The pills slide in once, the first time the panel scrolls into view.
function Toolkit() {
  const ref = React.useRef(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    if (!('IntersectionObserver' in window)) { setShown(true); return undefined; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((en) => en.isIntersecting)) { setShown(true); io.disconnect(); }
    }, { threshold: 0.25 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, []);

  let n = 0; // running index across rows, for the stagger
  return (
    <section id="toolkit" className={`g-toolkit ${shown ? 'is-in' : ''}`}>
      <img src="/assets/rebuilt.webp" alt="" loading="lazy" className="g-toolkit-bg" />
      <div className="g-toolkit-fade" />
      <div ref={ref} className="g-shelf">
        <div className="g-shelf-head">
          <h2>What I work <em>with.</em></h2>
          <span className="g-hand-note">always learning more</span>
        </div>
        {SKILL_GROUPS.map((group) => (
          <div key={group.name} className="g-shelf-row">
            <span className="g-shelf-label">
              <i style={{ background: group.color }} />
              {group.name}
            </span>
            <div className="g-shelf-pills">
              {group.skills.map((skill) => (
                <span key={skill} style={{ transitionDelay: `${n++ * 45}ms` }}>{skill}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Toolkit;
