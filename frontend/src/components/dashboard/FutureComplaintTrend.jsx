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

/**
 * Custom Tooltip Component for Future Complaint Trend
 */
function CustomTrendTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="custom-chart-tooltip" role="tooltip">
      <div className="tooltip-date font-mono">{label}</div>
      {payload.map((item) => {
        if (item.value === null || item.value === undefined) return null;
        return (
          <div key={item.dataKey} className="tooltip-row">
            <div className="tooltip-label">
              <span
                className="tooltip-indicator"
                style={{ backgroundColor: item.stroke }}
              />
              <span>{item.name}:</span>
            </div>
            <span className="tooltip-val font-mono">{item.value}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Main Visualization: Future Complaint Trend
 * Shows Historical vs Predicted vs Observed complaints
 */
export default function FutureComplaintTrend({ data = [] }) {
  return (
    <section
      className="dashboard-panel dashboard-trend"
      aria-label="Future Complaint Trend Visualization"
    >
      <div className="dashboard-panel-header">
        <div className="dashboard-panel-title-group">
          <h2 className="dashboard-panel-title">FUTURE COMPLAINT TREND</h2>
          <span className="dashboard-panel-subtitle">
            Historical baseline vs 7-day predictive forecast trajectory
          </span>
        </div>
        <span className="dashboard-panel-tag">FORECAST ENGINE</span>
      </div>

      {/* Custom Legend */}
      <div className="trend-chart-legend" aria-hidden="true">
        <div className="legend-item">
          <span className="legend-line historical" />
          <span>Historical Baseline</span>
        </div>
        <div className="legend-item">
          <span className="legend-line predicted" />
          <span>Predicted Forecast</span>
        </div>
        <div className="legend-item">
          <span className="legend-line actual" />
          <span>Observed Field Ground Truth</span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="chart-content-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 12, left: -16, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="var(--text-muted)"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tickMargin={8}
            />
            <YAxis
              stroke="var(--text-muted)"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tickMargin={6}
            />
            <Tooltip content={<CustomTrendTooltip />} />

            {/* Historical Series (Muted solid line) */}
            <Line
              type="monotone"
              dataKey="historical"
              name="Historical"
              stroke="#64748b"
              strokeWidth={2}
              dot={{ r: 2.5, fill: '#64748b', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#64748b', stroke: '#0f172a', strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />

            {/* Predicted Series (Accent cyan line) */}
            <Line
              type="monotone"
              dataKey="predicted"
              name="Predicted"
              stroke="#06b6d4"
              strokeWidth={2.5}
              strokeDasharray="4 2"
              dot={{ r: 3, fill: '#06b6d4', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#06b6d4', stroke: '#0f172a', strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />

            {/* Observed / Actual Series (Warm amber line) */}
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual Observed"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#f59e0b', stroke: '#0f172a', strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
