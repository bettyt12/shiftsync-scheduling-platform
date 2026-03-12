import React, { useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import { useLocations } from '../hooks/useLocations';
import { useShifts, usePublishShifts, useDeleteShift, useClockIn, useClockOut } from '../hooks/useShifts';
import Loader from '../components/Loader';
import Badge from '../components/Badge';
import { format, startOfWeek, endOfWeek, addDays, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import CoverageRequestModal from '../components/CoverageRequestModal';
import CreateShiftModal from '../components/CreateShiftModal';
import EditShiftModal from '../components/EditShiftModal';
import { Trash2, Edit3 } from 'lucide-react';

const Schedule = () => {
  const { user } = useAuth();
  const { data: locations, isLoading: loadingLocations } = useLocations();
  const { addToast } = useToast();
  const [selectedLocation, setSelectedLocation] = useState('');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  
  // Mutations
  const publishMutation = usePublishShifts();
  const deleteMutation = useDeleteShift();
  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();

  // Modal states
  const [isCoverageModalOpen, setIsCoverageModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const handleRequestCoverage = (shift) => {
    setSelectedShift(shift);
    setIsCoverageModalOpen(true);
  };

  const handleEditShift = (shift) => {
    setSelectedShift(shift);
    setIsEditModalOpen(true);
  };

  const handlePublish = async () => {
    if (!selectedLocation) {
      addToast('Select a location first', 'error');
      return;
    }
    if (window.confirm('Publish all draft shifts for this week?')) {
      try {
        await publishMutation.mutateAsync({
          locationId: selectedLocation,
          from: startDate.toISOString(),
          to: endDate.toISOString(),
        });
        addToast('Schedule published!', 'success');
      } catch (err) {
        addToast('Failed to publish', 'error');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this shift?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        addToast('Failed to delete shift', 'error');
      }
    }
  };

  const startDate = startOfWeek(currentWeek);
  const endDate = endOfWeek(currentWeek);

  const { data: shifts, isLoading: loadingShifts } = useShifts({
    locationId: selectedLocation,
    from: startDate.toISOString(),
    to: endDate.toISOString(),
  }, {
    enabled: !!selectedLocation
  });

  // Helper to get days of the week
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  if (loadingLocations) return <Loader className="mt-8" />;

  return (
    <div className="schedule-page">
      <div className="page-header">
        <div className="header-title">
          <h2>Weekly Schedule</h2>
          {isAdminOrManager && (
            <div className="manager-actions">
              <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>+ Create</button>
              <button className="btn-secondary" onClick={handlePublish} disabled={publishMutation.isLoading}>
                {publishMutation.isLoading ? 'Publishing...' : 'Publish Week'}
              </button>
            </div>
          )}
        </div>
        
        <div className="header-controls">
          <button className="btn-secondary" onClick={() => setCurrentWeek(addDays(currentWeek, -7))}>Previous</button>
          <span className="current-range">{format(startDate, 'MMM d')} - {format(endDate, 'MMM d')}</span>
          <button className="btn-secondary" onClick={() => setCurrentWeek(addDays(currentWeek, 7))}>Next</button>
          
          <select 
            className="location-select"
            value={selectedLocation} 
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="">Select Location</option>
            {locations?.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="schedule-grid">
        {days.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayShifts = shifts?.filter(s => format(parseISO(s.startTimeUtc), 'yyyy-MM-dd') === dayStr) || [];

          return (
            <div key={dayStr} className="day-column">
              <div className="day-header">
                <span className="day-name">{format(day, 'EEEE')}</span>
                <span className="day-date">{format(day, 'MMM d')}</span>
              </div>
              <div className="day-content">
                {loadingShifts ? (
                  <Loader size={16} />
                ) : dayShifts.length === 0 ? (
                  <div className="no-shifts">Free</div>
                ) : (
                  dayShifts.map(shift => {
                    const isAssignedToMe = shift.assignments?.some(a => a.userId === user?.id);
                    
                    return (
                      <div 
                        key={shift.id} 
                        className={`shift-card ${isAssignedToMe ? 'my-shift' : ''} ${shift.status === 'DRAFT' ? 'is-draft' : ''}`}
                        onClick={() => isAdminOrManager && handleEditShift(shift)}
                      >
                        <div className="shift-header">
                           <Badge variant={shift.status === 'PUBLISHED' ? 'success' : 'warning'}>
                            {shift.status[0]}
                          </Badge>
                          {isAdminOrManager && (
                            <div className="shift-actions">
                              <button 
                                className="btn-icon-small" 
                                onClick={(e) => { e.stopPropagation(); handleDelete(shift.id); }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="shift-time">
                          {format(parseISO(shift.startTimeUtc), 'p')} - {format(parseISO(shift.endTimeUtc), 'p')}
                        </div>
                        <div className="shift-meta">
                          <span className="skill-label">{shift.requiredSkill?.name}</span>
                          <div className="assignee-info">
                            {shift.assignments && shift.assignments.length > 0 ? (
                              <span className="assignee-name">
                                {shift.assignments[0].user.name}
                              </span>
                            ) : (
                              <span className="unassigned-label">Unassigned</span>
                            )}
                          </div>
                        </div>
                          {/* clock in/out button for own assignment */}
                          {isAssignedToMe && user?.role === 'STAFF' && (
                            (() => {
                              const myAssign = shift.assignments.find(a => a.userId === user.id);
                              if (!myAssign) return null;
                              if (!myAssign.clockInTimeUtc) {
                                return (
                                  <button
                                    className="btn-tiny"
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
                                    className="btn-tiny"
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
                        {isAssignedToMe && (
                          <button 
                            className="btn-tiny"
                            onClick={() => handleRequestCoverage(shift)}
                          >
                            Request Coverage
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      <CoverageRequestModal 
        isOpen={isCoverageModalOpen} 
        onClose={() => setIsCoverageModalOpen(false)} 
        shift={selectedShift}
      />

      <CreateShiftModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <EditShiftModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        shift={selectedShift}
      />
    </div>
  );
};



export default Schedule;
