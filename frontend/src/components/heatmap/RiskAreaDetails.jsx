import React from 'react';
import { useNavigate } from 'react-router-dom';
import { renderRiskBadge, renderVerificationBadge } from '../predictions/PredictionBadges';

/**
 * RiskAreaDetails: Slide-in panel for spatial prediction inspection and 3-tier lifecycle breakdown
 */
export default function RiskAreaDetails({ area = null }) {
  const navigate = useNavigate();

  if (!area) {
    return (
      <div className="risk-detail-panel" aria-label="Risk Area Inspection Panel">
        <div className="empty-state" style={{ padding: '36px 12px' }}>
          <div className="empty-icon" aria-hidden="true">🗺️</div>
          <div className="empty-title">SELECT A RISK AREA</div>
          <div className="empty-subtitle">
            Click any prediction marker on the Chicago map to inspect AI risk scores, historical evidence, and verification status.
          </div>
        </div>
      </div>
    );
  }

  const handleViewPrediction = () => {
    navigate(`/predictions/${area.id}`);
  };

  const handleViewAssignment = () => {
    navigate('/assignments');
  };

  const isVerified = area.verificationStatus === 'VERIFIED' || Boolean(area.actualOutcome);

  return (
    <div className="risk-detail-panel" aria-label={`Inspection Details for Area ${area.area?.communityArea}`}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <span className="identity-id">AREA #{area.area?.communityArea}</span>
          <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '4px 0 2px 0', color: 'var(--text-primary)' }}>
            {area.area?.communityAreaName || `Community Area ${area.area?.communityArea}`}
          </h3>
          <div className="cell-subtext">
            Ward {area.area?.ward} &bull; {area.location?.address}
          </div>
        </div>
        {renderRiskBadge(area.riskLevel)}
      </div>

      {/* Primary Metrics Grid */}
      <div className="meta-grid-2col" style={{ marginBottom: '14px' }}>
        <div className="meta-field">
          <span className="meta-field-label">Predicted Issue</span>
          <span className="meta-field-val" style={{ color: 'var(--accent)' }}>
            {area.complaintType}
          </span>
        </div>

        <div className="meta-field">
          <span className="meta-field-label">Calculated Risk</span>
          <span className="meta-field-val" style={{ color: area.riskScore >= 75 ? '#ff6b6b' : 'var(--text-primary)' }}>
            {area.riskScore} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>/ 100</span>
          </span>
        </div>

        <div className="meta-field">
          <span className="meta-field-label">Forecast Probability</span>
          <span className="meta-field-val">
            {Math.round((area.probability || 0) * 100)}%
          </span>
        </div>

        <div className="meta-field">
          <span className="meta-field-label">Forecast Horizon</span>
          <span className="meta-field-val">
            {area.predictionWindow?.display || 'Next 7 days'}
          </span>
        </div>

        <div className="meta-field">
          <span className="meta-field-label">Historical Baseline</span>
          <span className="meta-field-val">{area.historicalCount} complaints</span>
        </div>

        <div className="meta-field">
          <span className="meta-field-label">Recent Trend</span>
          <span className="meta-field-val">{area.trend || 'Increasing'}</span>
        </div>
      </div>

      {/* 3-Tier Research Distinction: AI Prediction vs Observation vs Evaluation */}
      <div className="detail-section-block">
        <span className="section-block-title">PREDICTION VS FIELD OBSERVATION</span>

        {/* Tier 1: Prediction */}
        <div className="tier-box">
          <div>
            <div className="meta-field-label">1. AI Model Forecast</div>
            <div className="cell-primary" style={{ fontSize: '11px', marginTop: '2px' }}>
              {area.complaintType} ({Math.round((area.probability || 0) * 100)}% prob)
            </div>
          </div>
          <span className="status-badge" style={{ background: 'rgba(77,214,199,0.1)', color: 'var(--accent)' }}>
            FORECAST
          </span>
        </div>

        {/* Tier 2: Observation */}
        <div className="tier-box">
          <div>
            <div className="meta-field-label">2. Field Observation</div>
            <div
              className="cell-primary"
              style={{
                fontSize: '11px',
                marginTop: '2px',
                color: isVerified ? '#4dd6a8' : 'var(--text-muted)',
              }}
            >
              {area.actualOutcome
                ? area.actualOutcome.replace(/_/g, ' ')
                : 'Awaiting onsite verification'}
            </div>
          </div>
          {renderVerificationBadge(area.verificationStatus)}
        </div>

        {/* Tier 3: Evaluation */}
        <div className="tier-box">
          <div>
            <div className="meta-field-label">3. Ground Truth Evaluation</div>
            <div className="cell-primary" style={{ fontSize: '11px', marginTop: '2px' }}>
              {area.evaluation ? area.evaluation.replace(/_/g, ' ') : 'Waiting for verification'}
            </div>
          </div>
          <span
            className="status-badge"
            style={{
              background: isVerified ? 'rgba(77,214,168,0.1)' : 'rgba(255,255,255,0.03)',
              color: isVerified ? '#4dd6a8' : 'var(--text-muted)',
            }}
          >
            {area.evaluation || 'WAITING'}
          </span>
        </div>
      </div>

      {/* Assigned Officer Context */}
      <div className="detail-section-block">
        <span className="section-block-title">OFFICER DISPATCH STATUS</span>
        <div className="tier-box">
          <div>
            <div className="cell-primary" style={{ fontSize: '11.5px' }}>
              {area.officer?.name || 'OFFICER NOT ASSIGNED'}
            </div>
            {area.officer?.name && (
              <div className="cell-subtext" style={{ marginTop: '2px' }}>
                {area.officer.department} &bull; {area.officer.distanceKm} km away
              </div>
            )}
          </div>
          <span className="status-badge" style={{ background: 'rgba(104,179,232,0.1)', color: '#68b3e8' }}>
            {area.assignmentStatus || 'UNASSIGNED'}
          </span>
        </div>
      </div>

      {/* Navigation Actions */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '18px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <button
          type="button"
          onClick={handleViewPrediction}
          className="btn-apply-filters"
          style={{ flex: 1 }}
        >
          VIEW PREDICTION →
        </button>
        {area.officer?.name && (
          <button
            type="button"
            onClick={handleViewAssignment}
            className="btn-reset-filters"
          >
            DISPATCH CONSOLE
          </button>
        )}
      </div>
    </div>
  );
}
