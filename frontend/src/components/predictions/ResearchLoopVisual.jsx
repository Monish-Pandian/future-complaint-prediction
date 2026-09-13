import React from 'react';

/**
 * ResearchLoopVisual: Operational research cycle displaying the 6-stage forecasting workflow
 */
export default function ResearchLoopVisual({ verification = {}, assignment = {} }) {
  const isVerified = verification?.status === 'VERIFIED' || Boolean(verification?.outcome);
  const isAssigned = Boolean(assignment?.officerName);

  // Active step computation:
  // 1. Historical Evidence (Completed)
  // 2. Future Prediction (Completed)
  // 3. Risk Assessment (Completed)
  // 4. Officer Assignment (Completed or Active)
  // 5. Field Verification (Active if assigned & not verified, completed if verified)
  // 6. Actual Outcome (Active if verified, pending otherwise)

  const steps = [
    { num: '01', label: 'Historical Evidence', status: 'completed' },
    { num: '02', label: 'Future Prediction', status: 'completed' },
    { num: '03', label: 'Risk Assessment', status: 'completed' },
    {
      num: '04',
      label: 'Officer Assignment',
      status: isAssigned ? 'completed' : 'active',
    },
    {
      num: '05',
      label: 'Field Verification',
      status: isVerified ? 'completed' : isAssigned ? 'active' : 'pending',
    },
    {
      num: '06',
      label: 'Actual Outcome',
      status: isVerified ? 'active' : 'pending',
    },
  ];

  return (
    <div className="research-loop-card" aria-label="Research Cycle Loop">
      <div className="research-loop-header">
        <span className="research-loop-title">PREDICTION & VERIFICATION CYCLE</span>
        <span className="workflow-badge">
          {isVerified ? 'VERIFICATION COMPLETE' : 'AWAITING FIELD VERIFICATION'}
        </span>
      </div>

      <div className="research-loop-steps">
        {steps.map((step, idx) => (
          <div
            key={step.num}
            className={`loop-step-item ${step.status}`}
            aria-current={step.status === 'active' ? 'step' : undefined}
          >
            <span className="loop-step-num">STAGE {step.num}</span>
            <span className="loop-step-label">{step.label}</span>
            {idx < steps.length - 1 && <span className="loop-connector">→</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
