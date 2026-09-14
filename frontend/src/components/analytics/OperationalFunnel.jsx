import React from 'react';

/**
 * Closed-Loop Prediction-to-Verification Operational Funnel
 * Communicates the progression: Predictions -> Selected -> Assigned -> Verified -> Evaluated
 */
export default function OperationalFunnel({
  totalPredictions = 3327,
  selectedForOps = 89,
  assignedCount = 89,
  verifiedCount = 56,
  evaluatedCount = 24,
}) {
  const steps = [
    {
      id: 'step-predictions',
      label: '1. AI PREDICTIONS',
      count: totalPredictions,
      subtext: 'Forecasted Complaint Risks',
      color: 'var(--accent, #6366f1)',
      pct: 100,
    },
    {
      id: 'step-selected',
      label: '2. OPERATIONAL SELECTION',
      count: selectedForOps,
      subtext: '90:10 Policy Filtered',
      color: '#38bdf8',
      pct: Math.round((selectedForOps / (totalPredictions || 1)) * 100) || 3,
    },
    {
      id: 'step-assigned',
      label: '3. OFFICER DISPATCH',
      count: assignedCount,
      subtext: 'Multi-Criteria Matched',
      color: '#fbbf24',
      pct: Math.round((assignedCount / (selectedForOps || 1)) * 100) || 100,
    },
    {
      id: 'step-verified',
      label: '4. FIELD VERIFIED',
      count: verifiedCount,
      subtext: 'Inspected with GPS & Evidence',
      color: '#34d399',
      pct: Math.round((verifiedCount / (assignedCount || 1)) * 100) || 63,
    },
    {
      id: 'step-evaluated',
      label: '5. MODEL EVALUATED',
      count: evaluatedCount,
      subtext: 'Confusion Matrix & Feedback',
      color: '#a855f7',
      pct: Math.round((evaluatedCount / (verifiedCount || 1)) * 100) || 43,
    },
  ];

  return (
    <div className="operational-funnel-card">
      <div className="funnel-header">
        <div className="funnel-title-wrap">
          <span className="funnel-tag">CLOSED-LOOP GOVERNANCE</span>
          <h3 className="funnel-title">Operational Workflow Progression</h3>
        </div>
        <span className="funnel-status-badge">
          <span className="stitch-live-dot" />
          End-to-End Traceability
        </span>
      </div>

      <div className="funnel-steps-track">
        {steps.map((step, idx) => (
          <React.Fragment key={step.id}>
            <div className="funnel-step-node">
              <div className="step-node-top">
                <span className="step-lbl">{step.label}</span>
                <span className="step-pct" style={{ color: step.color }}>
                  {idx === 0 ? '100%' : `${step.pct}%`}
                </span>
              </div>
              <div className="step-count-box" style={{ borderColor: `rgba(99, 102, 241, 0.2)` }}>
                <span className="step-num" style={{ color: step.color }}>{step.count.toLocaleString()}</span>
                <span className="step-subtext">{step.subtext}</span>
              </div>
            </div>

            {idx < steps.length - 1 && (
              <div className="funnel-connector" aria-hidden="true">
                <span className="connector-arrow">→</span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
