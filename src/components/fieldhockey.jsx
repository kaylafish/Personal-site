import React from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Reveal } from './reveal.jsx';
import Sprite from './sprites.jsx';
import VideoEmbed from './videoembed.jsx';
import VideoModal from './videomodal.jsx';

// ============================================================================
// FEATURED FIELD-HOCKEY VIDEOS — EDIT THIS WHEN YOU UPLOAD NEW FILM
// ----------------------------------------------------------------------------
// Each entry uses ONE of:
//   videoId   — Cloudflare Stream UID  (from Cloudflare dashboard → Stream)
//   youtubeId — YouTube video ID       (the part after ?v= in the YouTube URL)
//
// The first entry with featured:true renders larger than the rest.
// Leave both blank ('') to render a placeholder card.
// ============================================================================
const VIDEOS = [
  { youtubeId: 'M2QuJuKaG_o', title: 'Recruiting highlight Reel', meta: '2025 · 3:42', featured: true, note: 'FULL REEL' }
];

function FieldHockey({ onViewAll }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // ?v= → Cloudflare Stream UID, ?yt= → YouTube video ID
  const activeVideoId   = searchParams.get('v');
  const activeYoutubeId = searchParams.get('yt');
  const activeVideo = activeVideoId
    ? VIDEOS.find(v => v.videoId === activeVideoId)
    : activeYoutubeId
    ? VIDEOS.find(v => v.youtubeId === activeYoutubeId)
    : null;

  const openVideo = ({ videoId, youtubeId }) => {
    if (youtubeId) navigate(`${pathname}?yt=${youtubeId}`);
    else navigate(`${pathname}?v=${videoId}`);
  };
  const closeVideo = () => navigate(pathname, { replace: true });

  return (
    <>
      {activeVideo && (
        <VideoModal
          videoId={activeVideo.videoId}
          youtubeId={activeVideo.youtubeId}
          title={activeVideo.title}
          onClose={closeVideo}
        />
      )}
    <div className="page fh">
      <section className="fh-hero" id="fh-top">
        <div>
          <div className="eyebrow" style={{ marginBottom: 16 }}>
            <Sprite kind="dot" /> Athletics · Midfielder · #29, #99
          </div>
          <h1 className="jersey">
            <Reveal><span style={{ display: 'block' }}>Field</span></Reveal>
            <Reveal delay={150}><span style={{ display: 'block' }}><em>Hockey</em></span></Reveal>
          </h1>
          <div className="sprite-strip">
            <Sprite kind="stick" className="fhaccent" />
            <span>varsity · club</span>
            <Sprite kind="dashedline" style={{ width: 80, height: 14 }} />
          </div>
        </div>
        <div className="action-shot">
          <img src="/assets/action.webp" alt="" loading="lazy" />
        </div>
      </section>

      <section className="fh-stats">
        {[
          ['Position', <><em>Forward/Midfield</em></>],
          ['Class of', '2026'],
          ['Varsity seasons', <><em>2</em></>]
        ].map(([k, v], i) => (
          <Reveal key={i} delay={i * 80}>
            <div className="stat">
              <div className="label">{k}</div>
              <div className="val">{v}</div>
            </div>
          </Reveal>
        ))}
      </section>

      <section className="fh-section" id="fh-films">
        <Reveal>
          <h2>Highlight <em>films</em>.</h2>
        </Reveal>
        <Reveal delay={100}>
          <div className="fh-videos">
            {VIDEOS.map((v, i) => (
              <div key={i} className={`fh-video ${v.featured ? 'featured' : ''}`}>
                <VideoEmbed
                  videoId={v.videoId}
                  title={v.title}
                  onPlay={v.videoId ? openVideo : undefined}
                />
                <div className="meta">
                  <div>
                    <div className="title">{v.title}</div>
                    <div style={{ marginTop: 4, opacity: 0.85 }}>{v.meta}</div>
                  </div>
                  <div>{v.note}</div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={220}>
          <button className="view-all" onClick={onViewAll} style={{ marginTop: 40 }}>
            View full film archive <span className="arr">→</span>
          </button>
        </Reveal>
      </section>

      <section className="fh-section" id="fh-about">
        <Reveal>
          <h2>About the <em>player</em>.</h2>
        </Reveal>

        <div className="fh-about">
          <Reveal delay={100}>
            <div className="portrait has-img">
              <img src="/assets/fh.webp" alt="Action shot" loading="lazy" />
              <div className="second">
                <img src="/assets/aerial.webp" alt="aerial" loading="lazy" />
              </div>
            </div>
          </Reveal>

          <Reveal delay={180}>
            <div className="text">
              <p>
                I started playing field hockey in 2016 in <em>Vienna, Austria</em> with
                SV Arminen after my homeroom teacher introduced me to the sport. I feel 
                in love with the sport, and it soon became a lifelong passion.
              </p>
              <p>
                After moving from Austria to the U.S. during COVID, I took a break from the sport.
                Upon entering high school, I became involved with my school's team. For my freshman
                and sophomore year, my role was primarily as team manager and assistant coach, 
                helping out my coach with various game and team-bonding logistics.
                I also was responsible for onboarding and training the basics of the sport in new 
                players, and assisted in training the varsity team. 
              </p>
              <p>
                I hope to continue my love for the game at the next level.
              </p>

              <div className="fh-accolades">
                <div className="fh-accolades-label">Accolades & Awards</div>
                <ul>
                  <li><span className="yr">2025</span> — PCAL All-League 1st Team</li>
                  <li><span className="yr">2024</span> — PCAL All-League 2nd Team</li>
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>


      <section className="fh-section" id="fh-recruiting">
        <Reveal>
          <h2>For <em>coaches</em>.</h2>
        </Reveal>

        <Reveal delay={100}>
          <div className="fh-recruiting">
            <div className="block">
              <h3>Recruiting snapshot</h3>
              <dl>
                <div className="row"><dt>Class of</dt><dd>2026</dd></div>
                <div className="row"><dt>Position</dt><dd>Midfielder</dd></div>
                <div className="row"><dt>Height</dt><dd>5' 8"</dd></div>
                <div className="row"><dt>GPA (unweighted)</dt><dd>3.8</dd></div>
                <div className="row"><dt>Intended major</dt><dd>Aerospace Engineering</dd></div>
                <div className="row"><dt>Club</dt><dd>San Jose Fly</dd></div>
                <div className="row"><dt>High school</dt><dd>Monterey High School</dd></div>
              </dl>
            </div>

            <div className="block">
              <h3>Contact &amp; materials</h3>
              <dl>
                <div className="row"><dt>Email</dt><dd>mikayla@mikayla.space</dd></div>
                <div className="row"><dt>Phone</dt><dd>available on request</dd></div>
                <div className="row"><dt>Parents / guardian</dt><dd>available on request</dd></div>
                <div className="row"><dt>Club coach</dt><dd>available on request</dd></div>
              </dl>

            {/*
              <div className="cta-row">
                <a href="#" onClick={(e) => e.preventDefault()} className="btn">Download packet</a>
                <a href="#" onClick={(e) => e.preventDefault()} className="btn secondary">Request film</a>
              </div>*/}
            </div>
          </div>
        </Reveal>
      </section>
    </div>
    </>
  );
}

export default FieldHockey;
