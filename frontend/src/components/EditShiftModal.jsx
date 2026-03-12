import React, { useState } from 'react';
import Modal from './Modal';
import { useUpdateShift, useEligibleStaff, useAssignStaff, useUnassignStaff } from '../hooks/useShifts';
import { useSkills } from '../hooks/useSkills';
import { useToast } from '../context/ToastContext.jsx';
import { format, parseISO } from 'date-fns';
import Badge from './Badge';
import { UserPlus, UserMinus, AlertTriangle, CheckCircle } from 'lucide-react';

const EditShiftModal = ({ isOpen, onClose, shift }) => {
  const updateShift = useUpdateShift();
  const assignStaff = useAssignStaff();
  const unassignStaff = useUnassignStaff();
  const { data: skills } = useSkills();
  const { data: eligibleStaff, isLoading: loadingEligible } = useEligibleStaff(shift?.id, {
    enabled: !!shift?.id && isOpen
  });
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    requiredSkillId: shift?.requiredSkillId || '',
    headcount: shift?.headcount || 1,
    status: shift?.status || 'DRAFT',
    startTimeUtc: shift?.startTimeUtc ? shift.startTimeUtc.slice(0, 16) : '',
    endTimeUtc: shift?.endTimeUtc ? shift.endTimeUtc.slice(0, 16) : '',
  });

  // Reset form when shift changes
  React.useEffect(() => {
    if (shift) {
      setFormData({
        requiredSkillId: shift.requiredSkillId,
        headcount: shift.headcount,
        status: shift.status,
        startTimeUtc: new Date(shift.startTimeUtc).toISOString().slice(0, 16),
        endTimeUtc: new Date(shift.endTimeUtc).toISOString().slice(0, 16),
      });
    }
  }, [shift]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await updateShift.mutateAsync({
        id: shift.id,
        ...formData,
        startTimeUtc: new Date(formData.startTimeUtc).toISOString(),
        endTimeUtc: new Date(formData.endTimeUtc).toISOString(),
      });
      addToast('Shift updated', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update shift', 'error');
    }
  };

  const handleAssign = async (userId, force = false) => {
    try {
      await assignStaff.mutateAsync({ shiftId: shift.id, userId, force });
    } catch (err) {
      if (err.response?.status === 409) {
        const result = err.response.data;
        const msg = result.warnings.join('\n');
        if (window.confirm(`${result.message}\n\nWarnings:\n${msg}\n\nForce assignment anyway?`)) {
          handleAssign(userId, true);
        }
      } else {
          addToast(err.response?.data?.message || 'Failed to assign', 'error');
      }
    }
  };

  const handleUnassign = async (userId) => {
    if (window.confirm('Remove this person from the shift?')) {
      try {
        await unassignStaff.mutateAsync({ shiftId: shift.id, userId });
        addToast('Unassigned staff', 'success');
      } catch (err) {
        addToast('Failed to unassign', 'error');
      }
    }
  };

  if (!shift) return null;

  const currentAssignments = shift.assignments || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Modify Shift & Assignments">
      <div className="edit-shift-layout">
        <section className="shift-details-section">
          <h4>Shift Information</h4>
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label>Required Skill</label>
              <select 
                value={formData.requiredSkillId} 
                onChange={e => setFormData({...formData, requiredSkillId: e.target.value})}
              >
                {skills?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div className="form-group">
                <label>Headcount Needed</label>
                <input 
                  type="number" 
                  value={formData.headcount} 
                  onChange={e => setFormData({...formData, headcount: parseInt(e.target.value)})}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Start Time</label>
                <input 
                  type="datetime-local" 
                  value={formData.startTimeUtc} 
                  onChange={e => setFormData({...formData, startTimeUtc: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>End Time</label>
                <input 
                  type="datetime-local" 
                  value={formData.endTimeUtc} 
                  onChange={e => setFormData({...formData, endTimeUtc: e.target.value})}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={updateShift.isLoading}>
              Update Basic Details
            </button>
          </form>
        </section>

        <section className="staffing-section">
          <div className="section-header">
            <h4>Staff Assignments</h4>
            <Badge variant={currentAssignments.length >= shift.headcount ? 'success' : 'warning'}>
              {currentAssignments.length} / {shift.headcount} Staffed
            </Badge>
          </div>

          <div className="current-staff-list">
            {currentAssignments.map(a => (
              <div key={a.id} className="staff-assignment-item">
                <span>{a.user.name}</span>
                <button className="btn-unassign" onClick={() => handleUnassign(a.userId)}>
                  <UserMinus size={14} /> Remove
                </button>
              </div>
            ))}
          </div>

          <hr className="divider" />

          <h4>Available & Eligible Staff</h4>
          <div className="eligible-staff-list">
            {loadingEligible ? <p>Loading candidates...</p> : (
              eligibleStaff?.map(item => {
                const isAssigned = currentAssignments.some(a => a.userId === item.user.id);
                if (isAssigned) return null;

                return (
                  <div key={item.user.id} className={`eligible-item ${!item.eligible ? 'has-warnings' : ''}`}>
                    <div className="item-info">
                      <span className="staff-name">{item.user.name}</span>
                      {!item.hasRequiredSkill && <Badge variant="warning">Missing Skill</Badge>}
                      {!item.eligible && (
                        <div className="warnings-tooltip">
                          <AlertTriangle size={12} />
                          <small>{item.warnings[0]}</small>
                        </div>
                      )}
                    </div>
                    <button 
                      className={`btn-assign ${item.eligible ? 'v-ok' : 'v-warn'}`}
                      onClick={() => handleAssign(item.user.id)}
                    >
                      <UserPlus size={14} /> Assign
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </Modal>
  );
};

export default EditShiftModal;
