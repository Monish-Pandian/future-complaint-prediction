import React from 'react';

/**
 * PredictionProbability: Minimal circular gauge & confidence indicator
 */
export default function PredictionProbability({ probability = 0.87, confidence = 0.91 }) {
  const probPercent = Math.round(probability * 100);
  const confPercent = Math.round(confidence * 100);

  // SVG circle calculations
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (probPercent / 100) * circumference;

  return (
    <div className="info-card" aria-label="Predicted Probability Panel">
      <div className="info-card-header">
        <h3 className="info-card-title">PREDICTED PROBABILITY</h3>
        <span className="dashboard-panel-tag">xgb-test-v1</span>
      </div>

      <div className="probability-visual-container">
        <div className="probability-circle-wrap">
          <svg className="probability-svg" width="130" height="130" viewBox="0 0 130 130">
            <circle
              className="prob-circle-bg"
              cx="65"
              cy="65"
              r={radius}
            />
            <circle
              className="prob-circle-val"
              cx="65"
              cy="65"
              r={radius}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="prob-center-text">
            <span className="prob-number">{probPercent}%</span>
            <span className="prob-tag">PROBABILITY</span>
          </div>
        </div>

        <div className="prob-confidence-bar">
          <span style={{ color: 'var(--text-muted)' }}>Model Confidence Level:</span>
          <strong style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
            {confPercent}%
          </strong>
        </div>
      </div>
    </div>
  );
}
