import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Model Health & Governance Summary Card
 * Displays active model version, classification metrics, decision threshold, and evaluation link
 */
export default function ModelHealthSummaryCard({
  modelInfo = {},
}) {
  const version = modelInfo.modelVersion || 'xgb-test-v1';
  const threshold = modelInfo.threshold || 0.38;
  const rawFeatures = modelInfo.requiredFeatureCount || 36;
  const metrics = modelInfo.validationMetrics || {
    accuracy: 0.9127,
    precision: 0.9166,
    recall: 0.9934,
    f1: 0.9535,
    roc_auc: 0.9086,
  };

  const accPct = ((metrics.accuracy || 0.9127) * 100).toFixed(2);
  const precPct = ((metrics.precision || 0.9166) * 100).toFixed(2);
  const recPct = ((metrics.recall || 0.9934) * 100).toFixed(2);
  const f1Pct = ((metrics.f1 || 0.9535) * 100).toFixed(2);
  const rocAucPct = ((metrics.roc_auc || 0.9086) * 100).toFixed(2);

  return (
    <div className="analytics-card">
      <div className="analytics-card-header">
        <div className="analytics-card-title-wrap">
          <span className="analytics-card-tag">MODEL GOVERNANCE & HEALTH</span>
          <h3 className="analytics-card-title">AI Engine Performance Summary</h3>
        </div>

        <Link to="/evaluations" className="analytics-view-link">
          <span>View Model Evaluation</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>

      {/* Model Spec Badge */}
      <div className="model-spec-strip">
        <div className="spec-badge-group">
          <span className="spec-tag-lbl">ACTIVE MODEL:</span>
          <span className="spec-tag-val font-mono">{version}</span>
        </div>
        <div className="spec-badge-group">
          <span className="spec-tag-lbl">THRESHOLD:</span>
          <span className="spec-tag-val font-mono highlight-amber">{threshold}</span>
        </div>
        <div className="spec-badge-group">
          <span className="spec-tag-lbl">POLICY:</span>
          <span className="spec-tag-val font-mono highlight-blue">90/10 Ratio</span>
        </div>
      </div>

      {/* 5 Key Metric Cards */}
      <div className="model-metrics-grid">
        <div className="model-metric-box">
          <span className="m-val highlight-green">{accPct}%</span>
          <span className="m-lbl">Accuracy</span>
        </div>

        <div className="model-metric-box">
          <span className="m-val highlight-cyan">{precPct}%</span>
          <span className="m-lbl">Precision</span>
        </div>

        <div className="model-metric-box">
          <span className="m-val highlight-green">{recPct}%</span>
          <span className="m-lbl">Recall</span>
        </div>

        <div className="model-metric-box">
          <span className="m-val highlight-indigo">{f1Pct}%</span>
          <span className="m-lbl">F1 Score</span>
        </div>

        <div className="model-metric-box">
          <span className="m-val highlight-purple">{rocAucPct}%</span>
          <span className="m-lbl">ROC-AUC</span>
        </div>
      </div>
    </div>
  );
}
