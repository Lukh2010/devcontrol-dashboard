import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  networkInfoQueryOptions,
  portsQueryOptions,
  processesQueryOptions,
  systemAdminQueryOptions,
  systemInfoQueryOptions,
  systemPerformanceQueryOptions
} from '../api/client';

export function useDashboardLiveData() {
  const systemInfoQuery = useQuery(systemInfoQueryOptions());
  const systemPerformanceQuery = useQuery(systemPerformanceQueryOptions());
  const systemAdminQuery = useQuery(systemAdminQueryOptions());
  const processesQuery = useQuery(processesQueryOptions());
  const portsQuery = useQuery(portsQueryOptions());
  const networkInfoQuery = useQuery(networkInfoQueryOptions());

  const refreshSystem = useCallback(async () => {
    await Promise.allSettled([
      systemInfoQuery.refetch(),
      systemPerformanceQuery.refetch(),
      systemAdminQuery.refetch()
    ]);
  }, [systemAdminQuery, systemInfoQuery, systemPerformanceQuery]);

  const refreshProcesses = useCallback(async () => {
    const result = await processesQuery.refetch();
    return result.data ?? [];
  }, [processesQuery]);

  const refreshPorts = useCallback(async () => {
    const result = await portsQuery.refetch();
    return result.data ?? [];
  }, [portsQuery]);

  const refreshNetwork = useCallback(async () => {
    const result = await networkInfoQuery.refetch();
    return result.data ?? null;
  }, [networkInfoQuery]);

  return {
    systemInfo: systemInfoQuery.data ?? null,
    performanceData: systemPerformanceQuery.data ?? null,
    isAdmin: systemAdminQuery.data?.is_admin ?? false,
    processes: processesQuery.data ?? [],
    ports: portsQuery.data ?? [],
    networkInfo: networkInfoQuery.data ?? null,
    systemLoading: systemInfoQuery.isLoading || systemPerformanceQuery.isLoading,
    processesLoading: processesQuery.isLoading,
    processesFetching: processesQuery.isFetching,
    processesUpdatedAt: processesQuery.dataUpdatedAt,
    portsLoading: portsQuery.isLoading,
    portsFetching: portsQuery.isFetching,
    portsUpdatedAt: portsQuery.dataUpdatedAt,
    networkLoading: networkInfoQuery.isLoading,
    networkUpdatedAt: networkInfoQuery.dataUpdatedAt,
    refreshSystem,
    refreshProcesses,
    refreshPorts,
    refreshNetwork
  };
}
