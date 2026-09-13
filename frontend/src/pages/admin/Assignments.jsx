import React, { useState, useEffect, useCallback } from 'react';
import PageTransition from '../../components/layout/PageTransition';
import AssignmentSummary from '../../components/assignments/AssignmentSummary';
import AssignmentFilters from '../../components/assignments/AssignmentFilters';
import AssignmentTable from '../../components/assignments/AssignmentTable';
import AssignmentDetailsModal from '../../components/assignments/AssignmentDetailsModal';
import AssignmentStatusChart from '../../components/assignments/AssignmentStatusChart';
import { getAssignments, getAssignmentFilters, getAssignmentPreview, executeAutoAssignment } from '../../api/assignmentApi';

/**
 * Admin Assignments & AI Dispatch Monitoring Page
 * Urban Intelligence Command Center — Module 09
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
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Automatic assignment preview state
  const [previewCycleId, setPreviewCycleId] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Load initial filter options
  useEffect(() => {
    async function loadFilters() {
      try {
        const opts = await getAssignmentFilters();
        setFilterOptions(opts || {});
      } catch (err) {
        console.warn('Could not load assignment filter options:', err);
      }
    }
    loadFilters();
  }, []);

  // Fetch assignments data
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
          setAssignments(res.data.assignments || []);
          setPagination(res.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
          setSummary(res.data.summary || {});
          setDistribution(res.data.distribution || []);
          setIsLive(Boolean(res.isLive));
        }
      } catch (err) {
        console.error('Failed to load assignments:', err);
        setError('ASSIGNMENT DATA UNAVAILABLE');
      } finally {
        setIsLoading(false);
      }
    },
    [filters, pagination.page, pagination.limit, sortBy, sortOrder]
  );

  // Initial load
  useEffect(() => {
    loadAssignmentsData();
  }, [loadAssignmentsData]);

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadAssignmentsData(newFilters, 1, sortBy, sortOrder);
  };

  // Handle reset
  const handleReset = (emptyFilters) => {
    setFilters(emptyFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
    loadAssignmentsData(emptyFilters, 1, sortBy, sortOrder);
  };

  // Handle sort changes
  const handleSort = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    loadAssignmentsData(filters, pagination.page, field, order);
  };

  // Handle pagination page change
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    loadAssignmentsData(filters, newPage, sortBy, sortOrder);
  };

  // Handle drawer inspection
  const handleInspect = (assignment) => {
    setSelectedAssignment(assignment);
  };

  const handleCloseModal = () => {
    setSelectedAssignment(null);
  };

  // Load assignment preview
  const handlePreview = async () => {
    if (!previewCycleId.trim()) {
      setPreviewError('Please enter a prediction cycle ID.');
      return;
    }

    setIsPreviewLoading(true);
    setPreviewError(null);
    setPreviewData(null);

    try {
      const data = await getAssignmentPreview(previewCycleId.trim());
      setPreviewData(data);
      setShowPreview(true);
    } catch (err) {
      console.error('Failed to load assignment preview:', err);
      setPreviewError(err.message || 'Failed to load assignment preview.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Execute automatic assignment
  const handleExecute = async () => {
    if (!previewCycleId.trim()) {
      setPreviewError('Please enter a prediction cycle ID.');
      return;
    }

    if (!confirm(`Execute automatic officer assignment for cycle ${previewCycleId}? This will assign officers to all eligible unassigned candidates.`)) {
      return;
    }

    setIsExecuting(true);
    setPreviewError(null);

    try {
      const result = await executeAutoAssignment({ predictionCycleId: previewCycleId.trim() });
      setPreviewData(result);
      // Refresh assignments list after execution
      await loadAssignmentsData();
    } catch (err) {
      console.error('Failed to execute auto assignment:', err);
      setPreviewError(err.message || 'Failed to execute automatic assignment.');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewData(null);
    setPreviewError(null);
  };

  return (
    <PageTransition>
      <div className="assignments-container">
        {/* Header Bar */}
        <header className="assignments-header-wrapper">
          <div className="assignments-title-group">
            <div className="auth-label" style={{ marginBottom: '4px' }}>
              DISPATCH & RESOURCE ALLOCATION
            </div>
            <h1>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4dd6c7" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
              AI Verification Assignments
            </h1>
            <p className="assignments-subtitle">
              Inspect automated dispatch decisions, officer workload constraints, routing efficiency, and field verification state across Chicago municipal sectors.
            </p>
          </div>

          <div className="assignments-meta-actions">
            <span className={`assignments-mode-pill ${isLive ? 'live' : 'demo'}`}>
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
              className="assignments-btn assignments-btn-secondary"
              onClick={() => loadAssignmentsData()}
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Automatic Assignment Preview Section */}
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
                value={previewCycleId}
                onChange={(e) => setPreviewCycleId(e.target.value.toUpperCase().trim())}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="verification-btn verification-btn-primary"
                onClick={handlePreview}
                disabled={isPreviewLoading || !previewCycleId.trim()}
              >
                {isPreviewLoading ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                    </svg>
                    Previewing...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    Preview Auto Assignment
                  </>
                )}
              </button>

              <button
                type="button"
                className="verification-btn verification-btn-primary"
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                onClick={handleExecute}
                disabled={isExecuting || !previewCycleId.trim() || !previewData?.preview && !previewData?.assignments}
              >
                {isExecuting ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                    </svg>
                    Executing...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                    Execute Auto Assignment
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Error */}
          {previewError && (
            <div style={{ padding: '12px 16px', background: 'rgba(255, 107, 107, 0.1)', border: '1px solid rgba(255, 107, 107, 0.3)', borderRadius: 'var(--radius-md)', color: '#ff6b6b', marginTop: '12px' }}>
              <strong>Preview Error:</strong> {previewError}
            </div>
          )}
        </div>

        {/* Preview Results */}
        {showPreview && previewData && (
          <div className="verification-table-card" style={{ marginBottom: '16px' }}>
            <div className="verification-table-header">
              <div className="verification-table-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                {previewData.assignments ? 'Automatic Assignment Results' : 'Assignment Preview'}
              </div>
              <div className="verification-table-count">
                Cycle: {previewData.cycle?.cycleId || previewCycleId} &bull; 
                Total: {previewData.totalCandidates} &bull; 
                {previewData.assignments ? (
                  <>
                    Assigned: {previewData.assignedCount} &bull; 
                    Unassigned: {previewData.unassignedCount} &bull; 
                    Officers: {previewData.officersUsed}
                  </>
                ) : (
                  <>
                    Would Assign: {previewData.preview?.filter(p => p.wouldAssign).length || 0} &bull; 
                    Unassignable: {previewData.preview?.filter(p => !p.wouldAssign).length || 0}
                  </>
                )}
                <button type="button" className="verification-btn verification-btn-secondary" style={{ marginLeft: '16px' }} onClick={handleClosePreview}>
                  Close
                </button>
              </div>
            </div>

            {previewData.assignments ? (
              // Execution results
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>ASSIGNED</div>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981' }}>{previewData.assignedCount}</div>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(233, 108, 108, 0.1)', border: '1px solid rgba(233, 108, 108, 0.3)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>UNASSIGNED</div>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: '#e96c6c' }}>{previewData.unassignedCount}</div>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>OFFICERS USED</div>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: '#06b6d4' }}>{previewData.officersUsed}</div>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(237, 208, 111, 0.1)', border: '1px solid rgba(237, 208, 111, 0.3)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>POLICY</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#ecd06f', fontFamily: 'var(--font-mono)' }}>{previewData.assignmentPolicy}</div>
                  </div>
                </div>

                {/* Unassigned reasons breakdown */}
                {previewData.unassigned && previewData.unassigned.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                      Unassigned Candidates ({previewData.unassigned.length})
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {Object.entries(
                        previewData.unassigned.reduce((acc, u) => {
                          acc[u.reason] = (acc[u.reason] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([reason, count]) => (
                        <span key={reason} style={{ padding: '4px 10px', background: 'rgba(233, 108, 108, 0.15)', border: '1px solid rgba(233, 108, 108, 0.3)', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                          {reason.replace(/_/g, ' ')}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assignments table */}
                <div className="verification-table-responsive">
                  <table className="verification-table" aria-label="Assignment Results">
                    <thead>
                      <tr>
                        <th>Candidate ID</th>
                        <th>Area</th>
                        <th>SR Type</th>
                        <th>Officer</th>
                        <th>Distance (km)</th>
                        <th>Workload Before</th>
                        <th>Workload After</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.assignments.map((item, idx) => (
                        <tr key={item.candidateId || idx}>
                          <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#10b981', fontSize: '12px' }}>{item.candidateIdStr}</span></td>
                          <td>{item.communityArea}</td>
                          <td>{item.srType}</td>
                          <td>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.officerIdStr}</div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{item.officerDepartment}</div>
                          </td>
                          <td>{item.distanceKm}</td>
                          <td>{item.workloadBefore}</td>
                          <td>{item.workloadAfter}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{item.assignmentScore}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              // Preview results
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ padding: '16px', background: 'rgba(237, 208, 111, 0.1)', border: '1px solid rgba(237, 208, 111, 0.3)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>TOTAL CANDIDATES</div>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: '#ecd06f' }}>{previewData.totalCandidates}</div>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>WOULD ASSIGN</div>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: '#10b981' }}>{previewData.preview?.filter(p => p.wouldAssign).length || 0}</div>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(233, 108, 108, 0.1)', border: '1px solid rgba(233, 108, 108, 0.3)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>UNASSIGNABLE</div>
                    <div style={{ fontSize: '28px', fontWeight: '800', color: '#e96c6c' }}>{previewData.preview?.filter(p => !p.wouldAssign).length || 0}</div>
                  </div>
                  <div style={{ padding: '16px', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>POLICY</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#06b6d4', fontFamily: 'var(--font-mono)' }}>{previewData.assignmentPolicy}</div>
                  </div>
                </div>

                {/* Unassignable reasons breakdown */}
                {previewData.preview && previewData.preview.some(p => !p.wouldAssign) && (
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                      Unassignable Candidates
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {Object.entries(
                        previewData.preview.filter(p => !p.wouldAssign).reduce((acc, u) => {
                          acc[u.unassignedReason] = (acc[u.unassignedReason] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([reason, count]) => (
                        <span key={reason} style={{ padding: '4px 10px', background: 'rgba(233, 108, 108, 0.15)', border: '1px solid rgba(233, 108, 108, 0.3)', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                          {reason.replace(/_/g, ' ')}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview table */}
                <div className="verification-table-responsive">
                  <table className="verification-table" aria-label="Assignment Preview">
                    <thead>
                      <tr>
                        <th>Candidate ID</th>
                        <th>Area</th>
                        <th>SR Type</th>
                        <th>Probability</th>
                        <th>Required Dept</th>
                        <th>Eligible Officers</th>
                        <th>Best Officer</th>
                        <th>Distance (km)</th>
                        <th>Workload</th>
                        <th>Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.preview?.map((item, idx) => (
                        <tr key={item.candidate?.candidateId || idx} style={{ opacity: item.wouldAssign ? 1 : 0.6 }}>
                          <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: item.wouldAssign ? '#10b981' : '#e96c6c', fontSize: '12px' }}>{item.candidate?.candidateIdStr}</span></td>
                          <td>{item.candidate?.communityArea}</td>
                          <td>{item.candidate?.srType}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{(item.candidate?.probability * 100).toFixed(1)}%</td>
                          <td>{item.candidate?.requiredDepartment}</td>
                          <td>{item.eligibleOfficers}</td>
                          <td>
                            {item.bestOfficer ? (
                              <>
                                <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.bestOfficer.officerIdStr}</div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>{item.bestOfficer.department}</div>
                              </>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
                            )}
                          </td>
                          <td>{item.bestOfficer ? item.bestOfficer.distanceKm : '—'}</td>
                          <td>{item.bestOfficer ? `${item.bestOfficer.currentWorkload}/${item.bestOfficer.maxAssignments}` : '—'}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>{item.bestOfficer ? item.bestOfficer.assignmentScore : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Unassigned detail for execution results */}
            {previewData.unassigned && previewData.unassigned.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                  Unassigned Candidates Detail ({previewData.unassigned.length})
                </h4>
                <div className="verification-table-responsive">
                  <table className="verification-table" aria-label="Unassigned Candidates">
                    <thead>
                      <tr>
                        <th>Candidate ID</th>
                        <th>Area</th>
                        <th>SR Type</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.unassigned.map((item, idx) => (
                        <tr key={item.candidateId || idx}>
                          <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: '700', color: '#e96c6c', fontSize: '12px' }}>{item.candidateIdStr}</span></td>
                          <td>{item.communityArea}</td>
                          <td>{item.srType}</td>
                          <td>
                            <span style={{ padding: '2px 8px', background: 'rgba(233, 108, 108, 0.15)', border: '1px solid rgba(233, 108, 108, 0.3)', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                              {item.reason.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top KPI Metrics */}
        <AssignmentSummary summary={summary} />

        {/* Filter Controls */}
        <AssignmentFilters
          filters={filters}
          filterOptions={filterOptions}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
        />

        {/* Content Grid: Table + Side Status Breakdown */}
        <div className="assignments-content-grid">
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

          <AssignmentStatusChart distribution={distribution} />
        </div>

        {/* 4-Tier Detail Modal / Drawer */}
        {selectedAssignment && (
          <AssignmentDetailsModal
            assignment={selectedAssignment}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </PageTransition>
  );
}
