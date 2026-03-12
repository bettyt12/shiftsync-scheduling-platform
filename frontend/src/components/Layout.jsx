import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { useSocket } from '../hooks/useSocket';
import { 
  LayoutDashboard, 
  CalendarDays, 
  ShieldCheck, 
  Clock, 
  Users, 
  BarChart3, 
  FileText, 
  LogOut,
  Waves
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  useSocket();

  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/schedule', label: 'Schedule', icon: CalendarDays },
    { to: '/coverage', label: 'Coverage Board', icon: ShieldCheck },
    { to: '/availability', label: 'My Availability', icon: Clock },
  ];

  const managerItems = [
    { to: '/staff', label: 'Staff Management', icon: Users },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/audit', label: 'Audit Logs', icon: FileText },
  ];

  return (
    <div className="layout">
      <header className="navbar">
        <div className="navbar-brand">
          <Waves size={24} className="brand-icon" />
          <h1>ShiftSync</h1>
        </div>
        <div className="navbar-actions">
          {user && (
            <>
              <NotificationBell />
              <div className="user-pill">
                <div className="user-avatar-nav">{(user.name || user.email)[0].toUpperCase()}</div>
                <span className="user-greeting">{user.name || user.email}</span>
              </div>
            </>
          )}
          <button onClick={logout} className="btn-logout">
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </header>
      <div className="main-wrapper">
        <aside className="sidebar">
          <nav>
            <div className="nav-section-label">Main</div>
            <ul>
              {navItems.map(item => (
                <li key={item.to}>
                  <NavLink 
                    to={item.to}
                    className={({ isActive }) => (isActive ? 'active' : '')}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
            {isManager && (
              <>
                <div className="nav-section-label">Management</div>
                <ul>
                  {managerItems.map(item => (
                    <li key={item.to}>
                      <NavLink 
                        to={item.to}
                        className={({ isActive }) => (isActive ? 'active' : '')}
                      >
                        <item.icon size={18} />
                        <span>{item.label}</span>
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-role-badge">
              {user?.role}
            </div>
          </div>
        </aside>
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
