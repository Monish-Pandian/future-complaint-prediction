import React from 'react';
import KpiCard from '../dashboard/KpiCard';

/**
 * VerificationSummary: 5 top summary cards for ground truth verification & feedback metrics
 */
export default function VerificationSummary({ summary = {} }) {
  return (
    <section className="verification-kpis-grid" aria-label="Ground Truth Verification Metrics">
      <KpiCard
        label="TOTAL VERIFICATIONS"
        value={summary.totalVerifications ?? 56}
        supportingText="Ground truth field reports"
        status="info"
      />
      <KpiCard
        label="CONFIRMED PROBLEMS"
        value={summary.confirmedProblems ?? 38}
        supportingText="True Positive validations"
        status="success"
      />
      <KpiCard
        label="UNCONFIRMED FINDINGS"
        value={summary.unconfirmedFindings ?? 12}
        supportingText="False Positives / Noise"
        status="warning"
      />
      <KpiCard
        label="FEEDBACK INGESTED"
        value={summary.feedbackSignalsIngested ?? 44}
        supportingText="Feature store buffer signals"
        status="info"
      />
      <KpiCard
        label="VERIFICATION ACCURACY"
        value={`${summary.verificationAccuracy ?? 76.0}%`}
        supportingText="Empirical precision on forecast"
        status="success"
      />
    </section>
  );
}
