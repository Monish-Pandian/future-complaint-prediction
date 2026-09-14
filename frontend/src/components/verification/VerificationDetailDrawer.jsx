import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  renderVerificationOutcomeBadge,
  renderVerificationLifecycleBadge,
  renderEvaluationBadge,
  renderFeedbackPill,
} from './VerificationBadges';
import { renderRiskBadge } from '../predictions/PredictionBadges';

/**
 * VerificationDetailDrawer: Comprehensive slide-in drawer for inspecting Ground Truth Verification Assessments
 */
export default function VerificationDetailDrawer({ verification, onClose }) {
  const navigate = useNavigate();

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!verification) return null;

  const pred = verification.prediction || {};
  const officer = verification.officer || {};
  const asgn = verification.assignment || {};
  const evalData = verification.evaluation || {};
  const feedback = verification.feedback || {};

  const riskLevel = pred.riskLevel || 'LOW';
  const probPercent = pred.probability !== undefined
    ? Math.round(pred.probability * 100)
    : pred.riskScore || 50;

  return (
    <div className="verif-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="verif-drawer-title">
      <div className="verif-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="verif-drawer-header">
          <div>
            <div className="auth-label" style={{ marginBottom: '2px' }}>
              GROUND TRUTH VERIFICATION ASSESSMENT
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 id="verif-drawer-title" style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                {verification.verificationId}
              </h2>
              {renderVerificationOutcomeBadge(verification.outcome)}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
              Recorded: {new Date(verification.verifiedAt).toLocaleString()}
            </div>
          </div>
          <button
            type="button"
            className="verif-drawer-close"
            onClick={onClose}
            aria-label="Close Verification Assessment Drawer"
          >
            ✕
          </button>
        </div>

        {/* Drawer Content */}
        <div className="verif-drawer-content">
          {/* SECTION F: BEFORE / AFTER COMPARISON (Prediction vs Field Outcome) */}
          <div className="verif-comparison-card">
            <div className="verif-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 3 21 3 21 8"></polyline>
                <line x1="4" y1="20" x2="21" y2="3"></line>
                <polyline points="21 16 21 21 16 21"></polyline>
                <line x1="15" y1="15" x2="21" y2="21"></line>
                <line x1="4" y1="4" x2="9" y2="9"></line>
              </svg>
              Prediction vs Field Ground Truth
            </div>
            <div className="verif-comparison-grid">
              <div className="verif-comparison-col">
                <span className="verif-comparison-label">AI PREDICTION</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                  {renderRiskBadge(riskLevel)}
                  <span className="font-mono text-bold" style={{ fontSize: '12px' }}>{probPercent}%</span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {pred.complaintType || 'Civic Issue'}
                </div>
              </div>

              <div className="verif-comparison-arrow" aria-hidden="true">→</div>

              <div className="verif-comparison-col">
                <span className="verif-comparison-label">FIELD OUTCOME</span>
                <div style={{ margin: '4px 0' }}>
                  {renderVerificationOutcomeBadge(verification.outcome)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Severity: {verification.severity || 'MEDIUM'}
                </div>
              </div>

              <div className="verif-comparison-arrow" aria-hidden="true">→</div>

              <div className="verif-comparison-col">
                <span className="verif-comparison-label">EVALUATION</span>
                <div style={{ margin: '4px 0' }}>
                  {renderEvaluationBadge(evalData.classification)}
                </div>
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {feedback.feedbackType ? feedback.feedbackType.replace('FEEDBACK_', '') : 'VERIFIED'}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION A: ORIGINAL PREDICTION */}
          <div className="verif-section-card">
            <div className="verif-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
              Section A — Original Prediction Context
            </div>
            <div className="verif-detail-grid">
              <div className="verif-detail-item">
                <span className="verif-detail-label">Prediction Ref</span>
                <span className="verif-detail-val font-mono" style={{ color: '#60a5fa' }}>
                  {pred.predictionId || 'PRED-UNKNOWN'}
                </span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Model Version</span>
                <span className="verif-detail-val font-mono" style={{ color: '#a78bfa' }}>
                  xgb-test-v1
                </span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Complaint Category</span>
                <span className="verif-detail-val">{pred.complaintType || 'Civic Infrastructure'}</span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Forecast Probability</span>
                <span className="verif-detail-val font-mono" style={{ color: '#fbbf24' }}>
                  {probPercent}% (Risk Score: {pred.riskScore ?? 50})
                </span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Community Area</span>
                <span className="verif-detail-val">{pred.communityArea || 'Chicago'}</span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Ward</span>
                <span className="verif-detail-val font-mono">{pred.ward || 'Ward 1'}</span>
              </div>
            </div>
          </div>

          {/* SECTION B: FIELD ASSIGNMENT */}
          <div className="verif-section-card">
            <div className="verif-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Section B — Field Assignment & Dispatch
            </div>
            <div className="verif-detail-grid">
              <div className="verif-detail-item">
                <span className="verif-detail-label">Assigned Officer</span>
                <span className="verif-detail-val">{officer.name || 'Unassigned'}</span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Officer ID / Code</span>
                <span className="verif-detail-val font-mono" style={{ color: '#38bdf8' }}>
                  {officer.officerId || 'OFF-N/A'} ({officer.employeeCode || 'EMP-N/A'})
                </span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Department</span>
                <span className="verif-detail-val">{officer.department || pred.department || 'Municipal'}</span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Officer Contact</span>
                <span className="verif-detail-val font-mono">{officer.phone || '+1-312-555-0100'}</span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Assignment ID</span>
                <span className="verif-detail-val font-mono" style={{ color: '#4dd6c7' }}>
                  {asgn.assignmentId || 'ASGN-LINKED'}
                </span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Dispatch Distance</span>
                <span className="verif-detail-val font-mono">
                  {asgn.distanceKm !== undefined ? `${asgn.distanceKm.toFixed(1)} km` : '1.2 km'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION C: FIELD VERIFICATION & EVIDENCE */}
          <div className="verif-section-card">
            <div className="verif-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              Section C — Field Verification & Evidence
            </div>
            <div className="verif-detail-grid">
              <div className="verif-detail-item">
                <span className="verif-detail-label">Verification Status</span>
                <div>{renderVerificationLifecycleBadge(asgn.status || 'COMPLETED')}</div>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Observed Outcome</span>
                <div>{renderVerificationOutcomeBadge(verification.outcome)}</div>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Field Severity</span>
                <span className="verif-detail-val">{verification.severity || 'MEDIUM'}</span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">GPS Verification</span>
                <span className="verif-detail-val" style={{ color: verification.gpsAvailable ? '#10b981' : 'var(--text-muted)' }}>
                  {verification.gpsAvailable ? '✓ GPS Validated' : 'Location Verified'}
                </span>
              </div>
            </div>

            {/* Field Notes */}
            <div className="verif-notes-box">
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Inspector On-Site Observations:
              </strong>
              {verification.notes || 'Field verification logged by on-site municipal inspector.'}
            </div>

            {/* Evidence Metadata */}
            <div className="verif-evidence-box">
              <span className="verif-detail-label" style={{ display: 'block', marginBottom: '4px' }}>
                Operational Evidence Metadata:
              </span>
              {verification.evidenceUrl ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="font-mono text-bold" style={{ color: '#38bdf8' }}>Attachment:</span>
                  <a href={verification.evidenceUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>
                    {verification.evidenceUrl}
                  </a>
                </div>
              ) : (
                <span className="text-muted" style={{ fontSize: '12px' }}>
                  No evidence metadata available
                </span>
              )}
            </div>
          </div>

          {/* SECTION D: AI EVALUATION */}
          <div className="verif-section-card">
            <div className="verif-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              Section D — Prediction Evaluation Matrix
            </div>
            <div className="verif-detail-grid">
              <div className="verif-detail-item">
                <span className="verif-detail-label">Evaluation Classification</span>
                <div>{renderEvaluationBadge(evalData.classification)}</div>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Evaluation Identifier</span>
                <span className="verif-detail-val font-mono" style={{ fontSize: '12px' }}>
                  {evalData.evaluationId || 'EVAL-N/A'}
                </span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Ground Truth Mapping</span>
                <span className="verif-detail-val font-mono" style={{ fontSize: '11.5px' }}>
                  {verification.outcome || 'CONFIRMED'} → {evalData.classification || 'TRUE_POSITIVE'}
                </span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Evaluated At</span>
                <span className="verif-detail-val" style={{ fontSize: '12px' }}>
                  {evalData.evaluatedAt ? new Date(evalData.evaluatedAt).toLocaleString() : 'Automated Pipeline'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION E: FEEDBACK SIGNAL */}
          <div className="verif-section-card">
            <div className="verif-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              Section E — Model Feedback Ingestion
            </div>
            <div className="verif-detail-grid">
              <div className="verif-detail-item">
                <span className="verif-detail-label">Feedback Ingestion State</span>
                <div>{renderFeedbackPill(feedback.feedbackStatus)}</div>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Feedback Signal Type</span>
                <span className="verif-detail-val font-mono" style={{ fontSize: '11px', color: '#c4b5fd' }}>
                  {feedback.feedbackType || 'VERIFIED_OBSERVATION'}
                </span>
              </div>
            </div>
            <div className="verif-feedback-box">
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Feature Store Integration Notes:
              </strong>
              {feedback.notes || 'Signal registered in feature store buffer for periodic model retraining.'}
            </div>
          </div>

          {/* SECTION G: OPERATIONAL DEEP LINKS */}
          <div className="verif-nav-actions">
            <button
              type="button"
              className="verification-btn verification-btn-secondary"
              onClick={() => navigate('/risk-map')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                <line x1="8" y1="2" x2="8" y2="18"></line>
                <line x1="16" y1="6" x2="16" y2="22"></line>
              </svg>
              View on Risk Map
            </button>
            <button
              type="button"
              className="verification-btn verification-btn-secondary"
              onClick={() => navigate('/predictions')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
              View Prediction
            </button>
            {asgn.assignmentId && (
              <button
                type="button"
                className="verification-btn verification-btn-secondary"
                onClick={() => navigate('/assignments')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="8.5" cy="7" r="4"></circle>
                </svg>
                View Assignment
              </button>
            )}
            {evalData.evaluationId && (
              <button
                type="button"
                className="verification-btn verification-btn-secondary"
                onClick={() => navigate('/evaluations')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 14 14"></polyline>
                </svg>
                View Evaluation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
