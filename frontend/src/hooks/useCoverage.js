import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useCoverageRequests = (params = {}) => {
  return useQuery({
    queryKey: ['coverageRequests', params],
    queryFn: async () => {
      const { data } = await api.get('/coverage/requests', { params });
      return data.requests || [];
    },
    staleTime: 30 * 1000,
  });
};

export const useAcceptCoverage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (requestId) => {
      const { data } = await api.post(`/coverage/requests/${requestId}/accept`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coverageRequests'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
};

export const useApproveCoverage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, reason }) => {
      const { data } = await api.post(`/coverage/requests/${requestId}/approve`, { reason });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coverageRequests'] });
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
};

export const useCreateCoverageRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/coverage/requests', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coverageRequests'] });
    },
  });
};
