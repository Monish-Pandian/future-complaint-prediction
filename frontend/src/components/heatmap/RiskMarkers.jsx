import React from 'react';
import { CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { RiskBadge, AssignmentStatusBadge } from '../common/Badge';

function getRiskColor(level) {
  const l = (level || 'LOW').toUpperCase();
  if (l === 'CRITICAL') return '#ef4444';
  if (l === 'HIGH') return '#f97316';
  if (l === 'MEDIUM') return '#f59e0b';
  return '#10b981';
}

function getMarkerRadius(riskScore, level) {
  const l = (level || 'LOW').toUpperCase();
  if (l === 'CRITICAL') return 15;
  if (l === 'HIGH') return 12;
  if (l === 'MEDIUM') return 9;
  return 7;
}

export default function RiskMarkers({
  locations = [],
  selectedAreaId = null,
  onSelectArea,
}) {
  return (
    <>
      {locations.map((item, idx) => {
        const lat = item.location?.lat ?? (item.location?.coordinates ? item.location.coordinates[1] : 41.8781);
        const lng = item.location?.lng ?? (item.location?.coordinates ? item.location.coordinates[0] : -87.6298);
        const isSelected = selectedAreaId === item.id;
        const color = getRiskColor(item.riskLevel);
        const radius = getMarkerRadius(item.riskScore, item.riskLevel);
        const caName = item.area?.communityAreaName || `Area ${item.area?.communityArea || idx + 1}`;
        const ward = item.area?.ward || item.ward || 'Ward N/A';

        return (
          <CircleMarker
            key={item.id || idx}
            center={[lat, lng]}
            radius={isSelected ? radius + 4 : radius}
            pathOptions={{
              color: isSelected ? '#ffffff' : color,
              fillColor: color,
              fillOpacity: isSelected ? 0.95 : 0.7,
              weight: isSelected ? 3 : 1.5,
            }}
            eventHandlers={{
              click: () => onSelectArea(item),
            }}
          >
            {/* Hover Tooltip */}
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              <div style={{ fontSize: '11px', fontWeight: '600', lineHeight: 1.3 }}>
                <div style={{ fontWeight: '700', color: '#ffffff' }}>{caName} ({ward.startsWith('Ward') ? ward : `Ward ${ward}`})</div>
                <div style={{ color: color, fontWeight: '700' }}>
                  {item.complaintType} • Risk {item.riskScore}
                </div>
              </div>
            </Tooltip>

            {/* Click Popup */}
            <Popup>
              <div className="map-popup-card">
                <div className="popup-header-badges">
                  <span className="font-mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    AREA #{item.area?.communityArea || 'N/A'}
                  </span>
                  <RiskBadge level={item.riskLevel} />
                </div>

                <h4 className="popup-issue-title">{caName}</h4>
                <div className="popup-sub-location">{ward.startsWith('Ward') ? ward : `Ward ${ward}`} • Chicago, IL</div>

                <div className="popup-details-grid">
                  <div className="popup-detail-row">
                    <span className="popup-label">Predicted Issue:</span>
                    <span className="popup-val" style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                      {item.complaintType}
                    </span>
                  </div>

                  <div className="popup-detail-row">
                    <span className="popup-label">Risk Score:</span>
                    <span className="popup-val font-mono" style={{ color: color, fontWeight: '700' }}>
                      {item.riskScore} / 100
                    </span>
                  </div>

                  <div className="popup-detail-row">
                    <span className="popup-label">Forecast Probability:</span>
                    <span className="popup-val font-mono" style={{ color: 'var(--accent-text)', fontWeight: '700' }}>
                      {Math.round((item.probability || 0) * 100)}%
                    </span>
                  </div>

                  <div className="popup-detail-row">
                    <span className="popup-label">Department:</span>
                    <span className="popup-val">{item.department || 'Streets & Sanitation'}</span>
                  </div>

                  <div className="popup-detail-row">
                    <span className="popup-label">Target Window:</span>
                    <span className="popup-val font-mono">
                      {item.predictionWindow?.display || item.predictionDate || 'Next 7 days'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', marginTop: '10px', fontSize: '11.5px' }}
                  onClick={() => onSelectArea(item)}
                >
                  Inspect Area Intelligence →
                </button>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
