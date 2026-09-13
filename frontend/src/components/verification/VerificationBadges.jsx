import React from 'react';

/**
 * Render ground truth verification outcome badge
 */
export function renderVerificationOutcomeBadge(outcome) {
  const o = (outcome || 'PROBLEM_CONFIRMED').toUpperCase().replace(/\s+/g, '_');

  switch (o) {
    case 'PROBLEM_CONFIRMED':
      return <span className="verif-outcome-badge confirmed">Confirmed (TP)</span>;
    case 'PROBLEM_NOT_FOUND':
      return <span className="verif-outcome-badge not-found">Not Found (FP)</span>;
    case 'DIFFERENT_PROBLEM':
      return <span className="verif-outcome-badge different">Different Issue</span>;
    case 'DUPLICATE':
      return <span className="verif-outcome-badge duplicate">Duplicate</span>;
    case 'UNABLE_TO_VERIFY':
      return <span className="verif-outcome-badge unable">Inaccessible</span>;
    default:
      return <span className="verif-outcome-badge">{outcome || 'VERIFIED'}</span>;
  }
}

/**
 * Render evaluation matrix classification badge (TP, FP, TN, FN)
 */
export function renderEvaluationBadge(classification) {
  const c = (classification || 'TRUE_POSITIVE').toUpperCase().replace(/\s+/g, '_');

  switch (c) {
    case 'TRUE_POSITIVE':
      return <span className="eval-class-badge true-positive">True Positive</span>;
    case 'FALSE_POSITIVE':
      return <span className="eval-class-badge false-positive">False Positive</span>;
    case 'TRUE_NEGATIVE':
      return <span className="eval-class-badge true-negative">True Negative</span>;
    case 'FALSE_NEGATIVE':
      return <span className="eval-class-badge false-positive">False Negative</span>;
    default:
      return <span className="eval-class-badge undetermined">{classification || 'UNDETERMINED'}</span>;
  }
}

/**
 * Render feedback pipeline status pill
 */
export function renderFeedbackPill(status) {
  const s = (status || 'INGESTED_TO_FEATURE_STORE').toUpperCase();
  const label = s === 'INGESTED_TO_FEATURE_STORE' ? 'Feature Store' : s === 'MODEL_REFINED' ? 'Model Retrained' : 'Pending Buffer';

  return (
    <span className="fb-status-pill" title={`Feedback Pipeline State: ${s}`}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      </svg>
      {label}
    </span>
  );
}

export default {
  renderVerificationOutcomeBadge,
  renderEvaluationBadge,
  renderFeedbackPill,
};
