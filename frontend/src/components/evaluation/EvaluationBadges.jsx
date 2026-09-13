import React from 'react';

/**
 * Render evaluation classification badge (TP, FP, TN, FN)
 */
export function renderClassificationBadge(classification) {
  const c = (classification || 'TRUE_POSITIVE').toUpperCase().replace(/\s+/g, '_');

  switch (c) {
    case 'TRUE_POSITIVE':
      return <span className="eval-class-badge true-positive">True Positive (TP)</span>;
    case 'FALSE_POSITIVE':
      return <span className="eval-class-badge false-positive">False Positive (FP)</span>;
    case 'TRUE_NEGATIVE':
      return <span className="eval-class-badge true-negative">True Negative (TN)</span>;
    case 'FALSE_NEGATIVE':
      return <span className="eval-class-badge false-positive">False Negative (FN)</span>;
    default:
      return <span className="eval-class-badge undetermined">{classification || 'UNDETERMINED'}</span>;
  }
}

/**
 * Render feedback signal type badge
 */
export function renderFeedbackTypeBadge(type) {
  const t = (type || 'FEEDBACK_TRUE_POSITIVE').toUpperCase();
  const label = t.replace('FEEDBACK_', '').replace(/_/g, ' ');

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '10.5px',
        fontFamily: 'var(--font-mono)',
        fontWeight: '700',
        background: 'rgba(139, 92, 246, 0.12)',
        color: '#c4b5fd',
        border: '1px solid rgba(139, 92, 246, 0.35)',
      }}
    >
      {label}
    </span>
  );
}

export default {
  renderClassificationBadge,
  renderFeedbackTypeBadge,
};
