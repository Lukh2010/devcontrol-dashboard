import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { dashboardQueryKeys, fetchAuthStatus, validatePassword } from '../api/client';

export function useAuthStatus() {
  return useQuery({
    queryKey: dashboardQueryKeys.authStatus,
    queryFn: fetchAuthStatus
  });
}

export function usePasswordValidation(password, enabled = true) {
  const [debouncedPassword, setDebouncedPassword] = useState(password);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPassword(password);
    }, 600);

    return () => clearTimeout(timer);
  }, [password]);

  return useQuery({
    queryKey: dashboardQueryKeys.validatePassword(debouncedPassword),
    queryFn: () => validatePassword(debouncedPassword),
    enabled: enabled && Boolean(debouncedPassword),
    staleTime: 0
  });
}
