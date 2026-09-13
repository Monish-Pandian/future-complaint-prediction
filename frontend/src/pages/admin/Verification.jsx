import React, { useState, useEffect, useCallback } from 'react';
import PageTransition from '../../components/layout/PageTransition';
import VerificationSummary from '../../components/verification/VerificationSummary';
import VerificationFilters from '../../components/verification/VerificationFilters';
import VerificationTable from '../../components/verification/VerificationTable';
import VerificationDetailsModal from '../../components/verification/VerificationDetailsModal';
import VerificationOutcomeChart from '../../components/verification/VerificationOutcomeChart';
import { getVerifications, getVerificationFilters } from '../../api/verificationApi';

/**
 * Admin Verification & Ground Truth Feedback Monitoring Page
 * Urban Intelligence Command Center — Module 10
 */
export default function Verification() {
  const [verifications, setVerifications] = useState([]);
  const [summary, setSummary] = useState({});
  const [distribution, setDistribution] = useState([]);
  const [filterOptions, setFilterOptions] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({
    search: '',
    outcome: 'All outcomes',
    severity: 'All severities',
    department: 'All departments',
    ward: 'All wards',
    communityArea: 'All community areas',
  });
  const [sortBy, setSortBy] = useState('verifiedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState(null);
  const [selectedVerification, setSelectedVerification] = useState(null);

  // Initial filter options
  useEffect(() => {
    async function loadFilters() {
      try {
        const opts = await getVerificationFilters();
        setFilterOptions(opts || {});
      } catch (err) {
        console.warn('Could not load verification filter options:', err);
      }
    }
    loadFilters();
  }, []);

  // Fetch verification data
  const loadVerificationData = useCallback(
    async (customFilters = filters, page = pagination.page, sortField = sortBy, sortDir = sortOrder) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getVerifications({
          ...customFilters,
          page,
          limit: pagination.limit || 10,
          sortBy: sortField,
          sortOrder: sortDir,
        });

        if (res?.data) {
          setVerifications(res.data.verifications || []);
          setPagination(res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
          setSummary(res.data.summary || {});
          setDistribution(res.data.distribution || []);
          setIsLive(Boolean(res.isLive));
        }
      } catch (err) {
        console.error('Failed to load verification logs:', err);
        setError('VERIFICATION DATA UNAVAILABLE');
      } finally {
        setIsLoading(false);
      }
    },
    [filters, pagination.page, pagination.limit, sortBy, sortOrder]
  );

  // Initial load
  useEffect(() => {
    loadVerificationData();
  }, [loadVerificationData]);

  // Filter change
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadVerificationData(newFilters, 1, sortBy, sortOrder);
  };

  // Reset
  const handleReset = (emptyFilters) => {
    setFilters(emptyFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadVerificationData(emptyFilters, 1, sortBy, sortOrder);
  };

  // Sort
  const handleSort = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    loadVerificationData(filters, pagination.page, field, order);
  };

  // Page change
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    loadVerificationData(filters, newPage, sortBy, sortOrder);
  };

  // Inspect detail
  const handleInspect = (item) => {
    setSelectedVerification(item);
  };

  const handleCloseModal = () => {
    setSelectedVerification(null);
  };

  return (
    <PageTransition>
      <div className="verification-container">
        {/* Header Bar */}
        <header className="verification-header-wrapper">
          <div className="verification-title-group">
            <div className="auth-label" style={{ marginBottom: '4px' }}>
              GROUND TRUTH & MODEL EVALUATION
            </div>
            <h1>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Ground Truth Verification & Feedback Integration
            </h1>
            <p className="verification-subtitle">
              Monitor on-site field verification logs, prediction evaluation matrix (True/False Positives), discrepancy auditing, and feedback signal ingestion into the retraining pipeline.
            </p>
          </div>

          <div className="verification-meta-actions">
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

        {/* Error State Banner */}
        {error && (
          <div
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid rgba(255, 107, 107, 0.3)',
              color: '#ff6b6b',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
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
              onClick={() => loadVerificationData()}
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Top KPI Metrics */}
        <VerificationSummary summary={summary} />

        {/* Filters Bar */}
        <VerificationFilters
          filters={filters}
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
        />

        {/* Content Grid: Table + Side Outcome Breakdown */}
        <div className="verification-content-grid">
          <VerificationTable
            verifications={verifications}
            pagination={pagination}
            isLoading={isLoading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            onPageChange={handlePageChange}
            onInspect={handleInspect}
          />

          <VerificationOutcomeChart distribution={distribution} />
        </div>

        {/* 5-Tier Detail Modal / Drawer */}
        {selectedVerification && (
          <VerificationDetailsModal
            verification={selectedVerification}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </PageTransition>
  );
}
