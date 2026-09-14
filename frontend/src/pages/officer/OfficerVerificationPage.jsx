import React, { useState, useEffect, useCallback } from 'react';
import PageTransition from '../../components/layout/PageTransition';
import { renderRiskBadge } from '../../components/predictions/PredictionBadges';
import { renderAssignmentStatusBadge, renderSelectionTypeBadge } from '../../components/assignments/AssignmentBadges';
import SubmitVerificationModal from '../../components/officer/SubmitVerificationModal';
import {
  getMyAssignments,
  getOfficerVerificationCandidates,
  submitOfficerVerification,
} from '../../api/officerPortalApi';

/**
 * Field Officer Verification Tasks Page
 * Route: /officer/verification
 */
export default function OfficerVerificationPage() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [verifyingTask, setVerifyingTask] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  const loadVerificationTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const [assignmentsRes, candidatesRes] = await Promise.allSettled([
        getMyAssignments(),
        getOfficerVerificationCandidates(),
      ]);

      const assignmentsList = assignmentsRes.status === 'fulfilled' && assignmentsRes.value?.data ? assignmentsRes.value.data : [];
      const candidatesList = candidatesRes.status === 'fulfilled' && candidatesRes.value?.data ? (candidatesRes.value.data.candidates || candidatesRes.value.data || []) : [];

      // Combine assignment tasks that require field verification
      const allTasks = [...assignmentsList, ...candidatesList];
      setTasks(allTasks);
    } catch (err) {
      console.error('Failed to load officer verification tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVerificationTasks();
  }, [loadVerificationTasks]);

  const handleVerificationSubmit = async (payload) => {
    await submitOfficerVerification(payload);
    await loadVerificationTasks();
  };

  const filteredTasks = tasks.filter((t) => {
    const complaintType = t.prediction?.complaintType || t.complaintType || t.srType || '';
    const communityArea = t.prediction?.communityArea || t.communityArea || '';
    const status = t.status || 'ASSIGNED';

    const matchesSearch =
      complaintType.toLowerCase().includes(search.toLowerCase()) ||
      String(communityArea).toLowerCase().includes(search.toLowerCase());

    if (statusFilter === 'ACTIVE') {
      return matchesSearch && status !== 'COMPLETED';
    }
    if (statusFilter === 'COMPLETED') {
      return matchesSearch && (status === 'COMPLETED' || status === 'VERIFICATION_SUBMITTED');
    }
    return matchesSearch;
  });

  return (
    <PageTransition>
      <div className="page-container" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
            Field Verification Tasks
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>
            Verify predicted civic problems on-site and report ground truth observations
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by complaint type or area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '8px 12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              minWidth: '260px',
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '13px',
            }}
          >
            <option value="ACTIVE">Active Tasks</option>
            <option value="COMPLETED">Completed Verifications</option>
            <option value="ALL">All Tasks</option>
          </select>
        </div>

        {/* Task Cards Grid */}
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading verification tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--glass-border)' }}>
            No verification tasks found matching your filters.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {filteredTasks.map((task, idx) => {
              const pred = task.prediction || task.predictionId || {};
              const complaintType = pred.complaintType || task.complaintType || task.srType || 'Civic Issue';
              const communityArea = pred.communityArea || task.communityArea || '—';
              const ward = pred.ward || task.ward || '—';
              const riskLevel = pred.riskLevel || task.riskLevel || 'MEDIUM';
              const probability = pred.probability || task.probability || 0;

              return (
                <div
                  key={task._id || task.candidateId || task.assignmentId || idx}
                  className="card"
                  style={{
                    padding: '16px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)' }}>
                        {task.candidateId || task.assignmentId || `TASK-${idx + 1}`}
                      </span>
                      {renderRiskBadge(riskLevel)}
                    </div>

                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                      {complaintType}
                    </h3>

                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      Area: <strong>{communityArea}</strong> • Ward: <strong>{ward}</strong>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      Forecast Probability: <strong>{(probability * 100).toFixed(1)}%</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--glass-border)', paddingTop: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setVerifyingTask(task)}
                      className="btn btn-primary"
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                      }}
                    >
                      Verify Ground Truth
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Verification Submission Modal */}
        {verifyingTask && (
          <SubmitVerificationModal
            assignment={verifyingTask}
            onClose={() => setVerifyingTask(null)}
            onSubmitSuccess={handleVerificationSubmit}
          />
        )}
      </div>
    </PageTransition>
  );
}
