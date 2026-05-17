import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  healthQueryOptions,
  networkInfoQueryOptions,
  portsQueryOptions,
  processesQueryOptions,
  systemAdminQueryOptions,
  systemInfoQueryOptions,
  systemPerformanceQueryOptions
} from '../api/client';
import { useSettings } from '../context/SettingsContext';

export function useDashboardLiveData() {
  const { refreshIntervalMs } = useSettings();
  const refreshOptions = refreshIntervalMs > 0 ? { refetchInterval: refreshIntervalMs } : {};
  const systemInfoQuery = useQuery({ ...systemInfoQueryOptions(), ...refreshOptions });
  const systemPerformanceQuery = useQuery({ ...systemPerformanceQueryOptions(), ...refreshOptions });
  const systemAdminQuery = useQuery({ ...systemAdminQueryOptions(), ...refreshOptions });
  const healthQuery = useQuery({ ...healthQueryOptions(), ...refreshOptions });
  const processesQuery = useQuery({ ...processesQueryOptions(), ...refreshOptions });
  const portsQuery = useQuery({ ...portsQueryOptions(), ...refreshOptions });
  const networkInfoQuery = useQuery({ ...networkInfoQueryOptions(), ...refreshOptions });

  const refreshSystem = useCallback(async () => {
    await Promise.allSettled([
      systemInfoQuery.refetch(),
      systemPerformanceQuery.refetch(),
      systemAdminQuery.refetch(),
      healthQuery.refetch()
    ]);
  }, [healthQuery, systemAdminQuery, systemInfoQuery, systemPerformanceQuery]);

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
    health: healthQuery.data ?? null,
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
    healthLoading: healthQuery.isLoading,
    networkUpdatedAt: networkInfoQuery.dataUpdatedAt,
    refreshSystem,
    refreshProcesses,
    refreshPorts,
    refreshNetwork
  };
}
