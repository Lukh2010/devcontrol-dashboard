import { useMutation, useQueryClient } from '@tanstack/react-query';

import { dashboardQueryKeys, killPort, killProcess } from '../api/client';

export function useKillPortMutation(controlPassword) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (port) => killPort({ port, controlPassword }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.ports });
    }
  });
}

export function useKillProcessMutation(controlPassword) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pid) => killProcess({ pid, controlPassword }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.processes });
    }
  });
}
