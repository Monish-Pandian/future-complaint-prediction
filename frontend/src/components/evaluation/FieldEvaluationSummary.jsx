import React from 'react';
import MetricCard from '../common/MetricCard';

/**
 * FieldEvaluationSummary: Section B summary metrics for operational field-verification evaluations
 */
export default function FieldEvaluationSummary({ records = [], metricsData = {}, pagination = {} }) {
  const totalEvaluated = pagination.total || records.length;
  const tpCount = records.filter(
    (r) => (r.classification || '').toUpperCase() === 'TRUE_POSITIVE' || (r.actualOutcome || r.verification?.outcome) === 'PROBLEM_CONFIRMED'
  ).length;
  const fpCount = records.filter(
    (r) => (r.classification || '').toUpperCase() === 'FALSE_POSITIVE' || (r.actualOutcome || r.verification?.outcome) === 'PROBLEM_NOT_FOUND' || (r.actualOutcome || r.verification?.outcome) === 'DIFFERENT_PROBLEM'
  ).length;
  const undeterminedCount = records.filter(
    (r) => (r.classification || '').toUpperCase() === 'UNDETERMINED' || (r.actualOutcome || r.verification?.outcome) === 'UNABLE_TO_VERIFY' || (r.actualOutcome || r.verification?.outcome) === 'DUPLICATE'
  ).length;

  const fidelityRate = totalEvaluated > 0 ? `${Math.round((tpCount / totalEvaluated) * 100)}%` : '100%';

  return (
    <div className="evaluation-field-section">
      <div className="eval-section-header">
        <div>
          <div className="eval-section-tag font-mono">SECTION B • OPERATIONAL VALIDATION</div>
          <h3 className="eval-section-title">FIELD VERIFICATION EVALUATION</h3>
          <p className="eval-section-desc">
            Operational validation of predictions through officer-submitted ground truth outcomes and evidence.
          </p>
        </div>
        <div className="eval-live-badge font-mono">
          <span className="eval-live-dot" />
          <span>LIVE GROUND TRUTH STREAM</span>
        </div>
      </div>

      <div className="evaluation-kpis-grid" aria-label="Field Verification Evaluation Metrics">
        <MetricCard
          label="TOTAL EVALUATED"
          value={totalEvaluated}
          subtext="Verified cases evaluated against AI forecasts"
          status="info"
        />
        <MetricCard
          label="TRUE POSITIVES (TP)"
          value={tpCount}
          subtext="Field-confirmed problem observations"
          status="success"
        />
        <MetricCard
          label="FALSE POSITIVES (FP)"
          value={fpCount}
          subtext="Unconfirmed or discrepant field observations"
          status="warning"
        />
        <MetricCard
          label="UNDETERMINED"
          value={undeterminedCount}
          subtext="Inaccessible, duplicates, or data quality cases"
          status="neutral"
        />
        <MetricCard
          label="OPERATIONAL FIDELITY"
          value={fidelityRate}
          subtext="Ground truth confirmation rate in field"
          status="success"
        />
      </div>
    </div>
  );
}
