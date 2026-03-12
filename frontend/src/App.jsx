import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Coverage from './pages/Coverage';
import AuditLogs from './pages/AuditLogs';
import Availability from './pages/Availability';
import Analytics from './pages/Analytics';

import './App.css';

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route 
          path="/dashboard" 
          element={<Layout><Dashboard /></Layout>} 
        />
        <Route 
          path="/schedule" 
          element={<Layout><Schedule /></Layout>} 
        />
        <Route 
          path="/coverage" 
          element={<Layout><Coverage /></Layout>} 
        />
        <Route 
          path="/audit" 
          element={<Layout><AuditLogs /></Layout>} 
        />
        <Route 
          path="/availability" 
          element={<Layout><Availability /></Layout>} 
        />
        <Route 
          path="/analytics" 
          element={<Layout><Analytics /></Layout>} 
        />
        
        {/* Redirect unknown logged-in routes to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Fallback for unauthenticated or base URL */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
