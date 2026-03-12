import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useFairnessReport = (locationId) => {
  return useQuery({
    queryKey: ['fairness', locationId],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/fairness?locationId=${locationId}`);
      return data.report || [];
    },
    enabled: !!locationId,
  });
};

export const useOvertimeReport = (locationId) => {
  return useQuery({
    queryKey: ['overtime', locationId],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/overtime?locationId=${locationId}`);
      return data || { overtimeStaff: [], totalWeeklyHours: {} };
    },
    enabled: !!locationId,
  });
};
