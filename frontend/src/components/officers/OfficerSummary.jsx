import React from 'react';
import MetricCard from '../common/MetricCard';

/**
 * 6 KPI Metric Cards for Officer Workforce Operations
 * Reuses shared MetricCard component
 */
export default function OfficerSummary({ summary = {}, officers = [] }) {
  // Derive fleet metrics accurately from real summary or officer list
  const totalOfficers = summary.totalOfficers ?? summary.total ?? officers.length;
  
  const availableOfficers = summary.availableOfficers ?? summary.available ?? officers.filter(
    (o) => o.availability === 'AVAILABLE' && o.active !== false && (o.currentWorkload || 0) < (o.maxAssignments || 5)
  ).length;

  const busyOfficers = summary.busyOfficers ?? summary.busy ?? officers.filter(
    (o) => o.availability === 'BUSY' || ((o.currentWorkload || 0) > 0 && (o.currentWorkload || 0) < (o.maxAssignments || 5) * 0.8)
  ).length;

  const unavailableOfficers = summary.inactiveOfficers ?? summary.unavailable ?? officers.filter(
    (o) => o.availability === 'ON_LEAVE' || o.availability === 'OFF_DUTY' || o.availability === 'OFFLINE' || o.active === false
  ).length;

  const nearCapacityOfficers = summary.nearCapacity ?? officers.filter(
    (o) => (o.currentWorkload || 0) >= (o.maxAssignments || 5) * 0.8
  ).length;

  const totalActiveWorkload = summary.assignedTasks ?? summary.totalWorkload ?? officers.reduce(
    (acc, o) => acc + (o.currentWorkload || 0),
    0
  );

  return (
    <section className="officers-kpis-grid" aria-label="Field Workforce Operational KPIs">
      <MetricCard
        label="TOTAL OFFICERS"
        value={totalOfficers}
        subtext="Registered field workforce fleet"
        status="accent"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        }
      />

      <MetricCard
        label="AVAILABLE FOR DISPATCH"
        value={availableOfficers}
        subtext="Ready for AI task allocation"
        status="success"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        }
      />

      <MetricCard
        label="BUSY / ASSIGNED"
        value={busyOfficers}
        subtext="Actively executing field tasks"
        status="warning"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        }
      />

      <MetricCard
        label="UNAVAILABLE / OFF-DUTY"
        value={unavailableOfficers}
        subtext="On leave or off-duty status"
        status="neutral"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        }
      />

      <MetricCard
        label="OFFICERS NEAR CAPACITY"
        value={nearCapacityOfficers}
        subtext="Workload ≥ 80% of max threshold"
        status="danger"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        }
      />

      <MetricCard
        label="TOTAL ACTIVE WORKLOAD"
        value={totalActiveWorkload}
        subtext="Open tasks dispatched to officers"
        status="info"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        }
      />
    </section>
  );
}
