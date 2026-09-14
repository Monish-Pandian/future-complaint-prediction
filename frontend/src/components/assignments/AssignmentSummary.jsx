import React from 'react';
import KpiCard from '../dashboard/KpiCard';

/**
 * AssignmentSummary: Top KPI metrics for AI dispatches and field assignments
 */
export default function AssignmentSummary({ summary = {}, totalCount = 0 }) {
  const total = summary.total ?? totalCount ?? 0;
  const active = summary.active ?? 0;
  const completed = summary.completed ?? 0;
  const aiAssigned = summary.aiAssigned ?? summary.distribution?.AI_ASSIGNED ?? 0;
  const pending = summary.pending ?? summary.distribution?.AI_ASSIGNED ?? 0;

  return (
    <section className="assignments-kpis-grid" aria-label="AI Dispatch Metrics Overview">
      <KpiCard
        label="TOTAL ASSIGNMENTS"
        value={total}
        supportingText="Active & historical dispatch records"
        status="info"
      />
      <KpiCard
        label="AI DISPATCHED"
        value={aiAssigned || total}
        supportingText="Multi-criteria heuristic matching"
        status="info"
      />
      <KpiCard
        label="ACTIVE DISPATCHES"
        value={active}
        supportingText="Accepted or in-progress in field"
        status="warning"
      />
      <KpiCard
        label="PENDING ACCEPTANCE"
        value={pending}
        supportingText="Awaiting officer confirmation"
        status="critical"
      />
      <KpiCard
        label="COMPLETED VERIFICATIONS"
        value={completed}
        supportingText="Ground inspection reports filed"
        status="success"
      />
    </section>
  );
}

