import React from 'react';
import { Link } from 'react-router-dom';

export default function AuthButtons({ className = 'landing-actions' }) {
  return (
    <div className={className}>
      <Link to="/login" className="landing-button landing-button-primary">
        LOGIN
      </Link>
    </div>
  );
}
