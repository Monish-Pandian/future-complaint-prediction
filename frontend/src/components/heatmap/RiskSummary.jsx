import React from 'react';
import KpiCard from '../dashboard/KpiCard';

/**
 * RiskSummary: 3 compact intelligence summary cards for spatial risk
 */
export default function RiskSummary({ summary = {} }) {
  return (
    <section className="heatmap-summary-compact-grid" aria-label="Spatial Risk Metrics Overview">
      <KpiCard
        label="PREDICTED SECTORS"
        value={summary.totalPredictedAreas ?? 0}
        supportingText="Active spatial predictions"
        status="info"
      />
      <KpiCard
        label="HIGH-RISK HOTSPOTS"
        value={summary.highRiskAreas ?? 0}
        supportingText="Risk score 70.0 – 84.9"
        status="warning"
      />
      <KpiCard
        label="CRITICAL ESCALATIONS"
        value={summary.criticalAreas ?? 0}
        supportingText="Risk score ≥ 85.0"
        status="critical"
      />
    </section>
  );
}

