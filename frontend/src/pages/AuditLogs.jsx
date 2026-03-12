import React, { useState } from 'react';
import { useAuditLogs } from '../hooks/useAuditLogs';
import Card from '../components/Card';
import Loader from '../components/Loader';
import Badge from '../components/Badge';
import { format, parseISO, subDays } from 'date-fns';
import { Search, Download, Calendar, Filter } from 'lucide-react';

const AuditLogs = () => {
  const [filters, setFilters] = useState({
    from: subDays(new Date(), 7).toISOString(),
    to: new Date().toISOString(),
    entityType: ''
  });

  const { data: logs, isLoading } = useAuditLogs(filters);

  const handleExport = () => {
    const json = JSON.stringify(logs, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
  };

  const entityTypes = ['User', 'Shift', 'CoverageRequest', 'Location', 'Availability'];

  return (
    <div className="audit-logs-page">
      <div className="page-header">
        <div className="header-content">
          <h2>Audit Logs</h2>
          <p className="text-muted">Track all administrative actions and system-wide changes for compliance and accountability.</p>
        </div>
        <button className="btn-secondary" onClick={handleExport} disabled={!logs?.length}>
          <Download size={18} /> Export Results
        </button>
      </div>

      <div className="filters-bar mb-6">
        <Card>
          <div className="filters-grid">
            <div className="filter-group">
              <label><Calendar size={14} /> From Date</label>
              <input 
                type="datetime-local" 
                value={filters.from.slice(0, 16)} 
                onChange={e => setFilters({...filters, from: new Date(e.target.value).toISOString()})}
              />
            </div>
            <div className="filter-group">
              <label><Calendar size={14} /> To Date</label>
              <input 
                type="datetime-local" 
                value={filters.to.slice(0, 16)} 
                onChange={e => setFilters({...filters, to: new Date(e.target.value).toISOString()})}
              />
            </div>
            <div className="filter-group">
              <label><Filter size={14} /> Entity Type</label>
              <select 
                value={filters.entityType} 
                onChange={e => setFilters({...filters, entityType: e.target.value})}
              >
                <option value="">All Entities</option>
                {entityTypes.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
          </div>
        </Card>
      </div>

      <div className="logs-container">
        {isLoading ? (
          <Loader className="mt-8" />
        ) : !logs?.length ? (
          <Card className="text-center py-12">
            <Search className="mx-auto mb-4 text-muted" size={48} />
            <p className="text-muted">No logs found for the selected criteria.</p>
          </Card>
        ) : (
          <div className="log-list">
            {logs.map(log => (
              <div key={log.id} className="log-item-card">
                <div className="log-header">
                  <div className="actor-info">
                    <div className="avatar-small">{(log.actor?.name || 'S').charAt(0)}</div>
                    <div>
                      <span className="actor-name">{log.actor?.name || 'System'}</span>
                      <span className="log-time">{format(parseISO(log.createdAt), 'MMM d, h:mm:ss a')}</span>
                    </div>
                  </div>
                  <Badge variant="info">{log.action}</Badge>
                </div>
                
                <div className="log-body">
                  <div className="entity-path">
                    <span className="entity-type">{log.entityType}</span>
                    <span className="entity-id">ID: {log.entityId.slice(0, 8)}...</span>
                  </div>
                  
                  {log.reason && (
                    <div className="log-reason">
                      <strong>Note:</strong> {log.reason}
                    </div>
                  )}

                  {(log.before || log.after) && (
                    <details className="log-diff">
                      <summary>View Changes</summary>
                      <div className="diff-content">
                        {log.before && (
                          <div className="diff-col">
                            <label>Before</label>
                            <pre>{JSON.stringify(log.before, null, 2)}</pre>
                          </div>
                        )}
                        {log.after && (
                          <div className="diff-col">
                            <label>After</label>
                            <pre>{JSON.stringify(log.after, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
