import React from 'react';

/**
 * ConfusionMatrixCard: Authoritative Empirical 2x2 Confusion Matrix for xgb-test-v1
 * Verified TEST-2025 instance distribution (N = 39,270)
 */
export default function ConfusionMatrixCard() {
  const tp = 35103;
  const fp = 3194;
  const fn = 233;
  const tn = 740;
  const total = 39270;
  const correct = tp + tn; // 35,843
  const incorrect = fp + fn; // 3,427

  return (
    <div className="confusion-matrix-card" aria-label="Empirical Confusion Matrix">
      <div className="confusion-matrix-header">
        <div className="confusion-matrix-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          EMPIRICAL CONFUSION MATRIX
        </div>
        <div className="font-mono text-muted" style={{ fontSize: '11px' }}>
          N = {total.toLocaleString()} Prediction Instances
        </div>
      </div>

      <div className="confusion-matrix-grid">
        {/* Row 1: Column Headers */}
        <div />
        <div className="cm-label-header">ACTUAL POSITIVE</div>
        <div className="cm-label-header">ACTUAL NEGATIVE</div>

        {/* Row 2: Predicted Positive */}
        <div className="cm-row-label">PREDICTED POSITIVE</div>
        <div className="cm-cell tp" title="True Positive: Correctly predicted complaint occurrence">
          <span className="cm-value font-mono">{tp.toLocaleString()}</span>
          <span className="cm-name">TRUE POSITIVE (TP)</span>
          <span className="cm-desc">Correctly predicted complaint</span>
        </div>
        <div className="cm-cell fp" title="False Positive: Predicted complaint occurrence that did not occur">
          <span className="cm-value font-mono">{fp.toLocaleString()}</span>
          <span className="cm-name">FALSE POSITIVE (FP)</span>
          <span className="cm-desc">Predicted complaint did not occur</span>
        </div>

        {/* Row 3: Predicted Negative */}
        <div className="cm-row-label">PREDICTED NEGATIVE</div>
        <div className="cm-cell fn" title="False Negative: Complaint occurrence missed by the model">
          <span className="cm-value font-mono">{fn.toLocaleString()}</span>
          <span className="cm-name">FALSE NEGATIVE (FN)</span>
          <span className="cm-desc">Complaint occurrence missed</span>
        </div>
        <div className="cm-cell tn" title="True Negative: Correctly predicted no-complaint case">
          <span className="cm-value font-mono">{tn.toLocaleString()}</span>
          <span className="cm-name">TRUE NEGATIVE (TN)</span>
          <span className="cm-desc">Correctly predicted clean state</span>
        </div>
      </div>

      {/* Summary Matrix Telemetry */}
      <div className="cm-telemetry-grid font-mono">
        <div>
          <span className="text-muted">Total Correct: </span>
          <strong style={{ color: '#10b981' }}>{correct.toLocaleString()}</strong> (91.27%)
        </div>
        <div>
          <span className="text-muted">Total Incorrect: </span>
          <strong style={{ color: '#f59e0b' }}>{incorrect.toLocaleString()}</strong> (8.73%)
        </div>
        <div>
          <span className="text-muted">False Positive Rate: </span>
          <strong style={{ color: '#f59e0b' }}>8.13%</strong>
        </div>
        <div>
          <span className="text-muted">False Negative Rate: </span>
          <strong style={{ color: '#ef4444' }}>0.66%</strong>
        </div>
      </div>
    </div>
  );
}
