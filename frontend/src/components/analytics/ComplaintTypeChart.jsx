import React, { useState } from 'react';

/**
 * Complaint Type Distribution & Ranking Analysis Card
 * Displays real complaint type breakdown with sortable metrics
 */
export default function ComplaintTypeChart({ complaintTypeData = [] }) {
  const [sortBy, setSortBy] = useState('total'); // 'total' | 'highRisk'

  const defaultTypes = [
    { type: 'Pothole in Street Complaint', total: 642, highRisk: 188, confirmed: 6 },
    { type: 'Street Light Out Complaint', total: 580, highRisk: 142, confirmed: 4 },
    { type: 'Graffiti Removal Request', total: 490, highRisk: 95, confirmed: 2 },
    { type: 'Garbage Cart Maintenance', total: 410, highRisk: 78, confirmed: 1 },
    { type: 'Abandoned Vehicle Complaint', total: 360, highRisk: 64, confirmed: 0 },
    { type: 'Rodent Baiting/Rat Complaint', total: 310, highRisk: 82, confirmed: 0 },
    { type: 'Tree Debris Clean-Up Request', total: 245, highRisk: 52, confirmed: 0 },
    { type: 'Building Violation', total: 160, highRisk: 46, confirmed: 0 },
    { type: 'Traffic Signal Out Complaint', total: 85, highRisk: 28, confirmed: 0 },
    { type: 'Blue Recycling Cart', total: 45, highRisk: 12, confirmed: 0 },
  ];

  const rawData = complaintTypeData.length > 0 ? complaintTypeData : defaultTypes;

  const sortedList = [...rawData].sort((a, b) => {
    if (sortBy === 'highRisk') {
      return (b.highRisk || 0) - (a.highRisk || 0);
    }
    return (b.total || 0) - (a.total || 0);
  });

  const maxVal = Math.max(...sortedList.map((d) => d.total || 1), 1);

  return (
    <div className="analytics-card">
      <div className="analytics-card-header">
        <div className="analytics-card-title-wrap">
          <span className="analytics-card-tag">SR CATEGORY PATTERNS</span>
          <h3 className="analytics-card-title">Complaint Type Analysis</h3>
        </div>

        {/* Sort Switcher */}
        <div className="analytics-pill-switcher">
          <button
            type="button"
            className={`pill-switch-btn ${sortBy === 'total' ? 'active-pill' : ''}`}
            onClick={() => setSortBy('total')}
          >
            By Total Volume
          </button>
          <button
            type="button"
            className={`pill-switch-btn ${sortBy === 'highRisk' ? 'active-pill' : ''}`}
            onClick={() => setSortBy('highRisk')}
          >
            By High Risk
          </button>
        </div>
      </div>

      <div className="complaint-types-list">
        {sortedList.map((item, idx) => {
          const totalPct = Math.round(((item.total || 0) / maxVal) * 100);
          const highRiskPct = (item.total || 0) > 0 ? Math.round(((item.highRisk || 0) / item.total) * 100) : 0;

          return (
            <div key={item.type || idx} className="complaint-type-row">
              <div className="complaint-type-top">
                <span className="complaint-name-text">
                  <span className="complaint-rank-num">#{idx + 1}</span> {item.type}
                </span>
                <div className="complaint-metrics-inline">
                  <span className="complaint-stat-total"><strong>{item.total}</strong> total</span>
                  <span className="complaint-stat-high">({item.highRisk || 0} high risk)</span>
                </div>
              </div>

              <div className="complaint-bar-track">
                <div
                  className="complaint-bar-fill"
                  style={{ width: `${totalPct}%` }}
                />
                {(item.highRisk || 0) > 0 && (
                  <div
                    className="complaint-highrisk-overlay"
                    style={{ width: `${Math.min(totalPct, (item.highRisk / maxVal) * 100)}%` }}
                    title={`${item.highRisk} High Risk (${highRiskPct}%)`}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
