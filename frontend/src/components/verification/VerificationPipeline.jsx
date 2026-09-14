import React from 'react';
import Card from '../common/Card';

/**
 * VerificationPipeline: Interactive 4-stage operational workflow with stage filtering and outcome-to-evaluation matrix
 */
export default function VerificationPipeline({
  summary = {},
  activeStage = null,
  onStageClick = null,
}) {
  const pendingCount = summary.pendingAssignment ?? 0;
  const assignedCount = summary.assigned ?? 0;
  const submittedCount = summary.submitted ?? 0;
  const completedCount = summary.completed ?? (summary.total ?? 0) - pendingCount - assignedCount - submittedCount;
  const cancelledCount = summary.cancelled ?? 0;

  const pipelineStages = [
    {
      id: 'PENDING_ASSIGNMENT',
      label: 'PENDING ASSIGNMENT',
      count: pendingCount,
      color: '#f59e0b',
      bgClass: 'pending',
    },
    {
      id: 'ASSIGNED',
      label: 'ASSIGNED',
      count: assignedCount,
      color: '#38bdf8',
      bgClass: 'assigned',
    },
    {
      id: 'VERIFICATION_SUBMITTED',
      label: 'VERIFICATION SUBMITTED',
      count: submittedCount,
      color: '#a855f7',
      bgClass: 'submitted',
    },
    {
      id: 'COMPLETED',
      label: 'COMPLETED',
      count: completedCount,
      color: '#10b981',
      bgClass: 'completed',
    },
    {
      id: 'CANCELLED',
      label: 'CANCELLED',
      count: cancelledCount,
      color: '#ef4444',
      bgClass: 'cancelled',
    },
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
      title="Verification Pipeline & Ground Truth Matrix"
      subtitle="Operational lifecycle from candidate selection to ground truth validation and model evaluation"
      className="verification-pipeline-card"
    >
      <div className="verif-pipeline-grid">
        {/* Top: Operational Workflow Pipeline */}
        <div className="verif-flow-section">
          <div className="verif-section-tag font-mono">
            OPERATIONAL VERIFICATION STAGES (CLICK TO FILTER)
          </div>
          <div className="verif-flow-steps" aria-label="Verification Workflow Stages">
            {pipelineStages.map((stage, idx) => {
              const isSelected = activeStage === stage.id;
              return (
                <React.Fragment key={stage.id}>
                  <button
                    type="button"
                    className={`verif-pipeline-stage-btn ${stage.bgClass} ${isSelected ? 'active' : ''}`}
                    onClick={() => onStageClick && onStageClick(stage.id === activeStage ? null : stage.id)}
                    title={`Filter by ${stage.label}`}
                  >
                    <div className="verif-step-dot" style={{ backgroundColor: stage.color }} />
                    <span className="verif-step-label">{stage.label}</span>
                    <span className="verif-stage-count font-mono" style={{ color: stage.color }}>
                      {stage.count}
                    </span>
                  </button>
                  {idx < pipelineStages.length - 1 && (
                    <div className="verif-arrow" aria-hidden="true">
                      →
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Bottom: Outcome to Evaluation Matrix */}
        <div className="verif-mapping-section">
          <div className="verif-section-tag font-mono">
            GROUND TRUTH OUTCOME → EVALUATION MATRIX
          </div>
          <div className="verif-mapping-grid">
            {mappings.map((m) => (
              <div key={m.outcome} className="verif-mapping-card">
                <div className="verif-map-top">
                  <span className="verif-map-dot" style={{ backgroundColor: m.color }} />
                  <span className="verif-map-title">{m.label}</span>
                </div>
                <div className="verif-map-body font-mono">
                  <span className="verif-eval-badge" style={{ color: m.color }}>
                    {m.evalLabel}
                  </span>
                  <span className="verif-feedback-tag text-muted">
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
