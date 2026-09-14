import React from 'react';
import { useNavigate } from 'react-router-dom';
import { renderRiskBadge } from '../predictions/PredictionBadges';

/**
 * Verification badge renderer helper
 */
function renderVerificationBadge(status) {
  const rawStatus = (status || 'PENDING_VERIFICATION').toUpperCase();
  let badgeClass = 'status-pending';
  let label = 'PENDING';

  if (rawStatus.includes('VERIFIED_TRUE') || rawStatus === 'VERIFIED') {
    badgeClass = 'status-verified';
    label = 'VERIFIED';
  } else if (rawStatus.includes('VERIFIED_FALSE') || rawStatus.includes('NOT_FOUND')) {
    badgeClass = 'status-not-found';
    label = 'NOT FOUND';
  } else if (rawStatus.includes('ASSIGNED')) {
    badgeClass = 'status-assigned';
    label = 'ASSIGNED';
  } else if (rawStatus.includes('PROGRESS')) {
    badgeClass = 'status-progress';
    label = 'IN PROGRESS';
  }

  return (
    <span className={`status-badge ${badgeClass}`}>
      <span className="status-badge-dot" aria-hidden="true" />
      {label}
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

  const predictionsList = Array.isArray(data) ? data : [];

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
        <span className="dashboard-panel-tag">AI INFERENCES</span>
      </div>

      <div className="prediction-table-wrapper">
        {predictionsList.length === 0 ? (
          <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No recent predictions found. Run a prediction cycle to generate forecasts.
          </div>
        ) : (
          <table className="prediction-table">
            <thead>
              <tr>
                <th scope="col">Community Area</th>
                <th scope="col">Complaint Type</th>
                <th scope="col">Risk Level</th>
                <th scope="col">Prediction Window</th>
                <th scope="col">Officer Assignment</th>
                <th scope="col">Field Status</th>
                <th scope="col" style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {predictionsList.map((item, idx) => {
                const id = item.predictionId || item.id || item._id || `PRED-${idx}`;
                const area = item.communityAreaName || (typeof item.communityArea === 'number' ? `Community Area ${item.communityArea}` : item.communityArea || item.area || 'Chicago Sector');
                const ward = item.ward || (item.area?.ward ?? null);
                const complaint = item.complaintType || 'Civic Complaint';
                const riskLevel = (item.riskLevel || 'LOW').toUpperCase();
                const riskScore = item.riskScore ?? Math.round((item.probability ?? 0.5) * 100);
                const windowText = item.predictionWindow?.display || item.predictionWindow || 'Next 7 days';
                const officerName = item.assignedOfficer?.name || item.officerName || (item.assignedOfficer ? 'Officer Assigned' : (item.assignment || 'Unassigned'));
                const verification = item.verificationStatus || item.verification || 'PENDING';

                return (
                  <tr key={id}>
                    <td>
                      <div className="cell-primary">{area}</div>
                      {ward && <div className="cell-subtext">{ward}</div>}
                    </td>
                    <td>
                      <div className="cell-primary">{complaint}</div>
                      <div className="cell-subtext font-mono">{id}</div>
                    </td>
                    <td>
                      {renderRiskBadge(riskLevel, riskScore)}
                    </td>
                    <td>
                      <span className="cell-window">{windowText}</span>
                    </td>
                    <td>
                      <div className="cell-officer">
                        <span className="cell-primary">{officerName}</span>
                      </div>
                    </td>
                    <td>
                      {renderVerificationBadge(verification)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleViewPrediction(id)}
                        className="prediction-action"
                        aria-label={`View details for prediction ${id}`}
                      >
                        <span>VIEW</span>
                        <span aria-hidden="true">→</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
