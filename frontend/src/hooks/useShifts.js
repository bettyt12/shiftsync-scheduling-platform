import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useShifts = ({ locationId, from, to }, options = {}) => {
  return useQuery({
    queryKey: ['shifts', { locationId, from, to }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (locationId) params.append('locationId', locationId);
      if (from) params.append('from', from);
      if (to) params.append('to', to);
      
      const { data } = await api.get(`/shifts?${params.toString()}`);
      return data.shifts || [];
    },
    enabled: !!locationId,
    staleTime: 60 * 1000, 
    ...options
  });
};

export const useEligibleStaff = (shiftId, options = {}) => {
  return useQuery({
    queryKey: ['shift-eligible-staff', shiftId],
    queryFn: async () => {
      const { data } = await api.get(`/shifts/${shiftId}/eligible-staff`);
      return data.staff;
    },
    enabled: !!shiftId,
    ...options
  });
};

export const useAssignStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shiftId, userId, force }) => {
      const { data } = await api.post(`/shifts/${shiftId}/assign`, { userId, force });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
};

  // clock in/out mutations for the currently assigned user
  export const useClockIn = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (shiftId) => {
        const { data } = await api.post(`/shifts/${shiftId}/clock-in`);
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['shifts'] });
      },
    });
  };

  export const useClockOut = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (shiftId) => {
        const { data } = await api.post(`/shifts/${shiftId}/clock-out`);
        return data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['shifts'] });
      },
    });
  };

export const useUnassignStaff = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shiftId, userId }) => {
      const { data } = await api.post(`/shifts/${shiftId}/unassign`, { userId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
};

export const useUpdateShift = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.patch(`/shifts/${id}`, payload);
      return data.shift;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
};

export const usePublishShifts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/shifts/bulk-publish', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
};

export const useDeleteShift = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/shifts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
};
