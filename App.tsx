import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import TemplateList from './components/TemplateList';
import CreateTemplate from './components/CreateTemplate';
import ReportForm from './components/ReportForm';
import Login from './components/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
    const { isAuthenticated } = useAuth();
    
    return (
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
                <TemplateList />
            </ProtectedRoute>
          } />
          
          <Route path="/create" element={
            <ProtectedRoute>
                <CreateTemplate />
            </ProtectedRoute>
          } />
          
          <Route path="/report/:templateId" element={
            <ProtectedRoute>
                <ReportForm />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;