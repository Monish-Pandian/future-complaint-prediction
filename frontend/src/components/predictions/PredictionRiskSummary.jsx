import React from 'react';
import Card from '../common/Card';

export default function PredictionRiskSummary({ summary = {}, riskDistribution = [] }) {
  const total = summary.totalPredictions || 770;
  const critical = summary.critical || (summary.riskDistribution?.CRITICAL ?? 184);
  const high = summary.high || (summary.riskDistribution?.HIGH ?? 492);
  const medium = summary.medium || (summary.riskDistribution?.MEDIUM ?? 750);
  const low = summary.low || (summary.riskDistribution?.LOW ?? 370);

  const safeTotal = critical + high + medium + low || total || 1;

  const riskLevels = [
    {
      level: 'CRITICAL',
      label: 'Critical',
      count: critical,
      pct: ((critical / safeTotal) * 100).toFixed(1),
      color: 'var(--critical)',
      bg: 'var(--critical-soft)',
      border: 'var(--critical-border)',
      textColor: 'var(--critical-text)',
      desc: 'Risk Score ≥ 85.0',
    },
    {
      level: 'HIGH',
      label: 'High',
      count: high,
      pct: ((high / safeTotal) * 100).toFixed(1),
      color: 'var(--high)',
      bg: 'var(--high-soft)',
      border: 'var(--high-border)',
      textColor: 'var(--high-text)',
      desc: 'Risk Score 70.0 – 84.9',
    },
    {
      level: 'MEDIUM',
      label: 'Medium',
      count: medium,
      pct: ((medium / safeTotal) * 100).toFixed(1),
      color: 'var(--medium)',
      bg: 'var(--medium-soft)',
      border: 'var(--medium-border)',
      textColor: 'var(--medium-text)',
      desc: 'Risk Score 40.0 – 69.9',
    },
    {
      level: 'LOW',
      label: 'Low',
      count: low,
      pct: ((low / safeTotal) * 100).toFixed(1),
      color: 'var(--low)',
      bg: 'var(--low-soft)',
      border: 'var(--low-border)',
      textColor: 'var(--low-text)',
      desc: 'Risk Score < 40.0',
    },
  ];

  return (
    <Card
      title="Prediction Risk Distribution"
      subtitle="Aggregated risk tier breakdown for the active prediction cycle"
      className="prediction-risk-summary-card"
    >
      {/* Horizontal Stacked Bar */}
      <div className="risk-stacked-bar" role="progressbar" aria-label="Risk Distribution Bar">
        {riskLevels.map((lvl) => {
          const pct = Math.round((lvl.count / safeTotal) * 100);
          if (pct === 0 && lvl.count === 0) return null;
          return (
            <div
              key={lvl.level}
              className="risk-stacked-segment"
              style={{
                width: `${pct}%`,
                backgroundColor: lvl.color,
              }}
              title={`${lvl.label}: ${lvl.count} (${lvl.pct}%)`}
            />
          );
        })}
      </div>

      {/* Metric Cards Strip */}
      <div className="prediction-risk-strip">
        <div className="risk-strip-item total-item">
          <span className="risk-strip-label">Total Predictions</span>
          <div className="risk-strip-val font-mono" style={{ color: 'var(--text-primary)' }}>
            {total.toLocaleString()}
          </div>
          <span className="risk-strip-sub">Active Cycle Total</span>
        </div>

        {riskLevels.map((lvl) => (
          <div
            key={lvl.level}
            className="risk-strip-item"
            style={{ background: lvl.bg, borderColor: lvl.border }}
          >
            <div className="risk-strip-top">
              <span className="risk-strip-dot" style={{ background: lvl.color }} aria-hidden="true" />
              <span className="risk-strip-label" style={{ color: lvl.textColor }}>
                {lvl.label}
              </span>
              <span className="risk-strip-pct font-mono">{lvl.pct}%</span>
            </div>
            <div className="risk-strip-val font-mono" style={{ color: 'var(--text-primary)' }}>
              {lvl.count.toLocaleString()}
            </div>
            <span className="risk-strip-sub">{lvl.desc}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
