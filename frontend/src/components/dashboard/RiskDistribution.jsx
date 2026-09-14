import React from 'react';
import Card from '../common/Card';

export default function RiskDistribution({ data = [] }) {
  // Normalize data: array of { level: 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW', count: number }
  const levels = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  
  const counts = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  if (Array.isArray(data)) {
    data.forEach((item) => {
      const lvl = (item.level || item.riskLevel || '').toUpperCase();
      if (counts[lvl] !== undefined) {
        counts[lvl] = item.count || 0;
      }
    });
  } else if (typeof data === 'object' && data !== null) {
    Object.keys(counts).forEach((lvl) => {
      counts[lvl] = data[lvl] || 0;
    });
  }

  const total = Object.values(counts).reduce((acc, c) => acc + c, 0) || 1;

  const riskConfig = {
    CRITICAL: {
      label: 'Critical',
      desc: 'Risk Score ≥ 85.0',
      color: 'var(--critical)',
      bg: 'var(--critical-soft)',
      border: 'var(--critical-border)',
      textColor: 'var(--critical-text)',
    },
    HIGH: {
      label: 'High',
      desc: 'Risk Score 70.0 – 84.9',
      color: 'var(--high)',
      bg: 'var(--high-soft)',
      border: 'var(--high-border)',
      textColor: 'var(--high-text)',
    },
    MEDIUM: {
      label: 'Medium',
      desc: 'Risk Score 40.0 – 69.9',
      color: 'var(--medium)',
      bg: 'var(--medium-soft)',
      border: 'var(--medium-border)',
      textColor: 'var(--medium-text)',
    },
    LOW: {
      label: 'Low',
      desc: 'Risk Score < 40.0',
      color: 'var(--low)',
      bg: 'var(--low-soft)',
      border: 'var(--low-border)',
      textColor: 'var(--low-text)',
    },
  };

  return (
    <Card
      title="Risk Distribution"
      subtitle="Current cycle risk classification across 77 community areas"
      className="risk-distribution-card"
    >
      {/* Horizontal Stacked Segmented Distribution Bar */}
      <div className="risk-stacked-bar" role="progressbar" aria-label="Risk Distribution Bar">
        {levels.map((lvl) => {
          const count = counts[lvl];
          const pct = Math.round((count / total) * 100);
          if (pct === 0 && count === 0) return null;
          return (
            <div
              key={lvl}
              className="risk-stacked-segment"
              style={{
                width: `${pct}%`,
                backgroundColor: riskConfig[lvl].color,
              }}
              title={`${riskConfig[lvl].label}: ${count} (${pct}%)`}
            />
          );
        })}
      </div>

      {/* Detailed Risk Breakdown Grid */}
      <div className="risk-level-breakdown-grid">
        {levels.map((lvl) => {
          const count = counts[lvl];
          const pct = ((count / total) * 100).toFixed(1);
          const cfg = riskConfig[lvl];

          return (
            <div
              key={lvl}
              className="risk-level-item"
              style={{
                background: cfg.bg,
                borderColor: cfg.border,
              }}
            >
              <div className="risk-item-header">
                <span className="risk-item-dot" style={{ background: cfg.color }} aria-hidden="true" />
                <span className="risk-item-name" style={{ color: cfg.textColor }}>
                  {cfg.label}
                </span>
                <span className="risk-item-pct font-mono">{pct}%</span>
              </div>

              <div className="risk-item-count font-mono" style={{ color: 'var(--text-primary)' }}>
                {count.toLocaleString()}
              </div>

              <div className="risk-item-desc">{cfg.desc}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
