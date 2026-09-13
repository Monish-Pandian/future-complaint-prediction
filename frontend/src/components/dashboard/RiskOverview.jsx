import React, { useEffect, useState } from 'react';

/**
 * RiskOverview component displaying horizontal risk bars
 * Fast risk interpretation with semantic muted palettes
 */
export default function RiskOverview({ data = [] }) {
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    // Trigger animation slightly after mount
    const timeout = setTimeout(() => setIsRendered(true), 50);
    return () => clearTimeout(timeout);
  }, []);

  const totalComplaints = data.reduce((acc, curr) => acc + (curr.count || 0), 0);

  return (
    <section
      className="dashboard-panel dashboard-risk"
      aria-label="Risk Distribution Overview"
    >
      <div className="dashboard-panel-header">
        <div className="dashboard-panel-title-group">
          <h2 className="dashboard-panel-title">RISK DISTRIBUTION</h2>
          <span className="dashboard-panel-subtitle">
            Severity segmentation by forecast probability
          </span>
        </div>
        <span className="dashboard-panel-tag">DEMO DATA</span>
      </div>

      <div className="risk-list" role="list">
        {data.map((item, index) => {
          const percentage = totalComplaints > 0 ? ((item.count / totalComplaints) * 100).toFixed(1) : 0;
          const staggerDelay = `${index * 120}ms`;

          return (
            <div key={item.level} className="risk-row" role="listitem">
              <div className="risk-row-header">
                <div className="risk-name-group">
                  <span
                    className="risk-dot"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="risk-name">{item.label}</span>
                </div>

                <div className="risk-metrics-group">
                  <span className="risk-count">{item.count}</span>
                  <span className="risk-pct">({percentage}%)</span>
                </div>
              </div>

              <div className="risk-track" aria-hidden="true">
                <div
                  className="risk-fill"
                  style={{
                    width: isRendered ? `${percentage}%` : '0%',
                    backgroundColor: item.color,
                    boxShadow: `0 0 10px ${item.bgGlow || 'rgba(255,255,255,0.1)'}`,
                    transitionDelay: staggerDelay,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="risk-footer-summary">
        <span>Total Evaluated Clusters:</span>
        <strong style={{ color: 'var(--text-primary)' }}>{totalComplaints} zones</strong>
      </div>
    </section>
  );
}
