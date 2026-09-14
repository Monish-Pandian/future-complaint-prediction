import React from 'react';

/**
 * Exploration vs Exploitation Operational Strategy Card
 * Communicates the 90/10 capacity allocation policy
 */
export default function ExplorationStrategyCard({
  totalSelected = 89,
  exploitationCount = 80,
  explorationCount = 9,
}) {
  return (
    <div className="analytics-card">
      <div className="analytics-card-header">
        <div className="analytics-card-title-wrap">
          <span className="analytics-card-tag">DUAL-MODE CAPACITY ALLOCATION</span>
          <h3 className="analytics-card-title">Operational Selection Strategy</h3>
        </div>
        <span className="analytics-header-stat">90% / 10% Policy</span>
      </div>

      <p className="analytics-card-desc">
        Exploitation prioritizes high-confidence predicted risk hotspots; exploration allocates a controlled 10% dispatch budget to discover emerging or sparse civic issues.
      </p>

      <div className="exploration-split-container">
        {/* Exploitation (90%) */}
        <div className="split-panel panel-exploitation">
          <div className="split-header">
            <span className="split-badge-tag tag-cyan">90% EXPLOITATION</span>
            <span className="split-stat-num highlight-cyan">{exploitationCount} Tasks</span>
          </div>
          <span className="split-focus-label">FOCUS: HIGH-RISK PRIORITIZATION</span>
          <p className="split-text">
            Dispatches officers to top predicted problem sites with elevated probability (&ge; 0.38) and heavy historical incident density.
          </p>
          <div className="split-meter-bar">
            <div className="split-meter-fill fill-cyan" style={{ width: '90%' }} />
          </div>
        </div>

        {/* Exploration (10%) */}
        <div className="split-panel panel-exploration">
          <div className="split-header">
            <span className="split-badge-tag tag-purple">10% EXPLORATION</span>
            <span className="split-stat-num highlight-purple">{explorationCount} Tasks</span>
          </div>
          <span className="split-focus-label">FOCUS: BLIND-SPOT DISCOVERY</span>
          <p className="split-text">
            Exploratory sampling in moderate/sparse sectors to uncover unpredicted nascent infrastructure failures and prevent model bias.
          </p>
          <div className="split-meter-bar">
            <div className="split-meter-fill fill-purple" style={{ width: '10%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
