import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingLogo() {
  return (
    <Link to="/" className="landing-logo" aria-label="Civic Intelligence Home">
      <div className="landing-logo-mark" aria-hidden="true" />
      <span>CIVIC INTELLIGENCE</span>
    </Link>
  );
}
