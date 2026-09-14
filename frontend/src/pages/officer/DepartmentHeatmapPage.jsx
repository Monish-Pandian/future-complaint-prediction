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
        <header className="stitch-card mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="stitch-badge stitch-badge-cyan font-mono">DEPARTMENTAL SPATIAL TELEMETRY</span>
              <span className="stitch-badge stitch-badge-slate font-mono">{department?.toUpperCase()}</span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: '4px 0', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {department} Tactical Heatmap
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
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
            <button
              type="button"
              className="stitch-btn stitch-btn-secondary"
              style={{ fontSize: '12px', padding: '6px 14px' }}
              onClick={loadHeatmap}
            >
              ↻ Refresh Mesh
            </button>
          </div>
        </header>

        {/* Leaflet Map Card with Floating Legend */}
        <div className="stitch-card" style={{ padding: '0', overflow: 'hidden', height: '620px', position: 'relative' }}>
          {/* Floating Department Telemetry HUD */}
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            zIndex: 1000,
            background: 'var(--bg-card)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '12px 16px',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minWidth: '200px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>SECTOR DENSITY</span>
              <span className="stitch-badge stitch-badge-emerald font-mono">{hotspots.length} HOTSPOTS</span>
            </div>
            <div style={{ height: '1px', background: 'var(--border)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4d4f' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Critical Severity (≥0.90)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#faad14' }} />
                <span style={{ color: 'var(--text-secondary)' }}>High Probability (0.75-0.89)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1890ff' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Medium Probability (0.50-0.74)</span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading departmental spatial map...</div>
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
                    <div style={{ fontSize: '12px', padding: '4px' }}>
                      <strong style={{ fontSize: '13px', display: 'block', marginBottom: '4px' }}>{h.label || h.complaintType}</strong>
                      <div style={{ marginBottom: '4px' }}>{renderRiskBadge(h.riskLevel)}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>Dept: {department}</div>
                      {h.weight && (
                        <div style={{ fontSize: '11px', color: '#666', fontFamily: 'var(--font-mono)' }}>Weight: {(h.weight * 100).toFixed(0)}%</div>
                      )}
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
