import React from 'react';

/**
 * Render assignment status badge
 */
export function renderAssignmentStatusBadge(status) {
  const s = (status || 'AI_ASSIGNED').toUpperCase().replace(/\s+/g, '_');

  switch (s) {
    case 'AI_ASSIGNED':
      return <span className="asgn-status-badge ai-assigned">AI Assigned</span>;
    case 'ACCEPTED':
      return <span className="asgn-status-badge accepted">Accepted</span>;
    case 'IN_PROGRESS':
      return <span className="asgn-status-badge in-progress">In Progress</span>;
    case 'VERIFICATION_SUBMITTED':
      return <span className="asgn-status-badge submitted">Submitted</span>;
    case 'COMPLETED':
      return <span className="asgn-status-badge completed">Completed</span>;
    case 'REJECTED':
      return <span className="asgn-status-badge rejected">Rejected</span>;
    default:
      return <span className="asgn-status-badge">{status || 'UNKNOWN'}</span>;
  }
}

/**
 * Render verification candidate status badge
 */
export function renderCandidateStatusBadge(status) {
  const s = (status || 'ASSIGNED').toUpperCase().replace(/\s+/g, '_');

  switch (s) {
    case 'ASSIGNED':
      return <span className="cand-status-badge assigned">Assigned</span>;
    case 'VERIFICATION_SUBMITTED':
      return <span className="cand-status-badge submitted">Verification Submitted</span>;
    case 'COMPLETED':
      return <span className="cand-status-badge completed">Completed</span>;
    case 'CANCELLED':
      return <span className="cand-status-badge cancelled">Cancelled</span>;
    case 'PENDING_ASSIGNMENT':
      return <span className="cand-status-badge pending">Pending Assignment</span>;
    default:
      return <span className="cand-status-badge">{status || 'UNKNOWN'}</span>;
  }
}

/**
 * Render selection type badge (EXPLOITATION / EXPLORATION)
 */
export function renderSelectionTypeBadge(selectionType) {
  const type = (selectionType || '').toUpperCase();

  if (type === 'EXPLOITATION') {
    return <span className="cand-type-badge exploitation">Exploitation</span>;
  }
  if (type === 'EXPLORATION') {
    return <span className="cand-type-badge exploration">Exploration</span>;
  }
  return <span className="cand-type-badge">{selectionType || '—'}</span>;
}

/**
 * Render match score pill
 */
export function renderMatchScorePill(score) {
  const num = typeof score === 'number' ? score.toFixed(1) : score || '88.0';
  return (
    <span className="asgn-score-pill" title={`Composite AI Match Score: ${num}%`}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
      </svg>
      {num}%
    </span>
  );
}

/**
 * Render mini workload progress bar
 */
export function renderMiniWorkload(workload = 0, max = 5) {
  const pct = Math.min(100, Math.round((workload / max) * 100));
  let fillColor = '#4dd6a8';
  if (pct > 75) fillColor = '#ff6b6b';
  else if (pct > 50) fillColor = '#ecd06f';

  return (
    <div className="asgn-workload-mini" title={`Current Workload: ${workload} / ${max} tasks`}>
      <div className="asgn-workload-bar-wrap">
        <div className="asgn-workload-fill" style={{ width: `${pct}%`, backgroundColor: fillColor }} />
      </div>
      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
        {workload}/{max}
      </span>
    </div>
  );
}

export default {
  renderAssignmentStatusBadge,
  renderCandidateStatusBadge,
  renderSelectionTypeBadge,
  renderMatchScorePill,
  renderMiniWorkload,
};
