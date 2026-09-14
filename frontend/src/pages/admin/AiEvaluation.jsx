import React, { useState, useEffect, useCallback } from 'react';
import PageTransition from '../../components/layout/PageTransition';
import EvaluationMetricsGrid from '../../components/evaluation/EvaluationMetricsGrid';
import ConfusionMatrixCard from '../../components/evaluation/ConfusionMatrixCard';
import ModelVersionInfo from '../../components/evaluation/ModelVersionInfo';
import ClosedLoopFlow from '../../components/evaluation/ClosedLoopFlow';
import FieldEvaluationSummary from '../../components/evaluation/FieldEvaluationSummary';
import FeedbackPipelineCard from '../../components/evaluation/FeedbackPipelineCard';
import EvaluationFilters from '../../components/evaluation/EvaluationFilters';
import EvaluationRecordsTable from '../../components/evaluation/EvaluationRecordsTable';
import EvaluationDetailDrawer from '../../components/evaluation/EvaluationDetailDrawer';
import ErrorState from '../../components/common/ErrorState';
import {
  getEvaluationMetrics,
  getEvaluationRecords,
  getEvaluationFilters,
} from '../../api/evaluationApi';

/**
 * Admin AI Model Evaluation & Ground Truth Governance Console
 * Urban Intelligence Command Center — Module 8H
 */
export default function AiEvaluation() {
  const [metricsData, setMetricsData] = useState({});
  const [records, setRecords] = useState([]);
  const [filterOptions, setFilterOptions] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({
    search: '',
    classification: 'All classifications',
    outcome: 'All outcomes',
    department: 'All departments',
    riskLevel: 'All risk levels',
    ward: 'All wards',
  });
  const [sortBy, setSortBy] = useState('evaluatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState(null);

  // Load filter options
  useEffect(() => {
    async function loadFilters() {
      try {
        const opts = await getEvaluationFilters();
        setFilterOptions(opts || {});
      } catch (err) {
        console.warn('Could not load evaluation filter options:', err);
      }
    }
    loadFilters();
  }, []);

  // Fetch metrics & records
  const loadEvaluationData = useCallback(
    async (customFilters = filters, page = pagination.page, sortField = sortBy, sortDir = sortOrder) => {
      setIsLoading(true);
      setError(null);
      try {
        const [metricsRes, recordsRes] = await Promise.all([
          getEvaluationMetrics(customFilters),
          getEvaluationRecords({
            ...customFilters,
            page,
            limit: pagination.limit || 10,
            sortBy: sortField,
            sortOrder: sortDir,
          }),
        ]);

        if (metricsRes?.data) {
          setMetricsData(metricsRes.data);
          setIsLive(Boolean(metricsRes.isLive));
        }

        if (recordsRes?.data) {
          let list = recordsRes.data.records || [];

          // Outcome filter client-side if applied and not supported by backend
          if (customFilters.outcome && customFilters.outcome !== 'All outcomes') {
            const targetOutcome = customFilters.outcome.toUpperCase().trim();
            list = list.filter((r) => {
              const o = (r.actualOutcome || r.verification?.outcome || '').toUpperCase();
              return o === targetOutcome;
            });
          }

          setRecords(list);
          setPagination(recordsRes.data.pagination || { page: 1, limit: 10, total: list.length, totalPages: 1 });
        }
      } catch (err) {
        console.error('Failed to load AI evaluation data:', err);
        setError('Evaluation data unavailable. Please verify connection to the model governance service.');
      } finally {
        setIsLoading(false);
      }
    },
    [filters, pagination.page, pagination.limit, sortBy, sortOrder]
  );

  useEffect(() => {
    loadEvaluationData();
  }, [loadEvaluationData]);

  // Filters
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadEvaluationData(newFilters, 1, sortBy, sortOrder);
  };

  const handleReset = (emptyFilters) => {
    const defaultFilters = emptyFilters || {
      search: '',
      classification: 'All classifications',
      outcome: 'All outcomes',
      department: 'All departments',
      riskLevel: 'All risk levels',
      ward: 'All wards',
    };
    setFilters(defaultFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadEvaluationData(defaultFilters, 1, sortBy, sortOrder);
  };

  // Sorting
  const handleSort = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    loadEvaluationData(filters, pagination.page, field, order);
  };

  // Pagination
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    loadEvaluationData(filters, newPage, sortBy, sortOrder);
  };

  // Inspection
  const handleInspect = (item) => {
    setSelectedEvaluation(item);
  };

  const handleCloseDrawer = () => {
    setSelectedEvaluation(null);
  };

  return (
    <PageTransition>
      <div className="evaluation-container">
        {/* Header Bar */}
        <header className="evaluation-header-wrapper">
          <div className="evaluation-title-group">
            <div className="auth-label" style={{ marginBottom: '4px' }}>
              OPERATIONS / EVALUATIONS
            </div>
            <h1>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
              AI MODEL EVALUATION
            </h1>
            <p className="evaluation-subtitle">
              Measure prediction performance and track how field verification validates real-world AI forecasts.
            </p>
          </div>

          <div className="evaluation-meta-actions">
            <div className="eval-context-pill font-mono">
              <span className="text-muted">MODEL:</span> <strong>xgb-test-v1</strong>
            </div>
            <div className="eval-context-pill font-mono">
              <span className="text-muted">PERIOD:</span> <strong>2025 Test</strong>
            </div>
            <div className="eval-context-pill font-mono">
              <span className="text-muted">THRESHOLD:</span> <strong>0.38</strong>
            </div>
            <span className={`evaluation-mode-pill ${isLive ? 'live' : 'demo'}`}>
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
            title="AI evaluation data unavailable"
            description={error}
            onRetry={() => loadEvaluationData()}
            retryLabel="Retry Connection"
          />
        )}

        {/* ====================================================
            SECTION A: MODEL TEST PERFORMANCE (Authoritative TEST-2025)
            ==================================================== */}
        <EvaluationMetricsGrid />

        {/* Middle Layout: Confusion Matrix + Model Governance / Policy Info */}
        <div className="evaluation-middle-grid">
          <ConfusionMatrixCard />
          <ModelVersionInfo />
        </div>

        {/* Closed-Loop Operational Governance Architecture */}
        <ClosedLoopFlow />

        {/* ====================================================
            SECTION B: FIELD VERIFICATION EVALUATION (Live Operations)
            ==================================================== */}
        <FieldEvaluationSummary
          records={records}
          metricsData={metricsData}
          pagination={pagination}
        />

        {/* Model Feedback Signal Store */}
        <FeedbackPipelineCard
          feedback={metricsData.feedback}
          predictions={metricsData.predictions}
        />

        {/* Multi-Criteria Filters */}
        <EvaluationFilters
          filters={filters}
          filterOptions={filterOptions}
          totalFiltered={records.length}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
        />

        {/* Evaluated Records Table */}
        <EvaluationRecordsTable
          records={records}
          pagination={pagination}
          isLoading={isLoading}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onPageChange={handlePageChange}
          onInspect={handleInspect}
          onResetFilters={() => handleReset()}
        />

        {/* Evaluation Assessment Detail Drawer */}
        {selectedEvaluation && (
          <EvaluationDetailDrawer
            evaluation={selectedEvaluation}
            onClose={handleCloseDrawer}
          />
        )}
      </div>
    </PageTransition>
  );
}
