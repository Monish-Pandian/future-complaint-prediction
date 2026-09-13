import React from 'react';
import {
  renderVerificationOutcomeBadge,
  renderEvaluationBadge,
  renderFeedbackPill,
} from './VerificationBadges';
import { renderRiskBadge } from '../predictions/PredictionBadges';

/**
 * VerificationDetailsModal: 5-tier slide-in drawer detailing Prediction, Assignment, Verification, AI Evaluation, and Feedback Pipeline
 */
export default function VerificationDetailsModal({ verification, onClose }) {
  if (!verification) return null;

  const pred = verification.prediction || {};
  const officer = verification.officer || {};
  const asgn = verification.assignment || {};
  const evalData = verification.evaluation || {};
  const feedback = verification.feedback || {};

  return (
    <div className="verif-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="verif-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="verif-drawer-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: '800', color: '#10b981' }}>
                {verification.verificationId}
              </span>
              {renderVerificationOutcomeBadge(verification.outcome)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Verified: {new Date(verification.verifiedAt).toLocaleString()}
            </div>
          </div>
          <button
            type="button"
            className="verif-drawer-close"
            onClick={onClose}
            aria-label="Close detail modal"
          >
            ✕
          </button>
        </div>

        {/* Drawer Content */}
        <div className="verif-drawer-content">
          {/* SECTION 1: PREDICTION INTEL */}
          <div className="verif-section-card">
            <div className="verif-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
              1. Forecast Prediction Intel
            </div>
            <div className="verif-detail-grid">
              <div className="verif-detail-item">
                <span className="verif-detail-label">Complaint Type</span>
                <span className="verif-detail-val">{pred.complaintType || 'Civic Infrastructure'}</span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Prediction Ref</span>
                <span className="verif-detail-val" style={{ fontFamily: 'var(--font-mono)', color: '#68b3e8' }}>
                  {pred.predictionId || 'N/A'}
                </span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Forecast Risk Severity</span>
                <div>{renderRiskBadge(pred.riskLevel || 'LOW')}</div>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Forecast Probability</span>
                <span className="verif-detail-val" style={{ fontFamily: 'var(--font-mono)', color: '#ffd166' }}>
                  {Math.round((pred.probability ?? 0.5) * 100)}% (Risk Score: {pred.riskScore ?? 50})
                </span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Community Area</span>
                <span className="verif-detail-val">{pred.communityArea || 'Chicago'}</span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Ward</span>
                <span className="verif-detail-val">{pred.ward || 'Ward 1'}</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: ASSIGNED OFFICER CONTEXT */}
          <div className="verif-section-card">
            <div className="verif-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              2. Assigned Officer & Dispatch Link
            </div>
            <div className="verif-detail-grid">
              <div className="verif-detail-item">
                <span className="verif-detail-label">Inspector Name</span>
                <span className="verif-detail-val">{officer.name || 'Unassigned'}</span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Officer ID</span>
                <span className="verif-detail-val" style={{ fontFamily: 'var(--font-mono)', color: '#68b3e8' }}>
                  {officer.officerId || 'OFF-N/A'} ({officer.employeeCode || 'N/A'})
                </span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Department</span>
                <span className="verif-detail-val">{officer.department || pred.department || 'Municipal'}</span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Linked Dispatch</span>
                <span className="verif-detail-val" style={{ fontFamily: 'var(--font-mono)', color: '#4dd6c7' }}>
                  {asgn.assignmentId || 'ASGN-LINKED'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: GROUND TRUTH VERIFICATION EVIDENCE */}
          <div className="verif-section-card">
            <div className="verif-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              3. Field Verification Observation & Evidence
            </div>
            <div className="verif-detail-grid">
              <div className="verif-detail-item">
                <span className="verif-detail-label">Observed Outcome</span>
                <div>{renderVerificationOutcomeBadge(verification.outcome)}</div>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Verified Severity</span>
                <span className="verif-detail-val">{verification.severity || 'MEDIUM'}</span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">GPS Fix</span>
                <span className="verif-detail-val" style={{ color: verification.gpsAvailable ? '#4dd6a8' : 'var(--text-muted)' }}>
                  {verification.gpsAvailable ? '✓ GPS Validated' : 'Manual Entry'}
                </span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Coordinates</span>
                <span className="verif-detail-val" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                  {verification.location?.lat?.toFixed(4)}, {verification.location?.lng?.toFixed(4)}
                </span>
              </div>
            </div>
            <div className="verif-notes-box">
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Inspector Ground Notes:
              </strong>
              {verification.notes || 'No notes provided by field inspector.'}
            </div>
          </div>

          {/* SECTION 4: AI EVALUATION CLASSIFICATION MATRIX */}
          <div className="verif-section-card">
            <div className="verif-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              4. AI Evaluation Matrix
            </div>
            <div className="verif-detail-grid">
              <div className="verif-detail-item">
                <span className="verif-detail-label">Evaluation Classification</span>
                <div>{renderEvaluationBadge(evalData.classification)}</div>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Evaluation ID</span>
                <span className="verif-detail-val" style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                  {evalData.evaluationId || 'EVAL-N/A'}
                </span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Forecast vs Actual</span>
                <span className="verif-detail-val" style={{ fontSize: '12px' }}>
                  PREDICTED → {verification.outcome ? verification.outcome.replace('_', ' ') : 'OBSERVED'}
                </span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Evaluated At</span>
                <span className="verif-detail-val" style={{ fontSize: '12px' }}>
                  {evalData.evaluatedAt ? new Date(evalData.evaluatedAt).toLocaleString() : 'Automated'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 5: FEEDBACK SIGNAL STORE */}
          <div className="verif-section-card">
            <div className="verif-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              5. Feedback Signal Store & Model Pipeline
            </div>
            <div className="verif-detail-grid">
              <div className="verif-detail-item">
                <span className="verif-detail-label">Feedback Pipeline State</span>
                <div>{renderFeedbackPill(feedback.feedbackStatus)}</div>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Signal Type</span>
                <span className="verif-detail-val" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#c4b5fd' }}>
                  {feedback.feedbackType || 'FEEDBACK_TRUE_POSITIVE'}
                </span>
              </div>
            </div>
            <div className="verif-feedback-box">
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Feedback Ingestion Log:
              </strong>
              {feedback.notes || 'Signal registered in feature store buffer for periodic model retraining.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
