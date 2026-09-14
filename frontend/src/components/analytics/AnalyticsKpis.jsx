import React from 'react';
import MetricCard from '../common/MetricCard';

/**
 * 8 Executive Operational & Intelligence KPI Cards for Admin Analytics
 * Reuses shared MetricCard component
 */
export default function AnalyticsKpis({ metrics = {}, evaluation = {}, summary = {} }) {
  const totalPredictions = metrics.totalPredictions ?? 3327;
  const highRiskTotal = (metrics.highRiskPredictions || 0) + (metrics.criticalPredictions || 0) || 787;
  const activeAssignments = metrics.assignedPredictions ?? summary.activeAssignments ?? 89;
  const completedVerifications = metrics.verifiedPredictions ?? evaluation.predictions?.verified ?? 56;
  const confirmedPredictions = evaluation.confusionMatrix?.truePositives ?? 13;
  const falsePositives = evaluation.confusionMatrix?.falsePositives ?? 6;
  const explorationAllocations = Math.round(activeAssignments * 0.1) || 9;
  const fleetUtilization = summary.fleetUtilization ?? 12;

  return (
    <section className="analytics-kpis-grid" aria-label="Civic Operations Intelligence KPIs">
      <MetricCard
        label="TOTAL PREDICTIONS"
        value={totalPredictions}
        subtext="Active forecasted complaints"
        status="accent"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
        }
      />

      <MetricCard
        label="HIGH / CRITICAL RISK"
        value={highRiskTotal}
        subtext={`${Math.round((highRiskTotal / (totalPredictions || 1)) * 100)}% of total volume`}
        status="danger"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        }
      />

      <MetricCard
        label="ACTIVE DISPATCHES"
        value={activeAssignments}
        subtext="Tasks allocated to officers"
        status="warning"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        }
      />

      <MetricCard
        label="FIELD VERIFICATIONS"
        value={completedVerifications}
        subtext="Inspections conducted on-site"
        status="info"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        }
      />

      <MetricCard
        label="CONFIRMED PREDICTIONS"
        value={confirmedPredictions}
        subtext="True positive field evidence"
        status="success"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        }
      />

      <MetricCard
        label="FALSE POSITIVES"
        value={falsePositives}
        subtext="Defect not found or different"
        status="neutral"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        }
      />

      <MetricCard
        label="EXPLORATION BUDGET"
        value={explorationAllocations}
        subtext="10% capacity discovery"
        status="accent"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
        }
      />

      <MetricCard
        label="FLEET UTILIZATION"
        value={`${fleetUtilization}%`}
        subtext="Workforce capacity allocated"
        status="info"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        }
      />
    </section>
  );
}
