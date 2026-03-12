import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useLocations = () => {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await api.get('/locations');
      return data.locations || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
};
