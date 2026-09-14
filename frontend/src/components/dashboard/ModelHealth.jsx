import React from 'react';
import Card from '../common/Card';

export default function ModelHealth({ modelInfo = {} }) {
  const modelVersion = modelInfo?.modelVersion || 'xgb-test-v1';
  const threshold = modelInfo?.threshold ?? 0.38;
  const rawFeatures = modelInfo?.requiredFeatureCount ?? 36;
  const transformedFeatures = 45;
  const status = (modelInfo?.status || 'ACTIVE').toUpperCase();
  const f1 = modelInfo?.validationMetrics?.f1
    ? `${(modelInfo.validationMetrics.f1 * 100).toFixed(1)}%`
    : '95.6%';
  const accuracy = modelInfo?.validationMetrics?.accuracy
    ? `${(modelInfo.validationMetrics.accuracy * 100).toFixed(1)}%`
    : '91.8%';

  return (
    <Card
      title="Active AI Forecasting Engine"
      subtitle="Municipal spatial-temporal predictive intelligence"
      className="model-health-card"
    >
      <div className="model-specs-grid">
        <div className="model-spec-row">
          <span className="model-spec-label">Model Identifier</span>
          <span className="model-spec-val font-mono" style={{ color: 'var(--accent-text)' }}>
            {modelVersion}
          </span>
        </div>

        <div className="model-spec-row">
          <span className="model-spec-label">Operational Policy</span>
          <span className="model-spec-val font-mono" style={{ color: '#38bdf8' }}>90/10 Exploration-Exploitation</span>
        </div>

        <div className="model-spec-row">
          <span className="model-spec-label">Decision Threshold</span>
          <span className="model-spec-val font-mono">{threshold.toFixed(2)}</span>
        </div>

        <div className="model-spec-row">
          <span className="model-spec-label">Dispatch Weights</span>
          <span className="model-spec-val font-mono" style={{ color: '#34d399' }}>
            0.4 Risk / 0.3 Dist / 0.3 Load
          </span>
        </div>

        <div className="model-spec-row">
          <span className="model-spec-label">Data Repository</span>
          <span className="model-spec-val">Municipal Civic Complaint Archive</span>
        </div>

        <div className="model-spec-row">
          <span className="model-spec-label">Validation Accuracy</span>
          <span className="model-spec-val font-mono" style={{ color: 'var(--success-text)' }}>
            F1: {f1} • Acc: {accuracy}
          </span>
        </div>

        <div className="model-spec-row">
          <span className="model-spec-label">Deployment Status</span>
          <span className="badge badge-risk-low" style={{ fontSize: '10.5px' }}>
            <span className="status-badge-dot" aria-hidden="true" />
            {status}
          </span>
        </div>
      </div>
    </Card>
  );
}
