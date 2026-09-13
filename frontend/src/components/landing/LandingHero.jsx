import React from 'react';
import AuthButtons from './AuthButtons';

export default function LandingHero() {
  return (
    <section className="landing-hero" aria-label="Urban Intelligence Hero">
      <div className="landing-hero-content">
        <div className="landing-label">
          URBAN INTELLIGENCE PLATFORM
        </div>
        <h1 className="landing-title">
          PREDICT.
          <br />
          VERIFY.
          <br />
          <span>LEARN.</span>
        </h1>
        <p className="landing-description">
          An AI-driven civic intelligence platform for predicting emerging problems,
          coordinating field verification, and learning from real-world outcomes.
        </p>
        <AuthButtons />
      </div>
    </section>
  );
}
