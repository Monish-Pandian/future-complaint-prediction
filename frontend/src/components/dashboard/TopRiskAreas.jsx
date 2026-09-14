import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import { RiskBadge } from '../common/Badge';
import Button from '../common/Button';

export default function TopRiskAreas({ predictions = [] }) {
  const navigate = useNavigate();

  // Take top 5 highest risk items
  const topItems = Array.isArray(predictions)
    ? [...predictions]
        .sort((a, b) => (b.riskScore ?? b.probability * 100 ?? 0) - (a.riskScore ?? a.probability * 100 ?? 0))
        .slice(0, 5)
    : [];

  return (
    <Card
      title="Top Risk Areas"
      subtitle="Highest severity predicted complaint clusters requiring rapid dispatch"
      className="top-risk-card"
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/risk-map')}
          icon={
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
          }
        >
          View Risk Map
        </Button>
      }
    >
      {topItems.length === 0 ? (
        <div className="empty-state" style={{ padding: '24px' }}>
          <p className="empty-state-desc">No high-risk predictions recorded for the active cycle.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>Rank</th>
                <th>Community Area & Ward</th>
                <th>Complaint Type</th>
                <th>Risk Level</th>
                <th style={{ textAlign: 'right' }}>Risk Score</th>
                <th style={{ textAlign: 'right' }}>Probability</th>
              </tr>
            </thead>
            <tbody>
              {topItems.map((item, idx) => {
                const rank = String(idx + 1).padStart(2, '0');
                const ca = item.communityArea || item.area?.communityAreaName || `Area ${item.communityArea || 'N/A'}`;
                const ward = item.ward || item.area?.ward || 'Ward N/A';
                const score = (item.riskScore ?? item.probability * 100 ?? 0).toFixed(1);
                const prob = typeof item.probability === 'number'
                  ? `${Math.round(item.probability * 100)}%`
                  : `${Math.round(parseFloat(score))}%`;

                return (
                  <tr
                    key={item.id || item._id || item.predictionId || idx}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate('/risk-map')}
                    title="Click to view on Risk Map"
                  >
                    <td>
                      <span className="font-mono text-muted" style={{ fontWeight: '700', fontSize: '11px' }}>
                        {rank}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{ca}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ward}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        {item.complaintType || 'Civic Issue'}
                      </span>
                    </td>
                    <td>
                      <RiskBadge level={item.riskLevel} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="font-mono" style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                        {score}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="font-mono" style={{ color: 'var(--accent-text)', fontWeight: '600' }}>
                        {prob}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
