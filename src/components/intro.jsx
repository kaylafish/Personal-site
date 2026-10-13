import React from 'react';
import { clamp, useScrollFrame } from './motion.jsx';

const INTRO = "Aspiring Aerospace engineer focused on the intersection of GNC (Guidance, Navigation, and Control), and EDL (Entry, Descent, and Landing). I'm drawn to developing autonomous systems that cannot rely on human input for complex tasks and decision making. I enjoy thinking at the system level, using my experience across hardware and software to make design decisions that complement the system as a whole.";
const WORDS = INTRO.split(' ');

// Handwritten paragraph whose words light up as it scrolls through the viewport.
function Intro() {
  const textRef = React.useRef(null);
  const [lit, setLit] = React.useState(0);

  useScrollFrame(() => {
    const vh = window.innerHeight;
    const r = textRef.current.getBoundingClientRect();
    setLit(Math.round(clamp((vh * 0.85 - r.top) / (r.height + vh * 0.25)) * WORDS.length * 1.1));
  });

  return (
    <section id="intro" className="g-intro">
      <div className="g-hand-note g-intro-hi">hi there,</div>
      <p ref={textRef} className="g-intro-text">
        {WORDS.map((w, i) => (
          <span key={i} className={i < lit ? 'is-lit' : ''}>{w}</span>
        ))}
      </p>
    </section>
  );
}

export default Intro;
