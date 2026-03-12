import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useAuditLogs = (filters) => {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.from) params.append('from', filters.from);
      if (filters?.to) params.append('to', filters.to);
      if (filters?.entityType) params.append('entityType', filters.entityType);

      const { data } = await api.get(`/audit/export?${params.toString()}`);
      return data.logs;
    }
  });
};
