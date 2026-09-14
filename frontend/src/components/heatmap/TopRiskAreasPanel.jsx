import React from 'react';
import Card from '../common/Card';
import { RiskBadge } from '../common/Badge';

export default function TopRiskAreasPanel({
  locations = [],
  selectedAreaId = null,
  onSelectArea,
}) {
  const sorted = [...locations]
    .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
    .slice(0, 6);

  return (
    <Card
      title="Top Risk Areas"
      subtitle="Highest severity spatial clusters across Metro Chicago"
      className="top-risk-panel-card"
    >
      {sorted.length === 0 ? (
        <div className="empty-state" style={{ padding: '20px' }}>
          <p className="empty-state-desc">No risk areas matching filters.</p>
        </div>
      ) : (
        <div className="top-risk-mini-list">
          {sorted.map((item, idx) => {
            const rank = String(idx + 1).padStart(2, '0');
            const caName = item.area?.communityAreaName || `Area ${item.area?.communityArea || idx + 1}`;
            const ward = item.area?.ward || item.ward || 'N/A';
            const isSelected = selectedAreaId === item.id;

            return (
              <div
                key={item.id || idx}
                className={`top-risk-mini-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectArea(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelectArea(item)}
                title="Click to focus on map"
              >
                <div className="top-risk-rank font-mono">{rank}</div>

                <div className="top-risk-info">
                  <div className="top-risk-title">{caName}</div>
                  <div className="top-risk-sub">
                    {item.complaintType} • Ward {ward}
                  </div>
                </div>

                <div className="top-risk-meta">
                  <span className="top-risk-score font-mono">{item.riskScore}</span>
                  <RiskBadge level={item.riskLevel} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
