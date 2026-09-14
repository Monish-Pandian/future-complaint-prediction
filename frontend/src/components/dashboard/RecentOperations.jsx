import React from 'react';
import Card from '../common/Card';
import { RiskBadge, AssignmentStatusBadge } from '../common/Badge';

export default function RecentOperations({ recentPredictions = [], recentVerifications = [] }) {
  // Combine or format recent events
  const events = [];

  if (Array.isArray(recentPredictions)) {
    recentPredictions.slice(0, 5).forEach((p) => {
      events.push({
        id: p.predictionId || p.id || p._id,
        time: p.createdAt ? new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
        operation: 'AI Prediction Generated',
        entity: `${p.complaintType || 'Civic Issue'} • ${p.communityArea || 'Chicago'}`,
        status: p.verificationStatus || p.riskLevel || 'ACTIVE',
        type: 'prediction',
        riskLevel: p.riskLevel,
      });
    });
  }

  return (
    <Card
      title="Recent Operations"
      subtitle="Chronological audit log of live predictions, assignments, and verification events"
      className="recent-operations-card"
    >
      {events.length === 0 ? (
        <div className="empty-state" style={{ padding: '24px' }}>
          <p className="empty-state-desc">No recent operational activity available.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '90px' }}>Time</th>
                <th>Operation</th>
                <th>Target Entity & Location</th>
                <th>Status / Risk</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev, idx) => (
                <tr key={ev.id || idx}>
                  <td>
                    <span className="font-mono text-muted" style={{ fontSize: '11.5px' }}>
                      {ev.time}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '13px' }}>
                      {ev.operation}
                    </div>
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12.5px' }}>
                      {ev.entity}
                    </span>
                  </td>
                  <td>
                    {ev.riskLevel ? (
                      <RiskBadge level={ev.riskLevel} />
                    ) : (
                      <AssignmentStatusBadge status={ev.status} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
