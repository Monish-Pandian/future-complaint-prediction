import React from 'react';
import { useNavigate } from 'react-router-dom';
import { renderVerificationBadge } from './PredictionBadges';

/**
 * PredictionVerification: Multi-stage timeline separating prediction, dispatch, and ground-truth observation
 */
export default function PredictionVerification({
  prediction = {},
  assignment = {},
  verification = {},
}) {
  const navigate = useNavigate();

  const handleOpenVerification = () => {
    navigate('/verification');
  };

  const isVerified = verification?.status === 'VERIFIED' || Boolean(verification?.outcome);

  return (
    <div className="info-card" aria-label="Field Verification Pipeline">
      <div className="info-card-header">
        <h3 className="info-card-title">FIELD VERIFICATION STATUS</h3>
        {renderVerificationBadge(verification?.status)}
      </div>

      {/* Multi-Stage Breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        <div className="signal-card" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="meta-field-label">1. AI Forecasted Prediction</div>
            <div className="cell-primary" style={{ marginTop: '2px' }}>
              {prediction.complaintType} ({Math.round((prediction.probability || 0.87) * 100)}% prob)
            </div>
          </div>
          <span className="status-badge" style={{ background: 'rgba(77,214,199,0.1)', color: 'var(--accent)' }}>
            FORECAST
          </span>
        </div>

        <div className="signal-card" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="meta-field-label">2. Officer Assignment</div>
            <div className="cell-primary" style={{ marginTop: '2px' }}>
              {assignment.officerName || 'Awaiting Assignment'}
            </div>
          </div>
          <span className="status-badge" style={{ background: 'rgba(104,179,232,0.1)', color: '#68b3e8' }}>
            {assignment.status || 'UNASSIGNED'}
          </span>
        </div>

        <div className="signal-card" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="meta-field-label">3. Ground Truth Verification</div>
            <div className="cell-primary" style={{ marginTop: '2px' }}>
              {verification.notes || (isVerified ? 'Verification Complete' : 'Awaiting Onsite Inspection')}
            </div>
          </div>
          <span className="status-badge" style={{ background: 'rgba(236,208,111,0.1)', color: '#ecd06f' }}>
            {verification.status || 'PENDING'}
          </span>
        </div>

        <div className="signal-card" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="meta-field-label">4. Actual Ground Truth Outcome</div>
            <div
              className="cell-primary"
              style={{
                marginTop: '2px',
                color: isVerified ? '#4dd6a8' : 'var(--text-muted)',
              }}
            >
              {verification.outcome
                ? verification.outcome.replace('_', ' ')
                : 'Not available (pending observation)'}
            </div>
          </div>
          <span
            className="status-badge"
            style={{
              background: isVerified ? 'rgba(77,214,168,0.1)' : 'rgba(255,255,255,0.03)',
              color: isVerified ? '#4dd6a8' : 'var(--text-muted)',
            }}
          >
            {verification.evaluation || 'WAITING'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
        <button
          type="button"
          onClick={handleOpenVerification}
          className="prediction-action"
          aria-label="Open verification log console"
        >
          <span>OPEN VERIFICATION LOG</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
