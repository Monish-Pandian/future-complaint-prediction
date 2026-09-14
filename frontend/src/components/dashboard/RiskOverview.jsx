import React, { useEffect, useState } from 'react';

/**
 * RiskOverview component displaying horizontal risk bars
 * Fast risk interpretation with Stitch semantic palette
 */
export default function RiskOverview({ data = [] }) {
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsRendered(true), 50);
    return () => clearTimeout(timeout);
  }, []);

  const totalComplaints = data.reduce((acc, curr) => acc + (curr.count || 0), 0);

  return (
    <section
      className="dashboard-panel dashboard-risk"
      aria-label="Predictive Risk Tiers & Triage Policy"
    >
      <div className="dashboard-panel-header">
        <div className="dashboard-panel-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="stitch-live-dot" style={{ width: '6px', height: '6px' }} />
            <h2 className="dashboard-panel-title">PREDICTIVE RISK TIERS</h2>
          </div>
          <span className="dashboard-panel-subtitle">
            Bayesian spatio-temporal clustering across complaint vectors
          </span>
        </div>
        <span className="dashboard-panel-tag">v4.2-civic</span>
      </div>

      {/* Stacked Bar Visualizer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
        <div style={{ height: '10px', width: '100%', borderRadius: '5px', background: 'var(--bg-surface-recessed)', display: 'flex', overflow: 'hidden' }}>
          <div style={{ width: '12%', background: '#ef4444' }} title="Critical Risk" />
          <div style={{ width: '28%', background: '#f59e0b' }} title="High Risk" />
          <div style={{ width: '35%', background: '#3b82f6' }} title="Medium Risk" />
          <div style={{ width: '25%', background: '#10b981' }} title="Low Risk" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
          <span>1,796 Evaluated Vectors</span>
          <span>100% Normalized</span>
        </div>
      </div>

      <div className="risk-list" role="list">
        {data.map((item, index) => {
          const percentage = totalComplaints > 0 ? ((item.count / totalComplaints) * 100).toFixed(1) : 0;
          const staggerDelay = `${index * 100}ms`;

          return (
            <div key={item.level} className="risk-row" role="listitem">
              <div className="risk-row-header">
                <div className="risk-name-group">
                  <span
                    className="risk-dot"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  />
                  <span className="risk-name">{item.label}</span>
                </div>

                <div className="risk-metrics-group">
                  <span className="risk-count font-mono">{item.count}</span>
                  <span className="risk-pct font-mono">({percentage}%)</span>
                </div>
              </div>

              <div className="risk-track" aria-hidden="true">
                <div
                  className="risk-fill"
                  style={{
                    width: isRendered ? `${percentage}%` : '0%',
                    backgroundColor: item.color,
                    transitionDelay: staggerDelay,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 90/10 Policy Allocation Strategy Indicator */}
      <div style={{
        marginTop: '16px',
        padding: '12px 14px',
        background: 'var(--bg-surface-raised)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        fontSize: '11px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: 'var(--text-primary)', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Triage Policy Allocation
          </span>
          <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: '700' }}>
            ACTIVE
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '10px', marginBottom: '4px' }}>
          <span>Exploitation (High Confidence)</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>90%</span>
        </div>
        <div style={{ height: '5px', width: '100%', background: 'var(--bg-surface-recessed)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{ width: '90%', height: '100%', background: 'linear-gradient(90deg, #06b6d4, #0284c7)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '10px', marginBottom: '4px' }}>
          <span>Exploration (Blind Sampling)</span>
          <span style={{ color: 'var(--accent)', fontWeight: '600' }}>10%</span>
        </div>
        <div style={{ height: '5px', width: '100%', background: 'var(--bg-surface-recessed)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: '10%', height: '100%', background: '#10b981' }} />
        </div>
      </div>
    </section>
  );
}
