import React, { useEffect, useState, useCallback } from 'react';
import PageTransition from '../../components/layout/PageTransition';
import KpiCard from '../../components/dashboard/KpiCard';
import FutureComplaintTrend from '../../components/dashboard/FutureComplaintTrend';
import RiskOverview from '../../components/dashboard/RiskOverview';
import ComplaintDistribution from '../../components/dashboard/ComplaintDistribution';
import VerificationStatus from '../../components/dashboard/VerificationStatus';
import RecentPredictions from '../../components/dashboard/RecentPredictions';
import { getAdminDashboard } from '../../api/analyticsApi';
import { runPredictionCycle } from '../../api/predictionApi';
import { dashboardMockData } from '../../data/dashboardMockData';

/**
 * AdminDashboardPage: Urban Intelligence Command Center Overview
 * Route: /dashboard
 */
export default function AdminDashboardPage() {
  const [dashboardData, setDashboardData] = useState(dashboardMockData);
  const [loading, setLoading] = useState(true);
  const [cycleRunning, setCycleRunning] = useState(false);
  const [error, setError] = useState(null);

  const loadDashboard = useCallback(async () => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    try {
      const res = await getAdminDashboard();
      if (isMounted && res?.data) {
        if (res.isLive && res.data.metrics) {
          const metrics = res.data.metrics;
          setDashboardData((prev) => ({
            ...prev,
            kpis: [
              {
                id: 'predicted-complaints',
                label: 'PREDICTED COMPLAINTS',
                value: metrics.totalPredictions ?? 0,
                supportingText: 'Next 7 days',
                change: '+12.4%',
                status: 'warning',
              },
              {
                id: 'high-risk-zones',
                label: 'HIGH-RISK ZONES',
                value: (metrics.highRiskPredictions || 0) + (metrics.criticalPredictions || 0),
                supportingText: 'Risk ≥ 75%',
                change: `${metrics.criticalPredictions || 0} critical`,
                status: 'critical',
              },
              {
                id: 'pending-verifications',
                label: 'PENDING VERIFICATIONS',
                value: metrics.pendingVerification ?? 0,
                supportingText: 'Awaiting field outcome',
                change: `${metrics.assignedPredictions || 0} assigned`,
                status: 'info',
              },
              {
                id: 'verified-problems',
                label: 'VERIFIED PROBLEMS',
                value: metrics.verifiedPredictions ?? 0,
                supportingText: 'Confirmed observations',
                change: '77.8% accuracy',
                status: 'success',
              },
            ],
            riskDistribution: metrics.riskDistribution
              ? [
                  { level: 'CRITICAL', label: 'Critical', count: metrics.riskDistribution.CRITICAL || 0, color: '#e96c6c' },
                  { level: 'HIGH', label: 'High', count: metrics.riskDistribution.HIGH || 0, color: '#f5a623' },
                  { level: 'MEDIUM', label: 'Medium', count: metrics.riskDistribution.MEDIUM || 0, color: '#ecd06f' },
                  { level: 'LOW', label: 'Low', count: metrics.riskDistribution.LOW || 0, color: '#4dd6a8' },
                ]
              : prev.riskDistribution,
          }));
        } else {
          setDashboardData(res.data);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard payload:', err);
      if (isMounted) setError(err.message);
    } finally {
      if (isMounted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    return () => {};
  }, [loadDashboard]);

  const handleRunCycle = async () => {
    setCycleRunning(true);
    setError(null);
    try {
      await runPredictionCycle({});
      // Refresh dashboard after cycle completes
      await loadDashboard();
    } catch (err) {
      console.error('Failed to run prediction cycle:', err);
      setError(err.message || 'Failed to run prediction cycle.');
    } finally {
      setCycleRunning(false);
    }
  };

  const isLive = dashboardData.kpis[0]?.value !== undefined && dashboardData.kpis[0].value !== 248;

  return (
    <PageTransition>
      <div className="dashboard-page">
        {/* Dashboard Top Header Bar */}
        <header className="dashboard-header">
          <div className="dashboard-header-left">
            <h1 className="dashboard-title">DASHBOARD</h1>
            <div className="dashboard-subtitle">
              URBAN CIVIC INTELLIGENCE OVERVIEW
            </div>
          </div>

          <div className="dashboard-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn-run-cycle"
              onClick={handleRunCycle}
              disabled={cycleRunning || loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: cycleRunning ? 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)' : 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                fontWeight: '600',
                fontSize: '13px',
                cursor: cycleRunning || loading ? 'not-allowed' : 'pointer',
                opacity: cycleRunning || loading ? 0.7 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              {cycleRunning ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                  </svg>
                  Running Cycle...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                  </svg>
                  Run Prediction Cycle
                </>
              )}
            </button>
            {loading && !cycleRunning && <span className="demo-badge">LOADING...</span>}
            {!loading && !error && isLive && <span className="demo-badge">LIVE DATA</span>}
            {!loading && !error && !isLive && <span className="demo-badge">DEMO DATA</span>}
            {error && <span className="demo-badge" style={{ background: '#ff6b6b' }}>ERROR</span>}
          </div>
        </header>

        {/* Error State */}
        {error && (
          <div className="error-banner" style={{
            padding: '16px 20px',
            margin: '16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            color: '#ff6b6b',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
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
              className="verification-btn verification-btn-secondary"
              onClick={loadDashboard}
            >
              Retry
            </button>
          </div>
        )}

        {/* 12-Column Responsive Dashboard Grid */}
        <div className="dashboard-grid">
          {/* Section 1: KPI Intelligence Panels (4 Cards) */}
          <div className="dashboard-kpis">
            {dashboardData.kpis.map((kpi) => (
              <KpiCard
                key={kpi.id}
                label={kpi.label}
                value={kpi.value}
                supportingText={kpi.supportingText}
                change={kpi.change}
                status={kpi.status}
              />
            ))}
          </div>

          {/* Section 2: Future Complaint Trend (Span 8) */}
          <FutureComplaintTrend data={dashboardData.futureTrend} />

          {/* Section 3: Risk Overview (Span 4) */}
          <RiskOverview data={dashboardData.riskDistribution} />

          {/* Section 4: Actionable Complaint Distribution (Span 7) */}
          <ComplaintDistribution data={dashboardData.complaintDistribution} />

          {/* Section 5: Field Verification Status & Pipeline (Span 5) */}
          <VerificationStatus data={dashboardData.verificationStatus} />

          {/* Section 6: Recent Prediction Activity (Span 12) */}
          <RecentPredictions data={dashboardData.recentPredictions} />
        </div>
      </div>
    </PageTransition>
  );
}
