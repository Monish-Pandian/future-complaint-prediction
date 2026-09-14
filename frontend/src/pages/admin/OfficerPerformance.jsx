import React, { useState, useEffect, useCallback } from 'react';
import PageTransition from '../../components/layout/PageTransition';
import KpiCard from '../../components/dashboard/KpiCard';
import OfficerPerformanceFilters from '../../components/officerPerformance/OfficerPerformanceFilters';
import OfficerPerformanceTable from '../../components/officerPerformance/OfficerPerformanceTable';
import {
  getOfficerPerformance,
  getOfficerPerformanceFilters,
} from '../../api/officerApi';
import {
  officerPerformanceSummaryKpis,
  officerSecondaryKpis,
} from '../../data/officerPerformanceMockData';

/**
 * Admin Officer Performance List View
 * Route: /officer-performance
 */
export default function OfficerPerformance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [officers, setOfficers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 24, totalPages: 3 });
  const [summary, setSummary] = useState(officerPerformanceSummaryKpis);
  const [secondaryKpis, setSecondaryKpis] = useState(officerSecondaryKpis);
  const [filterOptions, setFilterOptions] = useState({});

  const [filters, setFilters] = useState({
    search: '',
    department: 'All Departments',
    status: 'All Statuses',
    workload: 'All Workloads',
    performanceRange: 'All Performance',
  });

  const [appliedFilters, setAppliedFilters] = useState({ ...filters });
  const [sortBy, setSortBy] = useState('completionRate');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    async function loadFilters() {
      try {
        const opts = await getOfficerPerformanceFilters();
        setFilterOptions(opts);
      } catch (err) {
        console.error('Failed to load officer filter options:', err);
      }
    }
    loadFilters();
  }, []);

  const loadOfficerData = useCallback(async () => {
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

      const res = await getOfficerPerformance(queryParams);
      if (res?.data) {
        setOfficers(res.data.officers || []);
        if (res.data.pagination) {
          setPagination((prev) => ({
            ...prev,
            ...res.data.pagination,
          }));
        }
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
        if (res.data.secondaryKpis) {
          setSecondaryKpis(res.data.secondaryKpis);
        }
      }
    } catch (err) {
      console.error('Failed to load officer performance:', err);
      setError(err.message || 'Unable to load officer performance.');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, sortBy, sortOrder, pagination.page, pagination.limit]);

  useEffect(() => {
    loadOfficerData();
  }, [loadOfficerData]);

  const handleApplyFilters = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    setAppliedFilters({ ...filters });
  };

  const handleResetFilters = () => {
    const defaultFilters = {
      search: '',
      department: 'All Departments',
      status: 'All Statuses',
      workload: 'All Workloads',
      performanceRange: 'All Performance',
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

  return (
    <PageTransition>
      <div className="officer-perf-page">
        {/* Header */}
        <header className="officer-perf-header">
          <div className="officer-perf-header-left">
            <h1 className="officer-perf-title">OFFICER PERFORMANCE</h1>
            <div className="officer-perf-subtitle">
              FIELD VERIFICATION OPERATIONS
            </div>
          </div>
          <div className="dashboard-header-actions">
            <span className="demo-badge">LIVE OPERATIONS</span>
          </div>
        </header>

        {/* Top 5 Primary KPI Cards (Reusing KpiCard) */}
        <div className="officer-kpis-top">
          <KpiCard
            label="TOTAL OFFICERS"
            value={summary.totalOfficers || 24}
            supportingText="Registered staff"
            status="info"
          />
          <KpiCard
            label="ACTIVE OFFICERS"
            value={summary.activeOfficers || 18}
            supportingText="Available on duty"
            status="success"
          />
          <KpiCard
            label="ASSIGNED TASKS"
            value={summary.assignedTasks || 47}
            supportingText="Active verification pipeline"
            status="info"
          />
          <KpiCard
            label="COMPLETED"
            value={summary.completedVerifications || 32}
            supportingText="Ground truth verified"
            status="success"
          />
          <KpiCard
            label="PENDING"
            value={summary.pendingVerifications || 15}
            supportingText="Awaiting field inspection"
            status="warning"
          />
        </div>

        {/* Secondary Operational Metrics Bar */}
        <section className="officer-kpis-secondary" aria-label="Secondary Operational Metrics">
          <div className="sec-metric-item">
            <span className="sec-metric-label">Average Verification Time</span>
            <span className="sec-metric-value">{secondaryKpis.averageVerificationTime}</span>
          </div>
          <div className="sec-metric-item">
            <span className="sec-metric-label">Overall Completion Rate</span>
            <span className="sec-metric-value" style={{ color: 'var(--accent)' }}>
              {Math.round((secondaryKpis.completionRate || 0.82) * 100)}%
            </span>
          </div>
          <div className="sec-metric-item">
            <span className="sec-metric-label">Confirmed Problems</span>
            <span className="sec-metric-value" style={{ color: '#4dd6a8' }}>
              {secondaryKpis.confirmedProblems}
            </span>
          </div>
          <div className="sec-metric-item">
            <span className="sec-metric-label">Problems Not Found</span>
            <span className="sec-metric-value" style={{ color: '#94a3b8' }}>
              {secondaryKpis.problemsNotFound}
            </span>
          </div>
          <div className="sec-metric-item">
            <span className="sec-metric-label">Unable To Verify</span>
            <span className="sec-metric-value" style={{ color: '#a78bfa' }}>
              {secondaryKpis.unableToVerify}
            </span>
          </div>
        </section>

        {/* Filters */}
        <OfficerPerformanceFilters
          filters={filters}
          filterOptions={filterOptions}
          onChange={setFilters}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
        />

        {/* Officer Performance Table */}
        <OfficerPerformanceTable
          officers={officers}
          pagination={pagination}
          loading={loading}
          error={error}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onPageChange={handlePageChange}
          onRetry={loadOfficerData}
        />
      </div>
    </PageTransition>
  );
}
