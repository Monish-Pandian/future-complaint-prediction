import React from 'react';

/**
 * PredictionExplanation: Explanatory evidence signals for the forecasted problem area
 */
export default function PredictionExplanation({ factors = [] }) {
  return (
    <div className="info-card" aria-label="Prediction Evidence Explanation">
      <div className="info-card-header">
        <h3 className="info-card-title">WHY WAS THIS AREA PREDICTED?</h3>
        <span className="dashboard-panel-tag">PREDICTION EVIDENCE</span>
      </div>

      <div className="signals-list" role="list">
        {factors.map((item, index) => (
          <div key={`signal-${index}`} className="signal-card" role="listitem">
            <span className="signal-chip">{item.label}</span>
            <span className="signal-text">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
