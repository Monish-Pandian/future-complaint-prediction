import React from 'react';
import IntelligenceBackground from '../components/landing/IntelligenceBackground';
import LandingNavbar from '../components/landing/LandingNavbar';
import LandingHero from '../components/landing/LandingHero';

export default function LandingPage() {
  return (
    <div className="landing-page">
      <IntelligenceBackground />
      <LandingNavbar />
      <LandingHero />
    </div>
  );
}
