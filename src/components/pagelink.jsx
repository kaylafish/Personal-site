import React from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { prefersReducedMotion } from './motion.jsx';

// Page changes crossfade using the browser's View Transitions API. Browsers
// without it (Firefox, for now) and visitors who prefer reduced motion get
// the plain instant change. The animation itself is styled in home.css.

// Drop-in for useNavigate().
export function usePageNavigate() {
  const navigate = useNavigate();
  return React.useCallback((to, options) => {
    if (!document.startViewTransition || prefersReducedMotion()) { navigate(to, options); return; }
    // flushSync so the new page is in the DOM before the browser snapshots it.
    const transition = document.startViewTransition(() => flushSync(() => navigate(to, options)));
    // The browser skips the animation when it can't run it (a hidden tab, say).
    // The page has still changed, so that isn't an error worth reporting.
    transition.ready.catch(() => {});
    transition.finished.catch(() => {});
  }, [navigate]);
}

// Drop-in for <Link>.
export function PageLink({ to, onClick, children, ...rest }) {
  const go = usePageNavigate();
  return (
    <a
      href={to}
      onClick={(e) => {
        if (onClick) onClick(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // new-tab clicks
        e.preventDefault();
        go(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
