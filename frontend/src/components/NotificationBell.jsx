import React, { useState, useRef, useEffect } from 'react';
import { useNotifications, useMarkAsRead } from '../hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Badge from './Badge';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const dropdownRef = useRef(null);

  const unreadCount = notifications?.filter(n => n.status === 'UNREAD').length || 0;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await markAsRead.mutateAsync(id);
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  // navigate to the full notifications page
  const navigate = useNavigate();
  const handleViewAll = () => {
    setIsOpen(false);
    navigate('/notifications');
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button className="bell-trigger" onClick={handleToggle}>
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="unread-dot">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="dropdown-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && <span className="unread-count">{unreadCount} New</span>}
          </div>

          <div className="dropdown-content">
            {isLoading ? (
              <div className="p-4 text-center">Loading...</div>
            ) : !notifications?.length ? (
              <div className="p-8 text-center text-muted">No notifications yet.</div>
            ) : (
              notifications.map(n => (
                <div 
                  key={n.id} 
                  className={`notification-item ${n.status === 'UNREAD' ? 'unread' : ''}`}
                >
                  <div className="item-content">
                    <p className="message">{n.payload?.message || n.type}</p>
                    <span className="time">
                      <Clock size={12} /> {format(parseISO(n.createdAt), 'MMM d, p')}
                    </span>
                  </div>
                  {n.status === 'UNREAD' && (
                    <button 
                      className="mark-read-btn" 
                      onClick={(e) => handleMarkRead(n.id, e)}
                      title="Mark as read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
          
          <div className="dropdown-footer">
            <button className="view-all-btn" onClick={handleViewAll}>View All</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
