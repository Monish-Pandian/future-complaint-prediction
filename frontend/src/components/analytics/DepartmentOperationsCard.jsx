import React from 'react';

/**
 * Department Operations Distribution Card
 * Displays prediction volumes, active dispatches, and verification throughput by municipal department
 */
export default function DepartmentOperationsCard({ departmentData = [] }) {
  const defaultDepts = [
    { department: 'Streets and Sanitation', count: 2150, highRiskCount: 520, activeAssignments: 58, verifiedCount: 38 },
    { department: 'CDOT - Department of Transportation', count: 860, highRiskCount: 195, activeAssignments: 22, verifiedCount: 14 },
    { department: 'DOB - Buildings', count: 180, highRiskCount: 48, activeAssignments: 6, verifiedCount: 3 },
    { department: 'Water Management', count: 137, highRiskCount: 24, activeAssignments: 3, verifiedCount: 1 },
  ];

  const deptList = departmentData.length > 0 ? departmentData : defaultDepts;
  const maxVolume = Math.max(...deptList.map((d) => d.count || 1), 1);

  return (
    <div className="analytics-card">
      <div className="analytics-card-header">
        <div className="analytics-card-title-wrap">
          <span className="analytics-card-tag">AGENCY ALLOCATION</span>
          <h3 className="analytics-card-title">Department Operational Breakdown</h3>
        </div>
        <span className="analytics-header-stat">{deptList.length} Municipal Agencies</span>
      </div>

      <div className="dept-ops-list">
        {deptList.map((dept, idx) => {
          const deptName = dept.department || 'Municipal';
          const volume = dept.count || 0;
          const highRisk = dept.highRiskCount || 0;
          const activeDispatches = dept.activeAssignments ?? (Math.round(volume * 0.025) || 1);
          const verified = dept.verifiedCount ?? (Math.round(volume * 0.018) || 1);
          const volPct = Math.round((volume / maxVolume) * 100);

          return (
            <div key={deptName || idx} className="dept-ops-row">
              <div className="dept-ops-top">
                <span className="dept-ops-name">{deptName}</span>
                <div className="dept-ops-stats-inline">
                  <span className="dept-stat-vol"><strong>{volume.toLocaleString()}</strong> forecasts</span>
                  <span className="dept-stat-tag tag-cyan">{activeDispatches} Dispatches</span>
                  <span className="dept-stat-tag tag-green">{verified} Verified</span>
                </div>
              </div>

              <div className="dept-ops-bar-track">
                <div
                  className="dept-ops-bar-fill"
                  style={{ width: `${volPct}%` }}
                />
              </div>

              <div className="dept-ops-bottom-sub">
                <span>High Risk Share: <strong>{highRisk}</strong> ({volume > 0 ? Math.round((highRisk / volume) * 100) : 0}%)</span>
                <span>Verification Ratio: <strong>{activeDispatches > 0 ? Math.round((verified / activeDispatches) * 100) : 0}%</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
