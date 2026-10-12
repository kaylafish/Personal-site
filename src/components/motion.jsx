import React from 'react';

// Shared scroll / viewport helpers for the home page.

export const clamp = (v) => Math.max(0, Math.min(1, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const MOBILE_QUERY = '(max-width: 799px)';

// In-page links scroll with a 70px offset so sections clear the glass navbar.
export function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = id === 'top' ? 0 : el.getBoundingClientRect().top + window.scrollY - 70;
  window.scrollTo({ top, behavior: 'smooth' });
}
export const go = (id) => (e) => {
  if (e) e.preventDefault();
  scrollToId(id);
};

// Runs fn once per animation frame while the page scrolls, on mount, and
// whenever deps change. fn should write to the DOM directly or bail out of
// setState when nothing changed.
export function useScrollFrame(fn, deps = []) {
  const ref = React.useRef(fn);
  ref.current = fn;
  React.useLayoutEffect(() => {
    let raf = 0;
    const run = () => { raf = 0; ref.current(); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(run); };
    window.addEventListener('scroll', onScroll, { passive: true });
    run();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, deps);
}

// A hidden tab or pane can report a 0×0 viewport; fall back to something sane
// so the glass geometry never goes negative.
const readViewport = () => ({
  vw: document.documentElement.clientWidth || 1280,
  vh: window.innerHeight || 800,
  mob: window.matchMedia(MOBILE_QUERY).matches,
});

export function useViewport() {
  const [vp, setVp] = React.useState(readViewport);
  React.useEffect(() => {
    let t;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const onResize = () => {
      clearTimeout(t);
      t = setTimeout(() => setVp((prev) => {
        const next = readViewport();
        // Phone browsers resize the viewport as the URL bar hides; don't
        // re-lay out the glass for that.
        if (coarse && next.vw === prev.vw && Math.abs(next.vh - prev.vh) < 150) return prev;
        if (next.vw === prev.vw && next.vh === prev.vh && next.mob === prev.mob) return prev;
        return next;
      }), 120);
    };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); clearTimeout(t); };
  }, []);
  return vp;
}

// Scroll-reveal: anything below the fold starts hidden and rises in once
// 12% of it is visible. Content already on screen is left alone.
export function Rv({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = React.useRef(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.95) return;
    el.classList.add('g-rv');
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      el.style.transitionDelay = `${delay}ms`;
      el.classList.add('is-in');
      io.disconnect();
    }), { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);
  return <Tag ref={ref} className={className} {...rest}>{children}</Tag>;
}

// The glass pages are always dark, whatever theme the field hockey pages are
// in. index.html sets the same class before first paint.
export function useGlassTheme() {
  React.useLayoutEffect(() => {
    document.documentElement.classList.add('glass-home');
    return () => document.documentElement.classList.remove('glass-home');
  }, []);
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
