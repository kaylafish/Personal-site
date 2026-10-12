import React from 'react';

// When a page's 3D model can't be shown (WebGL off or blocked, the model or
// the viewer's code failed to download), the page shows the project's cover
// photo in its place instead of an empty stage or a stuck loading line.

// Catches a viewer whose code failed to load (offline, a stale deploy) and
// reports it, so the page can swap in the photo.
export class SkipOnError extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) {
    console.warn('3D viewer failed', err); // eslint-disable-line no-console
    this.props.onError?.();
  }
  render() { return this.state.failed ? null : this.props.children; }
}


export function ModelFallback({ src, alt, className = '' }) {
  return (
    <div className={`g-model-fallback ${className}`}>
      <img src={src} alt={alt} />
      <span>3D view unavailable on this device</span>
    </div>
  );
}
