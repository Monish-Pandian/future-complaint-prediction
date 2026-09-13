import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Risk badge renderer helper
 */
function renderRiskBadge(riskLevel, score) {
  const level = (riskLevel || 'LOW').toUpperCase();
  let badgeClass = 'risk-badge-low';

  if (level === 'CRITICAL') {
    badgeClass = 'risk-badge-critical';
  } else if (level === 'HIGH') {
    badgeClass = 'risk-badge-high';
  } else if (level === 'MEDIUM') {
    badgeClass = 'risk-badge-medium';
  }

  return (
    <span className={`status-badge ${badgeClass}`}>
      <span className="status-badge-dot" aria-hidden="true" />
      {level} {score ? `(${score}%)` : ''}
    </span>
  );
}

/**
 * Verification badge renderer helper
 */
function renderVerificationBadge(status) {
  const s = (status || 'PENDING').toUpperCase().replace('_', ' ');
  let badgeClass = 'verif-badge-pending';

  if (s.includes('CRITICAL') || s === 'CRITICAL') {
    badgeClass = 'risk-badge-critical';
  } else if (s === 'ASSIGNED') {
    badgeClass = 'verif-badge-assigned';
  } else if (s.includes('PROGRESS')) {
    badgeClass = 'verif-badge-in-progress';
  } else if (s.includes('VERIFIED')) {
    badgeClass = 'verif-badge-verified';
  } else if (s.includes('NOT FOUND')) {
    badgeClass = 'verif-badge-not-found';
  }

  return (
    <span className={`status-badge ${badgeClass}`}>
      <span className="status-badge-dot" aria-hidden="true" />
      {s}
    </span>
  );
}

/**
 * RecentPredictions component: Tabular intelligence view of active predictions
 */
export default function RecentPredictions({ data = [] }) {
  const navigate = useNavigate();

  const handleViewPrediction = (id) => {
    navigate(`/predictions/${id}`);
  };

  return (
    <section
      className="dashboard-panel dashboard-recent"
      aria-label="Recent Prediction Activity Table"
    >
      <div className="dashboard-panel-header">
        <div className="dashboard-panel-title-group">
          <h2 className="dashboard-panel-title">RECENT PREDICTION ACTIVITY</h2>
          <span className="dashboard-panel-subtitle">
            Forecasting queue, AI officer dispatch, and ground-truth verification
          </span>
        </div>
        <span className="dashboard-panel-tag">DEMO DATA</span>
      </div>

      <div className="prediction-table-wrapper">
        <table className="prediction-table">
          <thead>
            <tr>
              <th scope="col">Area</th>
              <th scope="col">Complaint Type</th>
              <th scope="col">Risk</th>
              <th scope="col">Prediction Window</th>
              <th scope="col">Assignment</th>
              <th scope="col">Verification</th>
              <th scope="col" style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className="cell-primary">{item.area}</div>
                  {item.ward && <div className="cell-subtext">{item.ward}</div>}
                </td>
                <td>
                  <div className="cell-primary">{item.complaintType}</div>
                  <div className="cell-subtext">{item.id}</div>
                </td>
                <td>
                  {renderRiskBadge(item.riskLevel, item.riskScore)}
                </td>
                <td>
                  <span className="cell-window">{item.predictionWindow}</span>
                </td>
                <td>
                  <div className="cell-officer">
                    <span className="cell-primary">{item.assignment}</span>
                    {item.officerName && (
                      <span className="cell-subtext">{item.officerName}</span>
                    )}
                  </div>
                </td>
                <td>
                  {renderVerificationBadge(item.verification)}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => handleViewPrediction(item.id)}
                    className="prediction-action"
                    aria-label={`View details for prediction ${item.id}`}
                  >
                    <span>VIEW</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
