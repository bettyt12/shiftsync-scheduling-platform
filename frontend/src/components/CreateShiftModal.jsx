import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from './Modal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useLocations } from '../hooks/useLocations';
import { useQuery } from '@tanstack/react-query';

const schema = z.object({
  locationId: z.string().min(1, 'Location is required'),
  requiredSkillId: z.string().min(1, 'Skill is required'),
  startTimeUtc: z.string().min(1, 'Start time is required'),
  endTimeUtc: z.string().min(1, 'End time is required'),
  headcount: z.number().min(1).max(50),
  status: z.enum(['DRAFT', 'PUBLISHED']),
});

const CreateShiftModal = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const { data: locations } = useLocations();
  
  const { data: skills } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data } = await api.get('/skills');
      return data.skills || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/shifts', payload);
      return data.shift;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      onClose();
    },
  });

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      headcount: 1,
      status: 'PUBLISHED'
    }
  });

  const onSubmit = async (data) => {
    try {
      // Ensure ISO format
      const payload = {
        ...data,
        startTimeUtc: new Date(data.startTimeUtc).toISOString(),
        endTimeUtc: new Date(data.endTimeUtc).toISOString(),
      };
      await createMutation.mutateAsync(payload);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create shift');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Shift">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label>Location</label>
          <select {...register('locationId')}>
            <option value="">Select Location...</option>
            {locations?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          {errors.locationId && <span className="error-text">{errors.locationId.message}</span>}
        </div>

        <div className="form-group">
          <label>Required Skill</label>
          <select {...register('requiredSkillId')}>
            <option value="">Select Skill...</option>
            {skills?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {errors.requiredSkillId && <span className="error-text">{errors.requiredSkillId.message}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Start Time</label>
            <input type="datetime-local" {...register('startTimeUtc')} />
            {errors.startTimeUtc && <span className="error-text">{errors.startTimeUtc.message}</span>}
          </div>
          <div className="form-group">
            <label>End Time</label>
            <input type="datetime-local" {...register('endTimeUtc')} />
            {errors.endTimeUtc && <span className="error-text">{errors.endTimeUtc.message}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Headcount</label>
            <input type="number" {...register('headcount', { valueAsNumber: true })} />
            {errors.headcount && <span className="error-text">{errors.headcount.message}</span>}
          </div>
          <div className="form-group">
            <label>Initial Status</label>
            <select {...register('status')}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={createMutation.isLoading}>
            {createMutation.isLoading ? 'Creating...' : 'Create Shift'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateShiftModal;
