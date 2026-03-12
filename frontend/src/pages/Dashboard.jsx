import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Loader from '../components/Loader';
import { useLocations } from '../hooks/useLocations';
import { useShifts, useEligibleStaff, useClockIn, useClockOut } from '../hooks/useShifts';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useQuery } from '@tanstack/react-query';

const useOnDuty = (locationId, isEnabled) => {
  return useQuery({
    queryKey: ['on-duty', locationId],
    queryFn: async () => {
      const { data } = await api.get(`/shifts/on-duty?locationId=${locationId}`);
      return data.onDuty;
    },
    enabled: !!locationId && isEnabled,
    refetchInterval: 10000, 
  });
};

const Dashboard = () => {
  const { user } = useAuth();
  const { data: locations, isLoading: loadingLocations } = useLocations();
  const [selectedLocation, setSelectedLocation] = useState('');

  // Default to first location when they load
  useEffect(() => {
    if (locations && locations.length > 0 && !selectedLocation) {
      setSelectedLocation(locations[0].id);
    }
  }, [locations, selectedLocation]);

  const { data: shifts, isLoading: loadingShifts } = useShifts({ 
    locationId: selectedLocation 
  }, { 
    enabled: !!selectedLocation 
  });

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const { data: onDuty, isLoading: loadingOnDuty } = useOnDuty(selectedLocation, isAdminOrManager);

  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();

  if (loadingLocations) {
    return (
      <div className="page-content">
        <h2>Dashboard</h2>
        <Loader className="mt-8" />
      </div>
    );
  }

  // Get upcoming shifts
  const now = new Date();
  let upcomingShifts = shifts 
    ? shifts.filter(s => new Date(s.startTimeUtc) > now)
    : [];

  // If STAFF, only show shifts assigned to them
  if (user?.role === 'STAFF') {
    upcomingShifts = upcomingShifts.filter(s => 
      s.assignments?.some(a => a.userId === user.id)
    );
  }

  upcomingShifts = upcomingShifts.slice(0, 5);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        {locations && locations.length > 0 && (
          <select 
            className="location-select"
            value={selectedLocation} 
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        )}
      </div>

      <div className="dashboard-grid">
        <Card title="Upcoming Shifts">
          {loadingShifts ? (
            <Loader />
          ) : upcomingShifts.length === 0 ? (
            <p className="text-muted">No upcoming shifts assigned.</p>
          ) : (
            <ul className="shift-list">
              {upcomingShifts.map(shift => (
                <li key={shift.id} className="shift-item">
                  <div className="shift-time">
                    <span className="shift-day">{format(parseISO(shift.startTimeUtc), 'EEE, MMM d')}</span>
                    <span className="shift-hours">
                      {format(parseISO(shift.startTimeUtc), 'p')} - {format(parseISO(shift.endTimeUtc), 'p')}
                    </span>
                  </div>
                  <div className="shift-details">
                    <span className="shift-skill">{shift.requiredSkill?.name || 'General'}</span>
                    <Badge variant={shift.status === 'PUBLISHED' ? 'success' : 'warning'}>
                      {shift.status}
                    </Badge>
                  </div>
                  {/* clock controls for staff */}
                  {user?.role === 'STAFF' && (
                    (() => {
                      const myAssign = shift.assignments?.find(a => a.userId === user.id);
                      if (!myAssign) return null;
                      if (!myAssign.clockInTimeUtc) {
                        return (
                          <button
                            className="btn-secondary btn-sm mt-2"
                            onClick={() => clockInMutation.mutate(shift.id)}
                            disabled={clockInMutation.isLoading}
                          >
                            {clockInMutation.isLoading ? '...' : 'Clock In'}
                          </button>
                        );
                      }
                      if (myAssign.clockInTimeUtc && !myAssign.clockOutTimeUtc) {
                        return (
                          <button
                            className="btn-secondary btn-sm mt-2"
                            onClick={() => clockOutMutation.mutate(shift.id)}
                            disabled={clockOutMutation.isLoading}
                          >
                            {clockOutMutation.isLoading ? '...' : 'Clock Out'}
                          </button>
                        );
                      }
                      return null;
                    })()
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {isAdminOrManager && (
          <Card title="Live On-Duty Staff">
            {loadingOnDuty ? (
              <Loader />
            ) : onDuty?.length === 0 ? (
              <p className="text-muted">No one is currently clocked in.</p>
            ) : (
              <ul className="on-duty-list">
                {onDuty?.map(item => (
                  <li key={item.id} className="on-duty-item">
                    <div className="user-info-cell">
                      <div className="user-avatar-small">{item.user.name[0]}</div>
                      <span>{item.user.name}</span>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        <Card title="Quick Actions">
          <div className="quick-actions">
            <Link to="/schedule" className="btn-primary">View Full Schedule</Link>
            <Link to="/coverage" className="btn-secondary">Coverage Board</Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
