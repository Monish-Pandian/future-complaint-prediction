import React from 'react';
import { Link } from 'react-router-dom';

/**
 * AI Assignment Operations & Workforce Telemetry Card
 * Displays multi-criteria matching weights and active field dispatch stats
 */
export default function WorkforceAssignmentAnalytics({
  assignmentSummary = {},
  workforceSummary = {},
}) {
  const totalAssignments = assignmentSummary.total ?? 89;
  const activeAssignments = assignmentSummary.active ?? 89;
  const completedAssignments = assignmentSummary.completed ?? 56;
  const totalOfficers = workforceSummary.totalOfficers ?? 533;
  const availableOfficers = workforceSummary.availableOfficers ?? 520;
  const totalWorkload = workforceSummary.totalWorkload ?? 12;

  return (
    <div className="analytics-card">
      <div className="analytics-card-header">
        <div className="analytics-card-title-wrap">
          <span className="analytics-card-tag">DISPATCH & WORKFORCE</span>
          <h3 className="analytics-card-title">AI Assignment Operations</h3>
        </div>

        <div className="analytics-header-links-group">
          <Link to="/assignments" className="analytics-view-link">
            <span>Assignments</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
          <Link to="/officers" className="analytics-view-link">
            <span>Officers</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Multi-Criteria Formula Callout */}
      <div className="analytics-dispatch-policy-box">
        <div className="dispatch-policy-title">
          <span>COMAI Multi-Criteria Dispatch Strategy:</span>
          <code>Score = (0.4 × Risk) + (0.3 × Distance) + (0.3 × Workload)</code>
        </div>
        <div className="dispatch-weights-chips">
          <span className="weight-chip chip-risk">
            <span className="weight-dot dot-red" /> Risk Severity: <strong>0.40</strong>
          </span>
          <span className="weight-chip chip-dist">
            <span className="weight-dot dot-cyan" /> Proximity Distance: <strong>0.30</strong>
          </span>
          <span className="weight-chip chip-load">
            <span className="weight-dot dot-green" /> Workload Balance: <strong>0.30</strong>
          </span>
        </div>
      </div>

      {/* Workforce & Dispatch 4-Quad Telemetry */}
      <div className="analytics-quad-grid">
        <div className="analytics-quad-item">
          <span className="quad-label">TOTAL DISPATCHES</span>
          <span className="quad-value highlight-cyan">{totalAssignments}</span>
          <span className="quad-subtext">AI-allocated tasks</span>
        </div>

        <div className="analytics-quad-item">
          <span className="quad-label">ACTIVE FIELD TASKS</span>
          <span className="quad-value highlight-amber">{activeAssignments}</span>
          <span className="quad-subtext">Assigned / In Progress</span>
        </div>

        <div className="analytics-quad-item">
          <span className="quad-label">COMPLETED INSPECTIONS</span>
          <span className="quad-value highlight-green">{completedAssignments}</span>
          <span className="quad-subtext">Field outcomes logged</span>
        </div>

        <div className="analytics-quad-item">
          <span className="quad-label">FLEET READINESS</span>
          <span className="quad-value">{availableOfficers} / {totalOfficers}</span>
          <span className="quad-subtext">Officers available for dispatch</span>
        </div>
      </div>
    </div>
  );
}
