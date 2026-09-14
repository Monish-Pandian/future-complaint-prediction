import React from 'react';

/**
 * ModelVersionInfo: Displays Model Governance parameters and Operational Selection Policy
 */
export default function ModelVersionInfo() {
  return (
    <div className="eval-governance-container">
      {/* Model Governance Panel */}
      <div className="eval-info-card" aria-label="Model Governance Parameters">
        <div className="eval-info-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          MODEL GOVERNANCE
        </div>

        <div className="eval-info-grid">
          <div className="eval-info-item">
            <span className="eval-info-label">Active Model</span>
            <span className="eval-info-value font-mono" style={{ color: '#38bdf8' }}>
              xgb-test-v1
            </span>
          </div>
          <div className="eval-info-item">
            <span className="eval-info-label">Decision Threshold</span>
            <span className="eval-info-value font-mono" style={{ color: '#fbbf24' }}>
              0.38
            </span>
          </div>
          <div className="eval-info-item">
            <span className="eval-info-label">Feature Pipeline</span>
            <span className="eval-info-value font-mono" style={{ color: '#c4b5fd' }}>
              36 Raw → 45 Transformed
            </span>
          </div>
          <div className="eval-info-item">
            <span className="eval-info-label">Test Period</span>
            <span className="eval-info-value font-mono" style={{ color: '#10b981' }}>
              2025 Test Cycle
            </span>
          </div>
          <div className="eval-info-item">
            <span className="eval-info-label">Test Instances</span>
            <span className="eval-info-value font-mono" style={{ color: '#60a5fa' }}>
              39,270 instances
            </span>
          </div>
          <div className="eval-info-item">
            <span className="eval-info-label">Prediction Policy</span>
            <span className="eval-info-value font-mono" style={{ color: '#f472b6' }}>
              90% Exploit / 10% Explore
            </span>
          </div>
        </div>

        <div className="research-disclaimer-box">
          <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}>
            Instance Distinction:
          </strong>
          39,270 represents offline <strong>model test prediction instances</strong> generated across municipal forecasting grids, NOT physically verified field cases.
        </div>
      </div>

      {/* Operational Selection Policy Card */}
      <div className="eval-info-card" aria-label="Operational Selection Policy">
        <div className="eval-info-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          OPERATIONAL SELECTION POLICY
        </div>

        <div className="eval-policy-split font-mono">
          <div className="eval-policy-box exploit">
            <span className="eval-policy-pct">90%</span>
            <span className="eval-policy-name">EXPLOITATION</span>
            <span className="eval-policy-sub">High-Risk Prioritization</span>
          </div>
          <div className="eval-policy-box explore">
            <span className="eval-policy-pct">10%</span>
            <span className="eval-policy-name">EXPLORATION</span>
            <span className="eval-policy-sub">Emerging Risk Discovery</span>
          </div>
        </div>

        <p className="eval-policy-desc">
          90% of operational selection prioritizes known high-risk predictions, while 10% explores potentially emerging risks across the municipality.
        </p>
      </div>
    </div>
  );
}
