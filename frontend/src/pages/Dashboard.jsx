import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Loader from '../components/Loader';
import { useLocations } from '../hooks/useLocations';
import { useShifts } from '../hooks/useShifts';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

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
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Quick Actions">
          <div className="quick-actions">
            <Link to="/schedule" className="btn-primary">View Full Schedule</Link>
            <Link to="/coverage" className="btn-secondary">Request Coverage</Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
