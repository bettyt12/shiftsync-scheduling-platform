import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { useSocket } from '../hooks/useSocket';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  useSocket(); // Initialize socket connection

  return (
    <div className="layout">
      <header className="navbar">
        <div className="navbar-brand">
          <h1>ShiftSync</h1>
        </div>
        <div className="navbar-actions">
          {user && (
            <>
              <NotificationBell />
              <span className="user-greeting">Hi, {user.name || user.email}</span>
            </>
          )}
          <button onClick={logout} className="btn-logout">Logout</button>
        </div>
      </header>
      <div className="main-wrapper">
        <aside className="sidebar">
          <nav>
            <ul>
              <li>
                <NavLink 
                  to="/dashboard" 
                  className={({ isActive }) => (isActive ? 'active' : '')}
                >
                  Dashboard
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/schedule"
                  className={({ isActive }) => (isActive ? 'active' : '')}
                >
                  Schedule
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/coverage"
                  className={({ isActive }) => (isActive ? 'active' : '')}
                >
                  Coverage Board
                </NavLink>
              </li>
              <li>
                <NavLink 
                  to="/availability"
                  className={({ isActive }) => (isActive ? 'active' : '')}
                >
                  My Availability
                </NavLink>
              </li>
              {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
                <>
                  <li>
                    <NavLink 
                      to="/staff"
                      className={({ isActive }) => (isActive ? 'active' : '')}
                    >
                      Staff Management
                    </NavLink>
                  </li>
                  <li>
                    <NavLink 
                      to="/analytics"
                      className={({ isActive }) => (isActive ? 'active' : '')}
                    >
                      Analytics
                    </NavLink>
                  </li>
                  <li>
                    <NavLink 
                      to="/audit"
                      className={({ isActive }) => (isActive ? 'active' : '')}
                    >
                      Audit Logs
                    </NavLink>
                  </li>
                </>
              )}
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

export default Layout;
