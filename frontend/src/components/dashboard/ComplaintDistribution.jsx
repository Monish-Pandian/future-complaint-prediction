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

/**
 * Custom Tooltip for Actionable Complaint Types
 */
function CustomBarTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div className="custom-chart-tooltip" role="tooltip">
      <div className="tooltip-date font-mono">{data.category || data.department || data.shortName}</div>
      <div className="tooltip-row">
        <span className="tooltip-label">Forecasted Incident Volume:</span>
        <span className="tooltip-val font-mono">{data.count}</span>
      </div>
      {data.highRisk !== undefined && (
        <div className="tooltip-row">
          <span className="tooltip-label" style={{ color: '#ef4444' }}>
            High-Risk Escalations:
          </span>
          <span className="tooltip-val font-mono" style={{ color: '#ef4444' }}>
            {data.highRisk}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * ComplaintDistribution: Visualizes actionable complaint categories & departments
 */
export default function ComplaintDistribution({ data = [] }) {
  const chartData = Array.isArray(data) ? data : [];

  return (
    <section
      className="dashboard-panel dashboard-distribution"
      aria-label="Actionable Complaint Types Distribution"
    >
      <div className="dashboard-panel-header">
        <div className="dashboard-panel-title-group">
          <h2 className="dashboard-panel-title">ACTIONABLE COMPLAINT CLUSTERS</h2>
          <span className="dashboard-panel-subtitle">
            Municipal category & departmental operational workload
          </span>
        </div>
        <span className="dashboard-panel-tag">WORKLOAD SPECTRUM</span>
      </div>

      <div className="chart-content-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 12, left: -20, bottom: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="shortName"
              stroke="var(--text-muted)"
              fontSize={9.5}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              interval={0}
              angle={-18}
              textAnchor="end"
              dy={6}
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tickMargin={6}
            />
            <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'var(--bg-surface-hover)' }} />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || '#06b6d4'}
                  fillOpacity={0.88}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
