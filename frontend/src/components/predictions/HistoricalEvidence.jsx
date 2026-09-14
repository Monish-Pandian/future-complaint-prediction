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
 * Custom chart tooltip for historical observed frequency
 */
function HistoricalChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="custom-chart-tooltip" role="tooltip">
      <div className="tooltip-date">{label}</div>
      <div className="tooltip-row">
        <span className="tooltip-label">Observed Complaints:</span>
        <span className="tooltip-val">{payload[0].value}</span>
      </div>
    </div>
  );
}

/**
 * HistoricalEvidence: Displays historical baseline metrics and 14-day observed frequency chart
 */
export default function HistoricalEvidence({ evidence = {} }) {
  const {
    historicalCount = 42,
    recentCount = 8,
    previousComparablePeriod = 31,
    trendChange = 32,
    seasonalStrength = 'Strong',
    recentTrend = [],
  } = evidence;

  return (
    <div className="info-card" aria-label="Historical Evidence Panel">
      <div className="info-card-header">
        <h3 className="info-card-title">HISTORICAL EVIDENCE</h3>
        <span className="dashboard-panel-tag">BASELINE EVIDENCE</span>
      </div>

      {/* Historical Metrics Grid */}
      <div className="meta-grid-2col" style={{ marginBottom: '20px' }}>
        <div className="meta-field">
          <span className="meta-field-label">Historical Complaints</span>
          <span className="meta-field-val" style={{ fontSize: '18px' }}>
            {historicalCount}
          </span>
        </div>
        <div className="meta-field">
          <span className="meta-field-label">Recent 7-Day Filings</span>
          <span className="meta-field-val" style={{ fontSize: '18px', color: '#ff6b6b' }}>
            {recentCount}
          </span>
        </div>
        <div className="meta-field">
          <span className="meta-field-label">Prior Comparable Period</span>
          <span className="meta-field-val">{previousComparablePeriod} filings</span>
        </div>
        <div className="meta-field">
          <span className="meta-field-label">Trend Rate Change</span>
          <span
            className="meta-field-val"
            style={{ color: trendChange >= 0 ? 'var(--accent)' : '#4dd6a8' }}
          >
            {trendChange >= 0 ? `+${trendChange}%` : `${trendChange}%`}
          </span>
        </div>
        <div className="meta-field">
          <span className="meta-field-label">Seasonal Pattern</span>
          <span className="meta-field-val">{seasonalStrength}</span>
        </div>
        <div className="meta-field">
          <span className="meta-field-label">Baseline Context</span>
          <span className="meta-field-val">Historical Observations</span>
        </div>
      </div>

      {/* Recharts Recent Trend Line Chart */}
      <div style={{ marginTop: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          <span
            style={{
              fontSize: '10px',
              fontWeight: '700',
              letterSpacing: '0.08em',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
            }}
          >
            RECENT COMPLAINT TREND (14-DAY OBSERVED FREQUENCY)
          </span>
        </div>

        <div style={{ width: '100%', height: '160px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={recentTrend} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
              <XAxis
                dataKey="date"
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
              <Tooltip content={<HistoricalChartTooltip />} />
              <Line
                type="monotone"
                dataKey="count"
                name="Observed Count"
                stroke="#68b3e8"
                strokeWidth={2}
                dot={{ r: 2.5, fill: '#68b3e8' }}
                activeDot={{ r: 5, fill: '#68b3e8' }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
