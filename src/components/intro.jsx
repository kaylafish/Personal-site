import React from 'react';
import { clamp, useScrollFrame } from './motion.jsx';

const INTRO = "I'm Mikayla, I study Aerospace Engineering at Worcester Polytechnic Institute, where I focus on the intersection of GNC and EDL. While I retain deep theoretical expertise in the field, I also maintain lots of practical experience, including in CAD, manufacturing, and programming.";
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
