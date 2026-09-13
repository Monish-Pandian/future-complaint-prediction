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
      <div className="tooltip-date">{label}</div>
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
            <span className="tooltip-val">{item.value}</span>
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
            Historical vs predicted vs observed
          </span>
        </div>
        <span className="dashboard-panel-tag">DEMO DATA</span>
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
          <span>Observed / Actual</span>
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
              stroke="#68737e"
              strokeWidth={2}
              dot={{ r: 2.5, fill: '#68737e', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#68737e', stroke: '#080b0f', strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />

            {/* Predicted Series (Accent cyan line) */}
            <Line
              type="monotone"
              dataKey="predicted"
              name="Predicted"
              stroke="#4dd6c7"
              strokeWidth={2.5}
              strokeDasharray="4 2"
              dot={{ r: 3, fill: '#4dd6c7', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#4dd6c7', stroke: '#080b0f', strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />

            {/* Observed / Actual Series (Warm neutral high-contrast line) */}
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke="#e7b65a"
              strokeWidth={2}
              dot={{ r: 3, fill: '#e7b65a', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#e7b65a', stroke: '#080b0f', strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
