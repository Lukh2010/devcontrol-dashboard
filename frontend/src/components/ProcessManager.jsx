import React, { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Cpu, RefreshCw, Search, Shield, Trash2 } from 'lucide-react';

import { dashboardQueryKeys, fetchProcesses } from '../features/dashboard/api/client';
import { useKillProcessMutation } from '../features/dashboard/hooks/useActionMutations';
import ConfirmDialog from './ConfirmDialog';

function formatMemory(memoryMb) {
  if (memoryMb > 1024) {
    return `${(memoryMb / 1024).toFixed(1)} GB`;
  }

  return `${Math.round(memoryMb)} MB`;
}

function formatUpdatedAt(timestamp) {
  if (!timestamp) {
    return 'Waiting for refresh';
  }

  return new Date(timestamp).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

const ProcessManager = ({
  processes,
  loading,
  isAdmin,
  authUnlocked,
  passwordProtectionEnabled,
  onRefresh,
  onAction
}) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('cpu_desc');
  const [dashboardOnly, setDashboardOnly] = useState(false);
  const [killableOnly, setKillableOnly] = useState(false);
  const [highCpuOnly, setHighCpuOnly] = useState(false);
  const [highMemoryOnly, setHighMemoryOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [pendingProcess, setPendingProcess] = useState(null);

  const deferredSearch = useDeferredValue(search);
  const killProcessMutation = useKillProcessMutation('');

  const queryOptions = useMemo(() => ({
    search: deferredSearch.trim(),
    sort,
    limit: 200,
    dashboard_only: dashboardOnly,
    killable_only: killableOnly
  }), [dashboardOnly, deferredSearch, killableOnly, sort]);

  const processQuery = useQuery({
    queryKey: dashboardQueryKeys.processesList(queryOptions),
    queryFn: () => fetchProcesses(queryOptions),
    placeholderData: processes ?? [],
    staleTime: 5000
  });

  const visibleProcesses = useMemo(() => {
    const source = processQuery.data ?? processes ?? [];

    return source.filter((process) => {
      if (highCpuOnly && process.cpu_percent < 50) {
        return false;
      }

      if (highMemoryOnly && process.memory_mb < 1024) {
        return false;
      }

      if (statusFilter !== 'all' && process.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [highCpuOnly, highMemoryOnly, processQuery.data, processes, statusFilter]);

  const statusOptions = useMemo(() => {
    const statuses = new Set((processQuery.data ?? processes ?? []).map((process) => process.status));
    return ['all', ...statuses];
  }, [processQuery.data, processes]);

  const processSummary = useMemo(() => {
    if (!visibleProcesses.length) {
      return {
        total: 0,
        hottest: 'No data',
        avgCpu: '0.0%'
      };
    }

    const totalCpu = visibleProcesses.reduce((sum, process) => sum + process.cpu_percent, 0);

    return {
      total: visibleProcesses.length,
      hottest: visibleProcesses[0]?.name || 'Unknown',
      avgCpu: `${(totalCpu / visibleProcesses.length).toFixed(1)}%`
    };
  }, [visibleProcesses]);

  const requestKill = (process) => {
    if (passwordProtectionEnabled && !authUnlocked) {
      onAction?.({
        action: 'kill_process',
        status: 'blocked',
        message: 'Unlock control access before killing a process.',
        severity: 'warning',
        entity_type: 'process',
        entity_id: process.pid,
        requires_password: true
      });
      return;
    }

    setPendingProcess(process);
  };

  const confirmKill = async () => {
    if (!pendingProcess) {
      return;
    }

    try {
      await killProcessMutation.mutateAsync(pendingProcess.pid);
      onAction?.({
        action: 'kill_process',
        status: 'success',
        message: `Stop requested for ${pendingProcess.name} (${pendingProcess.pid}).`,
        severity: 'success',
        entity_type: 'process',
        entity_id: pendingProcess.pid
      });
      await Promise.allSettled([processQuery.refetch(), onRefresh?.()]);
    } catch (error) {
      onAction?.({
        action: 'kill_process',
        status: 'failed',
        message: error.message,
        severity: 'danger',
        entity_type: 'process',
        entity_id: pendingProcess.pid,
        retry_after: error.retryAfter ?? null
      });
    } finally {
      setPendingProcess(null);
    }
  };

  const tableLoading = (loading || processQuery.isLoading) && !visibleProcesses.length;

  return (
    <section className="panel">
      <div className="panel-header">
        <div className="panel-title-wrap">
          <span className="panel-icon">
            <Cpu size={18} />
          </span>
          <div>
            <h2 className="panel-title">Processes</h2>
            <p className="panel-subtitle">Search, filter and safely control dashboard-managed processes.</p>
          </div>
        </div>

        <div className="process-toolbar">
          <span className={`status-badge ${isAdmin ? 'status-success' : 'status-warning'}`}>
            {isAdmin ? 'Admin ready' : 'Admin required'}
          </span>
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              void Promise.allSettled([processQuery.refetch(), onRefresh?.()]);
            }}
            disabled={processQuery.isFetching}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div className="panel-body stack">
        <div className="summary-grid">
          <div className="summary-strip">
            <div>
              <div className="summary-label">Visible</div>
              <div className="summary-value">{processSummary.total}</div>
            </div>
            <Shield size={18} />
          </div>
          <div className="summary-strip">
            <div>
              <div className="summary-label">Hottest</div>
              <div className="summary-value clamp-text">{processSummary.hottest}</div>
            </div>
            <Cpu size={18} />
          </div>
          <div className="summary-strip">
            <div>
              <div className="summary-label">Average CPU</div>
              <div className="summary-value">{processSummary.avgCpu}</div>
            </div>
            <RefreshCw size={18} />
          </div>
        </div>

        <div className="table-controls">
          <label className="search-field">
            <Search size={16} />
            <input
              className="input table-search-input"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or PID"
            />
          </label>

          <div className="filter-row">
            <select className="select" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="cpu_desc">Sort by CPU</option>
              <option value="memory_desc">Sort by memory</option>
              <option value="name_asc">Sort by name</option>
              <option value="pid_asc">Sort by PID</option>
              <option value="status_asc">Sort by status</option>
            </select>

            <select className="select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status === 'all' ? 'All status' : status}</option>
              ))}
            </select>
          </div>

          <div className="toggle-row">
            <label className="toggle-chip">
              <input type="checkbox" checked={dashboardOnly} onChange={(event) => setDashboardOnly(event.target.checked)} />
              Dashboard-owned
            </label>
            <label className="toggle-chip">
              <input type="checkbox" checked={killableOnly} onChange={(event) => setKillableOnly(event.target.checked)} />
              Killable only
            </label>
            <label className="toggle-chip">
              <input type="checkbox" checked={highCpuOnly} onChange={(event) => setHighCpuOnly(event.target.checked)} />
              High CPU
            </label>
            <label className="toggle-chip">
              <input type="checkbox" checked={highMemoryOnly} onChange={(event) => setHighMemoryOnly(event.target.checked)} />
              High memory
            </label>
          </div>
        </div>

        <div className="toolbar-meta muted-note">
          {visibleProcesses.length} results • last refresh {formatUpdatedAt(processQuery.dataUpdatedAt)}
        </div>

        {!isAdmin ? (
          <div className="alert warning" aria-live="polite">
            <AlertTriangle size={16} />
            <span>Run the dashboard as Administrator on Windows to stop dashboard-owned processes.</span>
          </div>
        ) : null}

        {tableLoading ? (
          <div className="skeleton-stack" aria-hidden="true">
            <div className="skeleton-line skeleton-line-lg" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
          </div>
        ) : visibleProcesses.length === 0 ? (
          <div className="center-empty">
            <div>
              <p className="metric-reading compact-reading">No matching processes</p>
              <p className="muted-note">Adjust the filters or refresh the live list.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="table-wrap desktop-table">
              <table className="table">
                <thead>
                  <tr>
                    <th>Process</th>
                    <th>PID</th>
                    <th>CPU</th>
                    <th>Memory</th>
                    <th>Status</th>
                    <th>Ownership</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProcesses.map((process) => (
                    <tr key={process.pid}>
                      <td>
                        <div className="process-cell-stack">
                          <strong>{process.name}</strong>
                          <span className="muted-note">{process.kill_reason || 'Ready for inspection'}</span>
                        </div>
                      </td>
                      <td>{process.pid}</td>
                      <td className={process.cpu_percent > 80 ? 'value-danger' : process.cpu_percent > 50 ? 'value-warn' : 'value-good'}>
                        {process.cpu_percent}%
                      </td>
                      <td>{formatMemory(process.memory_mb)}</td>
                      <td><span className="status-pill neutral">{process.status}</span></td>
                      <td>
                        <span className={`status-pill ${process.dashboard_owned ? 'good' : 'warn'}`}>
                          {process.dashboard_owned ? 'Managed' : 'External'}
                        </span>
                      </td>
                      <td>
                        <div className="table-action">
                          <button
                            className="danger-button"
                            type="button"
                            onClick={() => requestKill(process)}
                            disabled={!process.killable || killProcessMutation.isPending}
                            title={process.kill_reason || `Stop process ${process.pid}`}
                          >
                            <Trash2 size={16} />
                            Stop
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mobile-card-list">
              {visibleProcesses.map((process) => (
                <div key={`mobile-${process.pid}`} className="mini-card explorer-card">
                  <div className="explorer-card-top">
                    <div>
                      <div className="action-feed-title">{process.name}</div>
                      <div className="muted-note">PID {process.pid}</div>
                    </div>
                    <span className={`status-badge ${process.killable ? 'status-success' : 'status-warning'}`}>
                      {process.killable ? 'Killable' : 'Blocked'}
                    </span>
                  </div>
                  <div className="explorer-metrics">
                    <span>CPU {process.cpu_percent}%</span>
                    <span>{formatMemory(process.memory_mb)}</span>
                    <span>{process.status}</span>
                  </div>
                  <div className="muted-note wrap-text">{process.kill_reason || 'Dashboard-owned process.'}</div>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => requestKill(process)}
                    disabled={!process.killable || killProcessMutation.isPending}
                  >
                    <Trash2 size={16} />
                    Stop
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingProcess)}
        title={pendingProcess ? `Stop ${pendingProcess.name}?` : 'Stop process'}
        description="Only dashboard-managed processes may be terminated."
        details={pendingProcess ? [
          `PID: ${pendingProcess.pid}`,
          pendingProcess.kill_reason || 'This process is eligible for termination.'
        ] : null}
        confirmLabel={killProcessMutation.isPending ? 'Stopping...' : 'Stop process'}
        onConfirm={() => { void confirmKill(); }}
        onCancel={() => setPendingProcess(null)}
        disabled={killProcessMutation.isPending}
      />
    </section>
  );
};

export default ProcessManager;
