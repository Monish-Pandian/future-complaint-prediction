import React, { useState, useEffect, useCallback } from 'react';
import PageTransition from '../../components/layout/PageTransition';
import OfficerSummary from '../../components/officers/OfficerSummary';
import WorkforceCapacityPanel from '../../components/officers/WorkforceCapacityPanel';
import OfficerFilters from '../../components/officers/OfficerFilters';
import OfficerTable from '../../components/officers/OfficerTable';
import OfficerDetailDrawer from '../../components/officers/OfficerDetailDrawer';
import { CreateOfficerModal, EditOfficerModal } from '../../components/officers/OfficerModals';
import ErrorState from '../../components/common/ErrorState';
import {
  getAdminOfficers,
  createAdminOfficer,
  updateAdminOfficer,
  deleteAdminOfficer,
  getAdminOfficerFilters,
} from '../../api/officerApi';

/**
 * Admin Field Officer Operations & Workforce Capacity Management
 * Route: /officers
 * Module 8I — Redesigned Operational Workforce Interface
 */
export default function OfficersManagementPage() {
  const [officers, setOfficers] = useState([]);
  const [summary, setSummary] = useState({});
  const [filterOptions, setFilterOptions] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({
    search: '',
    department: 'All departments',
    availability: 'All statuses',
    capacityFilter: 'All',
  });
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Inspection Drawer & Modals
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState(null);

  // Load filter options once on mount
  useEffect(() => {
    async function loadFilters() {
      try {
        const opts = await getAdminOfficerFilters();
        setFilterOptions(opts || {});
      } catch (err) {
        console.warn('Could not load officer filter options:', err);
      }
    }
    loadFilters();
  }, []);

  // Fetch officers from authoritative backend
  const loadOfficers = useCallback(
    async (customFilters = filters, page = pagination.page, sortField = sortBy, sortDir = sortOrder) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getAdminOfficers({
          ...customFilters,
          page,
          limit: pagination.limit || 10,
          sortBy: sortField,
          sortOrder: sortDir,
        });

        if (res?.data) {
          const list = res.data.officers || [];
          setOfficers(list);
          setPagination(res.data.pagination || { page: 1, limit: 10, total: list.length, totalPages: 1 });
          setSummary(res.data.summary || {});
        }
      } catch (err) {
        console.error('Failed to load field officers list:', err);
        setError(err.response?.data?.message || err.message || 'Field officer operations data unavailable.');
      } finally {
        setIsLoading(false);
      }
    },
    [filters, pagination.page, pagination.limit, sortBy, sortOrder]
  );

  useEffect(() => {
    loadOfficers();
  }, [loadOfficers]);

  // Filter change handler
  const handleFilterChange = (field, value) => {
    const next = { ...filters, [field]: value };
    setFilters(next);
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadOfficers(next, 1, sortBy, sortOrder);
  };

  // Reset filters
  const handleReset = () => {
    const emptyFilters = {
      search: '',
      department: 'All departments',
      availability: 'All statuses',
      capacityFilter: 'All',
    };
    setFilters(emptyFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadOfficers(emptyFilters, 1, sortBy, sortOrder);
  };

  // Sort handler
  const handleSort = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    loadOfficers(filters, pagination.page, field, order);
  };

  // Pagination page change
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    loadOfficers(filters, newPage, sortBy, sortOrder);
  };

  // CRUD Handlers
  const handleCreateSubmit = async (payload) => {
    await createAdminOfficer(payload);
    await loadOfficers();
  };

  const handleEditSubmit = async (id, payload) => {
    await updateAdminOfficer(id, payload);
    await loadOfficers();
  };

  const handleDelete = async (officer) => {
    if (window.confirm(`Are you sure you want to deactivate or remove ${officer.name} (${officer.officerId})?`)) {
      try {
        await deleteAdminOfficer(officer.id || officer._id || officer.officerId);
        await loadOfficers();
      } catch (err) {
        alert(err.response?.data?.message || err.message || 'Failed to delete officer.');
      }
    }
  };

  const isFiltered =
    Boolean(filters.search?.trim()) ||
    (filters.department && !filters.department.startsWith('All')) ||
    (filters.availability && !filters.availability.startsWith('All')) ||
    (filters.capacityFilter && filters.capacityFilter !== 'All');

  return (
    <PageTransition>
      <div className="officers-mgmt-container">
        {/* Command Action Bar */}
        <div className="stitch-command-bar">
          <div className="stitch-command-title-wrap">
            <div className="stitch-telemetry-badge">
              <span className="stitch-live-dot" />
              <span>OPERATIONS / OFFICERS • FIELD FLEET DISPATCH</span>
            </div>
            <h1 className="stitch-page-title">Field Officer Operations</h1>
            <p className="stitch-page-desc">
              Monitor officer availability, workload, capacity, departments, and assignment readiness.
            </p>
          </div>

          <div className="stitch-command-actions">
            <div className="command-telemetry-pill">
              <span className="pill-lbl">AVAILABLE FLEET:</span>
              <span className="pill-val-green">
                {summary.availableOfficers ?? summary.available ?? 0} Ready
              </span>
            </div>

            <div className="command-telemetry-pill">
              <span className="pill-lbl">ACTIVE WORKLOAD:</span>
              <span className="pill-val-cyan">
                {summary.assignedTasks ?? summary.totalWorkload ?? 0} Tasks
              </span>
            </div>

            <button
              type="button"
              className="stitch-btn-primary"
              id="provision-officer-btn"
              onClick={() => setIsCreateOpen(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Provision Officer</span>
            </button>
          </div>
        </div>

        {/* Error Banner with Retry */}
        {error && (
          <div className="officers-error-wrap">
            <ErrorState
              message={error}
              onRetry={() => loadOfficers()}
            />
          </div>
        )}

        {/* 6 Compact KPI Cards */}
        <OfficerSummary
          summary={summary}
          officers={officers}
        />

        {/* Workforce Capacity Overview & Department Summary Panel */}
        <WorkforceCapacityPanel
          officers={officers}
          summary={summary}
        />

        {/* Search & Filter Toolbar */}
        <OfficerFilters
          filters={filters}
          filterOptions={filterOptions}
          onChange={handleFilterChange}
          onReset={handleReset}
          totalCount={pagination.total}
          filteredCount={officers.length}
        />

        {/* Main High-Density Officers Workspace Table */}
        <OfficerTable
          officers={officers}
          isLoading={isLoading}
          pagination={pagination}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          onPageChange={handlePageChange}
          onInspect={setSelectedOfficer}
          onEdit={setEditingOfficer}
          onDelete={handleDelete}
          isFiltered={isFiltered}
          onResetFilters={handleReset}
        />

        {/* Slide-over Officer Detail Drawer */}
        {selectedOfficer && (
          <OfficerDetailDrawer
            officer={selectedOfficer}
            onClose={() => setSelectedOfficer(null)}
            onEdit={(officer) => {
              setSelectedOfficer(null);
              setEditingOfficer(officer);
            }}
          />
        )}

        {/* Provision Officer Modal */}
        {isCreateOpen && (
          <CreateOfficerModal
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            onSubmit={handleCreateSubmit}
            departments={filterOptions.departments || []}
          />
        )}

        {/* Edit Officer Modal */}
        {editingOfficer && (
          <EditOfficerModal
            isOpen={Boolean(editingOfficer)}
            officer={editingOfficer}
            onClose={() => setEditingOfficer(null)}
            onSubmit={(payload) => handleEditSubmit(editingOfficer.id || editingOfficer._id || editingOfficer.officerId, payload)}
            departments={filterOptions.departments || []}
          />
        )}
      </div>
    </PageTransition>
  );
}
