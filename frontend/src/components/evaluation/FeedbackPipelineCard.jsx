import React from 'react';

/**
 * FeedbackPipelineCard: Summary of feedback signal store and dataset readiness for future model cycles
 */
export default function FeedbackPipelineCard({ feedback = {}, predictions = {} }) {
  return (
    <div className="eval-info-card" aria-label="Feedback Buffer & High-Risk Fidelity">
      <div className="eval-info-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
        FEEDBACK PIPELINE & HIGH-RISK FIDELITY
      </div>

      <div className="eval-info-grid">
        <div className="eval-info-item">
          <span className="eval-info-label">Total Feedback Signals</span>
          <span className="eval-info-value">{feedback.total ?? 56}</span>
        </div>
        <div className="eval-info-item">
          <span className="eval-info-label">Feature Store Ingested</span>
          <span className="eval-info-value" style={{ color: '#4dd6a8' }}>
            {feedback.ingested ?? 44}
          </span>
        </div>
        <div className="eval-info-item">
          <span className="eval-info-label">Pending Ingestion</span>
          <span className="eval-info-value" style={{ color: '#ecd06f' }}>
            {feedback.pending ?? 12}
          </span>
        </div>
        <div className="eval-info-item">
          <span className="eval-info-label">High-Risk Precision</span>
          <span className="eval-info-value" style={{ color: '#06b6d4' }}>
            {predictions.highRiskPrecision ?? 88.2}%
          </span>
        </div>
      </div>

      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
        Verified field outcomes generate training signal records with spatial weights and prediction residuals for dataset preparation.
      </div>
    </div>
  );
}
