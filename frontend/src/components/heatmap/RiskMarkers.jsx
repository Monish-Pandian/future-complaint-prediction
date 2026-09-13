import React from 'react';
import { CircleMarker, Popup, Tooltip } from 'react-leaflet';

function getRiskColor(level) {
  const l = (level || 'LOW').toUpperCase();
  if (l === 'CRITICAL') return '#ff6b6b';
  if (l === 'HIGH') return '#f5a623';
  if (l === 'MEDIUM') return '#ecd06f';
  return '#4dd6a8';
}

function getMarkerRadius(riskScore, level) {
  const l = (level || 'LOW').toUpperCase();
  if (l === 'CRITICAL') return 16;
  if (l === 'HIGH') return 12;
  if (l === 'MEDIUM') return 9;
  return 7;
}

/**
 * RiskMarkers: Controlled spatial risk circle markers with interactive popups and selection handlers
 */
export default function RiskMarkers({
  locations = [],
  selectedAreaId = null,
  onSelectArea,
}) {
  return (
    <>
      {locations.map((item) => {
        const lat = item.location?.lat || 41.8781;
        const lng = item.location?.lng || -87.6298;
        const isSelected = selectedAreaId === item.id;
        const color = getRiskColor(item.riskLevel);
        const radius = getMarkerRadius(item.riskScore, item.riskLevel);

        return (
          <CircleMarker
            key={item.id}
            center={[lat, lng]}
            radius={isSelected ? radius + 4 : radius}
            pathOptions={{
              color: isSelected ? '#ffffff' : color,
              fillColor: color,
              fillOpacity: isSelected ? 0.9 : 0.65,
              weight: isSelected ? 3 : 1.5,
            }}
            eventHandlers={{
              click: () => onSelectArea(item),
            }}
          >
            {/* Hover Tooltip */}
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              <div style={{ fontSize: '10.5px', fontWeight: '700', lineHeight: 1.3 }}>
                <div>{item.area?.communityAreaName || `Area ${item.area?.communityArea}`}</div>
                <div style={{ color: color, fontWeight: '800' }}>
                  {item.complaintType} &bull; {item.riskScore}% Risk
                </div>
              </div>
            </Tooltip>

            {/* Click Popup */}
            <Popup>
              <div className="map-popup-card">
                <div className="popup-header-tag">
                  COMMUNITY AREA {item.area?.communityArea} (WARD {item.area?.ward})
                </div>
                <h4 className="popup-issue-title">{item.area?.communityAreaName}</h4>

                <div className="popup-meta-row">
                  <span>Predicted Issue:</span>
                  <strong>{item.complaintType}</strong>
                </div>

                <div className="popup-meta-row">
                  <span>Predicted Risk:</span>
                  <strong style={{ color: color }}>
                    {item.riskScore}% ({item.riskLevel})
                  </strong>
                </div>

                <div className="popup-meta-row">
                  <span>Forecast Window:</span>
                  <span>{item.predictionWindow?.display || item.predictionDate}</span>
                </div>

                <div className="popup-meta-row">
                  <span>Historical Baseline:</span>
                  <span>{item.historicalCount} recorded</span>
                </div>

                <div className="popup-meta-row">
                  <span>Verification:</span>
                  <span>{item.verificationStatus || 'PENDING'}</span>
                </div>

                <div className="popup-meta-row">
                  <span>Assignment:</span>
                  <span>{item.officer?.name || 'OFFICER NOT ASSIGNED'}</span>
                </div>

                <button
                  type="button"
                  className="popup-btn-view"
                  onClick={() => onSelectArea(item)}
                >
                  INSPECT PREDICTION DETAILS →
                </button>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
