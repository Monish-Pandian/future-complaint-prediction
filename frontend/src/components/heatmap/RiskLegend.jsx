import React from 'react';

export default function RiskLegend() {
  const tiers = [
    { level: 'CRITICAL', label: 'Critical', range: '≥ 85.0', color: 'var(--critical)' },
    { level: 'HIGH', label: 'High', range: '70.0 – 84.9', color: 'var(--high)' },
    { level: 'MEDIUM', label: 'Medium', range: '40.0 – 69.9', color: 'var(--medium)' },
    { level: 'LOW', label: 'Low', range: '< 40.0', color: 'var(--low)' },
  ];

  return (
    <div className="risk-floating-legend" aria-label="Risk Level Legend">
      <div className="legend-header">
        <span className="legend-title font-mono">RISK SEVERITY MATRIX</span>
      </div>
      <div className="legend-items-list">
        {tiers.map((tier) => (
          <div key={tier.level} className="legend-item-row">
            <span className="legend-color-dot" style={{ backgroundColor: tier.color }} aria-hidden="true" />
            <span className="legend-item-label">{tier.label}</span>
            <span className="legend-item-range font-mono">{tier.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
