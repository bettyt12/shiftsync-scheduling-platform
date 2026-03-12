import React, { useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import { useUsers, useUpdateUser } from '../hooks/useUsers';
import { useSkills } from '../hooks/useSkills';
import { useLocations } from '../hooks/useLocations';
import Card from '../components/Card';
import Loader from '../components/Loader';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { Edit2, Shield, MapPin, Award } from 'lucide-react';

const StaffManagement = () => {
  const { data: users, isLoading: loadingUsers } = useUsers();
  const { data: skills } = useSkills();
  const { data: locations } = useLocations();
  const updateUser = useUpdateUser();
  const { addToast } = useToast();

  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    desiredHoursPerWeek: 40,
    skillIds: [],
    locationIds: []
  });

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      role: user.role,
      desiredHoursPerWeek: user.desiredHoursPerWeek || 40,
      skillIds: user.skills.map(s => s.skillId),
      locationIds: user.locations.map(l => l.locationId)
    });
  };

  const handleToggleSkill = (skillId) => {
    setFormData(prev => ({
      ...prev,
      skillIds: prev.skillIds.includes(skillId)
        ? prev.skillIds.filter(id => id !== skillId)
        : [...prev.skillIds, skillId]
    }));
  };

  const handleToggleLocation = (locationId) => {
    setFormData(prev => ({
      ...prev,
      locationIds: prev.locationIds.includes(locationId)
        ? prev.locationIds.filter(id => id !== locationId)
        : [...prev.locationIds, locationId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateUser.mutateAsync({
        id: editingUser.id,
        ...formData
      });
      setEditingUser(null);
      addToast('User updated successfully', 'success');
    } catch (err) {
      addToast('Failed to update user', 'error');
    }
  };

  if (loadingUsers) return <Loader className="mt-8" />;

  return (
    <div className="staff-management-page">
      <div className="page-header">
        <div className="header-content">
          <h2>Staff Management</h2>
          <p className="text-muted">Manage employee roles, certifications, and skills across all locations.</p>
        </div>
      </div>

      <div className="staff-grid">
        <Card>
          <div className="table-responsive">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Locations</th>
                  <th>Skills</th>
                  <th>Desired Hrs</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users?.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className="user-info-cell">
                        <div className="user-avatar">
                          {user.name.charAt(0)}
                        </div>
                        <div className="user-details">
                          <span className="user-name">{user.name}</span>
                          <span className="user-email">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge variant={user.role === 'ADMIN' ? 'danger' : user.role === 'MANAGER' ? 'info' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td>
                      <div className="tag-list">
                        {user.locations.map(ul => (
                          <span key={ul.id} className="tag-item">
                            <MapPin size={12} /> {ul.location.name}
                          </span>
                        ))}
                        {user.locations.length === 0 && <span className="text-muted small">None</span>}
                      </div>
                    </td>
                    <td>
                      <div className="tag-list">
                        {user.skills.map(us => (
                          <span key={us.id} className="tag-item skill">
                            <Award size={12} /> {us.skill.name}
                          </span>
                        ))}
                        {user.skills.length === 0 && <span className="text-muted small">None</span>}
                      </div>
                    </td>
                    <td>{user.desiredHoursPerWeek || '-' }h</td>
                    <td>
                      <button className="btn-icon-small" onClick={() => handleEdit(user)}>
                        <Edit2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal 
        isOpen={!!editingUser} 
        onClose={() => setEditingUser(null)}
        title={`Edit Staff: ${editingUser?.name}`}
      >
        <form onSubmit={handleSubmit} className="staff-edit-form">
          <div className="form-section">
            <label><Shield size={16} /> Basic Info & Role</label>
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>System Role</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                >
                  <option value="STAFF">Staff</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label>Weekly Goal (Hrs)</label>
                <input 
                  type="number" 
                  value={formData.desiredHoursPerWeek}
                  onChange={e => setFormData({...formData, desiredHoursPerWeek: parseInt(e.target.value)})}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <label><MapPin size={16} /> Location Certifications</label>
            <div className="checkbox-grid">
              {locations?.map(loc => (
                <label key={loc.id} className="checkbox-item">
                  <input 
                    type="checkbox" 
                    checked={formData.locationIds.includes(loc.id)}
                    onChange={() => handleToggleLocation(loc.id)}
                  />
                  <span>{loc.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label><Award size={16} /> Skills & Certifications</label>
            <div className="checkbox-grid">
              {skills?.map(skill => (
                <label key={skill.id} className="checkbox-item">
                  <input 
                    type="checkbox" 
                    checked={formData.skillIds.includes(skill.id)}
                    onChange={() => handleToggleSkill(skill.id)}
                  />
                  <span>{skill.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setEditingUser(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={updateUser.isLoading}>
              {updateUser.isLoading ? 'Saving...' : 'Update Employee'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StaffManagement;
