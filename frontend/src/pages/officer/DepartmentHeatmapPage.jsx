import React, { useState, useEffect, useCallback } from 'react';
import PageTransition from '../../components/layout/PageTransition';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { renderRiskBadge } from '../../components/predictions/PredictionBadges';
import { getOfficerDepartmentHeatmap } from '../../api/officerPortalApi';

/**
 * Officer Department-Scoped Spatial Activity Heatmap
 * Urban Intelligence Command Center — Module 12
 */
export default function DepartmentHeatmapPage() {
  const [heatmapData, setHeatmapData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const loadHeatmap = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getOfficerDepartmentHeatmap();
      if (res?.data) {
        setHeatmapData(res.data);
        setIsLive(Boolean(res.isLive));
      }
    } catch (err) {
      console.error('Failed to load department heatmap:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHeatmap();
  }, [loadHeatmap]);

  const hotspots = heatmapData?.hotspots || [
    { lat: 41.8818, lng: -87.6545, weight: 0.88, complaintType: 'Solid Waste Accumulation', riskLevel: 'HIGH', label: 'Randolph St Corridor' },
    { lat: 41.8105, lng: -87.7274, weight: 0.92, complaintType: 'Pothole & Asphalt Break', riskLevel: 'CRITICAL', label: 'Pulaski Rd Transit Lane' },
  ];
  const department = heatmapData?.department || 'Streets & Sanitation';

  const getColor = (risk) => {
    switch (risk?.toUpperCase()) {
      case 'CRITICAL': return '#ff4d4f';
      case 'HIGH': return '#faad14';
      case 'MEDIUM': return '#1890ff';
      default: return '#52c41a';
    }
  };

  return (
    <PageTransition>
      <div className="officer-portal-container">
        {/* Header Bar */}
        <header className="officer-header-card">
          <div>
            <div className="auth-label" style={{ marginBottom: '4px' }}>
              DEPARTMENTAL SPATIAL ACTIVITY
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '4px 0', color: 'var(--text-primary)' }}>
              {department} Heatmap
            </h1>
            <p className="verification-subtitle">
              Geospatial complaint distribution and proactive verification task density filtered strictly for your department.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`verification-mode-pill ${isLive ? 'live' : 'demo'}`}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: isLive ? '#4dd6a8' : '#ecd06f',
                }}
              />
              {isLive ? 'Real API Data' : 'Demo Data'}
            </span>
          </div>
        </header>

        {/* Leaflet Map Card */}
        <div className="verification-table-card" style={{ padding: '0', overflow: 'hidden', height: '580px', position: 'relative' }}>
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Loading spatial map...</div>
          ) : (
            <MapContainer
              center={[41.8781, -87.6298]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {hotspots.map((h, i) => (
                <CircleMarker
                  key={`dept-pin-${i}`}
                  center={[h.lat, h.lng]}
                  radius={12}
                  fillColor={getColor(h.riskLevel)}
                  color="#ffffff"
                  weight={2}
                  opacity={0.9}
                  fillOpacity={0.7}
                >
                  <Popup>
                    <div style={{ fontSize: '12px' }}>
                      <strong>{h.label || h.complaintType}</strong>
                      <div style={{ marginTop: '4px' }}>{renderRiskBadge(h.riskLevel)}</div>
                      <div style={{ marginTop: '2px', color: '#666' }}>Dept: {department}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
