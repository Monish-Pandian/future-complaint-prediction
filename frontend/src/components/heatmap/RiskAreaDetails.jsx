import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import { RiskBadge, AssignmentStatusBadge } from '../common/Badge';
import { renderVerificationBadge } from '../predictions/PredictionBadges';
import Button from '../common/Button';

export default function RiskAreaDetails({ area = null }) {
  const navigate = useNavigate();

  if (!area) {
    return (
      <Card
        title="Community Area Intelligence"
        subtitle="Select a map marker or top risk cluster to inspect spatial risk factors"
        className="risk-detail-card"
      >
        <div className="empty-state" style={{ padding: '36px 16px' }}>
          <div className="empty-state-icon" aria-hidden="true">
            🗺️
          </div>
          <h4 className="empty-state-title">No Community Area Selected</h4>
          <p className="empty-state-desc">
            Click any prediction cluster on the Chicago map or choose an area from the Top Risk list to inspect AI risk scores, operational priority, and field verification status.
          </p>
        </div>
      </Card>
    );
  }

  const caNum = area.area?.communityArea || area.communityArea || 'N/A';
  const caName = area.area?.communityAreaName || area.communityAreaName || `Community Area ${caNum}`;
  const ward = area.area?.ward || area.ward || 'Ward N/A';
  const lat = area.location?.lat ?? (area.location?.coordinates ? area.location.coordinates[1] : 41.8781);
  const lng = area.location?.lng ?? (area.location?.coordinates ? area.location.coordinates[0] : -87.6298);
  const prob = typeof area.probability === 'number'
    ? `${(area.probability * 100).toFixed(1)}%`
    : `${area.riskScore}%`;
  const score = typeof area.riskScore === 'number' ? area.riskScore.toFixed(1) : '—';

  return (
    <Card
      title="Community Area Intelligence"
      subtitle="Detailed spatial risk assessment and operational integration"
      className="risk-detail-card"
      actions={<RiskBadge level={area.riskLevel} />}
    >
      {/* Header Info */}
      <div className="area-intel-header">
        <div>
          <span className="font-mono text-muted" style={{ fontSize: '10.5px', fontWeight: '700' }}>
            COMMUNITY AREA #{caNum}
          </span>
          <h3 className="area-intel-title">{caName}</h3>
          <p className="area-intel-sub">
            {ward.startsWith('Ward') ? ward : `Ward ${ward}`} • {area.location?.address || `${caName}, Chicago, IL`}
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="area-metrics-grid">
        <div className="area-metric-box">
          <span className="area-metric-label">Predicted Issue</span>
          <div className="area-metric-val" style={{ color: 'var(--accent-text)', fontSize: '13px' }}>
            {area.complaintType}
          </div>
          <span className="area-metric-sub">{area.department || 'Municipal Operations'}</span>
        </div>

        <div className="area-metric-box">
          <span className="area-metric-label">Composite Risk</span>
          <div className="area-metric-val font-mono">
            {score} <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ 100</span>
          </div>
          <span className="area-metric-sub">Cutoff: 0.38</span>
        </div>

        <div className="area-metric-box">
          <span className="area-metric-label">Forecast Probability</span>
          <div className="area-metric-val font-mono" style={{ color: 'var(--accent-text)' }}>
            {prob}
          </div>
          <span className="area-metric-sub">Calibrated Model</span>
        </div>

        <div className="area-metric-box">
          <span className="area-metric-label">Forecast Horizon</span>
          <div className="area-metric-val font-mono" style={{ fontSize: '12px' }}>
            {area.predictionWindow?.display || area.predictionDate || 'Next 7 Days'}
          </div>
          <span className="area-metric-sub">Rolling Cycle</span>
        </div>
      </div>

      {/* Spatial Coordinates */}
      <div className="area-specs-table">
        <div className="area-spec-row">
          <span className="area-spec-label">Centroid Coordinates</span>
          <span className="area-spec-val font-mono">{typeof lat === 'number' ? lat.toFixed(4) : lat}, {typeof lng === 'number' ? lng.toFixed(4) : lng}</span>
        </div>
        <div className="area-spec-row">
          <span className="area-spec-label">Responsible Dept</span>
          <span className="area-spec-val">{area.department || 'Streets & Sanitation'}</span>
        </div>
      </div>

      {/* Operational Integration */}
      <div className="area-ops-section">
        <span className="area-ops-section-title font-mono">OPERATIONAL STATUS</span>

        <div className="area-ops-card">
          <div className="area-op-row">
            <span className="area-op-label">AI Dispatch Assignment:</span>
            <AssignmentStatusBadge status={area.assignmentStatus || 'UNASSIGNED'} />
          </div>
          {area.officer?.name && (
            <div className="area-op-officer">
              Assigned: <strong>{area.officer.name}</strong> ({area.officer.department || 'Field Ops'})
            </div>
          )}

          <div className="area-op-row" style={{ marginTop: '8px' }}>
            <span className="area-op-label">Ground Truth Verification:</span>
            {renderVerificationBadge(area.verificationStatus || 'PENDING')}
          </div>

          {area.evaluation && area.evaluation !== 'WAITING' && (
            <div className="area-op-row" style={{ marginTop: '8px' }}>
              <span className="area-op-label">Model Evaluation:</span>
              <span className="font-mono text-bold" style={{ fontSize: '11px', color: area.evaluation === 'TRUE_POSITIVE' ? 'var(--success)' : 'var(--warning)' }}>
                {area.evaluation}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Context Navigation Links */}
      <div className="area-actions-grid">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/predictions')}
        >
          View in Predictions →
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/assignments')}
        >
          View in Assignments →
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/verification')}
        >
          View in Verification →
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/evaluations')}
        >
          View in Evaluation →
        </Button>
      </div>
    </Card>
  );
}
