import React from 'react';

/**
 * FeedbackPipelineCard: Summary of model feedback signals ingested into the retraining buffer
 */
export default function FeedbackPipelineCard({ feedback = {}, predictions = {} }) {
  const total = feedback.total ?? 4;
  const ingested = feedback.ingested ?? total;
  const pending = feedback.pending ?? 0;
  const highRiskPrec = predictions.highRiskPrecision ?? 91.66;

  return (
    <div className="eval-info-card" aria-label="Feedback Buffer & High-Risk Fidelity">
      <div className="eval-info-title">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
        MODEL FEEDBACK & RETRAINING BUFFER
      </div>

      <div className="eval-info-grid">
        <div className="eval-info-item">
          <span className="eval-info-label">Total Signals Logged</span>
          <span className="eval-info-value font-mono">{total}</span>
        </div>
        <div className="eval-info-item">
          <span className="eval-info-label">Feature Store Ingested</span>
          <span className="eval-info-value font-mono" style={{ color: '#10b981' }}>
            {ingested}
          </span>
        </div>
        <div className="eval-info-item">
          <span className="eval-info-label">Pending Ingestion</span>
          <span className="eval-info-value font-mono" style={{ color: '#fbbf24' }}>
            {pending}
          </span>
        </div>
        <div className="eval-info-item">
          <span className="eval-info-label">High-Risk Fidelity</span>
          <span className="eval-info-value font-mono" style={{ color: '#38bdf8' }}>
            {highRiskPrec}%
          </span>
        </div>
      </div>

      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: '1.5', marginTop: '4px' }}>
        Verified field outcomes generate training signal records with spatial weights and prediction residuals for automated feature store calibration.
      </div>
    </div>
  );
}
