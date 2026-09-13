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
      <div className="tooltip-date">{data.category || data.shortName}</div>
      <div className="tooltip-row">
        <span className="tooltip-label">Predicted Volume:</span>
        <span className="tooltip-val">{data.count}</span>
      </div>
      {data.highRisk !== undefined && (
        <div className="tooltip-row">
          <span className="tooltip-label" style={{ color: '#ff6b6b' }}>
            High-Risk Priority:
          </span>
          <span className="tooltip-val" style={{ color: '#ff6b6b' }}>
            {data.highRisk}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * ComplaintDistribution: Visualizes actionable complaint categories
 */
export default function ComplaintDistribution({ data = [] }) {
  return (
    <section
      className="dashboard-panel dashboard-distribution"
      aria-label="Actionable Complaint Types Distribution"
    >
      <div className="dashboard-panel-header">
        <div className="dashboard-panel-title-group">
          <h2 className="dashboard-panel-title">ACTIONABLE COMPLAINT TYPES</h2>
          <span className="dashboard-panel-subtitle">
            Intervention-ready problem classifications
          </span>
        </div>
        <span className="dashboard-panel-tag">DEMO DATA</span>
      </div>

      <div className="chart-content-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
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
            <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
            <Bar
              dataKey="count"
              radius={[4, 4, 0, 0]}
              maxBarSize={38}
              isAnimationActive={false}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || '#4dd6c7'}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
