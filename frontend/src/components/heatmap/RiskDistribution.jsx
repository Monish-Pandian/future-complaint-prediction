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

function RiskDistTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="custom-chart-tooltip" role="tooltip">
      <div className="tooltip-date">Risk Level: {label}</div>
      <div className="tooltip-row">
        <span className="tooltip-label">Predicted Areas:</span>
        <span className="tooltip-val" style={{ color: payload[0].payload.fill }}>
          {payload[0].value}
        </span>
      </div>
    </div>
  );
}

/**
 * RiskDistribution: Compact chart illustrating predicted severity levels
 */
export default function RiskDistribution({ distribution = [] }) {
  return (
    <div className="info-card" aria-label="Predicted Risk Distribution Chart">
      <div className="info-card-header">
        <h3 className="info-card-title">PREDICTED RISK DISTRIBUTION</h3>
        <span className="dashboard-panel-tag">RISK METRICS</span>
      </div>

      <div style={{ width: '100%', height: '180px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
            <XAxis
              dataKey="level"
              stroke="rgba(255, 255, 255, 0.3)"
              fontSize={9.5}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
            />
            <YAxis
              stroke="rgba(255, 255, 255, 0.3)"
              fontSize={9}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
            />
            <Tooltip content={<RiskDistTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={500}>
              {distribution.map((entry, index) => (
                <Cell key={`risk-bar-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
