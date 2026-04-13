import { useQuery } from '@tanstack/react-query';

import { dashboardQueryKeys, fetchAuthStatus, validatePassword } from '../api/client';

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
    staleTime: 0
  });
}
