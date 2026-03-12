import React from 'react';
import { useCoverageRequests, useAcceptCoverage, useApproveCoverage } from '../hooks/useCoverage';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { format, parseISO } from 'date-fns';

const Coverage = () => {
  const { user } = useAuth();
  const { data: requests, isLoading } = useCoverageRequests();
  const acceptMutation = useAcceptCoverage();
  const approveMutation = useApproveCoverage();

  const handleAccept = async (id) => {
    if (window.confirm('Are you sure you want to claim this shift?')) {
      try {
        await acceptMutation.mutateAsync(id);
        alert('Shift claimed successfully! Awaiting manager approval.');
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to claim shift');
      }
    }
  };

  const handleApprove = async (id) => {
    const reason = window.prompt('Optional: Reason for approval');
    try {
      await approveMutation.mutateAsync({ requestId: id, reason });
      alert('Request approved!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve');
    }
  };

  if (isLoading) return <Loader className="mt-8" />;

  const isManager = user?.role === 'MANAGER' || user?.role === 'ADMIN';

  return (
    <div className="coverage-page">
      <div className="page-header">
        <h2>Coverage Board</h2>
      </div>

      <div className="requests-list">
        {requests?.length === 0 ? (
          <p className="no-data">No active coverage requests.</p>
        ) : (
          requests?.map(req => (
            <Card key={req.id} className="request-card">
              <div className="request-header">
                <div className="request-type">
                  <Badge variant={req.type === 'DROP' ? 'danger' : 'info'}>
                    {req.type}
                  </Badge>
                  <span className="request-date">
                    {format(parseISO(req.shift.startTimeUtc), 'EEE, MMM d')}
                  </span>
                </div>
                <Badge variant={
                  req.status === 'APPROVED' ? 'success' : 
                  req.status === 'REJECTED' ? 'danger' : 
                  'warning'
                }>
                  {req.status.replace('_', ' ')}
                </Badge>
              </div>

              <div className="request-body">
                <div className="shift-info">
                  <p className="time-range">
                    {format(parseISO(req.shift.startTimeUtc), 'p')} - {format(parseISO(req.shift.endTimeUtc), 'p')}
                  </p>
                  <p className="location-name">{req.shift.location.name}</p>
                  <p className="skill-badge">{req.shift.requiredSkill.name}</p>
                </div>

                <div className="user-info">
                  <p><strong>From:</strong> {req.fromUser.name}</p>
                  {req.toUser && <p><strong>To:</strong> {req.toUser.name}</p>}
                  {req.claimedByUser && <p><strong>Claimed By:</strong> {req.claimedByUser.name}</p>}
                </div>
              </div>

              <div className="request-footer">
                {req.status === 'PENDING' && req.fromUserId !== user?.id && (
                  <button 
                    className="btn-primary"
                    onClick={() => handleAccept(req.id)}
                    disabled={acceptMutation.isLoading}
                  >
                    Claim Shift
                  </button>
                )}

                {isManager && req.status === 'PENDING_MANAGER' && (
                  <button 
                    className="btn-success"
                    onClick={() => handleApprove(req.id)}
                    disabled={approveMutation.isLoading}
                  >
                    Approve Request
                  </button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default Coverage;
