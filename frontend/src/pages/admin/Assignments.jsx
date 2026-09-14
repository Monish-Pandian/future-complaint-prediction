import React, { useState, useEffect, useCallback } from 'react';
import PageTransition from '../../components/layout/PageTransition';
import AssignmentSummary from '../../components/assignments/AssignmentSummary';
import AssignmentFilters from '../../components/assignments/AssignmentFilters';
import AssignmentTable from '../../components/assignments/AssignmentTable';
import AssignmentDetailDrawer from '../../components/assignments/AssignmentDetailDrawer';
import OfficerCapacityPanel from '../../components/assignments/OfficerCapacityPanel';
import AssignmentStatusChart from '../../components/assignments/AssignmentStatusChart';
import ErrorState from '../../components/common/ErrorState';
import { SkeletonCard, SkeletonTable } from '../../components/common/LoadingState';
import { getAssignments, getAssignmentFilters } from '../../api/assignmentApi';
import axiosInstance from '../../api/axiosInstance';

/**
 * Admin Assignment Operations & AI Dispatch Monitoring Page
 * Route: /assignments
 */
export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [summary, setSummary] = useState({});
  const [distribution, setDistribution] = useState([]);
  const [filterOptions, setFilterOptions] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({
    search: '',
    department: 'All departments',
    status: 'All assignment statuses',
    riskLevel: 'All risk levels',
    ward: 'All wards',
    communityArea: 'All community areas',
  });
  const [sortBy, setSortBy] = useState('assignedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Load initial filter options
  useEffect(() => {
    async function loadInitialMetadata() {
      try {
        const optsRes = await getAssignmentFilters();
        if (optsRes) {
          setFilterOptions(optsRes || {});
        }
      } catch (err) {
        console.warn('Could not load assignment metadata:', err);
      }
    }
    loadInitialMetadata();
  }, []);

  // Fetch real assignments data from authoritative API
  const loadAssignmentsData = useCallback(
    async (customFilters = filters, page = pagination.page, sortField = sortBy, sortDir = sortOrder) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getAssignments({
          ...customFilters,
          page,
          limit: pagination.limit || 10,
          sortBy: sortField,
          sortOrder: sortDir,
        });

        if (res?.data) {
          const list = res.data.assignments || [];
          setAssignments(list);
          setPagination(res.data.pagination || { page: 1, limit: 10, total: list.length, totalPages: 1 });
          setSummary(res.data.summary || {});

          // Build distribution for chart
          const distMap = res.data.distribution || {};
          const distArray = [
            { status: 'AI_ASSIGNED', label: 'AI Assigned', count: distMap.AI_ASSIGNED ?? list.filter(a => a.status === 'AI_ASSIGNED').length, fill: '#38bdf8' },
            { status: 'ACCEPTED', label: 'Accepted', count: distMap.ACCEPTED ?? list.filter(a => a.status === 'ACCEPTED').length, fill: '#f59e0b' },
            { status: 'IN_PROGRESS', label: 'In Progress', count: distMap.IN_PROGRESS ?? list.filter(a => a.status === 'IN_PROGRESS').length, fill: '#fbbf24' },
            { status: 'COMPLETED', label: 'Completed', count: distMap.COMPLETED ?? list.filter(a => a.status === 'COMPLETED').length, fill: '#10b981' },
            { status: 'REJECTED', label: 'Rejected', count: distMap.REJECTED ?? list.filter(a => a.status === 'REJECTED').length, fill: '#ef4444' },
          ];
          setDistribution(distArray);
        }
      } catch (err) {
        console.error('Failed to load assignments:', err);
        setError(err.response?.data?.message || err.message || 'Assignment data unavailable.');
      } finally {
        setIsLoading(false);
      }
    },
    [filters, pagination.page, pagination.limit, sortBy, sortOrder]
  );

  useEffect(() => {
    loadAssignmentsData();
  }, [loadAssignmentsData]);

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle reset
  const handleReset = (emptyFilters) => {
    setFilters(emptyFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle sort changes
  const handleSort = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
  };

  // Handle pagination page change
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // Handle drawer inspection
  const handleInspect = (assignment) => {
    setSelectedAssignment(assignment);
  };

  const handleCloseDrawer = () => {
    setSelectedAssignment(null);
  };

  return (
    <PageTransition>
      <div className="assignments-container">
        {/* Command Action Bar */}
        <div className="stitch-command-bar">
          <div className="stitch-command-title-wrap">
            <div className="stitch-telemetry-badge">
              <span className="stitch-live-dot" />
              <span>OPERATIONS / ASSIGNMENTS</span>
            </div>
            <h1 className="stitch-page-title">Assignment Operations</h1>
            <p className="stitch-page-desc">
              Manage and inspect municipal field officer task dispatches and verification workflow.
            </p>
          </div>

          <div className="stitch-command-actions">
            <button
              type="button"
              className="stitch-btn-secondary"
              onClick={() => loadAssignmentsData()}
              title="Refresh assignment records without triggering a new prediction cycle"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
              </svg>
              <span>Refresh Assignments</span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <ErrorState
            title="Assignment data unavailable"
            description={error}
            onRetry={() => loadAssignmentsData()}
            retryLabel="Retry Connection"
          />
        )}

        {/* Loading Skeleton during initial load */}
        {isLoading && assignments.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <SkeletonCard height={120} />
            <SkeletonCard height={140} />
            <SkeletonTable rows={8} cols={9} />
          </div>
        ) : (
          <>
            {/* 1. Top KPI Summary Cards */}
            <AssignmentSummary
              summary={summary}
              totalCount={pagination.total || assignments.length}
            />

            {/* 2. Filter Toolbar */}
            <AssignmentFilters
              filters={filters}
              filterOptions={filterOptions}
              onFilterChange={handleFilterChange}
              onReset={handleReset}
              totalMatching={pagination.total || assignments.length}
            />

            {/* 4. Main 70% Table / 30% Capacity & Chart Grid */}
            <div className="assignments-content-grid">
              {/* Left Main Table (70%) */}
              <div className="assignments-table-column">
                <AssignmentTable
                  assignments={assignments}
                  pagination={pagination}
                  isLoading={isLoading}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  onPageChange={handlePageChange}
                  onInspect={handleInspect}
                />
              </div>

              {/* Right Side Column (30%) */}
              <div className="assignments-side-column">
                {/* Officer Capacity Panel */}
                <OfficerCapacityPanel
                  summary={summary}
                  distribution={summary.distribution || {}}
                />

                {/* Dispatch Status Breakdown Chart */}
                <AssignmentStatusChart distribution={distribution} />
              </div>
            </div>
          </>
        )}

        {/* 5. Assignment Detail Slide-Over Drawer */}
        <AssignmentDetailDrawer
          assignment={selectedAssignment}
          onClose={handleCloseDrawer}
        />
      </div>
    </PageTransition>
  );
}

