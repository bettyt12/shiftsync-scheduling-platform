import React, { useState } from 'react';
import { useFairnessReport, useOvertimeReport } from '../hooks/useAnalytics';
import { useLocations } from '../hooks/useLocations';
import Card from '../components/Card';
import Loader from '../components/Loader';
import Badge from '../components/Badge';

const Analytics = () => {
  const { data: locations } = useLocations();
  const [selectedLocation, setSelectedLocation] = useState('');
  
  const { data: fairness, isLoading: loadingFairness } = useFairnessReport(selectedLocation);
  const { data: overtime, isLoading: loadingOvertime } = useOvertimeReport(selectedLocation);

  const handleLocationChange = (e) => setSelectedLocation(e.target.value);

  return (
    <div className="analytics-page">
      <div className="page-header">
        <h2>Analytics & Reports</h2>
        <select 
          className="location-select" 
          value={selectedLocation} 
          onChange={handleLocationChange}
        >
          <option value="">Select Location...</option>
          {locations?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {!selectedLocation ? (
        <p className="no-data">Please select a location to view reports.</p>
      ) : (
        <div className="analytics-grid">
          <Card title="Staff Fairness Report">
            {loadingFairness ? <Loader /> : (
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Hours Worked</th>
                    <th>Desired</th>
                    <th>Premium Shifts</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {fairness?.map(row => (
                    <tr key={row.userId}>
                      <td>{row.name}</td>
                      <td>{row.totalHours}h</td>
                      <td>{row.desiredHours}h</td>
                      <td>{row.premiumShifts}</td>
                      <td>
                        <Badge variant={row.fairnessScore > 80 ? 'success' : row.fairnessScore > 50 ? 'info' : 'warning'}>
                          {Math.round(row.fairnessScore)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="Overtime Alerts (Current Week)">
            {loadingOvertime ? <Loader /> : (
              <div className="overtime-list">
                {overtime?.overtimeStaff?.length === 0 ? (
                  <p className="text-muted">No staff currently in overtime.</p>
                ) : (
                  overtime?.overtimeStaff?.map(staff => (
                    <div key={staff.userId} className="overtime-item">
                      <div className="staff-info">
                        <strong>{staff.name}</strong>
                        <span className="text-danger">{staff.hours} hours projected</span>
                      </div>
                      <Badge variant="danger">Overtime</Badge>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default Analytics;
