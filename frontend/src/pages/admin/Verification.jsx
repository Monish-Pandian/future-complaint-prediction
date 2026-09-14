import React, { useState, useEffect, useCallback } from 'react';
import PageTransition from '../../components/layout/PageTransition';
import VerificationSummary from '../../components/verification/VerificationSummary';
import VerificationPipeline from '../../components/verification/VerificationPipeline';
import VerificationFilters from '../../components/verification/VerificationFilters';
import VerificationTable from '../../components/verification/VerificationTable';
import VerificationDetailDrawer from '../../components/verification/VerificationDetailDrawer';
import VerificationOutcomeChart from '../../components/verification/VerificationOutcomeChart';
import ErrorState from '../../components/common/ErrorState';
import { getVerifications, getVerificationFilters } from '../../api/verificationApi';

/**
 * Admin Verification Operations & Ground Truth Feedback Console
 * Urban Intelligence Command Center — Module 8G
 */
export default function Verification() {
  const [verifications, setVerifications] = useState([]);
  const [summary, setSummary] = useState({});
  const [distribution, setDistribution] = useState([]);
  const [filterOptions, setFilterOptions] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [activeStage, setActiveStage] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    outcome: 'All outcomes',
    severity: 'All severities',
    evaluation: 'All evaluations',
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
    async (customFilters = filters, page = pagination.page, sortField = sortBy, sortDir = sortOrder, stage = activeStage) => {
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
          let list = res.data.verifications || [];

          // Stage filtering if pipeline stage is selected
          if (stage) {
            list = list.filter((item) => {
              const itemStatus = (item.assignment?.status || item.status || '').toUpperCase();
              return itemStatus === stage.toUpperCase();
            });
          }

          // Evaluation filter client-side if applied
          if (customFilters.evaluation && customFilters.evaluation !== 'All evaluations') {
            const targetEval = customFilters.evaluation.toUpperCase().trim();
            list = list.filter((item) => {
              const evalClass = item.evaluation?.classification || (item.outcome === 'PROBLEM_CONFIRMED' ? 'TRUE_POSITIVE' : 'FALSE_POSITIVE');
              return evalClass === targetEval;
            });
          }

          setVerifications(list);
          setPagination(res.data.pagination || { page: 1, limit: 10, total: list.length, totalPages: 1 });
          setSummary(res.data.summary || {});
          setDistribution(res.data.distribution || []);
          setIsLive(Boolean(res.isLive));
        }
      } catch (err) {
        console.error('Failed to load verification logs:', err);
        setError('Verification data unavailable. Please verify connection to the operational forecasting service.');
      } finally {
        setIsLoading(false);
      }
    },
    [filters, pagination.page, pagination.limit, sortBy, sortOrder, activeStage]
  );

  // Initial load
  useEffect(() => {
    loadVerificationData();
  }, [loadVerificationData]);

  // Stage click in pipeline
  const handleStageClick = (stageId) => {
    setActiveStage(stageId);
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadVerificationData(filters, 1, sortBy, sortOrder, stageId);
  };

  // Filter change
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadVerificationData(newFilters, 1, sortBy, sortOrder, activeStage);
  };

  // Reset filters
  const handleReset = (emptyFilters) => {
    const defaultFilters = emptyFilters || {
      search: '',
      outcome: 'All outcomes',
      severity: 'All severities',
      evaluation: 'All evaluations',
      department: 'All departments',
      ward: 'All wards',
      communityArea: 'All community areas',
    };
    setActiveStage(null);
    setFilters(defaultFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadVerificationData(defaultFilters, 1, sortBy, sortOrder, null);
  };

  // Sort change
  const handleSort = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    loadVerificationData(filters, pagination.page, field, order, activeStage);
  };

  // Page change
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    loadVerificationData(filters, newPage, sortBy, sortOrder, activeStage);
  };

  // Inspect detail drawer
  const handleInspect = (item) => {
    setSelectedVerification(item);
  };

  const handleCloseDrawer = () => {
    setSelectedVerification(null);
  };

  return (
    <PageTransition>
      <div className="verification-container">
        {/* Header Bar */}
        <header className="verification-header-wrapper">
          <div className="verification-title-group">
            <div className="auth-label" style={{ marginBottom: '4px' }}>
              OPERATIONS / VERIFICATION
            </div>
            <h1>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              VERIFICATION OPERATIONS
            </h1>
            <p className="verification-subtitle">
              Track AI-selected verification candidates from field assignment through outcome and model evaluation.
            </p>
          </div>

          <div className="verification-meta-actions">
            <div className="verif-context-pill font-mono">
              <span className="text-muted">MODEL:</span> <strong>xgb-test-v1</strong>
            </div>
            <div className="verif-context-pill font-mono">
              <span className="text-muted">CANDIDATES:</span> <strong>{summary.total ?? verifications.length}</strong>
            </div>
            <span className={`verification-mode-pill ${isLive ? 'live' : 'demo'}`}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: isLive ? '#4dd6a8' : '#ecd06f',
                }}
              />
              {isLive ? 'OPERATIONAL' : 'SYNCING'}
            </span>
          </div>
        </header>

        {/* Error State Banner */}
        {error && (
          <ErrorState
            title="Verification data unavailable"
            description={error}
            onRetry={() => loadVerificationData()}
            retryLabel="Retry Connection"
          />
        )}

        {/* Top KPI Metrics */}
        <VerificationSummary summary={summary} totalCount={pagination.total} />

        {/* Interactive Verification Pipeline */}
        <VerificationPipeline
          summary={summary}
          activeStage={activeStage}
          onStageClick={handleStageClick}
        />

        {/* Filters Bar */}
        <VerificationFilters
          filters={filters}
          filterOptions={filterOptions}
          totalFiltered={verifications.length}
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
            onResetFilters={() => handleReset()}
          />

          <VerificationOutcomeChart distribution={distribution} />
        </div>

        {/* Verification Assessment Detail Drawer */}
        {selectedVerification && (
          <VerificationDetailDrawer
            verification={selectedVerification}
            onClose={handleCloseDrawer}
          />
        )}
      </div>
    </PageTransition>
  );
}
