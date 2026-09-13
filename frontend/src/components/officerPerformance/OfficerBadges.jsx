import React from 'react';

/**
 * Render officer operational status badge with semantic text & indicator dot
 */
export function renderOfficerStatusBadge(status) {
  const s = (status || 'ACTIVE').toUpperCase();
  let badgeClass = 'badge-status-active';

  if (s === 'BUSY') {
    badgeClass = 'badge-status-busy';
  } else if (s === 'OFFLINE') {
    badgeClass = 'badge-status-offline';
  } else if (s === 'ON LEAVE' || s.includes('LEAVE')) {
    badgeClass = 'badge-status-leave';
  }

  return (
    <span className={`badge-officer-status ${badgeClass}`}>
      <span className="status-badge-dot" aria-hidden="true" />
      {s}
    </span>
  );
}

/**
 * Format completion rate percentage and assign color class
 */
export function formatCompletionRate(rate) {
  const pct = Math.round((rate ?? 0) * 100);
  let rateClass = 'rate-high';
  if (pct < 70) {
    rateClass = 'rate-low';
  } else if (pct < 85) {
    rateClass = 'rate-med';
  }

  return <span className={`officer-rate-cell ${rateClass}`}>{pct}%</span>;
}

const OfficerBadges = {
  renderOfficerStatusBadge,
  formatCompletionRate,
};

export default OfficerBadges;
