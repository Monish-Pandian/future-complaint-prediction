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
            Ground truth feedback & field inspection funnel
          </span>
        </div>
        <span className="dashboard-panel-tag">INSPECTION PIPELINE</span>
      </div>

      <div className="verification-content">
        {/* Verification Status Breakdown Rows */}
        <div className="verification-status-list" role="list">
          {summary.map((row) => (
            <div key={row.key || row.status} className="verification-status-row" role="listitem">
              <div className="verif-status-label">
                <span
                  className="verif-status-indicator"
                  style={{ backgroundColor: row.color }}
                  aria-hidden="true"
                />
                <span>{row.status}</span>
              </div>

              <div className="verif-status-values">
                <span className="verif-count font-mono">{row.count}</span>
                {row.percentage !== undefined && (
                  <span className="verif-percentage font-mono">({row.percentage}%)</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Operational Workflow Pipeline */}
        <div className="workflow-pipeline-card">
          <div className="pipeline-header">
            <span className="pipeline-title">OPERATIONAL DISPATCH FLOW</span>
            <span className="workflow-badge">7-NODE TRACEABILITY</span>
          </div>

          <div className="pipeline-steps">
            {/* Step 1: Predicted */}
            <div className="pipeline-step">
              <span className="pipeline-step-label">Forecasted</span>
              <span className="pipeline-step-val font-mono">{pipeline.predicted}</span>
              <span className="pipeline-connector" aria-hidden="true">→</span>
            </div>

            {/* Step 2: Assigned */}
            <div className="pipeline-step">
              <span className="pipeline-step-label">Assigned</span>
              <span className="pipeline-step-val font-mono" style={{ color: '#06b6d4' }}>
                {pipeline.assigned}
              </span>
              <span className="pipeline-connector" aria-hidden="true">→</span>
            </div>

            {/* Step 3: Verified */}
            <div className="pipeline-step">
              <span className="pipeline-step-label">Inspected</span>
              <span className="pipeline-step-val font-mono" style={{ color: '#818cf8' }}>
                {pipeline.verified}
              </span>
              <span className="pipeline-connector" aria-hidden="true">→</span>
            </div>

            {/* Step 4: Confirmed */}
            <div className="pipeline-step">
              <span className="pipeline-step-label">Confirmed</span>
              <span className="pipeline-step-val font-mono" style={{ color: '#10b981' }}>
                {pipeline.confirmed}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
