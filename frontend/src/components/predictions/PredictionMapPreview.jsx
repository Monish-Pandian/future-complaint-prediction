import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { MAP_CONFIG } from '../../config/mapConfig';

/**
 * PredictionMapPreview: Lightweight interactive Leaflet map preview with command center aesthetic
 */
export default function PredictionMapPreview({ location = {}, area = {} }) {
  const navigate = useNavigate();

  const lat = location?.lat || 41.8781;
  const lng = location?.lng || -87.6298;
  const address = location?.address || 'Community Area Cluster, Chicago, IL';

  const handleViewGlobalHeatmap = () => {
    navigate('/heatmap');
  };

  return (
    <div className="info-card" aria-label="Spatial Location Preview">
      <div className="info-card-header">
        <h3 className="info-card-title">GEOGRAPHIC LOCATION PREVIEW</h3>
        <span className="dashboard-panel-tag">GEO LOCATION</span>
      </div>

      <div className="map-preview-wrapper">
        <MapContainer
          center={[lat, lng]}
          zoom={13}
          scrollWheelZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution={MAP_CONFIG.attribution}
            url={MAP_CONFIG.tileUrl}
          />
          <CircleMarker
            center={[lat, lng]}
            radius={10}
            pathOptions={{
              color: '#4dd6c7',
              fillColor: '#4dd6c7',
              fillOpacity: 0.6,
              weight: 2,
            }}
          >
            <Popup>
              <div style={{ color: '#0d1218', fontSize: '11px', fontWeight: '600' }}>
                <div><strong>{area.communityAreaName || `Area ${area.communityArea}`}</strong></div>
                <div>Ward {area.ward}</div>
                <div style={{ color: '#68737e', marginTop: '3px' }}>{address}</div>
              </div>
            </Popup>
          </CircleMarker>
        </MapContainer>
      </div>

      <div className="map-card-footer">
        <span className="map-coords-text">
          Coordinates: {lat.toFixed(4)}°N, {lng.toFixed(4)}°W
        </span>
        <button
          type="button"
          onClick={handleViewGlobalHeatmap}
          className="prediction-action"
          aria-label="View on global heatmap"
        >
          <span>VIEW ON MAP</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
