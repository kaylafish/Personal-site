import React from 'react';
import { PROJECTS } from '../data/projects.js';
import { MOBILE_QUERY, prefersReducedMotion } from './motion.jsx';
import { openAllProjects } from '../transitions.js';
import ProjectCard from './projectcard.jsx';

// "And so much more": every project as a card floating around a handwritten
// line. Cards bob at different depths and lean away from the cursor.

// Hand-tuned scatter on a 1280 × 780 stage: [x, y, width, rotation°, depth].
// Listed in the order slots fill, so a few cards still frame the centre.
const SLOTS = [
  [40, 60, 240, -5, 0.6], [1010, 96, 230, 4, 0.5], [300, 520, 250, -3, 0.6],
  [780, 490, 240, 2, 1.0], [340, 30, 190, 3, 1.1], [1050, 440, 190, -4, 0.7],
  [770, 40, 210, -2, 0.8], [60, 430, 210, 3, 0.9], [565, 590, 160, 5, 1.2],
];
const STAGE_W = 1280;

function More() {
  const stageRef = React.useRef(null);
  // Most recent first; past nine, the "See all" link covers the rest.
  const shown = PROJECTS.slice(-SLOTS.length).reverse();

  React.useEffect(() => {
    const stage = stageRef.current;
    if (prefersReducedMotion() || window.matchMedia(MOBILE_QUERY).matches) return undefined;
    const cards = [...stage.querySelectorAll('[data-depth]')];
    let raf = 0, last = 0, t = 0, speed = 1;
    let mx = 0, my = 0, sx = 0, sy = 0, hover = false;

    const onMove = (e) => {
      const b = stage.getBoundingClientRect();
      mx = (e.clientX - b.left) / b.width - 0.5;
      my = (e.clientY - b.top) / b.height - 0.5;
      hover = true;
    };
    const onLeave = () => { mx = 0; my = 0; hover = false; };
    stage.addEventListener('mousemove', onMove);
    stage.addEventListener('mouseleave', onLeave);

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(50, now - (last || now));
      last = now;
      // While cards fly back in from /projects (transitions.js) the field
      // holds still, so they land where the real cards are.
      if (!document.documentElement.classList.contains('pt-hold')) {
        speed += ((hover ? 0.15 : 1) - speed) * 0.06; // hovering slows the drift
        t += (dt * speed) / 1000;
        sx += (mx - sx) * 0.06;
        sy += (my - sy) * 0.06;
      }
      cards.forEach((c, i) => {
        const z = +c.dataset.depth, ph = i * 1.3;
        const x = -sx * z * 60;
        const y = Math.sin(t * 0.7 + ph) * 10 * z - sy * z * 50;
        const r = +c.dataset.rot + Math.sin(t * 0.5 + ph) * 1.2;
        c.style.transform = `translate3d(${x}px,${y}px,0) rotate(${r}deg)`;
      });
      stage.dataset.live = '';
    };
    // Only animate while the field is on screen.
    const io = new IntersectionObserver(([en]) => {
      cancelAnimationFrame(raf);
      last = 0;
      if (en.isIntersecting) raf = requestAnimationFrame(tick);
    });
    io.observe(stage);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      stage.removeEventListener('mousemove', onMove);
      stage.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <section id="more" className="g-more">
      <div ref={stageRef} className="g-field">
        <div className="g-field-centre">
          <span className="g-field-line">and so much more.</span>
          <a
            href="/projects"
            className="g-glass-pill"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // new-tab clicks
              e.preventDefault();
              openAllProjects(); // every card flies into its tile
            }}
          >
            See all {PROJECTS.length} projects <span>→</span>
          </a>
        </div>
        {shown.map((p, i) => {
          const [x, y, w, rot, depth] = SLOTS[i];
          return (
            <div
              key={p.slug}
              className="g-field-slot"
              style={{ '--x': `${(x / STAGE_W) * 100}%`, '--y': `${y}px`, '--w': `${(w / STAGE_W) * 100}%` }}
            >
              <div data-depth={depth} data-rot={rot} style={{ transform: `rotate(${rot}deg)` }}>
                <ProjectCard project={p} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default More;
