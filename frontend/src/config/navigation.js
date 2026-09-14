import {
  DashboardIcon,
  PredictionsIcon,
  RiskMapIcon,
  AssignmentsIcon,
  VerificationIcon,
  EvaluationIcon,
  OfficersIcon,
  AnalyticsIcon,
  SystemIcon,
  ProfileIcon,
  ComplaintsIcon,
  HistoryIcon,
} from '../components/common/Icons';

/**
 * Role-Based Navigation Configuration (Module 8A)
 * Strictly defines items for ADMIN and FIELD OFFICER.
 */

export const adminNavigationGroups = [
  {
    group: 'CORE',
    items: [
      {
        label: 'Dashboard',
        path: '/dashboard',
        icon: DashboardIcon,
      },
      {
        label: 'Predictions',
        path: '/predictions',
        icon: PredictionsIcon,
      },
      {
        label: 'Risk Map',
        path: '/risk-map',
        icon: RiskMapIcon,
      },
    ],
  },
  {
    group: 'OPERATIONS',
    items: [
      {
        label: 'Assignments',
        path: '/assignments',
        icon: AssignmentsIcon,
      },
      {
        label: 'Verification',
        path: '/verification',
        icon: VerificationIcon,
      },
      {
        label: 'Evaluations',
        path: '/evaluations',
        icon: EvaluationIcon,
      },
      {
        label: 'Officers',
        path: '/officers',
        icon: OfficersIcon,
      },
    ],
  },
  {
    group: 'MANAGEMENT',
    items: [
      {
        label: 'Analytics',
        path: '/analytics',
        icon: AnalyticsIcon,
      },
      {
        label: 'Profile',
        path: '/profile',
        icon: ProfileIcon,
      },
    ],
  },
];

export const officerNavigationGroups = [
  {
    group: 'FIELD OPERATIONS',
    items: [
      {
        label: 'Dashboard',
        path: '/officer',
        icon: DashboardIcon,
      },
      {
        label: 'My Assignments',
        path: '/officer/assignments',
        icon: ComplaintsIcon,
      },
      {
        label: 'Verification',
        path: '/officer/verification',
        icon: VerificationIcon,
      },
      {
        label: 'History',
        path: '/officer/history',
        icon: HistoryIcon,
      },
      {
        label: 'Profile',
        path: '/officer/profile',
        icon: ProfileIcon,
      },
    ],
  },
];

// Flat lists of navigation items
export const adminNavigation = adminNavigationGroups.flatMap((g) => g.items);
export const officerNavigation = officerNavigationGroups.flatMap((g) => g.items);

/**
 * Retrieve navigation configuration tailored for the authenticated role.
 * @param {string} role - 'ADMIN' or 'OFFICER'
 */
export function getNavigationForRole(role) {
  const normalizedRole = role?.toUpperCase();
  if (normalizedRole === 'ADMIN') {
    return {
      role: 'ADMIN',
      section: 'ADMIN CONSOLE',
      subtitle: 'URBAN INTELLIGENCE',
      groups: adminNavigationGroups,
      items: adminNavigation,
    };
  }

  return {
    role: 'OFFICER',
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
