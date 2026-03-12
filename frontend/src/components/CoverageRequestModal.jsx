import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from './Modal';
import { useCreateCoverageRequest } from '../hooks/useCoverage';
import { useUsers } from '../hooks/useUsers';
import { format, parseISO } from 'date-fns';

const schema = z.object({
  type: z.enum(['SWAP', 'DROP']),
  toUserId: z.string().optional(),
  reason: z.string().optional(),
});

const CoverageRequestModal = ({ isOpen, onClose, shift }) => {
  const createMutation = useCreateCoverageRequest();
  const { data: users } = useUsers();

  const { register, handleSubmit, watch, formState: { errors }, reset, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'DROP',
      toUserId: '',
      reason: ''
    }
  });

  const type = watch('type');

  useEffect(() => {
    // Clear swap target when switching back to DROP
    if (type === 'DROP') {
      setValue('toUserId', '');
    }
  }, [type, setValue]);

  const onSubmit = async (data) => {
    try {
      await createMutation.mutateAsync({
        shiftId: shift.id,
        type: data.type,
        toUserId: data.type === 'SWAP' && data.toUserId ? data.toUserId : undefined,
      });
      alert('Coverage request submitted successfully!');
      reset();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit request');
    }
  };

  if (!shift) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Coverage">
      <div className="shift-summary">
        <p><strong>Shift:</strong> {format(parseISO(shift.startTimeUtc), 'eeee, MMM do')}</p>
        <p><strong>Time:</strong> {format(parseISO(shift.startTimeUtc), 'p')} - {format(parseISO(shift.endTimeUtc), 'p')}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label>Request Type</label>
          <select {...register('type')}>
            <option value="DROP">Drop Shift (Open to anyone)</option>
            <option value="SWAP">Swap Shift with specific coworker</option>
          </select>
          {errors.type && <span className="error-text">{errors.type.message}</span>}
        </div>

        {type === 'SWAP' && (
          <div className="form-group">
            <label>Select Coworker to Swap With</label>
            <select {...register('toUserId')}>
              <option value="">Choose coworker...</option>
              {users?.filter(u => u.role === 'STAFF' && u.id !== shift.assignments?.[0]?.userId).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            {errors.toUserId && <span className="error-text">{errors.toUserId.message}</span>}
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={createMutation.isLoading}>
            {createMutation.isLoading ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CoverageRequestModal;
