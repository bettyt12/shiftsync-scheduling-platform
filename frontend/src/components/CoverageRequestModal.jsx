import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from './Modal';
import { useCreateCoverageRequest } from '../hooks/useCoverage';
import { format, parseISO } from 'date-fns';

const schema = z.object({
  type: z.enum(['SWAP', 'DROP']),
  reason: z.string().min(5, 'Please provide a reason (min 5 chars)'),
});

const CoverageRequestModal = ({ isOpen, onClose, shift }) => {
  const createMutation = useCreateCoverageRequest();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'DROP',
      reason: ''
    }
  });

  const onSubmit = async (data) => {
    try {
      await createMutation.mutateAsync({
        shiftId: shift.id,
        type: data.type,
        // reason is not currently in the backend schema but we might want it later
        // or we can use it just for local UX
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
            <option value="SWAP">Swap Shift (Coming soon...)</option>
          </select>
          {errors.type && <span className="error-text">{errors.type.message}</span>}
        </div>

        <div className="form-group">
          <label>Reason for Request</label>
          <textarea 
            {...register('reason')} 
            placeholder="e.g. Family emergency, feeling unwell..."
            rows={3}
          />
          {errors.reason && <span className="error-text">{errors.reason.message}</span>}
        </div>

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
