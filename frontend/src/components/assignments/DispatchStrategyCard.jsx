import React from 'react';
import Card from '../common/Card';

/**
 * DispatchStrategyCard: Displays the fixed AI dispatch scoring weights and operational pipeline
 * Invariants: Risk = 0.4, Distance = 0.3, Workload = 0.3 (Strictly Informational, Non-Editable)
 */
export default function DispatchStrategyCard({ summary = {}, distribution = {} }) {
  const pipelineStages = [
    { label: 'Prediction', count: summary.totalPredictions ?? 'Active', color: '#60a5fa' },
    { label: 'Selected', count: summary.selectedCandidates ?? summary.total ?? '—', color: '#818cf8' },
    { label: 'AI Assigned', count: distribution.AI_ASSIGNED ?? summary.aiAssigned ?? '—', color: '#38bdf8' },
    { label: 'Accepted', count: distribution.ACCEPTED ?? '—', color: '#f59e0b' },
    { label: 'In Progress', count: distribution.IN_PROGRESS ?? '—', color: '#fbbf24' },
    { label: 'Verification', count: summary.pendingVerification ?? '—', color: '#a78bfa' },
    { label: 'Completed', count: distribution.COMPLETED ?? summary.completed ?? '—', color: '#10b981' },
  ];

  return (
    <Card
      title="AI Dispatch Strategy & Operational Pipeline"
      subtitle="Multi-criteria optimization matching predictive civic risks to municipal field officers"
      className="dispatch-strategy-card"
    >
      <div className="dispatch-strategy-grid">
        {/* Left Column: Fixed Scoring Formula (Informational Only) */}
        <div className="dispatch-formula-section">
          <div className="dispatch-section-tag font-mono">SCORING WEIGHT DISTRIBUTION</div>
          <p className="dispatch-formula-desc">
            Officers are selected using risk priority, geographic proximity, workload capacity, and department compatibility.
          </p>

          <div className="dispatch-weights-row">
            <div className="dispatch-weight-badge">
              <span className="weight-percent font-mono">40%</span>
              <span className="weight-label">Risk Priority</span>
              <span className="weight-sub">Severity & Probability</span>
            </div>

            <div className="dispatch-weight-badge">
              <span className="weight-percent font-mono">30%</span>
              <span className="weight-label">Proximity</span>
              <span className="weight-sub">Haversine Distance (km)</span>
            </div>

            <div className="dispatch-weight-badge">
              <span className="weight-percent font-mono">30%</span>
              <span className="weight-label">Workload</span>
              <span className="weight-sub">Capacity & Active Queue</span>
            </div>
          </div>
        </div>

        {/* Right Column: Operational Pipeline */}
        <div className="dispatch-pipeline-section">
          <div className="dispatch-section-tag font-mono">DISPATCH LIFECYCLE PIPELINE</div>
          <div className="dispatch-pipeline-steps" aria-label="Operational Workflow Pipeline">
            {pipelineStages.map((stage, idx) => (
              <React.Fragment key={stage.label}>
                <div className="pipeline-step-item">
                  <div className="pipeline-step-dot" style={{ backgroundColor: stage.color }} />
                  <span className="pipeline-step-label">{stage.label}</span>
                  {stage.count !== undefined && stage.count !== null && (
                    <span className="pipeline-step-count font-mono" style={{ color: stage.color }}>
                      {stage.count}
                    </span>
                  )}
                </div>
                {idx < pipelineStages.length - 1 && (
                  <div className="pipeline-arrow" aria-hidden="true">
                    →
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
