import React from 'react';

// Full-screen lightbox supporting Cloudflare Stream and YouTube.
// Supply exactly one of videoId (Cloudflare) or youtubeId (YouTube).
// Close on Escape key or clicking the backdrop.
export default function VideoModal({ videoId, youtubeId, title, onClose }) {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const iframeSrc = youtubeId
    ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`
    : `https://iframe.videodelivery.net/${videoId}?autoplay=true&muted=false`;

  const iframeAllow = youtubeId
    ? 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
    : 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;';

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
            src={iframeSrc}
            allow={iframeAllow}
            allowFullScreen
            title={title || 'Video'}
          />
        </div>

        {title && <div className="vmodal-title">{title}</div>}
      </div>
    </div>
  );
}
