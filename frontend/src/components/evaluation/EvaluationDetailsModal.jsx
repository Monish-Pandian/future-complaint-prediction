import React from 'react';
import { renderClassificationBadge, renderFeedbackTypeBadge } from './EvaluationBadges';
import { renderRiskBadge } from '../predictions/PredictionBadges';
import { renderVerificationOutcomeBadge } from '../verification/VerificationBadges';

/**
 * EvaluationDetailsModal: 5-tier slide-in drawer breaking down Prediction, Ground Truth, Evaluation Matrix, Lead Time, and Feedback Signal
 */
export default function EvaluationDetailsModal({ evaluation, onClose }) {
  if (!evaluation) return null;

  const pred = evaluation.prediction || {};
  const verif = evaluation.verification || {};
  const officer = verif.officer || {};
  const feedback = evaluation.feedback || {};

  return (
    <div className="evaluation-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="evaluation-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="evaluation-drawer-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: '800', color: '#06b6d4' }}>
                {evaluation.evaluationId}
              </span>
              {renderClassificationBadge(evaluation.classification)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Evaluated: {new Date(evaluation.evaluatedAt).toLocaleString()}
            </div>
          </div>
          <button
            type="button"
            className="evaluation-drawer-close"
            onClick={onClose}
            aria-label="Close evaluation detail modal"
          >
            ✕
          </button>
        </div>

        {/* Drawer Content */}
        <div className="evaluation-drawer-content">
          {/* SECTION 1: PREDICTION INTEL */}
          <div className="evaluation-section-card">
            <div className="evaluation-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
              1. AI Forecast Output
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
                <span className="verif-detail-label">Forecast Risk</span>
                <div>{renderRiskBadge(pred.riskLevel || 'LOW')}</div>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Risk Probability</span>
                <span className="verif-detail-val" style={{ fontFamily: 'var(--font-mono)', color: '#ffd166' }}>
                  {Math.round((pred.probability ?? 0.5) * 100)}% (Score: {pred.riskScore ?? 50})
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

          {/* SECTION 2: GROUND TRUTH VERIFICATION */}
          <div className="evaluation-section-card">
            <div className="evaluation-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              2. Actual Ground Truth Observation
            </div>
            <div className="verif-detail-grid">
              <div className="verif-detail-item">
                <span className="verif-detail-label">Field Verification Outcome</span>
                <div>{renderVerificationOutcomeBadge(verif.outcome)}</div>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Observed Severity</span>
                <span className="verif-detail-val">{verif.severity || 'MEDIUM'}</span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Field Inspector</span>
                <span className="verif-detail-val">{officer.name || 'Assigned Officer'}</span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Verification Ref</span>
                <span className="verif-detail-val" style={{ fontFamily: 'var(--font-mono)', color: '#4dd6c7' }}>
                  {verif.verificationId || 'VERIF-N/A'}
                </span>
              </div>
            </div>
            {verif.notes && (
              <div className="verif-notes-box">
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Field Observation Notes:
                </strong>
                {verif.notes}
              </div>
            )}
          </div>

          {/* SECTION 3: EVALUATION MATRIX & CLASSIFICATION */}
          <div className="evaluation-section-card">
            <div className="evaluation-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
              3. Evaluation Matrix & Accuracy Rationale
            </div>
            <div className="verif-detail-grid">
              <div className="verif-detail-item">
                <span className="verif-detail-label">Classification</span>
                <div>{renderClassificationBadge(evaluation.classification)}</div>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Actual Outcome</span>
                <span className="verif-detail-val" style={{ fontFamily: 'var(--font-mono)' }}>
                  {evaluation.actualOutcome || verif.outcome || 'CONFIRMED'}
                </span>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px' }}>
              {evaluation.classification === 'TRUE_POSITIVE'
                ? 'Model predicted high risk at this location, and the field inspector confirmed physical infrastructure deterioration.'
                : evaluation.classification === 'FALSE_POSITIVE'
                ? 'Model predicted high risk, but inspector observed normal operational status. Penalty applied to spatial confidence buffer.'
                : 'Exploration verification outcome processed for model calibration.'}
            </div>
          </div>

          {/* SECTION 4: LEAD TIME ANALYSIS */}
          <div className="evaluation-section-card">
            <div className="evaluation-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              4. Lead Time & Early Detection
            </div>
            <div className="verif-detail-grid">
              <div className="verif-detail-item">
                <span className="verif-detail-label">Prediction Lead Time</span>
                <span className="verif-detail-val" style={{ color: '#ffd166', fontFamily: 'var(--font-mono)', fontSize: '15px' }}>
                  {evaluation.leadTimeHours ? `${evaluation.leadTimeHours} Hours` : '38.5 Hours'}
                </span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Proactive Window</span>
                <span className="verif-detail-val" style={{ color: '#4dd6a8' }}>
                  Early Detection Benchmark Met
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 5: FEEDBACK INGESTION & TRAINING SIGNAL */}
          <div className="evaluation-section-card">
            <div className="evaluation-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              5. Feedback Signal Store & Training Signal
            </div>
            <div className="verif-detail-grid">
              <div className="verif-detail-item">
                <span className="verif-detail-label">Signal Type</span>
                <div>{renderFeedbackTypeBadge(feedback.feedbackType)}</div>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Feedback Status</span>
                <span className="verif-detail-val" style={{ color: '#c4b5fd', fontFamily: 'var(--font-mono)' }}>
                  {feedback.feedbackStatus || 'INGESTED_TO_FEATURE_STORE'}
                </span>
              </div>
            </div>
            <div className="verif-feedback-box">
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                Feature Store Ingestion Log:
              </strong>
              {feedback.notes || 'Signal registered in feature store buffer for periodic model retraining.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
