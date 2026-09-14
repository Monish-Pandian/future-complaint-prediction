import React from 'react';
import MetricCard from '../common/MetricCard';

/**
 * EvaluationMetricsGrid: Authoritative 5-card TEST-2025 evaluation benchmarks for xgb-test-v1
 * Verified test instances: N = 39,270
 */
export default function EvaluationMetricsGrid() {
  return (
    <div className="evaluation-test-metrics-section">
      <div className="eval-section-header">
        <div>
          <div className="eval-section-tag font-mono">SECTION A • BENCHMARK EVALUATION</div>
          <h3 className="eval-section-title">MODEL TEST PERFORMANCE</h3>
          <p className="eval-section-desc">
            Authoritative TEST-2025 evaluation of <strong>xgb-test-v1</strong> across 39,270 prediction instances (Threshold: 0.38).
          </p>
        </div>
        <div className="eval-test-badge font-mono">
          <span>TEST-2025 GOLD STANDARD</span>
        </div>
      </div>

      <div className="evaluation-kpis-grid" aria-label="Authoritative Model Performance Metrics">
        <MetricCard
          label="ACCURACY"
          value="91.27%"
          subtext="Overall correct classification rate across test instances"
          status="success"
        />
        <MetricCard
          label="PRECISION"
          value="91.66%"
          subtext="Forecast fidelity among predicted positive instances"
          status="success"
        />
        <MetricCard
          label="RECALL"
          value="99.34%"
          subtext="Discovery rate of actual positive civic risks"
          status="info"
        />
        <MetricCard
          label="F1 SCORE"
          value="95.35%"
          subtext="Harmonic balance of precision and recall"
          status="info"
        />
        <MetricCard
          label="ROC-AUC"
          value="90.86%"
          subtext="Ranking discrimination across all classification thresholds"
          status="success"
        />
      </div>
    </div>
  );
}
