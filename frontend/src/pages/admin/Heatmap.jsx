import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import PageTransition from '../../components/layout/PageTransition';
import HeatmapFilters from '../../components/heatmap/HeatmapFilters';
import RiskLegend from '../../components/heatmap/RiskLegend';
import RiskSummary from '../../components/heatmap/RiskSummary';
import RiskMarkers from '../../components/heatmap/RiskMarkers';
import RiskAreaDetails from '../../components/heatmap/RiskAreaDetails';
import TopRiskAreasPanel from '../../components/heatmap/TopRiskAreasPanel';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import {
  getRiskMapData,
  getRiskMapFilters,
} from '../../api/analyticsApi';
import axiosInstance from '../../api/axiosInstance';
import { MAP_CONFIG } from '../../config/mapConfig';

const CHICAGO_CENTER = MAP_CONFIG.chicagoCenter || [41.8781, -87.6298];
const DEFAULT_ZOOM = MAP_CONFIG.defaultZoom || 11;

/**
 * Inner map flyTo controller hook component
 */
function MapFlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target && typeof target.lat === 'number' && typeof target.lng === 'number') {
      map.flyTo([target.lat, target.lng], 13, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

/**
 * Inner map controller hook component for custom zoom, locate, and reset controls
 */
function MapControls({ onLocationError, onResetView }) {
  const map = useMap();

  const handleZoomIn = () => {
    map.zoomIn();
  };

  const handleZoomOut = () => {
    map.zoomOut();
  };

  const handleResetView = () => {
    map.setView(CHICAGO_CENTER, DEFAULT_ZOOM);
    if (onResetView) onResetView();
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
 * Route: /risk-map & /heatmap
 */
export default function Heatmap() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locations, setLocations] = useState([]);
  const [summary, setSummary] = useState({
    totalPredictedAreas: 0,
    highRiskAreas: 0,
    criticalAreas: 0,
    pendingVerification: 0,
    assigned: 0,
  });
  const [filterOptions, setFilterOptions] = useState({});
  const [selectedArea, setSelectedArea] = useState(null);
  const [focusedCoords, setFocusedCoords] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);

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

  // Load filter options and active model metadata on mount
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [optsRes, modelRes] = await Promise.allSettled([
          getRiskMapFilters(),
          axiosInstance.get('/admin/model/active'),
        ]);

        if (optsRes.status === 'fulfilled') {
          setFilterOptions(optsRes.value || {});
        }

        if (modelRes.status === 'fulfilled' && modelRes.value?.data?.data) {
          setModelInfo(modelRes.value.data.data);
        } else {
          setModelInfo({
            modelVersion: 'xgb-test-v1',
            threshold: 0.38,
            requiredFeatureCount: 36,
          });
        }
      } catch (err) {
        console.warn('Could not load map metadata:', err);
      }
    }
    loadMetadata();
  }, []);

  // Fetch geographic risk map dataset from live API
  const loadMapData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getRiskMapData(filters);

      if (response && response.data) {
        const data = response.data;
        const locs = data.locations || [];
        setLocations(locs);
        setSummary(data.summary || {
          totalPredictedAreas: locs.length,
          highRiskAreas: locs.filter(l => l.riskLevel === 'HIGH').length,
          criticalAreas: locs.filter(l => l.riskLevel === 'CRITICAL').length,
          pendingVerification: locs.filter(l => l.verificationStatus?.includes('PENDING')).length,
          assigned: locs.filter(l => l.assignmentStatus === 'ASSIGNED').length,
        });

        // Auto-select first high-risk location if none is selected
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
    if (area) {
      const lat = area.location?.lat ?? (area.location?.coordinates ? area.location.coordinates[1] : null);
      const lng = area.location?.lng ?? (area.location?.coordinates ? area.location.coordinates[0] : null);
      if (lat != null && lng != null) {
        setFocusedCoords({ lat, lng });
      }
    }
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

        {/* Command Action Bar */}
        <div className="stitch-command-bar">
          <div className="stitch-command-title-wrap">
            <div className="stitch-telemetry-badge">
              <span className="stitch-live-dot" />
              <span>SPATIAL RISK INTELLIGENCE • 77 CHICAGO COMMUNITY AREAS</span>
            </div>
            <h1 className="stitch-page-title">Civic Risk Map</h1>
            <p className="stitch-page-desc">
              Spatial view of predicted future complaint risk across Chicago communities
            </p>
          </div>

          <div className="stitch-command-actions">
            <div className="header-model-badge" style={{ padding: '6px 12px' }}>
              <span className="header-model-dot" aria-hidden="true" />
              <span>Model: {modelInfo?.modelVersion || 'xgb-test-v1'}</span>
            </div>

            <div className="system-status" style={{ padding: '6px 12px' }}>
              <span className="system-status-dot" aria-hidden="true" />
              <span>THRESHOLD: {modelInfo?.threshold?.toFixed(2) || '0.38'}</span>
            </div>

            <button
              type="button"
              className="stitch-btn-secondary"
              onClick={loadMapData}
              title="Refresh spatial data without triggering a new prediction cycle"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
              </svg>
              <span>Refresh Map</span>
            </button>
          </div>
        </div>

        {/* 3 Compact Intelligence KPI Summary Cards */}
        <RiskSummary summary={summary} />

        {/* Compact Filter Toolbar Above Map */}
        <HeatmapFilters
          filters={filters}
          filterOptions={filterOptions}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
          totalMatching={locations.length}
        />

        {/* Main 70% Map / 30% Intelligence Panels Layout */}
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

              <MapControls
                onLocationError={handleLocationToast}
                onResetView={() => setFocusedCoords(null)}
              />

              <MapFlyTo target={focusedCoords} />

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
                <div className="loading-spinner" aria-hidden="true" />
                <div className="empty-state-title" style={{ marginTop: '12px' }}>
                  LOADING PREDICTED RISK DATA...
                </div>
              </div>
            )}

            {/* Error Overlay */}
            {error && !loading && (
              <div className="map-overlay" role="alert">
                <ErrorState
                  title="Risk map data unavailable"
                  description={error}
                  onRetry={loadMapData}
                  retryLabel="Retry Request"
                />
              </div>
            )}

            {/* Empty State Overlay */}
            {!loading && !error && locations.length === 0 && (
              <div className="map-overlay">
                <EmptyState
                  title="No geographic risk data available"
                  description="No predictions match the selected filters."
                  actionLabel="Reset filters"
                  onAction={handleResetFilters}
                />
              </div>
            )}
          </div>

          {/* 30% Side Intelligence Column */}
          <div className="heatmap-side-column">
            {/* Selected Area Intelligence Card */}
            <RiskAreaDetails area={selectedArea} />

            {/* Top Risk Areas Ranked Hotspots */}
            <TopRiskAreasPanel
              locations={locations}
              selectedAreaId={selectedArea?.id}
              onSelectArea={handleSelectArea}
            />
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
