import React from 'react';
import { Reveal } from './reveal.jsx';
import Sprite from './sprites.jsx';

function Contact() {
  return (
    <section className="contact" id="contact">
      <div className="contact-sprites" aria-hidden="true">
        <Sprite kind="orbit" className="c1 spin" />
        <Sprite kind="star" className="c2 twinkle" />
      </div>
      <Reveal>
        <div className="eyebrow" style={{ marginBottom: 40 }}>05 · Get in touch</div>
      </Reveal>
      <h2 className="contact-big">
        <Reveal><div>Say <em>hello</em> —</div></Reveal>
        <Reveal delay={150}>
          <div>
            <a href="mailto:mikayla@mikayla.space">mikayla@mikayla.space</a>
          </div>
        </Reveal>
      </h2>

      <Reveal delay={250}>
        <div className="contact-grid">
          <div className="item">
            <div className="label">Email</div>
            <div className="val">mikayla@mikayla.space</div>
          </div>
          <div className="item">
            <div className="label">Location</div>
            <div className="val">Worcester, MA</div>
          </div>
          <div className="item">
            <div className="label">GitHub</div>
            <div className="val">@kaylafish</div>
          </div>
          <div className="item">
            <div className="label">LinkedIn</div>
            <div className="val">/in/mikaylafisher</div>
          </div>
        </div>
      </Reveal>

      <footer>
        <span>© 2026 Mikayla Fisher</span>
        <span>Designed &amp; built from scratch · v1.0</span>
      </footer>
    </section>
  );
}

export default Contact;
