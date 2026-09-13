import {
  DashboardIcon,
  PredictionsIcon,
  PerformanceIcon,
  HeatmapIcon,
  OfficersIcon,
  AssignmentsIcon,
  VerificationIcon,
  ComplaintsIcon,
  EvaluationIcon,
} from '../components/common/Icons';

export const adminNavigationGroups = [
  {
    group: 'COMMAND CENTER',
    items: [
      {
        label: 'Dashboard',
        path: '/dashboard',
        icon: DashboardIcon,
      },
    ],
  },
  {
    group: 'INTELLIGENCE',
    items: [
      {
        label: 'Predictions',
        path: '/predictions',
        icon: PredictionsIcon,
      },
      {
        label: 'Heatmap',
        path: '/heatmap',
        icon: HeatmapIcon,
      },
    ],
  },
  {
    group: 'OPERATIONS',
    items: [
      {
        label: 'Officers',
        path: '/officers',
        icon: OfficersIcon,
      },
      {
        label: 'Assignments',
        path: '/assignments',
        icon: AssignmentsIcon,
      },
      {
        label: 'Verification Candidates',
        path: '/verification/candidates',
        icon: VerificationIcon,
      },
      {
        label: 'Verification',
        path: '/verification',
        icon: VerificationIcon,
      },
    ],
  },
  {
    group: 'ANALYTICS',
    items: [
      {
        label: 'Officer Performance',
        path: '/officer-performance',
        icon: PerformanceIcon,
      },
      {
        label: 'AI Evaluation',
        path: '/evaluation',
        icon: EvaluationIcon,
      },
    ],
  },
];

export const officerNavigationGroups = [
  {
    group: 'COMMAND CENTER',
    items: [
      {
        label: 'Dashboard',
        path: '/officer',
        icon: DashboardIcon,
      },
    ],
  },
  {
    group: 'OPERATIONS',
    items: [
      {
        label: 'Assigned Complaints',
        path: '/officer/complaints',
        icon: ComplaintsIcon,
      },
      {
        label: 'Department Heatmap',
        path: '/officer/heatmap',
        icon: HeatmapIcon,
      },
    ],
  },
];

// Flat arrays for backward compatibility
export const adminNavigation = adminNavigationGroups.flatMap((g) => g.items);
export const officerNavigation = officerNavigationGroups.flatMap((g) => g.items);

export function getNavigationForRole(role) {
  const normalizedRole = role?.toUpperCase();
  if (normalizedRole === 'ADMIN') {
    return {
      section: 'ADMIN CONSOLE',
      subtitle: 'URBAN OPERATIONS',
      groups: adminNavigationGroups,
      items: adminNavigation,
    };
  }
  return {
    section: 'FIELD OPERATIONS',
    subtitle: 'MUNICIPAL DISPATCH',
    groups: officerNavigationGroups,
    items: officerNavigation,
  };
}

export default {
  adminNavigationGroups,
  officerNavigationGroups,
  adminNavigation,
  officerNavigation,
  getNavigationForRole,
};
