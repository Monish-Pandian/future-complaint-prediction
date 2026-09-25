import React from 'react';

/**
 * Unified Risk Badge
 */
export function RiskBadge({ level = 'LOW', className = '' }) {
  const norm = (level || 'LOW').toUpperCase();
  let badgeClass = 'badge-risk-low';

  if (norm === 'CRITICAL') {
    badgeClass = 'badge-risk-critical';
  } else if (norm === 'HIGH') {
    badgeClass = 'badge-risk-high';
  } else if (norm === 'MEDIUM') {
    badgeClass = 'badge-risk-medium';
  }

  return (
    <span className={`badge badge-risk ${badgeClass} ${className}`.trim()}>
      <span className="status-badge-dot" aria-hidden="true" />
      {norm}
    </span>
  );
}

/**
 * Unified Assignment Badge
 */
export function AssignmentStatusBadge({ status = 'AI_ASSIGNED', className = '' }) {
  const s = (status || 'AI_ASSIGNED').toUpperCase().replace(/\s+/g, '_');
  let label = 'AI Assigned';
  let badgeClass = 'ai-assigned';

  switch (s) {
    case 'ACCEPTED':
      label = 'Accepted';
      badgeClass = 'accepted';
      break;
    case 'IN_PROGRESS':
      label = 'In Progress';
      badgeClass = 'in-progress';
      break;
    case 'VERIFICATION_SUBMITTED':
      label = 'Submitted';
      badgeClass = 'submitted';
      break;
    case 'COMPLETED':
      label = 'Completed';
      badgeClass = 'completed';
      break;
    case 'REJECTED':
      label = 'Rejected';
      badgeClass = 'rejected';
      break;
    default:
      label = 'AI Assigned';
      badgeClass = 'ai-assigned';
      break;
  }

  return (
    <span className={`asgn-status-badge ${badgeClass} ${className}`.trim()}>
      <span className="status-badge-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

/**
 * Unified Evaluation Badge
 */
export function EvaluationBadge({ classification = 'TRUE_POSITIVE', className = '' }) {
  const c = (classification || 'TRUE_POSITIVE').toUpperCase().replace(/\s+/g, '_');
  let label = 'True Positive (TP)';
  let badgeClass = 'true-positive';

  switch (c) {
    case 'FALSE_POSITIVE':
      label = 'False Positive (FP)';
      badgeClass = 'false-positive';
      break;
    case 'TRUE_NEGATIVE':
      label = 'True Negative (TN)';
      badgeClass = 'true-negative';
      break;
    case 'FALSE_NEGATIVE':
      label = 'False Negative (FN)';
      badgeClass = 'false-positive';
      break;
    case 'UNDETERMINED':
      label = 'Undetermined';
      badgeClass = 'undetermined';
      break;
    default:
      label = 'True Positive (TP)';
      badgeClass = 'true-positive';
      break;
  }

  return (
    <span className={`eval-class-badge ${badgeClass} ${className}`.trim()}>
      {label}
    </span>
  );
}

export default {
  RiskBadge,
  AssignmentStatusBadge,
  EvaluationBadge,
};
