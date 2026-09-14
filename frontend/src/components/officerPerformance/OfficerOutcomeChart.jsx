import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const OUTCOME_COLORS = {
  Confirmed: '#4dd6a8',
  'Not Found': '#94a3b8',
  'Different Problem': '#f5a623',
  Duplicate: '#68b3e8',
  'Unable to Verify': '#a78bfa',
};

function OutcomeTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0];
  return (
    <div className="custom-chart-tooltip" role="tooltip">
      <div className="tooltip-date">{data.name}</div>
      <div className="tooltip-row">
        <span className="tooltip-label">Observations:</span>
        <span className="tooltip-val" style={{ color: data.payload.fill }}>
          {data.value}
        </span>
      </div>
    </div>
  );
}

/**
 * OfficerOutcomeChart: Donut chart displaying field ground-truth verification outcomes
 */
export default function OfficerOutcomeChart({ performance = {} }) {
  const data = [
    { name: 'Confirmed', value: performance.confirmed ?? 12, fill: OUTCOME_COLORS['Confirmed'] },
    { name: 'Not Found', value: performance.notFound ?? 4, fill: OUTCOME_COLORS['Not Found'] },
    { name: 'Different Problem', value: performance.differentProblem ?? 1, fill: OUTCOME_COLORS['Different Problem'] },
    { name: 'Duplicate', value: performance.duplicate ?? 0, fill: OUTCOME_COLORS['Duplicate'] },
    { name: 'Unable to Verify', value: performance.unableToVerify ?? 1, fill: OUTCOME_COLORS['Unable to Verify'] },
  ].filter((item) => item.value > 0);

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="info-card" aria-label="Field Verification Outcomes Chart">
      <div className="info-card-header">
        <h3 className="info-card-title">FIELD VERIFICATION OUTCOMES</h3>
        <span className="dashboard-panel-tag">OUTCOME TELEMETRY</span>
      </div>

      <div style={{ width: '100%', height: '240px', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<OutcomeTooltip />} />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              animationDuration={500}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(15, 22, 29, 0.8)" strokeWidth={2} />
              ))}
            </Pie>
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span style={{ color: 'var(--text-secondary)', fontSize: '10.5px', fontWeight: '500' }}>
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Total Counter */}
        <div
          style={{
            position: 'absolute',
            top: '38%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1 }}>
            {total}
          </div>
          <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '2px' }}>
            VERIFIED
          </div>
        </div>
      </div>
    </div>
  );
}
