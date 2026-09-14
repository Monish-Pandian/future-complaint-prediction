import React from 'react';

/**
 * Determine operational readiness category for a field officer
 * @param {Object} officer
 * @returns {'READY' | 'BUSY' | 'NEAR_CAPACITY' | 'AT_CAPACITY' | 'UNAVAILABLE'}
 */
export function getOfficerReadiness(officer) {
  if (!officer) return 'UNAVAILABLE';
  
  const isInactive = officer.active === false;
  const isOffDuty = officer.availability === 'OFF_DUTY' || officer.availability === 'OFFLINE';
  const isOnLeave = officer.availability === 'ON_LEAVE';
  
  if (isInactive || isOffDuty || isOnLeave) {
    return 'UNAVAILABLE';
  }

  const workload = officer.currentWorkload || 0;
  const maxCap = officer.maxAssignments || 5;

  if (workload >= maxCap) {
    return 'AT_CAPACITY';
  }

  if (workload >= maxCap * 0.8) {
    return 'NEAR_CAPACITY';
  }

  if (officer.availability === 'BUSY' || workload > 0) {
    return 'BUSY';
  }

  return 'READY';
}

/**
 * Render operational readiness badge
 * @param {'READY' | 'BUSY' | 'NEAR_CAPACITY' | 'AT_CAPACITY' | 'UNAVAILABLE'} readiness
 */
export function renderOperationalReadinessBadge(readiness) {
  const r = (readiness || 'READY').toUpperCase();
  
  let badgeClass = 'readiness-ready';
  let label = 'READY';

  switch (r) {
    case 'BUSY':
      badgeClass = 'readiness-busy';
      label = 'BUSY';
      break;
    case 'NEAR_CAPACITY':
    case 'NEAR CAPACITY':
      badgeClass = 'readiness-near-capacity';
      label = 'NEAR CAPACITY';
      break;
    case 'AT_CAPACITY':
    case 'AT CAPACITY':
      badgeClass = 'readiness-at-capacity';
      label = 'AT CAPACITY';
      break;
    case 'UNAVAILABLE':
      badgeClass = 'readiness-unavailable';
      label = 'UNAVAILABLE';
      break;
    case 'READY':
    default:
      badgeClass = 'readiness-ready';
      label = 'READY';
      break;
  }

  return (
    <span className={`badge-readiness ${badgeClass}`} title={`Operational Readiness: ${label}`}>
      <span className="readiness-dot" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

/**
 * Render officer availability status badge
 * @param {string} status
 */
export function renderOfficerStatusBadge(status) {
  const s = (status || 'AVAILABLE').toUpperCase();
  let badgeClass = 'badge-status-available';
  let label = s.replace(/_/g, ' ');

  if (s === 'BUSY') {
    badgeClass = 'badge-status-busy';
  } else if (s === 'OFF_DUTY' || s === 'OFFLINE') {
    badgeClass = 'badge-status-offduty';
    label = 'OFF DUTY';
  } else if (s === 'ON_LEAVE' || s.includes('LEAVE')) {
    badgeClass = 'badge-status-leave';
    label = 'ON LEAVE';
  }

  return (
    <span className={`badge-officer-status ${badgeClass}`}>
      <span className="status-badge-dot" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

/**
 * Render workload vs max assignments progress bar & utilization indicator
 * @param {number} workload
 * @param {number} maxAssignments
 */
export function renderUtilizationBar(workload = 0, maxAssignments = 5) {
  const current = Math.max(0, workload);
  const max = Math.max(1, maxAssignments);
  const pct = Math.min(100, Math.round((current / max) * 100));

  let tierClass = 'util-tier-low';
  let tierLabel = 'Low';

  if (pct >= 100) {
    tierClass = 'util-tier-full';
    tierLabel = 'Full';
  } else if (pct >= 80) {
    tierClass = 'util-tier-high';
    tierLabel = 'High';
  } else if (pct >= 60) {
    tierClass = 'util-tier-mod';
    tierLabel = 'Moderate';
  }

  return (
    <div className="workload-util-container">
      <div className="workload-util-header">
        <span className="workload-util-ratio">
          <strong className="util-current">{current}</strong>
          <span className="util-slash">/</span>
          <span className="util-max">{max}</span>
        </span>
        <span className={`workload-util-pct ${tierClass}`}>
          {pct}%
        </span>
      </div>
      <div className="workload-progress-track" title={`Workload: ${current}/${max} (${pct}%) - ${tierLabel}`}>
        <div
          className={`workload-progress-fill ${tierClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default {
  getOfficerReadiness,
  renderOperationalReadinessBadge,
  renderOfficerStatusBadge,
  renderUtilizationBar,
};
