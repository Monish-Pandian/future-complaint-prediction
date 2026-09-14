import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

// Admin Pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import Predictions from './pages/admin/Predictions';
import PredictionDetails from './pages/admin/PredictionDetails';
import Heatmap from './pages/admin/Heatmap';
import AssignmentsPage from './pages/admin/AssignmentsPage';
import VerificationPage from './pages/admin/VerificationPage';
import VerificationCandidatesPage from './pages/admin/VerificationCandidatesPage';
import AiEvaluation from './pages/admin/AiEvaluation';
import OfficersManagementPage from './pages/admin/OfficersManagementPage';
import Analytics from './pages/admin/Analytics';
import OfficerPerformance from './pages/admin/OfficerPerformance';
import OfficerPerformanceDetails from './pages/admin/OfficerPerformanceDetails';
import SystemPage from './pages/admin/SystemPage';

// Officer Pages
import OfficerDashboardPage from './pages/officer/OfficerDashboardPage';
import AssignedComplaintsPage from './pages/officer/AssignedComplaintsPage';
import OfficerVerificationPage from './pages/officer/OfficerVerificationPage';
import OfficerHistoryPage from './pages/officer/OfficerHistoryPage';
import DepartmentHeatmapPage from './pages/officer/DepartmentHeatmapPage';

// Shared Common Pages
import ProfilePage from './pages/common/ProfilePage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Landing & Login */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />

            {/* Admin Operational Routes */}
            <Route
              element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<AdminDashboardPage />} />
              <Route path="/predictions" element={<Predictions />} />
              <Route path="/predictions/:id" element={<PredictionDetails />} />
              <Route path="/risk-map" element={<Heatmap />} />
              <Route path="/heatmap" element={<Heatmap />} />
              <Route path="/assignments" element={<AssignmentsPage />} />
              <Route path="/verification" element={<VerificationPage />} />
              <Route path="/verification/candidates" element={<VerificationCandidatesPage />} />
              <Route path="/evaluations" element={<AiEvaluation />} />
              <Route path="/evaluation" element={<AiEvaluation />} />
              <Route path="/officers" element={<OfficersManagementPage />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/officer-performance" element={<OfficerPerformance />} />
              <Route path="/officer-performance/:id" element={<OfficerPerformanceDetails />} />
              <Route path="/system" element={<SystemPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Officer Operational Routes */}
            <Route
              element={
                <ProtectedRoute allowedRoles={['OFFICER']}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/officer" element={<OfficerDashboardPage />} />
              <Route path="/officer/dashboard" element={<OfficerDashboardPage />} />
              <Route path="/officer/assignments" element={<AssignedComplaintsPage />} />
              <Route path="/officer/complaints" element={<AssignedComplaintsPage />} />
              <Route path="/officer/verification" element={<OfficerVerificationPage />} />
              <Route path="/officer/history" element={<OfficerHistoryPage />} />
              <Route path="/officer/profile" element={<ProfilePage />} />
              <Route path="/officer/heatmap" element={<DepartmentHeatmapPage />} />
            </Route>

            {/* Wildcard Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
