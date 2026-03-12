import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useAvailability = () => {
  return useQuery({
    queryKey: ['availability'],
    queryFn: async () => {
      const { data } = await api.get('/availability');
      return data.availability || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useAddRecurringAvailability = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/availability/recurring', payload);
      return data.entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
};

export const useDeleteAvailability = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/availability/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
};
