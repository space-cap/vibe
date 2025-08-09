import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import type { ApiResponse } from '../../types';

export const useApiQuery = <T>(
  key: string[],
  endpoint: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: key,
    queryFn: () => apiService.get<T>(endpoint),
    enabled: options?.enabled,
  });
};

export const useApiMutation = <T, D>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST',
  options?: {
    onSuccess?: (data: ApiResponse<T>) => void;
    onError?: (error: Error) => void;
  }
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: D) => {
      switch (method) {
        case 'POST':
          return apiService.post<T>(endpoint, data);
        case 'PUT':
          return apiService.put<T>(endpoint, data);
        case 'DELETE':
          return apiService.delete<T>(endpoint);
        default:
          return apiService.post<T>(endpoint, data);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      options?.onSuccess?.(data);
    },
    onError: options?.onError,
  });
};
