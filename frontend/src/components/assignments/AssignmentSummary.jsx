import React from 'react';
import KpiCard from '../dashboard/KpiCard';

/**
 * AssignmentSummary: Top KPI metrics for AI dispatches and assignments
 */
export default function AssignmentSummary({ summary = {} }) {
  return (
    <section className="assignments-kpis-grid" aria-label="AI Dispatch Metrics Overview">
      <KpiCard
        label="TOTAL ASSIGNMENTS"
        value={summary.totalAssignments ?? 48}
        supportingText="Lifetime automated dispatches"
        status="info"
      />
      <KpiCard
        label="ACTIVE DISPATCHES"
        value={summary.activeDispatches ?? 22}
        supportingText="In-progress or accepted"
        status="warning"
      />
      <KpiCard
        label="COMPLETED VERIFICATIONS"
        value={summary.completedVerifications ?? 24}
        supportingText="Field reports logged"
        status="success"
      />
      <KpiCard
        label="AVG MATCH SCORE"
        value={`${summary.avgAssignmentScore ?? 89.2}%`}
        supportingText="Composite heuristic efficiency"
        status="info"
      />
      <KpiCard
        label="UNASSIGNED PREDICTIONS"
        value={summary.unassignedPredictions ?? 14}
        supportingText="Pending dispatch queue"
        status="critical"
      />
    </section>
  );
}
