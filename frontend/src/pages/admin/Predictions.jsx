import React, { useState, useEffect, useCallback } from 'react';
import PageTransition from '../../components/layout/PageTransition';
import KpiCard from '../../components/dashboard/KpiCard';
import PredictionFilters from '../../components/predictions/PredictionFilters';
import PredictionTable from '../../components/predictions/PredictionTable';
import { getPredictions, getPredictionFilters, runPredictionCycle } from '../../api/predictionApi';

/**
 * Admin Predicted Complaints Main View
 * Route: /predictions
 */
export default function Predictions() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [filterOptions, setFilterOptions] = useState({});
  const [cycleRunning, setCycleRunning] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    complaintType: 'All complaint types',
    communityArea: 'All community areas',
    ward: 'All wards',
    riskLevel: 'All risk levels',
    verificationStatus: 'All verification statuses',
    assignmentStatus: 'All assignment statuses',
  });

  const [appliedFilters, setAppliedFilters] = useState({ ...filters });
  const [sortBy, setSortBy] = useState('riskScore');
  const [sortOrder, setSortOrder] = useState('desc');

  // Load available filter options once
  useEffect(() => {
    async function loadFilters() {
      try {
        const opts = await getPredictionFilters();
        setFilterOptions(opts);
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    }
    loadFilters();
  }, []);

  // Compute summary from live predictions
  const computeSummary = (preds) => {
    if (!preds || !preds.length) {
      return { totalPredictions: 0, highRisk: 0, pendingVerification: 0, assigned: 0 };
    }
    return {
      totalPredictions: preds.length,
      highRisk: preds.filter(p => p.riskLevel === 'HIGH' || p.riskLevel === 'CRITICAL').length,
      pendingVerification: preds.filter(p => p.verificationStatus === 'UNASSIGNED' || p.verificationStatus === 'ASSIGNED' || p.verificationStatus === 'PENDING_VERIFICATION').length,
      assigned: preds.filter(p => p.assignedOfficer).length,
    };
  };

  // Main data loader function calling predictionApi service
  const loadPredictions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = {
        ...appliedFilters,
        sortBy,
        sortOrder,
        page: pagination.page,
        limit: pagination.limit,
      };

      const data = await getPredictions(queryParams);
      // API returns { predictions: [...], pagination: {...} }
      setPredictions(data.predictions || []);
      setPagination((prev) => ({
        ...prev,
        ...data.pagination,
      }));
    } catch (err) {
      console.error('Failed to load predictions:', err);
      setError(err.message || 'Unable to load predictions.');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, sortBy, sortOrder, pagination.page, pagination.limit]);

  useEffect(() => {
    loadPredictions();
  }, [loadPredictions]);

  const handleRunCycle = async () => {
    setCycleRunning(true);
    setError(null);
    try {
      await runPredictionCycle({});
      // Refresh predictions after cycle completes
      await loadPredictions();
    } catch (err) {
      console.error('Failed to run prediction cycle:', err);
      setError(err.message || 'Failed to run prediction cycle.');
    } finally {
      setCycleRunning(false);
    }
  };

  const handleApplyFilters = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    setAppliedFilters({ ...filters });
  };

  const handleResetFilters = () => {
    const defaultFilters = {
      search: '',
      complaintType: 'All complaint types',
      communityArea: 'All community areas',
      ward: 'All wards',
      riskLevel: 'All risk levels',
      verificationStatus: 'All verification statuses',
      assignmentStatus: 'All assignment statuses',
    };
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnKey);
      setSortOrder('desc');
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const summary = computeSummary(predictions);

  return (
    <PageTransition>
      <div className="predictions-page">
        {/* Header */}
        <header className="predictions-header">
          <div className="predictions-header-left">
            <h1 className="predictions-title">PREDICTED COMPLAINTS</h1>
            <div className="predictions-subtitle">
              FUTURE CIVIC RISK PREDICTIONS
            </div>
          </div>
          <div className="dashboard-header-actions">
            <button
              type="button"
              className="btn-run-cycle"
              onClick={handleRunCycle}
              disabled={cycleRunning || loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: cycleRunning ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: '600',
                fontSize: '13px',
                cursor: cycleRunning || loading ? 'not-allowed' : 'pointer',
                opacity: cycleRunning || loading ? 0.7 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              {cycleRunning ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                  </svg>
                  Running Cycle...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                  </svg>
                  Run Prediction Cycle
                </>
              )}
            </button>
            {loading && !cycleRunning && <span className="demo-badge">LOADING...</span>}
            {!loading && !error && <span className="demo-badge">LIVE DATA</span>}
            {error && <span className="demo-badge" style={{ background: '#ff6b6b' }}>ERROR</span>}
          </div>
        </header>

        {/* Error State */}
        {error && (
          <div className="error-banner" style={{
            padding: '16px 20px',
            margin: '16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            color: '#ff6b6b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span style={{ fontWeight: '600', fontSize: '13px' }}>{error}</span>
            </div>
            <button
              type="button"
              className="verification-btn verification-btn-secondary"
              onClick={loadPredictions}
            >
              Retry
            </button>
          </div>
        )}

        {/* Top Summary KPI Cards (Reusing KpiCard) */}
        <div className="predictions-kpis">
          <KpiCard
            label="TOTAL PREDICTIONS"
            value={summary.totalPredictions}
            supportingText="Forecast window (Next 7 days)"
            status="info"
          />
          <KpiCard
            label="HIGH RISK"
            value={summary.highRisk}
            supportingText="Risk score ≥ 75%"
            status="critical"
          />
          <KpiCard
            label="PENDING VERIFICATION"
            value={summary.pendingVerification}
            supportingText="Awaiting field outcome"
            status="warning"
          />
          <KpiCard
            label="ASSIGNED"
            value={summary.assigned}
            supportingText="Field officers dispatched"
            status="success"
          />
        </div>

        {/* Filter Section */}
        <PredictionFilters
          filters={filters}
          filterOptions={filterOptions}
          onChange={setFilters}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
        />

        {/* Prediction Table */}
        <PredictionTable
          predictions={predictions}
          pagination={pagination}
          loading={loading}
          error={error}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onPageChange={handlePageChange}
          onRetry={loadPredictions}
        />
      </div>
    </PageTransition>
  );
}
