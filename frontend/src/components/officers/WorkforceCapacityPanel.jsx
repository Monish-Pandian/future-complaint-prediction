import React from 'react';

/**
 * Workforce Capacity Overview & Department Distribution Panel
 * Provides operational fleet capacity telemetry and real department breakdown
 */
export default function WorkforceCapacityPanel({ officers = [], summary = {} }) {
  // Aggregate real workforce metrics
  const totalFleetCapacity = officers.reduce((sum, o) => sum + (o.maxAssignments || 5), 0) || 1;
  const totalAllocatedWorkload = officers.reduce((sum, o) => sum + (o.currentWorkload || 0), 0);
  const fleetUtilizationPct = Math.min(100, Math.round((totalAllocatedWorkload / totalFleetCapacity) * 100));

  // Category counts
  const availableCapacityCount = officers.filter(
    (o) => o.active !== false && (o.currentWorkload || 0) < (o.maxAssignments || 5) * 0.8 && o.availability === 'AVAILABLE'
  ).length;

  const nearCapacityCount = officers.filter(
    (o) => o.active !== false && (o.currentWorkload || 0) >= (o.maxAssignments || 5) * 0.8 && (o.currentWorkload || 0) < (o.maxAssignments || 5)
  ).length;

  const atCapacityCount = officers.filter(
    (o) => (o.currentWorkload || 0) >= (o.maxAssignments || 5)
  ).length;

  const unavailableCount = officers.filter(
    (o) => o.active === false || o.availability === 'ON_LEAVE' || o.availability === 'OFF_DUTY' || o.availability === 'OFFLINE'
  ).length;

  // Department distribution from loaded real officer records
  const deptMap = {};
  officers.forEach((o) => {
    const dept = o.department || 'Municipal';
    if (!deptMap[dept]) {
      deptMap[dept] = {
        name: dept,
        officers: 0,
        available: 0,
        workload: 0,
        capacity: 0,
      };
    }
    deptMap[dept].officers += 1;
    if (o.availability === 'AVAILABLE' && o.active !== false && (o.currentWorkload || 0) < (o.maxAssignments || 5)) {
      deptMap[dept].available += 1;
    }
    deptMap[dept].workload += (o.currentWorkload || 0);
    deptMap[dept].capacity += (o.maxAssignments || 5);
  });

  const departmentList = Object.values(deptMap).sort((a, b) => b.officers - a.officers);

  return (
    <div className="workforce-capacity-grid">
      {/* Left: Workforce Capacity Overview */}
      <div className="capacity-overview-card">
        <div className="capacity-card-header">
          <div className="capacity-card-title-wrap">
            <span className="capacity-badge-tag">FLEET DISPATCH CAPACITY</span>
            <h3 className="capacity-card-title">Workforce Capacity Overview</h3>
          </div>
          <div className="capacity-utilization-badge">
            <span className="capacity-util-label">FLEET UTILIZATION:</span>
            <span className="capacity-util-value">{fleetUtilizationPct}%</span>
          </div>
        </div>

        {/* Big Progress Bar */}
        <div className="capacity-bar-section">
          <div className="capacity-bar-stats">
            <div className="capacity-stat-group">
              <span className="capacity-stat-label">CURRENT ACTIVE WORKLOAD</span>
              <span className="capacity-stat-num highlight-cyan">{totalAllocatedWorkload} tasks</span>
            </div>
            <div className="capacity-stat-group" style={{ textAlign: 'right' }}>
              <span className="capacity-stat-label">TOTAL FLEET CAPACITY</span>
              <span className="capacity-stat-num">{totalFleetCapacity} max slots</span>
            </div>
          </div>

          <div className="fleet-progress-track" title={`Fleet Workload: ${totalAllocatedWorkload} / ${totalFleetCapacity} (${fleetUtilizationPct}%)`}>
            <div
              className={`fleet-progress-fill ${
                fleetUtilizationPct >= 90 ? 'util-tier-full' : fleetUtilizationPct >= 70 ? 'util-tier-high' : fleetUtilizationPct >= 40 ? 'util-tier-mod' : 'util-tier-low'
              }`}
              style={{ width: `${fleetUtilizationPct}%` }}
            />
          </div>
        </div>

        {/* Operational Category Chips */}
        <div className="capacity-categories-strip">
          <div className="capacity-cat-chip cat-available">
            <div className="cat-chip-top">
              <span className="cat-chip-dot green-dot" />
              <span className="cat-chip-name">AVAILABLE CAPACITY</span>
            </div>
            <span className="cat-chip-count">{availableCapacityCount}</span>
          </div>

          <div className="capacity-cat-chip cat-near">
            <div className="cat-chip-top">
              <span className="cat-chip-dot amber-dot" />
              <span className="cat-chip-name">NEAR CAPACITY (≥80%)</span>
            </div>
            <span className="cat-chip-count">{nearCapacityCount}</span>
          </div>

          <div className="capacity-cat-chip cat-full">
            <div className="cat-chip-top">
              <span className="cat-chip-dot red-dot" />
              <span className="cat-chip-name">AT CAPACITY</span>
            </div>
            <span className="cat-chip-count">{atCapacityCount}</span>
          </div>

          <div className="capacity-cat-chip cat-off">
            <div className="cat-chip-top">
              <span className="cat-chip-dot slate-dot" />
              <span className="cat-chip-name">UNAVAILABLE</span>
            </div>
            <span className="cat-chip-count">{unavailableCount}</span>
          </div>
        </div>
      </div>

      {/* Right: Department Workforce Distribution */}
      <div className="department-summary-card">
        <div className="capacity-card-header">
          <div className="capacity-card-title-wrap">
            <span className="capacity-badge-tag">DEPARTMENT COVERAGE</span>
            <h3 className="capacity-card-title">Department Distribution</h3>
          </div>
          <span className="dept-total-badge">{departmentList.length} Active Departments</span>
        </div>

        <div className="dept-distribution-list">
          {departmentList.length === 0 ? (
            <div className="dept-empty-state">No department workforce data available.</div>
          ) : (
            departmentList.map((dept) => {
              const deptUtil = dept.capacity > 0 ? Math.round((dept.workload / dept.capacity) * 100) : 0;
              return (
                <div key={dept.name} className="dept-distribution-row">
                  <div className="dept-row-info">
                    <span className="dept-name">{dept.name}</span>
                    <div className="dept-metrics-inline">
                      <span className="dept-officer-badge">{dept.officers} {dept.officers === 1 ? 'Officer' : 'Officers'}</span>
                      <span className="dept-avail-badge">{dept.available} Available</span>
                      <span className="dept-workload-badge">{dept.workload} Active Tasks</span>
                    </div>
                  </div>

                  <div className="dept-mini-progress-wrap">
                    <div className="dept-mini-track">
                      <div
                        className={`dept-mini-fill ${
                          deptUtil >= 80 ? 'util-tier-high' : deptUtil >= 50 ? 'util-tier-mod' : 'util-tier-low'
                        }`}
                        style={{ width: `${Math.min(100, deptUtil)}%` }}
                      />
                    </div>
                    <span className="dept-mini-pct">{deptUtil}%</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
