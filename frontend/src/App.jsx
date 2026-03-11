import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import './App.css';

// Placeholder Pages - We will build these properly later
const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      setError(msg);
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>Login to ShiftSync</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleLogin}>
          <input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
          <button type="submit">Sign In</button>
        </form>
      </div>
    </div>
  );
};

const Dashboard = () => <div className="page-content"><h2>Dashboard</h2><p>Overview of schedules and notifications.</p></div>;
const Schedule = () => <div className="page-content"><h2>Schedule</h2><p>Shift calendar view.</p></div>;

// Global Layout
const Layout = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="layout">
      <header className="navbar">
        <div className="navbar-brand">
          <h1>ShiftSync</h1>
        </div>
        <div className="navbar-actions">
          {user && <span className="user-greeting">Hi, {user.name || user.email}</span>}
          <button onClick={logout} className="btn-logout">Logout</button>
        </div>
      </header>
      <div className="main-wrapper">
        <aside className="sidebar">
          <nav>
            <ul>
              <li><a href="/dashboard">Dashboard</a></li>
              <li><a href="/schedule">Schedule</a></li>
              <li><a href="/coverage">Coverage Board</a></li>
              {user?.role === 'admin' || user?.role === 'owner' ? (
                <li><a href="/audit">Audit Logs</a></li>
              ) : null}
            </ul>
          </nav>
        </aside>
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
};

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
        {/* Redirect unknown logged-in routes to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Fallback for unauthenticated or base URL */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
