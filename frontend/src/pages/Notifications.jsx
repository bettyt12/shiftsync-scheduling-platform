import React from 'react';
import { useNotifications, useMarkAsRead } from '../hooks/useNotifications';
import Loader from '../components/Loader';
import Card from '../components/Card';
import { format, parseISO } from 'date-fns';
import { Clock, Check } from 'lucide-react';

const Notifications = () => {
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();

  const handleMarkRead = async (id) => {
    try {
      await markAsRead.mutateAsync(id);
    } catch (err) {
      console.error('failed to mark notification read', err);
    }
  };

  return (
    <div className="notifications-page">
      <div className="page-header">
        <h2>All Notifications</h2>
      </div>

      {isLoading ? (
        <Loader className="mt-8" />
      ) : !notifications?.length ? (
        <Card className="text-center py-12">
          <p className="text-muted">You have no notifications.</p>
        </Card>
      ) : (
        <div className="notifications-list">
          {notifications.map(n => (
            <Card
              key={n.id}
              className={`notification-item ${n.status === 'UNREAD' ? 'unread' : ''}`}
            >
              <div className="notification-body">
                <p className="message">{n.payload?.message || n.type}</p>
                <span className="time">
                  <Clock size={14} /> {format(parseISO(n.createdAt), 'MMM d, p')}
                </span>
              </div>
              {n.status === 'UNREAD' && (
                <button
                  className="btn-icon mark-read-btn"
                  onClick={() => handleMarkRead(n.id)}
                  title="Mark as read"
                >
                  <Check size={16} />
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
