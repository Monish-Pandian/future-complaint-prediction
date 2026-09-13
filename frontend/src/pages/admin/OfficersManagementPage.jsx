import React, { useState, useEffect, useCallback } from 'react';
import PageTransition from '../../components/layout/PageTransition';
import KpiCard from '../../components/dashboard/KpiCard';
import { renderOfficerStatusBadge } from '../../components/officerPerformance/OfficerBadges';
import { CreateOfficerModal, EditOfficerModal } from '../../components/officers/OfficerModals';
import {
  getAdminOfficers,
  createAdminOfficer,
  updateAdminOfficer,
  deleteAdminOfficer,
  getAdminOfficerFilters,
} from '../../api/officerApi';

/**
 * Admin Officer Management Registry Page
 * Urban Intelligence Command Center — Module 12
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
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState(null);

  // Load filter options
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

  // Fetch officers
  const loadOfficers = useCallback(
    async (customFilters = filters, page = pagination.page) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getAdminOfficers({
          ...customFilters,
          page,
          limit: pagination.limit || 10,
        });

        if (res?.data) {
          setOfficers(res.data.officers || []);
          setPagination(res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
          setSummary(res.data.summary || {});
          setIsLive(Boolean(res.isLive));
        }
      } catch (err) {
        console.error('Failed to load officers list:', err);
        setError('OFFICER REGISTRY DATA UNAVAILABLE');
      } finally {
        setIsLoading(false);
      }
    },
    [filters, pagination.page, pagination.limit]
  );

  useEffect(() => {
    loadOfficers();
  }, [loadOfficers]);

  // Filter change
  const handleFilterChange = (field, value) => {
    const next = { ...filters, [field]: value };
    setFilters(next);
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadOfficers(next, 1);
  };

  const handleReset = () => {
    const emptyFilters = {
      search: '',
      department: 'All departments',
      availability: 'All statuses',
    };
    setFilters(emptyFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadOfficers(emptyFilters, 1);
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
    if (window.confirm(`Are you sure you want to remove ${officer.name} (${officer.officerId})?`)) {
      try {
        await deleteAdminOfficer(officer.id || officer._id || officer.officerId);
        await loadOfficers();
      } catch (err) {
        alert(err.response?.data?.message || err.message || 'Failed to delete officer.');
      }
    }
  };

  return (
    <PageTransition>
      <div className="officers-mgmt-container">
        {/* Compact Page Header */}
        <header className="officers-mgmt-header">
          <div className="officers-mgmt-title">
            <h1>OFFICER REGISTRY</h1>
            <p className="officers-mgmt-subtitle">
              Municipal field operations and dispatch management
            </p>
          </div>

          <div className="officers-header-actions">
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

            <button
              type="button"
              className="btn-provision-officer"
              id="provision-officer-btn"
              onClick={() => setIsCreateOpen(true)}
            >
              + Provision Officer
            </button>
          </div>
        </header>

        {/* Error State Banner */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{error}</span>
            <button
              type="button"
              className="officers-btn-reset"
              onClick={() => loadOfficers()}
            >
              Retry
            </button>
          </div>
        )}

        {/* 4 Compact KPIs */}
        <section className="officers-kpis-grid" aria-label="Officer Registry KPIs">
          <KpiCard
            label="TOTAL OFFICERS"
            value={summary.totalOfficers ?? officers.length}
            supportingText="Registered field inspectors"
            status="info"
          />
          <KpiCard
            label="AVAILABLE FOR DISPATCH"
            value={summary.availableOfficers ?? 5}
            supportingText="Ready for AI task allocation"
            status="success"
          />
          <KpiCard
            label="BUSY / EN ROUTE"
            value={summary.busyOfficers ?? 1}
            supportingText="Active on-site inspection"
            status="warning"
          />
          <KpiCard
            label="OFFLINE / INACTIVE"
            value={summary.inactiveOfficers ?? 0}
            supportingText="Off duty or on leave"
            status="info"
          />
        </section>

        {/* Clean Filter Toolbar */}
        <div className="officers-filter-toolbar">
          <div className="officers-search-wrapper">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              id="officer-mgmt-search"
              type="text"
              className="officers-search-input"
              placeholder="Search officers by name, ID, or skills..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>

          <select
            id="officer-mgmt-dept"
            className="officers-select"
            value={filters.department}
            onChange={(e) => handleFilterChange('department', e.target.value)}
          >
            {filterOptions.departments?.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            id="officer-mgmt-avail"
            className="officers-select"
            value={filters.availability}
            onChange={(e) => handleFilterChange('availability', e.target.value)}
          >
            {filterOptions.availabilities?.map((a) => (
              <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
            ))}
          </select>

          <button
            type="button"
            className="officers-btn-reset"
            onClick={handleReset}
          >
            Reset
          </button>
        </div>

        {/* Officers Table Card */}
        <div className="officers-table-card">
          <div className="officers-table-header">
            <div className="officers-table-title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Registered Municipal Officers
            </div>
            <div className="officers-table-count">
              Showing {officers.length} officers
            </div>
          </div>

          <div className="officers-table-responsive">
            <table className="officers-table" aria-label="Officer Registry Table">
              <thead>
                <tr>
                  <th>OFFICER ID</th>
                  <th>OFFICER</th>
                  <th>DEPARTMENT</th>
                  <th>EMPLOYEE ID</th>
                  <th>AVAILABILITY</th>
                  <th>ACTIVE WORKLOAD</th>
                  <th>PATROL SKILLS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`skeleton-${i}`}>
                      <td colSpan={8}>
                        <div style={{ height: '20px', background: 'var(--surface-secondary)', borderRadius: '4px', opacity: 0.6 }} />
                      </td>
                    </tr>
                  ))
                ) : officers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                      <div style={{ fontSize: '24px', marginBottom: '8px' }}>👤</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No officers match your search</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Try clearing filters or provisioning a new officer.
                      </div>
                    </td>
                  </tr>
                ) : (
                  officers.map((officer) => {
                    const id = officer.id || officer._id || officer.officerId;
                    return (
                      <tr key={id}>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '11px', color: 'var(--accent)' }}>
                            {officer.officerId || id}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {officer.name}
                          </div>
                          {officer.phone && (
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {officer.phone}
                            </div>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {officer.department}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            {officer.employeeCode || '—'}
                          </span>
                        </td>
                        <td>
                          {renderOfficerStatusBadge(officer.availability)}
                        </td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {officer.currentWorkload ?? 0} tasks
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {Array.isArray(officer.skills) && officer.skills.length > 0 ? (
                              officer.skills.map((skill, idx) => (
                                <span key={idx} className="officer-skill-tag">
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>General</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="officers-actions-cell">
                            <button
                              type="button"
                              className="btn-officer-edit"
                              onClick={() => setEditingOfficer(officer)}
                              title="Edit Officer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn-officer-delete"
                              onClick={() => handleDelete(officer)}
                              title="Delete Officer"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="officers-pagination">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total officers)
            </span>
            <div className="officers-pagination-actions">
              <button
                type="button"
                className="btn-pagination"
                disabled={pagination.page <= 1}
                onClick={() => {
                  const prev = pagination.page - 1;
                  setPagination((p) => ({ ...p, page: prev }));
                  loadOfficers(filters, prev);
                }}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-pagination"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => {
                  const next = pagination.page + 1;
                  setPagination((p) => ({ ...p, page: next }));
                  loadOfficers(filters, next);
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Provision Officer Modal (Conditionally Mounted) */}
        {isCreateOpen && (
          <CreateOfficerModal
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            onSubmit={handleCreateSubmit}
          />
        )}

        {/* Edit Officer Modal (Conditionally Mounted) */}
        {editingOfficer && (
          <EditOfficerModal
            isOpen={Boolean(editingOfficer)}
            officer={editingOfficer}
            onClose={() => setEditingOfficer(null)}
            onSubmit={(payload) => handleEditSubmit(editingOfficer.id || editingOfficer._id || editingOfficer.officerId, payload)}
          />
        )}
      </div>
    </PageTransition>
  );
}
