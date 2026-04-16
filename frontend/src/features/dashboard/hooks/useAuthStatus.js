import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createAuthSession,
  dashboardQueryKeys,
  deleteAuthSession,
  fetchAuthStatus,
  validatePassword
} from '../api/client';

export function useAuthStatus() {
  return useQuery({
    queryKey: dashboardQueryKeys.authStatus,
    queryFn: fetchAuthStatus
  });
}

export function usePasswordValidation(password, enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.validatePassword(password),
    queryFn: () => validatePassword(password),
    enabled: enabled && Boolean(password),
    staleTime: 0,
    retry: false
  });
}

export function useCreateAuthSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAuthSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.authStatus });
    }
  });
}

export function useDeleteAuthSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAuthSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.authStatus });
    }
  });
}
