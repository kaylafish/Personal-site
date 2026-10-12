import React from 'react';

// Replays the recorded signature in /assets/signature.json: one array of
// {x, y, t} points per stroke, in the file's own w × h space, t in ms.
// Plays once when 60% visible and again on hover. If the file is missing,
// falls back to a handwritten "— Mikayla".

const SPEED = 2; // × real time

function Signature() {
  const canvasRef = React.useRef(null);
  const [sig, setSig] = React.useState(null);

  React.useEffect(() => {
    let live = true;
    fetch('/assets/signature.json')
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d) => { if (live && d && d.strokes && d.strokes.length) setSig(d); });
    return () => { live = false; };
  }, []);

  React.useEffect(() => {
    const c = canvasRef.current;
    if (!c || !sig) return undefined;
    const ctx = c.getContext('2d');
    const sx = c.width / sig.w, sy = c.height / sig.h;
    const pts = sig.strokes.flatMap((st) => st.map((p, pi) => ({ ...p, first: pi === 0 })));
    if (!pts.length) return undefined;
    let raf = 0;

    const play = () => {
      cancelAnimationFrame(raf);
      const t0 = pts[0].t;
      const start = performance.now();
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.strokeStyle = '#eef1f5';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      let i = 0;
      const step = (now) => {
        const elapsed = (now - start) * SPEED;
        while (i < pts.length && pts[i].t - t0 <= elapsed) {
          const p = pts[i];
          if (!p.first) {
            // Quadratic curve through the midpoints keeps the line smooth.
            const q = pts[i - 1], o = pts[i - 2];
            ctx.beginPath();
            if (o && !q.first) {
              ctx.moveTo(((o.x + q.x) / 2) * sx, ((o.y + q.y) / 2) * sy);
              ctx.quadraticCurveTo(q.x * sx, q.y * sy, ((q.x + p.x) / 2) * sx, ((q.y + p.y) / 2) * sy);
            } else {
              ctx.moveTo(q.x * sx, q.y * sy);
              ctx.lineTo(p.x * sx, p.y * sy);
            }
            ctx.stroke();
          }
          i++;
        }
        if (i < pts.length) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { play(); io.disconnect(); }
    }), { threshold: 0.6 });
    io.observe(c);
    c.addEventListener('mouseenter', play);
    return () => {
      io.disconnect();
      c.removeEventListener('mouseenter', play);
      cancelAnimationFrame(raf);
    };
  }, [sig]);

  return (
    <div className="g-sign">
      {sig
        ? <canvas ref={canvasRef} width="1040" height="280" role="img" aria-label="Mikayla's signature" />
        : <span className="g-sign-fallback">— Mikayla</span>}
    </div>
  );
}

export default Signature;
