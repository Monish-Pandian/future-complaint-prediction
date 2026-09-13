import React from 'react';

/**
 * Risk badge renderer
 */
export function renderRiskBadge(riskLevel) {
  const level = (riskLevel || 'LOW').toUpperCase();
  let badgeClass = 'badge-risk-low';

  if (level === 'CRITICAL') {
    badgeClass = 'badge-risk-critical';
  } else if (level === 'HIGH') {
    badgeClass = 'badge-risk-high';
  } else if (level === 'MEDIUM') {
    badgeClass = 'badge-risk-medium';
  }

  return (
    <span className={`badge-risk ${badgeClass}`}>
      <span className="status-badge-dot" aria-hidden="true" />
      {level}
    </span>
  );
}

/**
 * Verification badge renderer
 */
export function renderVerificationBadge(status) {
  const s = (status || 'PENDING').toUpperCase().replace('_', ' ');
  let badgeClass = 'badge-verif-pending';

  if (s.includes('VERIFIED') || s === 'VERIFIED') {
    badgeClass = 'badge-verif-verified';
  } else if (s.includes('NOT FOUND')) {
    badgeClass = 'badge-verif-not-found';
  } else if (s.includes('DIFFERENT')) {
    badgeClass = 'badge-verif-different';
  } else if (s.includes('ASSIGNED')) {
    badgeClass = 'badge-assignment-assigned';
  } else if (s.includes('PROGRESS')) {
    badgeClass = 'badge-assignment-in-progress';
  }

  return (
    <span className={`badge-verif ${badgeClass}`}>
      <span className="status-badge-dot" aria-hidden="true" />
      {s}
    </span>
  );
}

/**
 * Assignment badge renderer
 */
export function renderAssignmentBadge(status) {
  const asgn = (status || 'UNASSIGNED').toUpperCase().replace('_', ' ');
  let badgeClass = 'badge-assignment-unassigned';

  if (asgn === 'ASSIGNED') {
    badgeClass = 'badge-assignment-assigned';
  } else if (asgn === 'ACCEPTED') {
    badgeClass = 'badge-assignment-accepted';
  } else if (asgn === 'IN PROGRESS') {
    badgeClass = 'badge-assignment-in-progress';
  } else if (asgn === 'COMPLETED') {
    badgeClass = 'badge-assignment-completed';
  } else if (asgn === 'REJECTED') {
    badgeClass = 'badge-risk-critical';
  }

  return (
    <span className={`badge-assignment ${badgeClass}`}>
      <span className="status-badge-dot" aria-hidden="true" />
      {asgn}
    </span>
  );
}

const PredictionBadges = {
  renderRiskBadge,
  renderVerificationBadge,
  renderAssignmentBadge,
};

export default PredictionBadges;
