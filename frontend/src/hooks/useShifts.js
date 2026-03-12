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
