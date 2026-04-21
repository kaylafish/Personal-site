import React from 'react';

// Scroll-reveal helpers
function Reveal({ children, delay = 0, className = '' }) {
  const ref = React.useRef(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setTimeout(() => setShown(true), delay);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`reveal ${shown ? 'in' : ''} ${className}`}>
      {children}
    </div>
  );
}

function RevealWords({ text, delay = 0, className = '' }) {
  const ref = React.useRef(null);
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          setTimeout(() => setShown(true), delay);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  const words = text.split(' ');
  return (
    <span ref={ref} className={className}>
      {words.map((w, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            opacity: shown ? 1 : 0,
            transform: shown ? 'translateY(0)' : 'translateY(40%)',
            transition: `opacity 0.7s ${i * 50}ms cubic-bezier(0.2,0.8,0.2,1), transform 0.7s ${i * 50}ms cubic-bezier(0.2,0.8,0.2,1)`,
            marginRight: '0.25em',
          }}
        >
          {w}
        </span>
      ))}
    </span>
  );
}

export default Reveal;
export { Reveal, RevealWords };
