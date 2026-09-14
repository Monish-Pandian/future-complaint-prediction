import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import Button from '../common/Button';

/**
 * OfficerCapacityPanel: Snapshot of municipal officer capacity and dispatch load
 */
export default function OfficerCapacityPanel({ summary = {}, distribution = {} }) {
  const navigate = useNavigate();

  const totalAssigned = summary.total ?? 0;
  const activeCount = summary.active ?? (distribution.ACCEPTED || 0) + (distribution.IN_PROGRESS || 0);
  const completedCount = summary.completed ?? distribution.COMPLETED ?? 0;

  return (
    <Card
      title="Officer Capacity & Dispatch Load"
      subtitle="Operational resource distribution across municipal field departments"
      className="officer-capacity-card"
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/officers')}
        >
          View Officers →
        </Button>
      }
    >
      <div className="capacity-stats-list">
        <div className="capacity-stat-item">
          <div className="capacity-stat-info">
            <span className="capacity-stat-label">Active Field Tasks</span>
            <span className="capacity-stat-sub">In progress or accepted by officers</span>
          </div>
          <span className="capacity-stat-val font-mono" style={{ color: 'var(--warning)' }}>
            {activeCount}
          </span>
        </div>

        <div className="capacity-stat-item">
          <div className="capacity-stat-info">
            <span className="capacity-stat-label">AI Queue (Pending)</span>
            <span className="capacity-stat-sub">Automated dispatches awaiting response</span>
          </div>
          <span className="capacity-stat-val font-mono" style={{ color: 'var(--info)' }}>
            {distribution.AI_ASSIGNED ?? summary.aiAssigned ?? 0}
          </span>
        </div>

        <div className="capacity-stat-item">
          <div className="capacity-stat-info">
            <span className="capacity-stat-label">Verified & Completed</span>
            <span className="capacity-stat-sub">Ground inspection reports submitted</span>
          </div>
          <span className="capacity-stat-val font-mono" style={{ color: 'var(--success)' }}>
            {completedCount}
          </span>
        </div>
      </div>

      <div className="capacity-footer-note font-mono">
        <span>MAX CAPACITY PER OFFICER: <strong>5 TASKS</strong></span>
        <span>POLICY: <strong>90/10 EXPLOIT-EXPLORE</strong></span>
      </div>
    </Card>
  );
}
