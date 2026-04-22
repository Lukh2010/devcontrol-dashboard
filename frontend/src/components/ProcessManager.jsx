import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronDown, ChevronRight, Cpu, RefreshCw, Search, Shield, Trash2 } from 'lucide-react';

import { dashboardQueryKeys, fetchProcesses } from '../features/dashboard/api/client';
import { useKillProcessMutation } from '../features/dashboard/hooks/useActionMutations';
import {
  buildVisibleProcessTree,
  collectExpandableProcessIds,
  compareProcesses,
  flattenProcessTree
} from '../features/dashboard/lib/processTree';
import ConfirmDialog from './ConfirmDialog';

function formatMemory(memoryMb) {
  const safeMemory = Number(memoryMb ?? 0);

  if (!Number.isFinite(safeMemory) || safeMemory <= 0) {
    return '0 MB';
  }

  if (safeMemory > 1024) {
    return `${(safeMemory / 1024).toFixed(1)} GB`;
  }

  return `${Math.round(safeMemory)} MB`;
}

function formatCpuPercent(cpuPercent) {
  const safeCpu = Number(cpuPercent ?? 0);

  if (!Number.isFinite(safeCpu) || safeCpu <= 0) {
    return '0%';
  }

  if (safeCpu < 0.1) {
    return '<0.1%';
  }

  if (safeCpu < 10) {
    return `${safeCpu.toFixed(1)}%`;
  }

  return `${Math.round(safeCpu)}%`;
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

function formatInventoryLabel(process) {
  if (process.inventory_degraded) {
    return 'Fallback';
  }

  if (process.inventory_source === 'command') {
    return 'Command';
  }

  if (process.inventory_source === 'psutil_fallback') {
    return 'Fallback';
  }

  return 'Unknown';
}

function buildProcessLabel(node) {
  if (!node.children.length) {
    return node.process.name;
  }

  return `${node.process.name} (${node.groupSize})`;
}

function getDisplayedCpuPercent(node, expanded) {
  if (node.children.length && !expanded) {
    return node.aggregateCpuPercent;
  }

  return node.ownCpuPercent ?? node.process.cpu_percent ?? 0;
}

function getDisplayedMemoryMb(node, expanded) {
  if (node.children.length && !expanded) {
    return node.aggregateMemoryMb;
  }

  return node.ownMemoryMb ?? node.process.memory_mb ?? 0;
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [pendingProcess, setPendingProcess] = useState(null);
  const [expandedProcessIds, setExpandedProcessIds] = useState(() => new Set());

  const deferredSearch = useDeferredValue(search);
  const killProcessMutation = useKillProcessMutation('');

  const queryOptions = useMemo(() => ({
    search: deferredSearch.trim(),
    sort,
    limit: 500,
    dashboard_only: dashboardOnly,
    killable_only: killableOnly
  }), [dashboardOnly, deferredSearch, killableOnly, sort]);

  const processQuery = useQuery({
    queryKey: dashboardQueryKeys.processesList(queryOptions),
    queryFn: () => fetchProcesses(queryOptions),
    placeholderData: processes ?? [],
    staleTime: 5000
  });

  const allProcesses = useMemo(
    () => processQuery.data ?? processes ?? [],
    [processQuery.data, processes]
  );
  const matchesLocalFilters = useMemo(() => (process) => {
      if (statusFilter !== 'all' && process.status !== statusFilter) {
        return false;
      }

      return true;
    }, [statusFilter]);

  const matchingProcesses = useMemo(() => (
    allProcesses.filter(matchesLocalFilters)
  ), [allProcesses, matchesLocalFilters]);

  const processTree = useMemo(() => (
    buildVisibleProcessTree(allProcesses, {
      sort,
      filterFn: matchesLocalFilters
    })
  ), [allProcesses, matchesLocalFilters, sort]);

  const autoExpandTree = Boolean(deferredSearch.trim() || statusFilter !== 'all');

  const flatRows = useMemo(() => (
    flattenProcessTree(processTree, expandedProcessIds, autoExpandTree)
  ), [autoExpandTree, expandedProcessIds, processTree]);

  useEffect(() => {
    const validExpandableIds = new Set(collectExpandableProcessIds(processTree));
    setExpandedProcessIds((current) => {
      const next = new Set([...current].filter((pid) => validExpandableIds.has(pid)));
      if (next.size === current.size) {
        return current;
      }
      return next;
    });
  }, [processTree]);

  const statusOptions = useMemo(() => {
    const statuses = new Set(allProcesses.map((process) => process.status));
    return ['all', ...statuses];
  }, [allProcesses]);

  const processSummary = useMemo(() => {
    if (!matchingProcesses.length) {
      return {
        total: 0,
        hottest: 'No data',
        avgCpu: '0.0%',
        source: 'Unknown'
      };
    }

    const totalCpu = matchingProcesses.reduce((sum, process) => sum + process.cpu_percent, 0);
    const hottestProcess = [...matchingProcesses].sort((left, right) => compareProcesses(left, right, sort))[0];

    return {
      total: matchingProcesses.length,
      hottest: hottestProcess?.name || 'Unknown',
      avgCpu: `${(totalCpu / matchingProcesses.length).toFixed(1)}%`,
      source: formatInventoryLabel(hottestProcess || matchingProcesses[0])
    };
  }, [matchingProcesses, sort]);

  const toggleProcessGroup = (pid) => {
    setExpandedProcessIds((current) => {
      const next = new Set(current);
      if (next.has(pid)) {
        next.delete(pid);
      } else {
        next.add(pid);
      }
      return next;
    });
  };

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

  const tableLoading = (loading || processQuery.isLoading) && !flatRows.length;

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
          <div className="summary-strip">
            <div>
              <div className="summary-label">Inventory</div>
              <div className="summary-value">{processSummary.source}</div>
            </div>
            <Shield size={18} />
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
          </div>
        </div>

        <div className="toolbar-meta muted-note">
          {matchingProcesses.length} matching processes • {flatRows.length} rows visible • last refresh {formatUpdatedAt(processQuery.dataUpdatedAt)}
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
        ) : flatRows.length === 0 ? (
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
                  {flatRows.map((node) => {
                    const process = node.process;
                    const expanded = autoExpandTree || expandedProcessIds.has(process.pid);
                    const processLabel = buildProcessLabel(node);
                    const secondaryLine = process.command_line || process.exe_path || process.kill_reason || 'Ready for inspection';
                    const displayedCpuPercent = getDisplayedCpuPercent(node, expanded);
                    const displayedMemoryMb = getDisplayedMemoryMb(node, expanded);
                    const groupTotals = node.children.length
                      ? `Group total ${formatCpuPercent(node.aggregateCpuPercent)} CPU | ${formatMemory(node.aggregateMemoryMb)}`
                      : null;

                    return (
                    <tr key={process.pid}>
                      <td>
                        <div className="process-cell-stack">
                          <div className="process-tree-row" style={{ paddingLeft: `${node.level * 18}px` }}>
                            {node.children.length ? (
                              <button
                                className="process-tree-toggle"
                                type="button"
                                onClick={() => toggleProcessGroup(process.pid)}
                                aria-label={expanded ? `Collapse ${process.name}` : `Expand ${process.name}`}
                              >
                                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                            ) : (
                              <span className="process-tree-spacer" aria-hidden="true" />
                            )}
                            <div className="process-cell-stack">
                              <strong>{processLabel}</strong>
                              <div className="process-chip-row">
                                <span className={`status-pill ${process.inventory_degraded ? 'warn' : 'neutral'}`}>
                                  {formatInventoryLabel(process)}
                                </span>
                                {process.username ? <span className="status-pill neutral">{process.username}</span> : null}
                              </div>
                              {expanded && groupTotals ? (
                                <span className="muted-note wrap-text">{groupTotals}</span>
                              ) : null}
                              <span className="muted-note wrap-text">{secondaryLine}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>{process.pid}</td>
                      <td className={displayedCpuPercent > 80 ? 'value-danger' : displayedCpuPercent > 50 ? 'value-warn' : 'value-good'}>
                        {formatCpuPercent(displayedCpuPercent)}
                      </td>
                      <td>{formatMemory(displayedMemoryMb)}</td>
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
                  );})}
                </tbody>
              </table>
            </div>

            <div className="mobile-card-list">
              {flatRows.map((node) => {
                const process = node.process;
                const expanded = autoExpandTree || expandedProcessIds.has(process.pid);
                const displayedCpuPercent = getDisplayedCpuPercent(node, expanded);
                const displayedMemoryMb = getDisplayedMemoryMb(node, expanded);
                const groupTotals = node.children.length
                  ? `Group total ${formatCpuPercent(node.aggregateCpuPercent)} CPU | ${formatMemory(node.aggregateMemoryMb)}`
                  : null;
                return (
                <div
                  key={`mobile-${process.pid}`}
                  className="mini-card explorer-card"
                  style={{ marginLeft: `${node.level * 12}px` }}
                >
                  <div className="explorer-card-top">
                    <div className="process-mobile-heading">
                      <div className="process-tree-row">
                        {node.children.length ? (
                          <button
                            className="process-tree-toggle"
                            type="button"
                            onClick={() => toggleProcessGroup(process.pid)}
                            aria-label={expanded ? `Collapse ${process.name}` : `Expand ${process.name}`}
                          >
                            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        ) : (
                          <span className="process-tree-spacer" aria-hidden="true" />
                        )}
                        <div>
                          <div className="action-feed-title">{buildProcessLabel(node)}</div>
                          <div className="muted-note">PID {process.pid}</div>
                        </div>
                      </div>
                    </div>
                    <span className={`status-badge ${process.killable ? 'status-success' : 'status-warning'}`}>
                      {process.killable ? 'Killable' : 'Blocked'}
                    </span>
                  </div>
                  <div className="explorer-metrics">
                    <span>CPU {formatCpuPercent(displayedCpuPercent)}</span>
                    <span>{formatMemory(displayedMemoryMb)}</span>
                    <span>{process.status}</span>
                  </div>
                  <div className="process-chip-row">
                    <span className={`status-pill ${process.inventory_degraded ? 'warn' : 'neutral'}`}>
                      {formatInventoryLabel(process)}
                    </span>
                    {process.username ? <span className="status-pill neutral">{process.username}</span> : null}
                  </div>
                  {expanded && groupTotals ? <div className="muted-note wrap-text">{groupTotals}</div> : null}
                  <div className="muted-note wrap-text">{process.command_line || process.exe_path || process.kill_reason || 'Dashboard-owned process.'}</div>
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
              );})}
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
