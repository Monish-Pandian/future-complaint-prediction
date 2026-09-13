import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

function VerificationActivityTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="custom-chart-tooltip" role="tooltip">
      <div className="tooltip-date">{label}</div>
      <div className="tooltip-row">
        <span className="tooltip-label">Completed Verifications:</span>
        <span className="tooltip-val" style={{ color: '#4dd6c7' }}>
          {payload[0].value}
        </span>
      </div>
    </div>
  );
}

/**
 * OfficerVerificationChart: 14-day daily verification activity line chart
 */
export default function OfficerVerificationChart({ timeline = [] }) {
  return (
    <div className="info-card" aria-label="Verification Activity Timeline Chart">
      <div className="info-card-header">
        <h3 className="info-card-title">VERIFICATION ACTIVITY</h3>
        <span className="dashboard-panel-tag">DEMO DATA</span>
      </div>

      <div style={{ width: '100%', height: '220px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timeline} margin={{ top: 12, right: 12, left: -24, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
            <XAxis
              dataKey="date"
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
            <Tooltip content={<VerificationActivityTooltip />} />
            <Line
              type="monotone"
              dataKey="completed"
              stroke="#4dd6c7"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#4dd6c7' }}
              activeDot={{ r: 5, fill: '#ffffff', stroke: '#4dd6c7' }}
              animationDuration={600}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
