import React from 'react';
import { useNavigate } from 'react-router-dom';
import { renderVerificationBadge } from '../predictions/PredictionBadges';

function renderOutcomeBadge(outcome) {
  const o = (outcome || 'PENDING').toUpperCase().replace('_', ' ');
  let color = 'var(--text-muted)';
  let bg = 'rgba(255, 255, 255, 0.03)';
  let border = 'rgba(255, 255, 255, 0.06)';

  if (o.includes('CONFIRMED')) {
    color = '#4dd6a8';
    bg = 'rgba(77, 214, 168, 0.1)';
    border = 'rgba(77, 214, 168, 0.25)';
  } else if (o.includes('NOT FOUND')) {
    color = '#94a3b8';
    bg = 'rgba(148, 163, 184, 0.1)';
    border = 'rgba(148, 163, 184, 0.25)';
  } else if (o.includes('DIFFERENT')) {
    color = '#f5a623';
    bg = 'rgba(245, 166, 35, 0.1)';
    border = 'rgba(245, 166, 35, 0.25)';
  }

  return (
    <span
      className="badge-verif"
      style={{ background: bg, color: color, borderColor: border }}
    >
      <span className="status-badge-dot" aria-hidden="true" />
      {o}
    </span>
  );
}

/**
 * RecentAssignments: Table of recent AI predictions assigned to the officer
 */
export default function RecentAssignments({ assignments = [] }) {
  const navigate = useNavigate();

  const handleRowClick = (id) => {
    navigate(`/predictions/${id}`);
  };

  return (
    <div className="info-card" aria-label="Recent Assignments Table">
      <div className="info-card-header">
        <h3 className="info-card-title">RECENT AI PREDICTION ASSIGNMENTS</h3>
        <span className="dashboard-panel-tag">AI DISPATCH QUEUE</span>
      </div>

      <div className="prediction-table-wrapper">
        <table className="prediction-table">
          <thead>
            <tr>
              <th scope="col">Prediction ID</th>
              <th scope="col">Complaint Type</th>
              <th scope="col">Area</th>
              <th scope="col">AI Predicted Risk</th>
              <th scope="col">Assigned Date</th>
              <th scope="col">Verification Status</th>
              <th scope="col">Field Ground-Truth Outcome</th>
              <th scope="col" style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {assignments.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state" style={{ padding: '24px 0' }}>
                    <div className="empty-title">NO RECENT ASSIGNMENTS</div>
                    <div className="empty-subtitle">
                      No active or completed AI prediction assignments recorded for this officer.
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              assignments.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => handleRowClick(item.id)}
                  className="prediction-row-clickable"
                >
                  <td>
                    <span className="identity-id">{item.id}</span>
                  </td>
                  <td>
                    <span className="cell-primary">{item.complaintType}</span>
                  </td>
                  <td>
                    <div className="cell-primary">{item.areaName || `Area ${item.communityArea}`}</div>
                    <div className="cell-subtext">Area #{item.communityArea} &bull; Ward {item.ward}</div>
                  </td>
                  <td>
                    <span className="cell-primary" style={{ color: item.riskScore >= 75 ? '#ff6b6b' : 'var(--text-primary)' }}>
                      {item.riskScore}%
                    </span>
                  </td>
                  <td>
                    <span className="cell-window">{item.assignedDate}</span>
                  </td>
                  <td>{renderVerificationBadge(item.verificationStatus)}</td>
                  <td>{renderOutcomeBadge(item.outcome)}</td>
                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleRowClick(item.id)}
                      className="prediction-action"
                      aria-label={`View prediction ${item.id}`}
                    >
                      <span>VIEW</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
