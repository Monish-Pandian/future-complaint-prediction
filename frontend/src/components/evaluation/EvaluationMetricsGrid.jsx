import React from 'react';
import KpiCard from '../dashboard/KpiCard';

/**
 * EvaluationMetricsGrid: 4 top summary cards for authoritative AI Model Research metrics
 */
export default function EvaluationMetricsGrid({ metrics = {} }) {
  const precisionVal = metrics.precision !== null && metrics.precision !== undefined ? `${metrics.precision}%` : 'N/A';
  const recallVal = metrics.recall !== null && metrics.recall !== undefined ? `${metrics.recall}%` : 'N/A';
  const f1Val = metrics.f1Score !== null && metrics.f1Score !== undefined ? `${metrics.f1Score}%` : 'N/A';
  const accuracyVal = metrics.accuracy !== null && metrics.accuracy !== undefined ? `${metrics.accuracy}%` : 'N/A';

  return (
    <section className="evaluation-kpis-grid" aria-label="AI Model Performance Metrics">
      <KpiCard
        label="PRECISION"
        value={precisionVal}
        supportingText="TP / (TP + FP) Forecast Fidelity"
        status="success"
      />
      <KpiCard
        label="RECALL"
        value={recallVal}
        supportingText="TP / (TP + FN) Discovery Rate"
        status="info"
      />
      <KpiCard
        label="F1 SCORE"
        value={f1Val}
        supportingText="Harmonic Precision-Recall Mean"
        status="info"
      />
      <KpiCard
        label="OVERALL ACCURACY"
        value={accuracyVal}
        supportingText="(TP + TN) / Verified Benchmark"
        status="success"
      />
    </section>
  );
}
