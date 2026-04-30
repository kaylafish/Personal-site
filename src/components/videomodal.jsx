import React from 'react';

// Full-screen lightbox for Cloudflare Stream videos.
// Usage: <VideoModal videoId="abc123" title="Season Highlights" onClose={fn} />
// Close on Escape key or clicking the backdrop.
export default function VideoModal({ videoId, title, onClose }) {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="vmodal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Video'}
    >
      <div className="vmodal-content" onClick={(e) => e.stopPropagation()}>
        <button
          className="vmodal-close"
          onClick={onClose}
          aria-label="Close video"
          type="button"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <div className="vmodal-embed">
          <iframe
            src={`https://iframe.videodelivery.net/${videoId}?autoplay=true&muted=false`}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen
            title={title || 'Highlight video'}
          />
        </div>

        {title && <div className="vmodal-title">{title}</div>}
      </div>
    </div>
  );
}
