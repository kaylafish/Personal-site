import React from 'react';
import { PageLink } from './pagelink.jsx';
import { EMAIL, GITHUB_URL, LINKEDIN_URL } from '../site.js';
import { Rv } from './motion.jsx';
import Signature from './signature.jsx';

function Contact() {
  return (
    <section id="contact" className="g-contact">
      <Rv>
        <span className="g-eyebrow">Get in touch</span>
        <h2 className="g-contact-big">
          <span className="g-contact-hello">Say hello.</span>
          <br />
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
        </h2>
      </Rv>

      <Rv>
        <Signature />
      </Rv>

      <Rv delay={120} className="g-contact-grid">
        <div>
          <div className="g-contact-label">Email</div>
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
        </div>
        <div>
          <div className="g-contact-label">Location</div>
          <span>Worcester, MA</span>
        </div>
        <div>
          <div className="g-contact-label">GitHub</div>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer">@kaylafish</a>
        </div>
        <div>
          <div className="g-contact-label">LinkedIn</div>
          <a href={LINKEDIN_URL} target="_blank" rel="noreferrer">/in/kaylafish</a>
        </div>
      </Rv>

      <footer className="g-footer">
        <span>© 2026 Mikayla Fisher</span>
        <PageLink to="/fieldhockey">Field hockey →</PageLink>
      </footer>
    </section>
  );
}

export default Contact;
