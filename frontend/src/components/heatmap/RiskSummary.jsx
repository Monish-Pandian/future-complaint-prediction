import React from 'react';
import KpiCard from '../dashboard/KpiCard';

/**
 * RiskSummary: 3 compact intelligence summary cards for spatial risk
 */
export default function RiskSummary({ summary = {} }) {
  return (
    <section className="heatmap-summary-compact-grid" aria-label="Spatial Risk Metrics Overview">
      <KpiCard
        label="PREDICTED AREAS"
        value={summary.totalPredictedAreas || 24}
        supportingText="Municipal coverage zones"
        status="info"
      />
      <KpiCard
        label="HIGH-RISK HOTSPOTS"
        value={summary.highRiskAreas || 8}
        supportingText="Risk score ≥ 75"
        status="warning"
      />
      <KpiCard
        label="CRITICAL ESCALATIONS"
        value={summary.criticalAreas || 3}
        supportingText="Immediate priority clusters"
        status="critical"
      />
    </section>
  );
}
