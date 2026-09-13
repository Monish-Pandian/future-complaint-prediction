import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import PageTransition from '../../components/layout/PageTransition';
import HeatmapFilters from '../../components/heatmap/HeatmapFilters';
import RiskLegend from '../../components/heatmap/RiskLegend';
import RiskSummary from '../../components/heatmap/RiskSummary';
import RiskMarkers from '../../components/heatmap/RiskMarkers';
import RiskAreaDetails from '../../components/heatmap/RiskAreaDetails';
import {
  getRiskMapData,
  getRiskMapFilters,
} from '../../api/analyticsApi';
import {
  heatmapSummaryStats,
} from '../../data/heatmapMockData';
import { MAP_CONFIG } from '../../config/mapConfig';

const CHICAGO_CENTER = MAP_CONFIG.chicagoCenter;
const DEFAULT_ZOOM = MAP_CONFIG.defaultZoom;

/**
 * Inner map controller hook component for custom zoom, locate, and reset controls
 */
function MapControls({ onLocationError }) {
  const map = useMap();

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  const handleResetView = () => {
    map.setView(CHICAGO_CENTER, DEFAULT_ZOOM);
  };

  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      onLocationError('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 13);
      },
      (err) => {
        console.warn('Geolocation access issue:', err.message);
        onLocationError('Location permission unavailable.');
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="map-floating-controls" aria-label="Map Navigation Controls">
      <button
        type="button"
        className="map-control-btn"
        onClick={handleZoomIn}
        title="Zoom in"
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        type="button"
        className="map-control-btn"
        onClick={handleZoomOut}
        title="Zoom out"
        aria-label="Zoom out"
      >
        &minus;
      </button>
      <button
        type="button"
        className="map-control-btn"
        onClick={handleLocateUser}
        title="Locate nearest cluster"
        aria-label="Locate"
      >
        ⌖
      </button>
      <button
        type="button"
        className="map-control-btn"
        onClick={handleResetView}
        title="Reset map view"
        aria-label="Reset view"
      >
        ↺
      </button>
    </div>
  );
}

/**
 * Admin Spatial Risk Intelligence Page
 * Route: /heatmap
 */
export default function Heatmap() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locations, setLocations] = useState([]);
  const [summary, setSummary] = useState(heatmapSummaryStats);
  const [filterOptions, setFilterOptions] = useState({});
  const [selectedArea, setSelectedArea] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    complaintType: 'All complaint types',
    dateRange: 'Next 7 days',
    riskLevel: 'All risk levels',
    ward: 'All wards',
    communityArea: 'All community areas',
    verificationStatus: 'All verification statuses',
    assignmentStatus: 'All assignment statuses',
  });

  // Track if current data is from live API or fallback
  const [isLive, setIsLive] = useState(false);

  // Load filter options on mount
  useEffect(() => {
    async function loadFilters() {
      try {
        const options = await getRiskMapFilters();
        setFilterOptions(options || {});
      } catch (err) {
        console.warn('Could not load dynamic map filter options:', err);
      }
    }
    loadFilters();
  }, []);

  // Fetch geographic risk map dataset
  const loadMapData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getRiskMapData(filters);

      if (response && response.data) {
        const data = response.data;
        const locs = data.locations || [];
        setLocations(locs);
        setSummary(data.summary || heatmapSummaryStats);
        setIsLive(Boolean(response.isLive));

        // Auto-select first high-risk location if nothing selected
        if (locs.length > 0) {
          setSelectedArea((prev) => {
            if (prev) {
              const stillExists = locs.find((l) => l.id === prev.id);
              return stillExists || locs[0];
            }
            return locs[0];
          });
        } else {
          setSelectedArea(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch spatial risk data:', err);
      setError(err.response?.data?.message || err.message || 'Geospatial risk service unavailable.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadMapData();
  }, [loadMapData]);

  // Handle filter changes
  const handleFilterChange = (updatedFilters) => {
    setFilters(updatedFilters);
  };

  // Handle filter reset
  const handleResetFilters = () => {
    const defaultFilters = {
      search: '',
      complaintType: 'All complaint types',
      dateRange: 'Next 7 days',
      riskLevel: 'All risk levels',
      ward: 'All wards',
      communityArea: 'All community areas',
      verificationStatus: 'All verification statuses',
      assignmentStatus: 'All assignment statuses',
    };
    setFilters(defaultFilters);
  };

  // Handle selection of a specific risk point
  const handleSelectArea = (area) => {
    setSelectedArea(area);
  };

  // Handle location errors
  const handleLocationToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  return (
    <PageTransition>
      <div className="heatmap-page">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="map-toast" role="alert">
            {toastMessage}
          </div>
        )}

        {/* Top Header */}
        <header className="heatmap-header">
          <div className="heatmap-header-left">
            <h1 className="heatmap-title">Spatial Risk Intelligence</h1>
            <p className="heatmap-subtitle">
              Predicted civic complaint risk across municipal areas &bull; Chicago &bull; Forecast Window: Next 7 Days
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className={`verification-mode-pill ${isLive ? 'live' : 'demo'}`}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: isLive ? '#10b981' : '#f59e0b',
                }}
              />
              {isLive ? 'Real API Data' : 'Demo Data'}
            </span>
          </div>
        </header>

        {/* 3 Compact Intelligence KPI Summary Cards */}
        <RiskSummary summary={summary} />

        {/* Compact Filter Toolbar Above Map */}
        <HeatmapFilters
          filters={filters}
          filterOptions={filterOptions}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
        />

        {/* Main 70% Map / 30% Intelligence Panel Layout */}
        <div className="heatmap-main-layout">
          {/* 70% Map Section */}
          <div className="heatmap-map-wrapper" role="region" aria-label="Chicago Spatial Risk Map">
            <MapContainer
              center={CHICAGO_CENTER}
              zoom={DEFAULT_ZOOM}
              minZoom={10}
              maxZoom={17}
              scrollWheelZoom={true}
              className="heatmap-map-container"
            >
              <TileLayer
                attribution={MAP_CONFIG.attribution}
                url={MAP_CONFIG.tileUrl}
              />

              <MapControls onLocationError={handleLocationToast} />

              <RiskMarkers
                locations={locations}
                selectedAreaId={selectedArea?.id}
                onSelectArea={handleSelectArea}
              />
            </MapContainer>

            {/* Floating Compact Legend */}
            <RiskLegend />

            {/* Loading Overlay */}
            {loading && (
              <div className="map-overlay" role="status">
                <div className="empty-icon" style={{ animation: 'spin 1.2s infinite linear' }}>
                  ⏳
                </div>
                <div className="empty-title">LOADING PREDICTED RISK DATA...</div>
              </div>
            )}

            {/* Error Overlay */}
            {error && !loading && (
              <div className="map-overlay" role="alert">
                <div className="error-icon">⚠️</div>
                <div className="error-title">UNABLE TO LOAD RISK MAP</div>
                <div className="error-subtitle">{error}</div>
                <button type="button" onClick={loadMapData} className="btn-retry">
                  RETRY
                </button>
              </div>
            )}

            {/* Empty State Overlay */}
            {!loading && !error && locations.length === 0 && (
              <div className="map-overlay">
                <div className="empty-icon">🔍</div>
                <div className="empty-title">NO PREDICTED RISK AREAS FOUND</div>
                <div className="empty-subtitle">
                  No prediction hotspots match the current filter criteria.
                </div>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="btn-retry"
                  style={{ marginTop: '12px' }}
                >
                  RESET FILTERS
                </button>
              </div>
            )}
          </div>

          {/* 30% Area Intelligence Panel */}
          <RiskAreaDetails area={selectedArea} />
        </div>
      </div>
    </PageTransition>
  );
}
