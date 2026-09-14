import React from 'react';
import Card from '../common/Card';

/**
 * ClosedLoopFlow: Closed-Loop Governance Architecture & Ground Truth Mapping Matrix
 */
export default function ClosedLoopFlow() {
  const workflowStages = [
    { label: 'AI PREDICTION', color: '#60a5fa' },
    { label: 'RISK PRIORITIZATION', color: '#818cf8' },
    { label: 'OFFICER ASSIGNMENT', color: '#38bdf8' },
    { label: 'FIELD VERIFICATION', color: '#f59e0b' },
    { label: 'EVALUATION', color: '#10b981' },
    { label: 'FEEDBACK INGESTION', color: '#a78bfa' },
  ];

  const mappings = [
    { outcome: 'PROBLEM_CONFIRMED', label: 'Problem Confirmed', evalClass: 'TRUE_POSITIVE', evalLabel: 'True Positive', feedback: 'VERIFIED_OBSERVATION', color: '#10b981' },
    { outcome: 'PROBLEM_NOT_FOUND', label: 'Problem Not Found', evalClass: 'FALSE_POSITIVE', evalLabel: 'False Positive', feedback: 'FALSE_POSITIVE_SIGNAL', color: '#f59e0b' },
    { outcome: 'DIFFERENT_PROBLEM', label: 'Different Problem', evalClass: 'FALSE_POSITIVE', evalLabel: 'False Positive', feedback: 'FALSE_POSITIVE_SIGNAL', color: '#f97316' },
    { outcome: 'DUPLICATE', label: 'Duplicate Report', evalClass: 'UNDETERMINED', evalLabel: 'Undetermined', feedback: 'DATA_QUALITY_ISSUE', color: '#60a5fa' },
    { outcome: 'UNABLE_TO_VERIFY', label: 'Unable to Verify', evalClass: 'UNDETERMINED', evalLabel: 'Undetermined', feedback: 'DATA_QUALITY_ISSUE', color: '#ef4444' },
  ];

  return (
    <Card
      title="Closed-Loop AI Governance Architecture"
      subtitle="Complete feedback loop linking machine learning forecasts, operational field dispatch, and continuous retraining buffers"
      className="closed-loop-card"
    >
      <div className="closed-loop-content">
        {/* Workflow Chain */}
        <div className="closed-loop-chain" aria-label="Closed-Loop Operational Architecture">
          {workflowStages.map((stage, idx) => (
            <React.Fragment key={stage.label}>
              <div className="closed-loop-step">
                <div className="closed-loop-dot" style={{ backgroundColor: stage.color }} />
                <span className="closed-loop-label font-mono">{stage.label}</span>
              </div>
              {idx < workflowStages.length - 1 && (
                <span className="closed-loop-arrow" aria-hidden="true">→</span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Evaluation & Feedback Mapping Matrix */}
        <div className="eval-matrix-section">
          <div className="eval-matrix-tag font-mono">GROUND TRUTH OUTCOME → EVALUATION → FEEDBACK MAPPINGS</div>
          <div className="eval-matrix-grid">
            {mappings.map((m) => (
              <div key={m.outcome} className="eval-matrix-item">
                <div className="eval-matrix-top">
                  <span className="eval-matrix-dot" style={{ backgroundColor: m.color }} />
                  <span className="eval-matrix-name">{m.label}</span>
                </div>
                <div className="eval-matrix-body font-mono">
                  <span className="eval-matrix-class" style={{ color: m.color }}>
                    {m.evalLabel}
                  </span>
                  <span className="eval-matrix-fb text-muted">
                    ↳ {m.feedback.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
