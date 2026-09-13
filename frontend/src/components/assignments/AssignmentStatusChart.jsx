import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

function StatusTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload;
  return (
    <div
      style={{
        background: '#0f172a',
        border: '1px solid var(--glass-border)',
        borderRadius: '6px',
        padding: '8px 12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        fontSize: '12px',
      }}
    >
      <div style={{ color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
        Status: {item.label || label}
      </div>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span style={{ color: 'var(--text-secondary)' }}>Dispatches:</span>
        <span style={{ color: item.fill, fontWeight: '700', fontFamily: 'var(--font-mono)' }}>
          {payload[0].value}
        </span>
      </div>
    </div>
  );
}

/**
 * AssignmentStatusChart: Visual breakdown of current assignment states across municipal sectors
 */
export default function AssignmentStatusChart({ distribution = [] }) {
  return (
    <div className="assignments-side-card" aria-label="Assignment Status Breakdown">
      <div className="assignments-side-title">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4dd6c7" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 6v6l4 2"></path>
        </svg>
        DISPATCH STATUS BREAKDOWN
      </div>

      <div style={{ width: '100%', height: '200px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="rgba(255, 255, 255, 0.3)"
              fontSize={9}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
            />
            <YAxis
              stroke="rgba(255, 255, 255, 0.3)"
              fontSize={9}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
            />
            <Tooltip content={<StatusTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={500}>
              {distribution.map((entry, index) => (
                <Cell key={`asgn-bar-${index}`} fill={entry.fill || '#4dd6c7'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
        {distribution.map((d) => (
          <div
            key={d.status}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11px',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: d.fill }} />
              <span>{d.label}</span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: 'var(--text-primary)' }}>
              {d.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
