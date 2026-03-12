import React, { useState } from 'react';
import { useAvailability, useAddRecurringAvailability, useDeleteAvailability } from '../hooks/useAvailability';
import Card from '../components/Card';
import Loader from '../components/Loader';
import { Trash2, Plus } from 'lucide-react';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const Availability = () => {
  const { data: availability, isLoading } = useAvailability();
  const addMutation = useAddRecurringAvailability();
  const deleteMutation = useDeleteAvailability();

  const [newEntry, setNewEntry] = useState({
    dayOfWeek: 1,
    startMinute: 540, // 9:00 AM
    endMinute: 1020,  // 5:00 PM
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await addMutation.mutateAsync(newEntry);
    } catch (err) {
      alert('Failed to add availability');
    }
  };

  const minutesToTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
  };

  if (isLoading) return <Loader className="mt-8" />;

  const recurring = availability?.filter(a => a.kind === 'RECURRING') || [];

  return (
    <div className="availability-page">
      <div className="page-header">
        <h2>My Availability</h2>
      </div>

      <div className="availability-layout">
        <section className="availability-list">
          <h3>Recurring Availability</h3>
          <p className="text-muted">When are you generally available to work each week?</p>
          
          <div className="availability-grid">
            {recurring.length === 0 ? (
              <p className="no-data">No recurring availability set.</p>
            ) : (
              recurring.map(entry => (
                <div key={entry.id} className="availability-item">
                  <div className="entry-info">
                    <strong>{DAYS[entry.dayOfWeek]}</strong>
                    <span>{minutesToTime(entry.startMinute)} - {minutesToTime(entry.endMinute)}</span>
                  </div>
                  <button 
                    className="btn-icon"
                    onClick={() => deleteMutation.mutate(entry.id)}
                    disabled={deleteMutation.isLoading}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="availability-form">
          <Card title="Add Regular Availability">
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label>Day of Week</label>
                <select 
                  value={newEntry.dayOfWeek}
                  onChange={e => setNewEntry({...newEntry, dayOfWeek: parseInt(e.target.value)})}
                >
                  {DAYS.map((day, i) => <option key={day} value={i}>{day}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Time (minutes from midnight)</label>
                  <input 
                    type="number" 
                    value={newEntry.startMinute}
                    onChange={e => setNewEntry({...newEntry, startMinute: parseInt(e.target.value)})}
                  />
                  <small>{minutesToTime(newEntry.startMinute)}</small>
                </div>
                <div className="form-group">
                  <label>End Time (minutes from midnight)</label>
                  <input 
                    type="number" 
                    value={newEntry.endMinute}
                    onChange={e => setNewEntry({...newEntry, endMinute: parseInt(e.target.value)})}
                  />
                  <small>{minutesToTime(newEntry.endMinute)}</small>
                </div>
              </div>
              <button 
                type="submit" 
                className="btn-primary w-full" 
                disabled={addMutation.isLoading}
              >
                <Plus size={18} /> Add Entry
              </button>
            </form>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default Availability;
