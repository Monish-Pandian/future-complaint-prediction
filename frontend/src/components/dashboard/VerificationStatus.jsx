import React from 'react';

/**
 * VerificationStatus component displaying field verification breakdown and pipeline flow
 */
export default function VerificationStatus({ data }) {
  const summary = data?.summary || [];
  const pipeline = data?.pipeline || {
    predicted: 248,
    assigned: 176,
    verified: 126,
    confirmed: 98,
  };

  return (
    <section
      className="dashboard-panel dashboard-verification"
      aria-label="Field Verification Status and Pipeline"
    >
      <div className="dashboard-panel-header">
        <div className="dashboard-panel-title-group">
          <h2 className="dashboard-panel-title">FIELD VERIFICATION STATUS</h2>
          <span className="dashboard-panel-subtitle">
            Ground truth feedback & resolution funnel
          </span>
        </div>
        <span className="dashboard-panel-tag">DEMO DATA</span>
      </div>

      <div className="verification-content">
        {/* Verification Status Breakdown Rows */}
        <div className="verification-status-list" role="list">
          {summary.map((row) => (
            <div key={row.key} className="verification-status-row" role="listitem">
              <div className="verif-status-label">
                <span
                  className="verif-status-indicator"
                  style={{ backgroundColor: row.color }}
                  aria-hidden="true"
                />
                <span>{row.status}</span>
              </div>

              <div className="verif-status-values">
                <span className="verif-count">{row.count}</span>
                <span className="verif-percentage">{row.percentage}%</span>
              </div>
            </div>
          ))}
        </div>

        {/* Operational Workflow Pipeline */}
        <div className="workflow-pipeline-card">
          <div className="pipeline-header">
            <span className="pipeline-title">OPERATIONAL DISPATCH PIPELINE</span>
            <span className="workflow-badge">DEMO WORKFLOW DATA</span>
          </div>

          <div className="pipeline-steps">
            {/* Step 1: Predicted */}
            <div className="pipeline-step">
              <span className="pipeline-step-label">Predicted</span>
              <span className="pipeline-step-val">{pipeline.predicted}</span>
              <span className="pipeline-connector">→</span>
            </div>

            {/* Step 2: Assigned */}
            <div className="pipeline-step">
              <span className="pipeline-step-label">Assigned</span>
              <span className="pipeline-step-val" style={{ color: '#68b3e8' }}>
                {pipeline.assigned}
              </span>
              <span className="pipeline-connector">→</span>
            </div>

            {/* Step 3: Verified */}
            <div className="pipeline-step">
              <span className="pipeline-step-label">Verified</span>
              <span className="pipeline-step-val" style={{ color: '#a78bfa' }}>
                {pipeline.verified}
              </span>
              <span className="pipeline-connector">→</span>
            </div>

            {/* Step 4: Confirmed */}
            <div className="pipeline-step">
              <span className="pipeline-step-label">Confirmed</span>
              <span className="pipeline-step-val" style={{ color: '#4dd6a8' }}>
                {pipeline.confirmed}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
