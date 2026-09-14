import React, { useState, useEffect, useCallback } from 'react';
import PageTransition from '../../components/layout/PageTransition';
import KpiCard from '../../components/dashboard/KpiCard';
import { renderRiskBadge } from '../../components/predictions/PredictionBadges';
import {
  selectCandidates,
  getCandidates,
  getSummary,
  assignCandidates,
  unassignCandidates,
  getCandidateFilters,
} from '../../api/verificationSelectionApi';

/**
 * Admin Verification Candidates Page
 * Route: /verification/candidates
 * Displays predictions selected for 90/10 verification candidate pool
 */
export default function VerificationCandidatesPage() {
  const [candidates, setCandidates] = useState([]);
  const [summary, setSummary] = useState({});
  const [filterOptions, setFilterOptions] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    selectionType: 'All selection types',
    status: 'All candidate statuses',
    riskLevel: 'All risk levels',
    communityArea: 'All community areas',
    ward: 'All wards',
  });
  const [appliedFilters, setAppliedFilters] = useState({ ...filters });
  const [sortBy, setSortBy] = useState('selectionRank');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [assignModal, setAssignModal] = useState({ open: false, officerId: '', officerName: '' });

  // Load filter options
  useEffect(() => {
    async function loadFilters() {
      try {
        const opts = await getCandidateFilters();
        setFilterOptions(opts || {});
      } catch (err) {
        console.warn('Could not load candidate filter options:', err);
      }
    }
    loadFilters();
  }, []);

  // Compute summary KPIs from live data
  const computeSummary = (cands, summaryData) => {
    if (!cands || !cands.length) {
      return {
        totalCandidates: 0,
        exploitationCount: 0,
        explorationCount: 0,
        assignedCount: 0,
        pendingCount: 0,
      };
    }
    return {
      totalCandidates: cands.length,
      exploitationCount: cands.filter(c => c.selectionType === 'EXPLOITATION').length,
      explorationCount: cands.filter(c => c.selectionType === 'EXPLORATION').length,
      assignedCount: cands.filter(c => c.status === 'ASSIGNED' || c.status === 'VERIFICATION_SUBMITTED').length,
      pendingCount: cands.filter(c => c.status === 'PENDING_ASSIGNMENT').length,
      ...summaryData,
    };
  };

  // Load candidates for selected cycle
  const loadCandidates = useCallback(async () => {
    if (!selectedCycleId) {
      setCandidates([]);
      setSummary({});
      setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
      setIsLoading(false);
      setIsLive(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [candidatesRes, summaryRes] = await Promise.all([
        getCandidates({
          ...appliedFilters,
          predictionCycleId: selectedCycleId,
          sortBy,
          sortOrder,
          page: pagination.page,
          limit: pagination.limit,
        }),
        getSummary(selectedCycleId),
      ]);

      if (candidatesRes) {
        setCandidates(candidatesRes.candidates || []);
        setPagination((prev) => ({
          ...prev,
          ...candidatesRes.pagination,
        }));
        setIsLive(true);
      }
      if (summaryRes) {
        setSummary(summaryRes);
      }
    } catch (err) {
      console.error('Failed to load candidates:', err);
      setError(err.message || 'Unable to load verification candidates.');
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters, sortBy, sortOrder, pagination.page, pagination.limit, selectedCycleId]);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  // Trigger 90/10 selection
  const handleSelectCandidates = async (e) => {
    e?.preventDefault();
    if (!selectedCycleId) {
      setError('Please select a prediction cycle first.');
      return;
    }
    if (!confirm(`Run 90/10 verification selection for cycle ${selectedCycleId}? This will select candidates for field verification.`)) {
      return;
    }

    setIsSelecting(true);
    setError(null);
    try {
      await selectCandidates({
        predictionCycleId: selectedCycleId,
        budgetPct: 0.1, // 10% budget as default
      });
      await loadCandidates();
    } catch (err) {
      console.error('Failed to select candidates:', err);
      setError(err.message || 'Failed to run verification selection.');
    } finally {
      setIsSelecting(false);
    }
  };

  // Filter handling
  const handleApplyFilters = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    setAppliedFilters({ ...filters });
  };

  const handleResetFilters = () => {
    const defaultFilters = {
      search: '',
      selectionType: 'All selection types',
      status: 'All candidate statuses',
      riskLevel: 'All risk levels',
      communityArea: 'All community areas',
      ward: 'All wards',
    };
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Sort
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Pagination
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // Candidate selection for manual assignment
  const handleCandidateSelect = (candidateId) => {
    setSelectedCandidates((prev) =>
      prev.includes(candidateId)
        ? prev.filter((id) => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCandidates.length === candidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(candidates.map((c) => c.id));
    }
  };

  // Manual assignment
  const handleAssignClick = () => {
    if (selectedCandidates.length === 0) {
      alert('Please select at least one candidate.');
      return;
    }
    setAssignModal({ open: true, officerId: '', officerName: '' });
  };

  const handleAssignConfirm = async () => {
    if (!assignModal.officerId) {
      alert('Please enter an officer ID.');
      return;
    }

    try {
      await assignCandidates({
        candidateIds: selectedCandidates,
        officerId: assignModal.officerId,
      });
      setSelectedCandidates([]);
      setAssignModal({ open: false, officerId: '', officerName: '' });
      await loadCandidates();
    } catch (err) {
      console.error('Failed to assign candidates:', err);
      alert(err.message || 'Failed to assign candidates.');
    }
  };

  // Manual unassign
  const handleUnassign = async () => {
    if (selectedCandidates.length === 0) {
      alert('Please select at least one candidate.');
      return;
    }
    if (!confirm(`Unassign ${selectedCandidates.length} candidate(s)?`)) return;

    try {
      await unassignCandidates(selectedCandidates);
      setSelectedCandidates([]);
      await loadCandidates();
    } catch (err) {
      console.error('Failed to unassign candidates:', err);
      alert(err.message || 'Failed to unassign candidates.');
    }
  };

  const summaryKpis = computeSummary(candidates, summary);

  return (
    <PageTransition>
      <div className="verification-candidates-page">
        {/* Stitch Ground Truth Verification Command Action Bar */}
        <div className="stitch-command-bar">
          <div className="stitch-command-title-wrap">
            <div className="stitch-telemetry-badge">
              <span className="stitch-live-dot" />
              <span>GROUND TRUTH VERIFICATION PIPELINE • 90/10 TRIAGE POOL</span>
            </div>
            <h1 className="stitch-page-title">Verification Candidates — 90/10 Strategy</h1>
            <p className="stitch-page-desc">
              Select verification candidates from active prediction cycles. Monitor 90% exploitation vs 10% blind exploration balance to eliminate feedback loops.
            </p>
          </div>

          <div className="stitch-command-actions">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)'
            }}>
              <span style={{ color: 'var(--text-muted)' }}>STRATEGY: </span>
              <span style={{ color: 'var(--accent)', fontWeight: '700' }}>90% Exploit / 10% Explore</span>
            </div>
            <button
              type="button"
              className="stitch-btn-primary"
              onClick={handleSelectCandidates}
              disabled={isSelecting || !selectedCycleId || isLoading}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>Run 90/10 Selection</span>
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="error-banner" style={{
            padding: '16px 20px', margin: '16px', borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.3)', color: '#ff6b6b',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span style={{ fontWeight: '600', fontSize: '13px' }}>{error}</span>
            </div>
            <button type="button" className="verification-btn verification-btn-secondary" onClick={loadCandidates}>
              Retry
            </button>
          </div>
        )}

        {/* Cycle Selection & Actions */}
        <div className="verification-filter-card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                PREDICTION CYCLE ID
              </label>
              <input
                type="text"
                className="verification-search-input"
                placeholder="e.g., CYCLE-2026-001"
                value={selectedCycleId}
                onChange={(e) => setSelectedCycleId(e.target.value.toUpperCase().trim())}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="verification-btn verification-btn-primary"
                onClick={handleSelectCandidates}
                disabled={isSelecting || !selectedCycleId || isLoading}
              >
                {isSelecting ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                    </svg>
                    Selecting...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                    Run 90/10 Selection
                  </>
                )}
              </button>

              <button
                type="button"
                className="verification-btn verification-btn-secondary"
                onClick={loadCandidates}
                disabled={!selectedCycleId || isLoading}
              >
                Refresh Candidates
              </button>
            </div>
          </div>
        </div>

        {/* Summary KPIs */}
        <section className="verification-kpis-grid" aria-label="Candidate Selection Summary">
          <KpiCard
            label="TOTAL CANDIDATES"
            value={summaryKpis.totalCandidates ?? 0}
            supportingText={summaryKpis.totalBudget ? `Budget: ${Math.round(summaryKpis.totalBudget * 100)}%` : '90/10 allocation'}
            status="info"
          />
          <KpiCard
            label="EXPLOITATION (90%)"
            value={summaryKpis.exploitationCount ?? 0}
            supportingText="Top risk predictions"
            status="warning"
          />
          <KpiCard
            label="EXPLORATION (10%)"
            value={summaryKpis.explorationCount ?? 0}
            supportingText="Random sample for learning"
            status="info"
          />
          <KpiCard
            label="ASSIGNED TO OFFICERS"
            value={summaryKpis.assignedCount ?? 0}
            supportingText="Ready for field verification"
            status="success"
          />
          <KpiCard
            label="PENDING ASSIGNMENT"
            value={summaryKpis.pendingCount ?? 0}
            supportingText="Awaiting officer dispatch"
            status="critical"
          />
        </section>

        {/* Filters */}
        <div className="verification-filter-card">
          <form onSubmit={handleApplyFilters} aria-label="Candidate Filters">
            <div className="verification-filter-row">
              <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </span>
                <input
                  type="text"
                  className="verification-search-input"
                  placeholder="Search by Candidate ID, Area, Type..."
                  value={filters.search || ''}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                />
              </div>

              <select className="verification-select" value={filters.selectionType || 'All selection types'} onChange={(e) => setFilters((prev) => ({ ...prev, selectionType: e.target.value }))}>
                {filterOptions.selectionTypes?.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>

              <select className="verification-select" value={filters.status || 'All candidate statuses'} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
                {filterOptions.statuses?.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>

              <select className="verification-select" value={filters.riskLevel || 'All risk levels'} onChange={(e) => setFilters((prev) => ({ ...prev, riskLevel: e.target.value }))}>
                {filterOptions.riskLevels?.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>

              <div className="verification-filter-actions">
                <button type="submit" className="verification-btn verification-btn-primary">Apply</button>
                <button type="button" className="verification-btn verification-btn-secondary" onClick={handleResetFilters}>Reset</button>
              </div>
            </div>
          </form>
        </div>

        {/* Candidate Table */}
        <div className="verification-table-card">
          <div className="verification-table-header">
            <div className="verification-table-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Verification Candidates Pool
            </div>
            <div className="verification-table-count">
              Showing {candidates.length} of {pagination.total || candidates.length} candidates
              {selectedCandidates.length > 0 && (
                <span style={{ marginLeft: '16px', color: '#10b981', fontWeight: '600' }}>
                  {selectedCandidates.length} selected
                </span>
              )}
            </div>
          </div>

          <div className="verification-table-responsive">
            <table className="verification-table" aria-label="Verification Candidates">
              <thead>
                <tr>
                  <th style={{ width: '48px' }}>
                    <input type="checkbox" checked={selectedCandidates.length === candidates.length && candidates.length > 0} onChange={handleSelectAll} />
                  </th>
                  <th className="sortable" onClick={() => handleSort('candidateId')}>Candidate ID{sortBy === 'candidateId' ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ''}</th>
                  <th className="sortable" onClick={() => handleSort('selectionRank')}>Rank{sortBy === 'selectionRank' ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ''}</th>
                  <th className="sortable" onClick={() => handleSort('selectionType')}>Type{sortBy === 'selectionType' ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ''}</th>
                  <th>Complaint / Prediction</th>
                  <th>Area / Ward</th>
                  <th className="sortable" onClick={() => handleSort('riskLevel')}>Risk{sortBy === 'riskLevel' ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ''}</th>
                  <th className="sortable" onClick={() => handleSort('status')}>Status{sortBy === 'status' ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : ''}</th>
                  <th>Assigned Officer</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`cand-skel-${i}`}>
                      <td colSpan={10} style={{ padding: '16px' }}>
                        <div style={{ height: '24px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                      </td>
                    </tr>
                  ))
                ) : candidates.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: '48px 24px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="8" x2="12" y2="12"></line>
                          <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {selectedCycleId ? 'No Verification Candidates Found' : 'Select a Prediction Cycle to Load Candidates'}
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                          {selectedCycleId ? 'No candidates match the selected filters.' : 'Enter a valid prediction cycle ID to load the 90/10 candidate pool.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  candidates.map((item) => (
                    <tr key={item.id || item.candidateId}>
                      <td>
                        <input type="checkbox" checked={selectedCandidates.includes(item.id)} onChange={() => handleCandidateSelect(item.id)} />
                      </td>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#10b981', fontSize: '12px' }}>{item.candidateId}</span></td>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: '600' }}>#{item.selectionRank}</span></td>
                      <td>
                        <span className={`verification-type-badge ${item.selectionType === 'EXPLOITATION' ? 'exploitation' : 'exploration'}`}>
                          {item.selectionType}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>
                          {item.prediction?.complaintType || 'Civic Complaint'}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                          Ref: {item.prediction?.predictionId || 'N/A'}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                          {item.prediction?.communityArea || 'Chicago'}
                        </div>
                        <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {item.prediction?.ward || 'Ward 1'}
                        </span>
                      </td>
                      <td>{renderRiskBadge(item.prediction?.riskLevel || 'LOW')}</td>
                      <td>
                        <span className={`candidate-status-badge ${item.status.toLowerCase()}`}>
                          {item.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        {item.assignedOfficer ? (
                          <>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                              {item.assignedOfficer.name}
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                              {item.assignedOfficer.officerId}
                            </div>
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {item.status === 'PENDING_ASSIGNMENT' && (
                            <button
                              type="button"
                              className="verification-btn verification-btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '11px' }}
                              onClick={() => setSelectedCandidates([item.id])}
                              title="Select for Assignment"
                            >
                              Assign
                            </button>
                          )}
                          {item.assignedOfficer && item.status === 'ASSIGNED' && (
                            <button
                              type="button"
                              className="verification-btn verification-btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '11px' }}
                              onClick={() => { setSelectedCandidates([item.id]); setAssignModal({ open: true, officerId: '', officerName: '' }); }}
                              title="Reassign"
                            >
                              Reassign
                            </button>
                          )}
                          <button
                            type="button"
                            className="verification-btn verification-btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                            onClick={() => { setSelectedCandidates([item.id]); handleAssignClick(); }}
                            title="Manual Assign"
                          >
                            Manual
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="verification-pagination">
            <div>Page {pagination.page || 1} of {pagination.totalPages || 1}</div>
            <div className="verification-pagination-btns">
              <button type="button" className="verif-page-btn" disabled={pagination.page <= 1 || isLoading} onClick={() => handlePageChange(pagination.page - 1)}>← Previous</button>
              <button type="button" className="verif-page-btn" disabled={pagination.page >= pagination.totalPages || isLoading} onClick={() => handlePageChange(pagination.page + 1)}>Next →</button>
            </div>
          </div>
        </div>

        {/* Assignment Modal */}
        {assignModal.open && (
          <div className="modal-overlay" onClick={() => setAssignModal({ open: false, officerId: '', officerName: '' })}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Assign Officer to Candidates</h3>
                <button type="button" className="modal-close" onClick={() => setAssignModal({ open: false, officerId: '', officerName: '' })}>&times;</button>
              </div>
              <div className="modal-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p>{selectedCandidates.length} candidate(s) selected for assignment.</p>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                    OFFICER ID
                  </label>
                  <input
                    type="text"
                    className="verification-search-input"
                    placeholder="Enter Officer ObjectId or Officer ID (e.g., OFF-1001)"
                    value={assignModal.officerId}
                    onChange={(e) => setAssignModal((prev) => ({ ...prev, officerId: e.target.value.trim() }))}
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button type="button" className="verification-btn verification-btn-secondary" onClick={() => setAssignModal({ open: false, officerId: '', officerName: '' })}>Cancel</button>
                  <button type="button" className="verification-btn verification-btn-primary" onClick={handleAssignConfirm} disabled={!assignModal.officerId}>Assign</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}