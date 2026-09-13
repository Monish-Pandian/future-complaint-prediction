import React, { useState, useEffect, useCallback } from 'react';
import PageTransition from '../../components/layout/PageTransition';
import EvaluationMetricsGrid from '../../components/evaluation/EvaluationMetricsGrid';
import ConfusionMatrixCard from '../../components/evaluation/ConfusionMatrixCard';
import ModelVersionInfo from '../../components/evaluation/ModelVersionInfo';
import FeedbackPipelineCard from '../../components/evaluation/FeedbackPipelineCard';
import EvaluationFilters from '../../components/evaluation/EvaluationFilters';
import EvaluationRecordsTable from '../../components/evaluation/EvaluationRecordsTable';
import EvaluationDetailsModal from '../../components/evaluation/EvaluationDetailsModal';
import {
  getEvaluationMetrics,
  getEvaluationRecords,
  getEvaluationFilters,
} from '../../api/evaluationApi';

/**
 * Admin AI Feedback & Prediction Evaluation Page
 * Urban Intelligence Command Center — Module 11
 */
export default function AiEvaluation() {
  const [metricsData, setMetricsData] = useState({});
  const [records, setRecords] = useState([]);
  const [filterOptions, setFilterOptions] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({
    search: '',
    classification: 'All classifications',
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
          setRecords(recordsRes.data.records || []);
          setPagination(recordsRes.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
        }
      } catch (err) {
        console.error('Failed to load AI evaluation data:', err);
        setError('AI EVALUATION DATA UNAVAILABLE');
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
    setFilters(emptyFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadEvaluationData(emptyFilters, 1, sortBy, sortOrder);
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

  const handleCloseModal = () => {
    setSelectedEvaluation(null);
  };

  return (
    <PageTransition>
      <div className="evaluation-container">
        {/* Header Bar */}
        <header className="evaluation-header-wrapper">
          <div className="evaluation-title-group">
            <div className="auth-label" style={{ marginBottom: '4px' }}>
              RESEARCH EVALUATION & FEEDBACK MATRIX
            </div>
            <h1>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
              AI Feedback & Prediction Evaluation
            </h1>
            <p className="evaluation-subtitle">
              Authoritative model evaluation benchmarks comparing AI forecasted civic risk against ground truth field verifications. Monitored research metrics include Precision, Recall, F1 Score, Confusion Matrix, and Feedback Buffer readiness.
            </p>
          </div>

          <div className="evaluation-meta-actions">
            <span className={`evaluation-mode-pill ${isLive ? 'live' : 'demo'}`}>
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
              className="evaluation-btn evaluation-btn-secondary"
              onClick={() => loadEvaluationData()}
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Top Research Metric KPI Cards */}
        <EvaluationMetricsGrid metrics={metricsData.metrics} />

        {/* Middle Layout: Confusion Matrix + Model/Feedback Info */}
        <div className="evaluation-middle-grid">
          <ConfusionMatrixCard
            matrix={metricsData.confusionMatrix}
            metrics={metricsData.metrics}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <ModelVersionInfo
              modelVersion={metricsData.modelVersion}
              activeCycleId={metricsData.activeCycleId}
              leadTime={metricsData.leadTime}
              predictions={metricsData.predictions}
            />

            <FeedbackPipelineCard
              feedback={metricsData.feedback}
              predictions={metricsData.predictions}
            />
          </div>
        </div>

        {/* Multi-Criteria Filters */}
        <EvaluationFilters
          filters={filters}
          filterOptions={filterOptions}
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
        />

        {/* 5-Tier Detail Modal / Drawer */}
        {selectedEvaluation && (
          <EvaluationDetailsModal
            evaluation={selectedEvaluation}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </PageTransition>
  );
}
