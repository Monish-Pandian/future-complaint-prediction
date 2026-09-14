import React from 'react';

/**
 * Risk Distribution Visualization Card
 * Displays breakdown of forecasted risk levels (Critical, High, Medium, Low)
 */
export default function RiskDistributionCard({ riskDistribution = {}, total = 0 }) {
  const low = riskDistribution.LOW || 0;
  const medium = riskDistribution.MEDIUM || 0;
  const high = riskDistribution.HIGH || 0;
  const critical = riskDistribution.CRITICAL || 0;

  const totalCount = total || (low + medium + high + critical) || 1;

  const tiers = [
    {
      level: 'CRITICAL',
      count: critical,
      pct: Math.round((critical / totalCount) * 100),
      color: '#ef4444',
      bgClass: 'risk-tier-critical',
      label: 'Immediate Hazard & Triage Priority',
    },
    {
      level: 'HIGH',
      count: high,
      pct: Math.round((high / totalCount) * 100),
      color: '#f59e0b',
      bgClass: 'risk-tier-high',
      label: 'Targeted for 90% Exploitation Dispatch',
    },
    {
      level: 'MEDIUM',
      count: medium,
      pct: Math.round((medium / totalCount) * 100),
      color: '#38bdf8',
      bgClass: 'risk-tier-medium',
      label: 'Standard Municipal Surveillance',
    },
    {
      level: 'LOW',
      count: low,
      pct: Math.round((low / totalCount) * 100),
      color: '#10b981',
      bgClass: 'risk-tier-low',
      label: 'Baseline Routine Monitoring',
    },
  ];

  return (
    <div className="analytics-card">
      <div className="analytics-card-header">
        <div className="analytics-card-title-wrap">
          <span className="analytics-card-tag">RISK STRATIFICATION</span>
          <h3 className="analytics-card-title">Forecasted Risk Distribution</h3>
        </div>
        <span className="analytics-header-stat">{totalCount.toLocaleString()} Total Forecasts</span>
      </div>

      {/* Stacked Horizon Bar */}
      <div className="risk-stacked-track" title="Overall Risk Stratification Breakdown">
        {tiers.map((t) => (
          <div
            key={t.level}
            className={`risk-stacked-fill ${t.bgClass}`}
            style={{ width: `${Math.max(2, t.pct)}%` }}
            title={`${t.level}: ${t.count} (${t.pct}%)`}
          />
        ))}
      </div>

      {/* Breakdown Rows */}
      <div className="risk-breakdown-list">
        {tiers.map((t) => (
          <div key={t.level} className="risk-breakdown-row">
            <div className="risk-row-left">
              <span className="risk-dot" style={{ background: t.color }} />
              <div className="risk-label-group">
                <span className="risk-level-name" style={{ color: t.color }}>{t.level}</span>
                <span className="risk-level-desc">{t.label}</span>
              </div>
            </div>

            <div className="risk-row-right">
              <div className="risk-bar-container">
                <div
                  className="risk-bar-fill"
                  style={{ width: `${t.pct}%`, background: t.color }}
                />
              </div>
              <span className="risk-count-val">{t.count.toLocaleString()}</span>
              <span className="risk-pct-val">({t.pct}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
