import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RiskBadge, AssignmentStatusBadge } from '../common/Badge';
import { renderVerificationBadge } from './PredictionBadges';
import Button from '../common/Button';

export default function PredictionDetailDrawer({
  prediction = null,
  onClose,
}) {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!prediction) return null;

  const id = prediction.predictionId || prediction.id || prediction._id;
  const caName = prediction.communityArea || prediction.area?.communityAreaName || `Area ${prediction.area?.communityArea || 'N/A'}`;
  const ward = prediction.ward || prediction.area?.ward || 'Ward N/A';
  const prob = typeof prediction.probability === 'number'
    ? `${(prediction.probability * 100).toFixed(2)}%`
    : '—';
  const score = typeof prediction.riskScore === 'number'
    ? prediction.riskScore.toFixed(1)
    : typeof prediction.probability === 'number'
    ? (prediction.probability * 100).toFixed(1)
    : '0.0';
  const confidence = typeof prediction.confidence === 'number'
    ? `${(prediction.confidence * 100).toFixed(1)}%`
    : '88.0%';
  const lat = prediction.location?.lat ?? (prediction.location?.coordinates ? prediction.location.coordinates[1] : 41.8781);
  const lng = prediction.location?.lng ?? (prediction.location?.coordinates ? prediction.location.coordinates[0] : -87.6298);

  const assignment = prediction.assignment || {};
  const officer = prediction.assignedOfficer || assignment.assignedOfficer || {};
  const verification = prediction.verification || {};
  const evaluation = prediction.evaluation || {};

  return (
    <div className="drawer-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Prediction Assessment Drawer">
      <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="drawer-header">
          <div className="drawer-header-left">
            <div className="drawer-header-badges">
              <RiskBadge level={prediction.riskLevel} />
              <span className="font-mono text-muted" style={{ fontSize: '11px' }}>
                ID: {id}
              </span>
            </div>
            <h2 className="drawer-title">{prediction.complaintType || 'Civic Complaint'}</h2>
            <p className="drawer-subtitle">{caName} • {ward.startsWith('Ward') ? ward : `Ward ${ward}`}</p>
          </div>

          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close drawer"
          >
            ✕
          </button>
        </div>

        {/* Drawer Body */}
        <div className="drawer-body">
          {/* 1. Core Risk & Probability Telemetry */}
          <div className="drawer-section">
            <h4 className="drawer-section-title">Machine Learning Assessment</h4>
            <div className="drawer-metric-grid">
              <div className="drawer-metric-box">
                <span className="drawer-metric-label">Model Probability</span>
                <div className="drawer-metric-val font-mono" style={{ color: 'var(--accent-text)' }}>
                  {prob}
                </div>
                <span className="drawer-metric-sub">Calibrated AI Forecast Output</span>
              </div>

              <div className="drawer-metric-box">
                <span className="drawer-metric-label">Composite Risk Score</span>
                <div className="drawer-metric-val font-mono" style={{ color: 'var(--text-primary)' }}>
                  {score} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ 100</span>
                </div>
                <span className="drawer-metric-sub">Classification Cutoff: 0.38</span>
              </div>

              <div className="drawer-metric-box">
                <span className="drawer-metric-label">Confidence Interval</span>
                <div className="drawer-metric-val font-mono">
                  {confidence}
                </div>
                <span className="drawer-metric-sub">Model Reliability Metric</span>
              </div>
            </div>
          </div>

          {/* 2. Spatial & Department Specs */}
          <div className="drawer-section">
            <h4 className="drawer-section-title">Spatial & Departmental Context</h4>
            <div className="drawer-specs-table">
              <div className="drawer-spec-row">
                <span className="drawer-spec-label">Community Area</span>
                <span className="drawer-spec-val">{caName}</span>
              </div>
              <div className="drawer-spec-row">
                <span className="drawer-spec-label">Municipal Ward</span>
                <span className="drawer-spec-val">{ward}</span>
              </div>
              <div className="drawer-spec-row">
                <span className="drawer-spec-label">Responsible Department</span>
                <span className="drawer-spec-val">{prediction.department || 'Municipal Operations'}</span>
              </div>
              <div className="drawer-spec-row">
                <span className="drawer-spec-label">Geo Coordinates</span>
                <span className="drawer-spec-val font-mono">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
              </div>
              <div className="drawer-spec-row">
                <span className="drawer-spec-label">Forecast Window</span>
                <span className="drawer-spec-val font-mono">
                  {prediction.predictionWindow?.display || prediction.predictionDate || 'Next 7 Days'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Operational Dispatch & Ground Truth */}
          <div className="drawer-section">
            <h4 className="drawer-section-title">Operational Workflow Integration</h4>
            <div className="drawer-ops-grid">
              {/* Officer Assignment Card */}
              <div className="drawer-op-card">
                <div className="drawer-op-header">
                  <span className="drawer-op-type">AI DISPATCH ASSIGNMENT</span>
                  <AssignmentStatusBadge status={assignment.status || prediction.assignmentStatus || 'UNASSIGNED'} />
                </div>
                <div className="drawer-op-content">
                  {officer.name ? (
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{officer.name}</div>
                      <div className="text-muted" style={{ fontSize: '11px' }}>
                        {officer.department || 'Field Ops'} • {officer.employeeCode || 'OFFICER'}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted" style={{ margin: 0, fontSize: '12px' }}>
                      Not yet assigned to field officer.
                    </p>
                  )}
                </div>
                <div className="drawer-op-action">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      onClose();
                      navigate('/assignments');
                    }}
                  >
                    View in Assignments →
                  </Button>
                </div>
              </div>

              {/* Ground Truth Verification Card */}
              <div className="drawer-op-card">
                <div className="drawer-op-header">
                  <span className="drawer-op-type">FIELD VERIFICATION</span>
                  {renderVerificationBadge(verification.status || prediction.verificationStatus || 'UNASSIGNED')}
                </div>
                <div className="drawer-op-content">
                  {verification.outcome ? (
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        Outcome: {verification.outcome.replace(/_/g, ' ')}
                      </div>
                      {verification.notes && (
                        <div className="text-muted" style={{ fontSize: '11.5px', marginTop: '2px' }}>
                          "{verification.notes}"
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted" style={{ margin: 0, fontSize: '12px' }}>
                      Awaiting field inspection and evidence log.
                    </p>
                  )}
                </div>
                <div className="drawer-op-action">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      onClose();
                      navigate('/verification');
                    }}
                  >
                    View in Verification →
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="drawer-footer">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close Assessment
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onClose();
              navigate('/risk-map');
            }}
          >
            Locate on Risk Map
          </Button>
        </div>
      </div>
    </div>
  );
}
