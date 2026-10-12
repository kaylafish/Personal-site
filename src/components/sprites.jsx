import React from 'react';

// Small decorative SVG sprites that sprinkle around the site.
// Each sprite is absolutely-positioned; colors follow currentColor so they
// adopt whatever --ink or --accent wrapper they sit inside.

function Sprite({ kind, className = '', style = {} }) {
  const S = SPRITES[kind];
  if (!S) return null;
  return (
    <span className={`sprite sprite-${kind} ${className}`} style={style} aria-hidden="true">
      {S}
    </span>
  );
}

const SPRITES = {
  stick: (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M38 6 L18 30 C14 34, 14 40, 20 42 L26 42" />
      <circle cx="30" cy="42" r="3" fill="currentColor" stroke="none"/>
    </svg>
  ),
  dashedline: (
    <svg viewBox="0 0 100 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 4">
      <path d="M2 10 C20 0, 50 20, 98 10"/>
    </svg>
  ),
  dot: (
    <svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="currentColor"/></svg>
  ),
};

export default Sprite;
