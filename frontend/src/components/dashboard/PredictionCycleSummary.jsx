import React from 'react';
import Button from '../common/Button';

export default function PredictionCycleSummary({
  cycleData,
  modelInfo,
  onRunCycle,
  running = false,
}) {
  const modelVersion = modelInfo?.modelVersion || 'xgb-test-v1';
  const cycleId = cycleData?.cycleId || cycleData?.predictionCycleId || 'CYCLE-2026-09-14-ACTIVE';
  const totalPredictions = cycleData?.totalPredictions ?? 770;
  const threshold = modelInfo?.threshold ?? 0.38;
  const status = cycleData?.status || 'ACTIVE';

  // Format date range (e.g. 14 Sep 2026 → 21 Sep 2026)
  const formatDateRange = () => {
    if (cycleData?.targetWindow?.start && cycleData?.targetWindow?.end) {
      const start = new Date(cycleData.targetWindow.start).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      const end = new Date(cycleData.targetWindow.end).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${start} → ${end}`;
    }
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 86400000);
    const s = today.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const e = nextWeek.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${s} → ${e}`;
  };

  const generatedTimestamp = cycleData?.createdAt
    ? new Date(cycleData.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="card prediction-cycle-hero" role="region" aria-label="Current Prediction Cycle">
      <div className="card-header" style={{ paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div className="cycle-hero-icon" aria-hidden="true">
            ⬢
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 className="card-title" style={{ fontSize: '16px', letterSpacing: '-0.01em' }}>
                Current Prediction Cycle
              </h3>
              <span className={`badge ${status === 'ACTIVE' ? 'badge-risk-low' : 'badge-risk-medium'}`}>
                <span className="status-badge-dot" aria-hidden="true" />
                {status}
              </span>
            </div>
            <p className="card-subtitle" style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
              Cycle ID: {cycleId}
            </p>
          </div>
        </div>

        <div className="card-actions">
          <Button
            variant="primary"
            size="sm"
            onClick={onRunCycle}
            loading={running}
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            }
          >
            {running ? 'Executing Prediction Cycle...' : 'Generate New Cycle'}
          </Button>
        </div>
      </div>

      <div className="card-body" style={{ paddingTop: '12px' }}>
        <div className="cycle-hero-grid">
          <div className="cycle-metric-item">
            <span className="cycle-metric-label">Active Model</span>
            <div className="cycle-metric-val font-mono" style={{ color: 'var(--accent-text)' }}>
              {modelVersion}
            </div>
            <span className="cycle-metric-sub">Production XGBoost</span>
          </div>

          <div className="cycle-metric-item">
            <span className="cycle-metric-label">Target Forecast Window</span>
            <div className="cycle-metric-val" style={{ fontSize: '14px', fontWeight: '600' }}>
              {formatDateRange()}
            </div>
            <span className="cycle-metric-sub">7-day rolling window</span>
          </div>

          <div className="cycle-metric-item">
            <span className="cycle-metric-label">Cycle Predictions</span>
            <div className="cycle-metric-val font-mono">
              {totalPredictions.toLocaleString()}
            </div>
            <span className="cycle-metric-sub">Across 77 Community Areas</span>
          </div>

          <div className="cycle-metric-item">
            <span className="cycle-metric-label">Classification Threshold</span>
            <div className="cycle-metric-val font-mono">
              {threshold.toFixed(2)}
            </div>
            <span className="cycle-metric-sub">F1-optimized decision boundary</span>
          </div>

          <div className="cycle-metric-item">
            <span className="cycle-metric-label">Generated Timestamp</span>
            <div className="cycle-metric-val" style={{ fontSize: '13px', fontWeight: '500' }}>
              {generatedTimestamp}
            </div>
            <span className="cycle-metric-sub">Live Mongo persistence</span>
          </div>
        </div>
      </div>
    </div>
  );
}
