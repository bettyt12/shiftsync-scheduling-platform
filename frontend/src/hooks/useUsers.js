import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get('/users');
      return data.users;
    }
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.patch(`/users/${id}`, payload);
      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
};

export const useCoworkers = (locationId) => {
  return useQuery({
    queryKey: ['coworkers', locationId],
    queryFn: async () => {
      if (!locationId) return [];
      const { data } = await api.get(`/users/coworkers?locationId=${locationId}`);
      return data.coworkers;
    },
    enabled: !!locationId
  });
};
