import React from 'react';
import Card from '../common/Card';

export default function OperationalStrategy({ strategyData = {} }) {
  const exploitationPct = 90;
  const explorationPct = 10;

  const exploitationCount = strategyData.exploitationCount ?? 35;
  const explorationCount = strategyData.explorationCount ?? 4;
  const totalCandidates = exploitationCount + explorationCount;

  return (
    <Card
      title="Operational Strategy"
      subtitle="Spatio-temporal 90/10 exploration-exploitation verification policy"
      className="strategy-card"
    >
      {/* 90/10 Ratio Visual Bar */}
      <div className="strategy-ratio-container">
        <div className="strategy-ratio-header">
          <div className="strategy-ratio-title">
            <span>Budget Allocation Ratio</span>
            <span className="font-mono" style={{ color: 'var(--accent-text)', fontWeight: '700' }}>
              90% / 10%
            </span>
          </div>
          <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
            {totalCandidates} Active Verification Candidates
          </span>
        </div>

        <div className="strategy-split-bar" role="progressbar" aria-label="90/10 Policy Allocation Bar">
          <div
            className="strategy-split-segment exploit"
            style={{ width: `${exploitationPct}%` }}
            title={`90% Exploitation (${exploitationCount} tasks)`}
          >
            <span>90% EXPLOIT</span>
          </div>
          <div
            className="strategy-split-segment explore"
            style={{ width: `${explorationPct}%` }}
            title={`10% Exploration (${explorationCount} tasks)`}
          >
            <span>10%</span>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="strategy-details-grid">
        <div className="strategy-box exploit-box">
          <div className="strategy-box-header">
            <span className="strategy-box-pill exploit-pill font-mono">90% EXPLOITATION</span>
            <span className="strategy-box-count font-mono">{exploitationCount} tasks</span>
          </div>
          <p className="strategy-box-text">
            Prioritizes top high-confidence complaint forecast areas with elevated probability to maximize mitigation yield.
          </p>
        </div>

        <div className="strategy-box explore-box">
          <div className="strategy-box-header">
            <span className="strategy-box-pill explore-pill font-mono">10% EXPLORATION</span>
            <span className="strategy-box-count font-mono">{explorationCount} tasks</span>
          </div>
          <p className="strategy-box-text">
            Allocates controlled capacity into lower-density sectors to detect emerging anomalies and prevent algorithmic blind spots.
          </p>
        </div>
      </div>

      {/* Scientific Policy Note */}
      <div className="strategy-policy-note">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          Exploration is intentionally limited to discover potentially emerging risks while exploitation prioritizes known high-value predictions.
        </span>
      </div>
    </Card>
  );
}
