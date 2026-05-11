import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  dashboardQueryKeys,
  killPort,
  killProcess,
  previewPortStop,
  previewProcessStop
} from '../api/client';

export function useKillPortMutation(controlPassword) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (portRequest) => {
      const request = typeof portRequest === 'object' ? portRequest : { port: portRequest };
      return killPort({ ...request, controlPassword });
    },
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

export function usePreviewPortStopMutation(controlPassword) {
  return useMutation({
    mutationFn: (portRequest) => {
      const request = typeof portRequest === 'object' ? portRequest : { port: portRequest };
      return previewPortStop({ ...request, controlPassword });
    }
  });
}

export function usePreviewProcessStopMutation(controlPassword) {
  return useMutation({
    mutationFn: (pid) => previewProcessStop({ pid, controlPassword })
  });
}
