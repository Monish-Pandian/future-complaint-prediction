import React from 'react';

/**
 * Render ground truth verification outcome badge
 */
export function renderVerificationOutcomeBadge(outcome) {
  if (!outcome) {
    return <span className="verif-outcome-badge awaiting font-mono">Awaiting Verification</span>;
  }

  const o = outcome.toUpperCase().replace(/\s+/g, '_');

  switch (o) {
    case 'PROBLEM_CONFIRMED':
      return <span className="verif-outcome-badge confirmed">Problem Confirmed</span>;
    case 'PROBLEM_NOT_FOUND':
      return <span className="verif-outcome-badge not-found">Problem Not Found</span>;
    case 'DIFFERENT_PROBLEM':
      return <span className="verif-outcome-badge different">Different Problem</span>;
    case 'DUPLICATE':
      return <span className="verif-outcome-badge duplicate">Duplicate</span>;
    case 'UNABLE_TO_VERIFY':
      return <span className="verif-outcome-badge unable">Unable to Verify</span>;
    default:
      return <span className="verif-outcome-badge">{outcome.replace(/_/g, ' ')}</span>;
  }
}

/**
 * Render verification workflow status badge
 */
export function renderVerificationLifecycleBadge(status) {
  const s = (status || 'PENDING_ASSIGNMENT').toUpperCase().replace(/\s+/g, '_');

  switch (s) {
    case 'PENDING_ASSIGNMENT':
      return <span className="verif-status-badge pending font-mono">Pending Assignment</span>;
    case 'ASSIGNED':
      return <span className="verif-status-badge assigned font-mono">Assigned</span>;
    case 'VERIFICATION_SUBMITTED':
      return <span className="verif-status-badge submitted font-mono">Submitted</span>;
    case 'COMPLETED':
      return <span className="verif-status-badge completed font-mono">Completed</span>;
    case 'CANCELLED':
      return <span className="verif-status-badge cancelled font-mono">Cancelled</span>;
    default:
      return <span className="verif-status-badge font-mono">{status?.replace(/_/g, ' ') || 'PENDING'}</span>;
  }
}

/**
 * Render evaluation matrix classification badge (TRUE_POSITIVE, FALSE_POSITIVE, UNDETERMINED)
 */
export function renderEvaluationBadge(classification) {
  if (!classification) {
    return <span className="eval-class-badge undetermined font-mono">Awaiting Evaluation</span>;
  }

  const c = classification.toUpperCase().replace(/\s+/g, '_');

  switch (c) {
    case 'TRUE_POSITIVE':
      return <span className="eval-class-badge true-positive font-mono">True Positive</span>;
    case 'FALSE_POSITIVE':
      return <span className="eval-class-badge false-positive font-mono">False Positive</span>;
    case 'UNDETERMINED':
      return <span className="eval-class-badge undetermined font-mono">Undetermined</span>;
    default:
      return <span className="eval-class-badge undetermined font-mono">{classification.replace(/_/g, ' ')}</span>;
  }
}

/**
 * Render feedback pipeline status pill
 */
export function renderFeedbackPill(status) {
  const s = (status || 'INGESTED_TO_FEATURE_STORE').toUpperCase();
  const label = s === 'INGESTED_TO_FEATURE_STORE' ? 'Feature Store Ingested' : s === 'MODEL_REFINED' ? 'Retraining Buffer' : s.replace(/_/g, ' ');

  return (
    <span className="fb-status-pill font-mono" title={`Feedback Pipeline State: ${s}`}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      </svg>
      {label}
    </span>
  );
}

export default {
  renderVerificationOutcomeBadge,
  renderVerificationLifecycleBadge,
  renderEvaluationBadge,
  renderFeedbackPill,
};

