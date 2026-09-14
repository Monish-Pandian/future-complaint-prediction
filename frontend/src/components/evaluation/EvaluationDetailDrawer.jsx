import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { renderClassificationBadge, renderFeedbackTypeBadge } from './EvaluationBadges';
import { renderRiskBadge } from '../predictions/PredictionBadges';
import { renderVerificationOutcomeBadge } from '../verification/VerificationBadges';

/**
 * EvaluationDetailDrawer: Comprehensive slide-in drawer detailing AI Prediction, Ground Truth, Evaluation, and Feedback
 */
export default function EvaluationDetailDrawer({ evaluation, onClose }) {
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

  if (!evaluation) return null;

  const pred = evaluation.prediction || {};
  const verif = evaluation.verification || {};
  const officer = verif.officer || evaluation.officer || {};
  const feedback = evaluation.feedback || {};

  const riskLevel = pred.riskLevel || 'LOW';
  const probPercent = pred.probability !== undefined
    ? Math.round(pred.probability * 100)
    : pred.riskScore || 50;

  return (
    <div className="evaluation-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="eval-drawer-title">
      <div className="evaluation-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="evaluation-drawer-header">
          <div>
            <div className="auth-label" style={{ marginBottom: '2px' }}>
              MODEL GOVERNANCE & EVALUATION ASSESSMENT
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 id="eval-drawer-title" style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                {evaluation.evaluationId}
              </h2>
              {renderClassificationBadge(evaluation.classification)}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
              Evaluated: {new Date(evaluation.evaluatedAt).toLocaleString()}
            </div>
          </div>
          <button
            type="button"
            className="evaluation-drawer-close"
            onClick={onClose}
            aria-label="Close Evaluation Assessment Drawer"
          >
            ✕
          </button>
        </div>

        {/* Drawer Content */}
        <div className="evaluation-drawer-content">
          {/* COMPARISON CARD: AI PREDICTION VS FIELD OBSERVATION VS EVALUATION */}
          <div className="eval-comparison-card">
            <div className="evaluation-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 3 21 3 21 8"></polyline>
                <line x1="4" y1="20" x2="21" y2="3"></line>
                <polyline points="21 16 21 21 16 21"></polyline>
                <line x1="15" y1="15" x2="21" y2="21"></line>
                <line x1="4" y1="4" x2="9" y2="9"></line>
              </svg>
              Prediction vs Field Ground Truth
            </div>
            <div className="eval-comparison-grid">
              <div className="eval-comparison-col">
                <span className="eval-comparison-label">AI FORECAST</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                  {renderRiskBadge(riskLevel)}
                  <span className="font-mono text-bold" style={{ fontSize: '12px' }}>{probPercent}%</span>
                </div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {pred.complaintType || 'Civic Problem'}
                </div>
              </div>

              <div className="eval-comparison-arrow" aria-hidden="true">→</div>

              <div className="eval-comparison-col">
                <span className="eval-comparison-label">FIELD OBSERVATION</span>
                <div style={{ margin: '4px 0' }}>
                  {renderVerificationOutcomeBadge(verif.outcome || evaluation.actualOutcome || 'PROBLEM_CONFIRMED')}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Severity: {verif.severity || 'MEDIUM'}
                </div>
              </div>

              <div className="eval-comparison-arrow" aria-hidden="true">→</div>

              <div className="eval-comparison-col">
                <span className="eval-comparison-label">EVALUATION</span>
                <div style={{ margin: '4px 0' }}>
                  {renderClassificationBadge(evaluation.classification)}
                </div>
                <div style={{ marginTop: '2px' }}>
                  {renderFeedbackTypeBadge(feedback.feedbackType || (evaluation.classification === 'TRUE_POSITIVE' ? 'FEEDBACK_TRUE_POSITIVE' : 'FEEDBACK_FALSE_POSITIVE'))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 1: CASE IDENTITY & PREDICTION */}
          <div className="evaluation-section-card">
            <div className="evaluation-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
              1. AI Forecast Intel & Case Identity
            </div>
            <div className="verif-detail-grid">
              <div className="verif-detail-item">
                <span className="verif-detail-label">Evaluation Ref</span>
                <span className="verif-detail-val font-mono" style={{ color: '#06b6d4' }}>
                  {evaluation.evaluationId}
                </span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Model Version</span>
                <span className="verif-detail-val font-mono" style={{ color: '#a78bfa' }}>
                  xgb-test-v1
                </span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Prediction Ref</span>
                <span className="verif-detail-val font-mono" style={{ color: '#60a5fa' }}>
                  {pred.predictionId || 'PRED-UNKNOWN'}
                </span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Complaint Type</span>
                <span className="verif-detail-val">{pred.complaintType || 'Civic Infrastructure'}</span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Forecast Probability</span>
                <span className="verif-detail-val font-mono" style={{ color: '#fbbf24' }}>
                  {probPercent}% (Risk Score: {pred.riskScore ?? 50})
                </span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Area / Ward</span>
                <span className="verif-detail-val">{pred.communityArea || 'Chicago'} ({pred.ward || 'Ward 1'})</span>
              </div>
            </div>
          </div>

          {/* SECTION 2: GROUND TRUTH FIELD VERIFICATION */}
          <div className="evaluation-section-card">
            <div className="evaluation-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              2. Actual Ground Truth Field Observation
            </div>
            <div className="verif-detail-grid">
              <div className="verif-detail-item">
                <span className="verif-detail-label">Field Verification Outcome</span>
                <div>{renderVerificationOutcomeBadge(verif.outcome || evaluation.actualOutcome || 'PROBLEM_CONFIRMED')}</div>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Field Severity</span>
                <span className="verif-detail-val">{verif.severity || 'MEDIUM'}</span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Assigned Inspector</span>
                <span className="verif-detail-val">{officer.name || 'Assigned Officer'}</span>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Verification Ref</span>
                <span className="verif-detail-val font-mono" style={{ color: '#38bdf8' }}>
                  {verif.verificationId || 'VERIF-LINKED'}
                </span>
              </div>
            </div>
            {verif.notes && (
              <div className="verif-notes-box">
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                  Field Inspector Observations:
                </strong>
                {verif.notes}
              </div>
            )}
          </div>

          {/* SECTION 3: EVALUATION MATRIX & ACCURACY RATIONALE */}
          <div className="evaluation-section-card">
            <div className="evaluation-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
              3. Evaluation Matrix & Classification Rationale
            </div>
            <div className="verif-detail-grid">
              <div className="verif-detail-item">
                <span className="verif-detail-label">Matrix Classification</span>
                <div>{renderClassificationBadge(evaluation.classification)}</div>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Evaluation Formula</span>
                <span className="verif-detail-val font-mono" style={{ fontSize: '12px' }}>
                  {verif.outcome || 'CONFIRMED'} → {evaluation.classification || 'TRUE_POSITIVE'}
                </span>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5', padding: '10px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '4px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
              {evaluation.classification === 'TRUE_POSITIVE'
                ? 'Model predicted elevated complaint probability, and on-site field verification confirmed the physical civic deterioration. Positive observation reinforces spatial confidence.'
                : evaluation.classification === 'FALSE_POSITIVE'
                ? 'Model forecasted complaint risk, but on-site inspector found no physical issue or observed a different problem. False positive signal penalizes feature weights during model calibration.'
                : 'Exploration verification outcome processed for baseline data quality audit and threshold recalibration.'}
            </div>
          </div>

          {/* SECTION 4: FEEDBACK SIGNAL INGESTION */}
          <div className="evaluation-section-card">
            <div className="evaluation-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              4. Feedback Signal Store & Training Buffer
            </div>
            <div className="verif-detail-grid">
              <div className="verif-detail-item">
                <span className="verif-detail-label">Signal Type</span>
                <div>{renderFeedbackTypeBadge(feedback.feedbackType || (evaluation.classification === 'TRUE_POSITIVE' ? 'FEEDBACK_TRUE_POSITIVE' : 'FEEDBACK_FALSE_POSITIVE'))}</div>
              </div>
              <div className="verif-detail-item">
                <span className="verif-detail-label">Pipeline Status</span>
                <span className="verif-detail-val font-mono" style={{ color: '#c4b5fd' }}>
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

          {/* SECTION 5: OPERATIONAL DEEP LINKS */}
          <div className="eval-nav-actions">
            <button
              type="button"
              className="evaluation-btn evaluation-btn-secondary"
              onClick={() => navigate('/predictions')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
              View Prediction
            </button>
            <button
              type="button"
              className="evaluation-btn evaluation-btn-secondary"
              onClick={() => navigate('/verification')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              View Verification
            </button>
            <button
              type="button"
              className="evaluation-btn evaluation-btn-secondary"
              onClick={() => navigate('/assignments')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
              </svg>
              View Assignment
            </button>
            <button
              type="button"
              className="evaluation-btn evaluation-btn-secondary"
              onClick={() => navigate('/risk-map')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                <line x1="8" y1="2" x2="8" y2="18"></line>
                <line x1="16" y1="6" x2="16" y2="22"></line>
              </svg>
              View on Risk Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
