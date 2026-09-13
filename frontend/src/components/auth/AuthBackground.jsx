import React from 'react';
import { Link } from 'react-router-dom';

export default function AuthBackground() {
  const nodes = [
    { top: '25%', left: '20%' },
    { top: '35%', left: '75%' },
    { top: '65%', left: '15%' },
    { top: '75%', left: '70%' },
    { top: '80%', left: '40%' },
  ];

  return (
    <div className="auth-intelligence" aria-hidden="true">
      {/* Subtle Constellation Geometric Lines */}
      <svg className="intelligence-lines" width="100%" height="100%">
        <line x1="20%" y1="25%" x2="75%" y2="35%" stroke="currentColor" strokeWidth="1" strokeDasharray="3 6" opacity="0.15" />
        <line x1="75%" y1="35%" x2="70%" y2="75%" stroke="currentColor" strokeWidth="1" strokeDasharray="3 6" opacity="0.15" />
        <line x1="70%" y1="75%" x2="40%" y2="80%" stroke="currentColor" strokeWidth="1" strokeDasharray="3 6" opacity="0.15" />
        <line x1="40%" y1="80%" x2="15%" y2="65%" stroke="currentColor" strokeWidth="1" strokeDasharray="3 6" opacity="0.15" />
        <line x1="15%" y1="65%" x2="20%" y2="25%" stroke="currentColor" strokeWidth="1" strokeDasharray="3 6" opacity="0.15" />
      </svg>

      {/* Nodes */}
      {nodes.map((node, i) => (
        <div
          key={i}
          className="intelligence-node"
          style={{ top: node.top, left: node.left }}
        />
      ))}

      {/* Brand Hero Content */}
      <div className="auth-intelligence-content">
        <Link to="/" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '24px' }}>
          <div className="auth-brand-badge">
            <span className="auth-brand-dot" aria-hidden="true" />
            <span>CIVIC INTELLIGENCE PLATFORM</span>
          </div>
        </Link>

        <h1 className="auth-hero-title">
          PREDICT.
          <br />
          VERIFY.
          <br />
          <span>LEARN.</span>
        </h1>

        <p className="auth-hero-description">
          An AI-driven civic intelligence platform for predicting emerging problems,
          coordinating field verification, and learning from real-world outcomes.
        </p>
      </div>
    </div>
  );
}
