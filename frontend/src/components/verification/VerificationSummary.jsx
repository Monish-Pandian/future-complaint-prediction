import React from 'react';
import MetricCard from '../common/MetricCard';

/**
 * VerificationSummary: Top KPI row displaying key verification candidate counts and field outcomes
 */
export default function VerificationSummary({ summary = {}, totalCount = 0 }) {
  const total = summary.total ?? totalCount ?? 0;
  const pending = summary.pendingAssignment ?? 0;
  const assigned = summary.assigned ?? 0;
  const submitted = summary.submitted ?? 0;
  const completed = summary.completed ?? (total - pending - assigned - submitted);
  const confirmed = summary.confirmed ?? summary.distribution?.PROBLEM_CONFIRMED ?? 0;

  return (
    <section className="verification-kpis-grid" aria-label="Ground Truth Verification Metrics">
      <MetricCard
        label="TOTAL CANDIDATES"
        value={total}
        subtext="AI-selected verification candidates"
        status="info"
      />
      <MetricCard
        label="PENDING ASSIGNMENT"
        value={pending}
        subtext="Awaiting officer dispatch"
        status="warning"
      />
      <MetricCard
        label="ASSIGNED / IN FIELD"
        value={assigned}
        subtext="Active field investigations"
        status="neutral"
      />
      <MetricCard
        label="VERIFICATION SUBMITTED"
        value={submitted}
        subtext="Awaiting evaluation ingestion"
        status="info"
      />
      <MetricCard
        label="COMPLETED"
        value={completed}
        subtext="Verified & evaluated cases"
        status="success"
      />
      <MetricCard
        label="CONFIRMED (TP)"
        value={confirmed}
        subtext="True Positive ground truth"
        status="success"
      />
    </section>
  );
}
