import React from 'react';
import { Link } from 'react-router-dom';
import LandingLogo from './LandingLogo';

export default function LandingNavbar() {
  return (
    <nav className="landing-navbar" aria-label="Main Navigation">
      <LandingLogo />
      <div className="landing-navbar-actions">
        <Link to="/login" className="landing-button landing-button-primary">
          LOGIN
        </Link>
      </div>
    </nav>
  );
}
