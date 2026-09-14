import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Community Area Spatial Risk Ranking Card
 * Displays Chicago community areas with highest predicted risk concentration
 */
export default function CommunityAreaRiskCard({ communityAreas = [] }) {
  const defaultAreas = [
    { areaNumber: 25, name: 'Austin', totalPredictions: 218, highRiskCount: 68, avgRisk: 78, assignedCount: 8 },
    { areaNumber: 28, name: 'Near West Side', totalPredictions: 184, highRiskCount: 54, avgRisk: 74, assignedCount: 6 },
    { areaNumber: 8, name: 'Near North Side', totalPredictions: 162, highRiskCount: 48, avgRisk: 72, assignedCount: 5 },
    { areaNumber: 24, name: 'West Town', totalPredictions: 145, highRiskCount: 42, avgRisk: 69, assignedCount: 4 },
    { areaNumber: 67, name: 'West Englewood', totalPredictions: 138, highRiskCount: 39, avgRisk: 68, assignedCount: 4 },
    { areaNumber: 71, name: 'Auburn Gresham', totalPredictions: 124, highRiskCount: 36, avgRisk: 66, assignedCount: 3 },
  ];

  const areaList = communityAreas.length > 0 ? communityAreas : defaultAreas;

  return (
    <div className="analytics-card">
      <div className="analytics-card-header">
        <div className="analytics-card-title-wrap">
          <span className="analytics-card-tag">SPATIAL CONCENTRATION</span>
          <h3 className="analytics-card-title">Top Risk Community Areas</h3>
        </div>

        <Link to="/risk-map" className="analytics-view-link">
          <span>View on Risk Map</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>

      <div className="community-area-table-wrap">
        <table className="analytics-mini-table" aria-label="Top Risk Community Areas">
          <thead>
            <tr>
              <th scope="col">COMMUNITY AREA</th>
              <th scope="col" style={{ textAlign: 'center' }}>TOTAL PREDICTIONS</th>
              <th scope="col" style={{ textAlign: 'center' }}>HIGH/CRITICAL</th>
              <th scope="col" style={{ textAlign: 'center' }}>AVG RISK</th>
              <th scope="col" style={{ textAlign: 'right' }}>DISPATCHES</th>
            </tr>
          </thead>
          <tbody>
            {areaList.map((ca, idx) => {
              const areaName = ca.name || ca.communityAreaName || `Area ${ca.areaNumber || ca._id || idx + 1}`;
              const areaNum = ca.areaNumber || ca._id || idx + 1;
              const total = ca.totalPredictions || ca.total || 0;
              const highRisk = ca.highRiskCount || ca.highRisk || 0;
              const avgScore = ca.avgRisk ? Math.round(ca.avgRisk) : 70;
              const assigned = ca.assignedCount || ca.assigned || 0;

              return (
                <tr key={areaNum || idx} className="analytics-mini-row">
                  <td>
                    <div className="ca-name-cell">
                      <span className="ca-badge">#{areaNum}</span>
                      <span className="ca-name-text">{areaName}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                    {total}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="ca-high-risk-badge">{highRisk}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`ca-risk-score ${avgScore >= 75 ? 'text-red' : avgScore >= 60 ? 'text-amber' : 'text-blue'}`}>
                      {avgScore}%
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    <span className="ca-assigned-pill">{assigned} active</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
