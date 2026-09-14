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

function TaskTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="custom-chart-tooltip" role="tooltip">
      <div className="tooltip-date">{label}</div>
      <div className="tooltip-row">
        <span className="tooltip-label">Tasks Count:</span>
        <span className="tooltip-val" style={{ color: payload[0].payload.fill }}>
          {payload[0].value}
        </span>
      </div>
    </div>
  );
}

/**
 * OfficerTaskChart: Bar chart displaying task lifecycle breakdown
 */
export default function OfficerTaskChart({ taskStatusCounts = {} }) {
  const data = [
    { status: 'Assigned', count: taskStatusCounts.assigned ?? 3, fill: '#68b3e8' },
    { status: 'Accepted', count: taskStatusCounts.accepted ?? 1, fill: '#4dd6c7' },
    { status: 'In Progress', count: taskStatusCounts.inProgress ?? 2, fill: '#a78bfa' },
    { status: 'Verified', count: taskStatusCounts.verified ?? 18, fill: '#4dd6a8' },
    { status: 'Rejected', count: taskStatusCounts.rejected ?? 0, fill: '#ff6b6b' },
  ];

  return (
    <div className="info-card" aria-label="Task Status Breakdown Chart">
      <div className="info-card-header">
        <h3 className="info-card-title">TASK STATUS</h3>
        <span className="dashboard-panel-tag">TASK BREAKDOWN</span>
      </div>

      <div style={{ width: '100%', height: '240px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 12, left: -24, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
            <XAxis
              dataKey="status"
              stroke="rgba(255, 255, 255, 0.3)"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
            />
            <YAxis
              stroke="rgba(255, 255, 255, 0.3)"
              fontSize={9}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
            />
            <Tooltip content={<TaskTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} animationDuration={500}>
              {data.map((entry, index) => (
                <Cell key={`bar-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
