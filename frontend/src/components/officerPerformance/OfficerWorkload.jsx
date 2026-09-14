import React from 'react';

/**
 * OfficerWorkload: Horizontal capacity progress indicator and real-time workload stats
 */
export default function OfficerWorkload({ workload = {} }) {
  const active = workload.active ?? 3;
  const recommendedCapacity = workload.recommendedCapacity ?? 5;
  const pending = workload.pending ?? 1;
  const inProgress = workload.inProgress ?? 2;
  const completedToday = workload.completedToday ?? 4;

  const pct = Math.min(Math.round((active / recommendedCapacity) * 100), 100);

  return (
    <div className="info-card" aria-label="Current Workload Panel">
      <div className="info-card-header">
        <h3 className="info-card-title">CURRENT WORKLOAD</h3>
        <span className="dashboard-panel-tag">CAPACITY METRICS</span>
      </div>

      <div className="workload-card-inner">
        {/* Horizontal Progress Bar */}
        <div className="workload-bar-wrap">
          <div className="workload-bar-meta">
            <span style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>
              Active Task Load
            </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>
              {active} / {recommendedCapacity} recommended active tasks
            </span>
          </div>

          <div className="workload-progress-track">
            <div
              className="workload-progress-fill"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={active}
              aria-valuemin={0}
              aria-valuemax={recommendedCapacity}
            />
          </div>
        </div>

        {/* 4 Mini Stat Badges */}
        <div className="workload-mini-stats">
          <div className="workload-mini-item">
            <span className="workload-mini-label">Active Tasks</span>
            <span className="workload-mini-val" style={{ color: 'var(--accent)' }}>
              {active}
            </span>
          </div>

          <div className="workload-mini-item">
            <span className="workload-mini-label">Pending Acceptance</span>
            <span className="workload-mini-val" style={{ color: '#ecd06f' }}>
              {pending}
            </span>
          </div>

          <div className="workload-mini-item">
            <span className="workload-mini-label">In Progress</span>
            <span className="workload-mini-val" style={{ color: '#a78bfa' }}>
              {inProgress}
            </span>
          </div>

          <div className="workload-mini-item">
            <span className="workload-mini-label">Completed Today</span>
            <span className="workload-mini-val" style={{ color: '#4dd6a8' }}>
              {completedToday}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
