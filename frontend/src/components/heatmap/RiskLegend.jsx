import React from 'react';

/**
 * RiskLegend: Floating compact spatial risk level indicator
 */
export default function RiskLegend() {
  return (
    <div className="heatmap-floating-legend" aria-label="Risk Level Legend">
      <span className="legend-title">RISK LEVEL</span>
      <div className="legend-items-row">
        <div className="legend-item">
          <span className="legend-dot critical" aria-hidden="true" />
          <span>Critical</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot high" aria-hidden="true" />
          <span>High</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot medium" aria-hidden="true" />
          <span>Medium</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot low" aria-hidden="true" />
          <span>Low</span>
        </div>
      </div>
    </div>
  );
}
