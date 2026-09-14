import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import Button from '../common/Button';

export default function FieldOperationsSnapshot({ operationsData = {} }) {
  const navigate = useNavigate();

  const totalOfficers = operationsData.totalOfficers ?? 52;
  const activeOfficers = operationsData.activeOfficers ?? 38;
  const activeAssignments = operationsData.activeAssignments ?? 39;
  const deptDist = operationsData.departmentDistribution || [
    { department: 'Streets & Sanitation', count: 24, highRiskCount: 8, color: '#3b82f6' },
    { department: 'Transportation (CDOT)', count: 12, highRiskCount: 4, color: '#06b6d4' },
    { department: 'Buildings & Safety', count: 3, highRiskCount: 1, color: '#10b981' },
  ];

  return (
    <Card
      title="Field Operations"
      subtitle="Municipal dispatch readiness and departmental officer workload"
      className="field-operations-card"
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/assignments')}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" />
            </svg>
          }
        >
          View Assignments
        </Button>
      }
    >
      {/* Metric Mini Grid */}
      <div className="field-ops-metric-row">
        <div className="field-ops-stat-pill">
          <span className="field-ops-stat-label">Active Officers</span>
          <div className="field-ops-stat-val font-mono" style={{ color: 'var(--success-text)' }}>
            {activeOfficers} <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/ {totalOfficers}</span>
          </div>
          <span className="field-ops-stat-sub">73% on duty</span>
        </div>

        <div className="field-ops-stat-pill">
          <span className="field-ops-stat-label">Active Dispatches</span>
          <div className="field-ops-stat-val font-mono" style={{ color: 'var(--accent-text)' }}>
            {activeAssignments}
          </div>
          <span className="field-ops-stat-sub">Weighted 0.4 / 0.3 / 0.3</span>
        </div>
      </div>

      {/* Department Breakdown */}
      <div className="field-ops-dept-list">
        <div className="field-ops-dept-header">
          <span>Department</span>
          <span>Assigned Tasks</span>
        </div>
        {deptDist.map((dept, idx) => (
          <div key={idx} className="field-ops-dept-row">
            <div className="field-ops-dept-name-wrap">
              <span
                className="field-ops-dept-dot"
                style={{ background: dept.color || 'var(--accent)' }}
                aria-hidden="true"
              />
              <span className="field-ops-dept-name">{dept.department || dept.category}</span>
            </div>
            <div className="field-ops-dept-count font-mono">
              <span>{dept.count}</span>
              {dept.highRiskCount > 0 && (
                <span className="field-ops-high-tag font-mono">
                  {dept.highRiskCount} High
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
