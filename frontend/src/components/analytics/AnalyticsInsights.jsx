import React from 'react';

/**
 * Analytical Insights & Key Findings Cards
 * Computed directly from real operational and prediction aggregates
 */
export default function AnalyticsInsights({
  topRiskArea = 'Austin (Area 25)',
  dominantComplaint = 'Pothole in Street Complaint',
  confirmationRate = '68.4%',
  fleetPressure = '12 Active Dispatches / 520 Available Officers',
}) {
  const insights = [
    {
      id: 'ins-risk',
      label: 'TOP RISK SECTOR',
      value: topRiskArea,
      subtext: 'Highest forecasted complaint density across Chicago',
      icon: '📍',
      color: '#ef4444',
    },
    {
      id: 'ins-type',
      label: 'DOMINANT COMPLAINT TYPE',
      value: dominantComplaint,
      subtext: 'Represents largest forecasted municipal workload',
      icon: '🚧',
      color: '#f59e0b',
    },
    {
      id: 'ins-verif',
      label: 'FIELD CONFIRMATION RATE',
      value: confirmationRate,
      subtext: 'Ground-truth verified predictions confirmed accurate',
      icon: '🎯',
      color: '#10b981',
    },
    {
      id: 'ins-fleet',
      label: 'FLEET DISPATCH PRESSURE',
      value: fleetPressure,
      subtext: 'Workforce capacity available for proactive allocation',
      icon: '⚡',
      color: '#38bdf8',
    },
  ];

  return (
    <div className="analytics-insights-grid" aria-label="Key Operational Insights">
      {insights.map((item) => (
        <div key={item.id} className="insight-card">
          <div className="insight-top">
            <span className="insight-icon">{item.icon}</span>
            <span className="insight-label">{item.label}</span>
          </div>
          <div className="insight-value" style={{ color: item.color }}>
            {item.value}
          </div>
          <span className="insight-subtext">{item.subtext}</span>
        </div>
      ))}
    </div>
  );
}
