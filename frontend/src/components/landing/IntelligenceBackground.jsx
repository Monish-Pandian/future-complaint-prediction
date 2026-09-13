import React from 'react';

export default function IntelligenceBackground() {
  const nodes = [
    { top: '22%', left: '18%', delay: '0s' },
    { top: '30%', left: '80%', delay: '1.2s' },
    { top: '68%', left: '14%', delay: '0.6s' },
    { top: '74%', left: '84%', delay: '1.8s' },
    { top: '78%', left: '48%', delay: '2.4s' },
    { top: '16%', left: '60%', delay: '0.9s' },
    { top: '48%', left: '88%', delay: '1.5s' },
    { top: '52%', left: '10%', delay: '2.1s' }
  ];

  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* City technical grid */}
      <div className="landing-grid" />

      {/* Geospatial topographic isolines */}
      <div className="landing-topography" />

      {/* Constellation connection lines */}
      <svg className="intelligence-lines" width="100%" height="100%">
        <line x1="18%" y1="22%" x2="60%" y2="16%" stroke="rgba(77, 214, 199, 0.12)" strokeWidth="1" strokeDasharray="4 6" />
        <line x1="60%" y1="16%" x2="80%" y2="30%" stroke="rgba(77, 214, 199, 0.12)" strokeWidth="1" strokeDasharray="4 6" />
        <line x1="80%" y1="30%" x2="88%" y2="48%" stroke="rgba(77, 214, 199, 0.12)" strokeWidth="1" strokeDasharray="4 6" />
        <line x1="88%" y1="48%" x2="84%" y2="74%" stroke="rgba(77, 214, 199, 0.12)" strokeWidth="1" strokeDasharray="4 6" />
        <line x1="84%" y1="74%" x2="48%" y2="78%" stroke="rgba(77, 214, 199, 0.12)" strokeWidth="1" strokeDasharray="4 6" />
        <line x1="48%" y1="78%" x2="14%" y2="68%" stroke="rgba(77, 214, 199, 0.12)" strokeWidth="1" strokeDasharray="4 6" />
        <line x1="14%" y1="68%" x2="10%" y2="52%" stroke="rgba(77, 214, 199, 0.12)" strokeWidth="1" strokeDasharray="4 6" />
        <line x1="10%" y1="52%" x2="18%" y2="22%" stroke="rgba(77, 214, 199, 0.12)" strokeWidth="1" strokeDasharray="4 6" />
      </svg>

      {/* Intelligence nodes */}
      {nodes.map((node, index) => (
        <div
          key={index}
          className="intelligence-node"
          style={{
            top: node.top,
            left: node.left,
            animationDelay: node.delay
          }}
        />
      ))}
    </div>
  );
}
