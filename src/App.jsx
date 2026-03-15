import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { AppProvider, useApp } from './context/AppContext';
import { Login } from './pages/Login';

const Dashboard = lazy(() =>
  import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })),
);
const MSMEProfile = lazy(() =>
  import('./pages/MSMEProfile').then((module) => ({ default: module.MSMEProfile })),
);
const ComplianceGuidance = lazy(() =>
  import('./pages/ComplianceGuidance').then((module) => ({
    default: module.ComplianceGuidance,
  })),
);
const AlertsDeadlines = lazy(() =>
  import('./pages/AlertsDeadlines').then((module) => ({ default: module.AlertsDeadlines })),
);
const GovtSchemes = lazy(() =>
  import('./pages/GovtSchemes').then((module) => ({ default: module.GovtSchemes })),
);
const LoanRecommendations = lazy(() =>
  import('./pages/LoanRecommendations').then((module) => ({
    default: module.LoanRecommendations,
  })),
);
const AIQueryAssistant = lazy(() =>
  import('./pages/AIQueryAssistant').then((module) => ({
    default: module.AIQueryAssistant,
  })),
);
const DocumentStorage = lazy(() =>
  import('./pages/DocumentStorage').then((module) => ({
    default: module.DocumentStorage,
  })),
);
const Settings = lazy(() =>
  import('./pages/Settings').then((module) => ({ default: module.Settings })),
);

function AppLoader() {
  return (
    <div className="app-loader">
      <div className="app-loader-card card">
        <h1>CompliAssist Workspace</h1>
        <p>Loading your compliance dashboard and backend session.</p>
      </div>
    </div>
  );
}

function ProtectedLayout() {
  const { isReady, isAuthenticated } = useApp();

  if (!isReady) {
    return <AppLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
}

function PublicOnlyLogin() {
  const { isReady, isAuthenticated } = useApp();

  if (!isReady) {
    return <AppLoader />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Login />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<AppLoader />}>
      <Routes>
        <Route path="/login" element={<PublicOnlyLogin />} />
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="profile" element={<MSMEProfile />} />
          <Route path="guidance" element={<ComplianceGuidance />} />
          <Route path="alerts" element={<AlertsDeadlines />} />
          <Route path="schemes" element={<GovtSchemes />} />
          <Route path="loans" element={<LoanRecommendations />} />
          <Route path="assistant" element={<AIQueryAssistant />} />
          <Route path="storage" element={<DocumentStorage />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
