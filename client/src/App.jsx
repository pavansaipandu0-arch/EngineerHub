import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import LandingPage from './pages/LandingPage.jsx';
import SessionsPage from './pages/SessionsPage.jsx';
import VerifyEmailPage from './pages/VerifyEmailPage.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import WorkspaceLayout, { FeatureGate } from './components/WorkspaceLayout.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import CommunityPage from './pages/CommunityPage.jsx';
import QuestionsPage, { QuestionDetailPage } from './pages/QuestionsPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import ProjectDetailPage from './pages/ProjectDetailPage.jsx';
import ResourcesPage from './pages/ResourcesPage.jsx';
import { EngineerDirectoryPage, NotificationsPage } from './pages/PeopleNotificationsPage.jsx';
import AdminModerationPage from './pages/AdminModerationPage.jsx';
import EngineeringToolsPage from './pages/EngineeringToolsPage.jsx';
import { getUserHomePath, isStudentUser } from './utils/authRouting.js';

function ProtectedRoute({ children, adminOnly = false, studentOnly = false }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin')
    return <Navigate to={getUserHomePath(user)} replace />;
  if (studentOnly && !isStudentUser(user)) {
    return <Navigate to={getUserHomePath(user)} replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<AuthPage />} />
      <Route path="/reset-password" element={<AuthPage />} />
      <Route
        path="/workspace"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student-dashboard"
        element={
          <ProtectedRoute studentOnly>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions"
        element={
          <ProtectedRoute>
            <SessionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute>
            <WorkspaceLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/profile"
          element={
            <FeatureGate feature="engineer-profiles">
              <ProfilePage />
            </FeatureGate>
          }
        />
        <Route
          path="/engineers"
          element={
            <FeatureGate feature="engineer-profiles">
              <EngineerDirectoryPage />
            </FeatureGate>
          }
        />
        <Route
          path="/engineers/:userId"
          element={
            <FeatureGate feature="engineer-profiles">
              <ProfilePage />
            </FeatureGate>
          }
        />
        <Route
          path="/community"
          element={
            <FeatureGate feature="community-hub">
              <CommunityPage />
            </FeatureGate>
          }
        />
        <Route
          path="/questions"
          element={
            <FeatureGate feature="question-board">
              <QuestionsPage />
            </FeatureGate>
          }
        />
        <Route
          path="/questions/:questionId"
          element={
            <FeatureGate feature="question-board">
              <QuestionDetailPage />
            </FeatureGate>
          }
        />
        <Route
          path="/projects"
          element={
            <FeatureGate feature="project-studio">
              <ProjectsPage />
            </FeatureGate>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <FeatureGate feature="project-studio">
              <ProjectDetailPage />
            </FeatureGate>
          }
        />
        <Route
          path="/library"
          element={
            <FeatureGate feature="engineering-library">
              <ResourcesPage />
            </FeatureGate>
          }
        />
        <Route
          path="/tools"
          element={
            <FeatureGate feature="engineering-tools">
              <EngineeringToolsPage />
            </FeatureGate>
          }
        />
        <Route path="/jobs" element={<FeatureGate feature="jobs-internships" />} />
        <Route path="/learning" element={<FeatureGate feature="learning-center" />} />
        <Route path="/events" element={<FeatureGate feature="events-hackathons" />} />
        <Route path="/research" element={<FeatureGate feature="research-hub" />} />
        <Route path="/messages" element={<FeatureGate feature="messaging" />} />
        <Route path="/assistant" element={<FeatureGate feature="ai-assistant" />} />
        <Route path="/quizzes" element={<FeatureGate feature="quiz-system" />} />
        <Route path="/showcase" element={<FeatureGate feature="project-showcase" />} />
        <Route
          path="/notifications"
          element={
            <FeatureGate feature="notifications">
              <NotificationsPage />
            </FeatureGate>
          }
        />
        <Route
          path="/admin/moderation"
          element={
            <ProtectedRoute adminOnly>
              <AdminModerationPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <Dashboard initialAdmin />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
