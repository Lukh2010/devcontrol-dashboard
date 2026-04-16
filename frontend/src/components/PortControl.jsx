import React, { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Network, RefreshCw, Search, ShieldAlert, Trash2 } from 'lucide-react';

import { dashboardQueryKeys, fetchPorts } from '../features/dashboard/api/client';
import { useKillPortMutation } from '../features/dashboard/hooks/useActionMutations';
import ConfirmDialog from './ConfirmDialog';

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

const PortControl = ({
  ports,
  loading,
  authUnlocked,
  passwordProtectionEnabled,
  onRefresh,
  onAction
}) => {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('port_asc');
  const [dashboardOnly, setDashboardOnly] = useState(false);
  const [killableOnly, setKillableOnly] = useState(false);
  const [pendingPort, setPendingPort] = useState(null);

  const deferredSearch = useDeferredValue(search);
  const killPortMutation = useKillPortMutation('');

  const queryOptions = useMemo(() => ({
    search: deferredSearch.trim(),
    sort,
    limit: 200,
    dashboard_only: dashboardOnly,
    killable_only: killableOnly
  }), [dashboardOnly, deferredSearch, killableOnly, sort]);

  const portsQuery = useQuery({
    queryKey: dashboardQueryKeys.portsList(queryOptions),
    queryFn: () => fetchPorts(queryOptions),
    placeholderData: ports ?? [],
    staleTime: 5000
  });

  const visiblePorts = portsQuery.data ?? ports ?? [];

  const requestKill = (portInfo) => {
    if (passwordProtectionEnabled && !authUnlocked) {
      onAction?.({
        action: 'kill_by_port',
        status: 'blocked',
        message: 'Unlock control access before stopping a port.',
        severity: 'warning',
        entity_type: 'port',
        entity_id: portInfo.port,
        requires_password: true
      });
      return;
    }

    setPendingPort(portInfo);
  };

  const confirmKill = async () => {
    if (!pendingPort) {
      return;
    }

    try {
      const result = await killPortMutation.mutateAsync(pendingPort.port);
      onAction?.({
        action: 'kill_by_port',
        status: 'success',
        message: result.message,
        severity: 'success',
        entity_type: 'port',
        entity_id: pendingPort.port
      });
      await Promise.allSettled([portsQuery.refetch(), onRefresh?.()]);
    } catch (error) {
      onAction?.({
        action: 'kill_by_port',
        status: 'failed',
        message: error.message,
        severity: 'danger',
        entity_type: 'port',
        entity_id: pendingPort.port,
        retry_after: error.retryAfter ?? null
      });
    } finally {
      setPendingPort(null);
    }
  };

  const tableLoading = (loading || portsQuery.isLoading) && !visiblePorts.length;

  return (
    <section className="panel">
      <div className="panel-header">
        <div className="panel-title-wrap">
          <span className="panel-icon">
            <Network size={18} />
          </span>
          <div>
            <h2 className="panel-title">Ports</h2>
            <p className="panel-subtitle">Inspect listening services and stop only managed listeners.</p>
          </div>
        </div>

        <button
          className="ghost-button"
          type="button"
          onClick={() => {
            void Promise.allSettled([portsQuery.refetch(), onRefresh?.()]);
          }}
          disabled={portsQuery.isFetching}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="panel-body stack">
        <div className="table-controls">
          <label className="search-field">
            <Search size={16} />
            <input
              className="input table-search-input"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by port, PID, or process"
            />
          </label>

          <div className="filter-row">
            <select className="select" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="port_asc">Sort by port</option>
              <option value="process_asc">Sort by process</option>
              <option value="pid_asc">Sort by PID</option>
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
          {visiblePorts.length} results • last refresh {formatUpdatedAt(portsQuery.dataUpdatedAt)}
        </div>

        {tableLoading ? (
          <div className="skeleton-stack" aria-hidden="true">
            <div className="skeleton-line skeleton-line-lg" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
          </div>
        ) : visiblePorts.length === 0 ? (
          <div className="center-empty">
            <div>
              <p className="metric-reading compact-reading">No matching listeners</p>
              <p className="muted-note">Try a broader search or disable one of the filters.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="table-wrap desktop-table">
              <table className="table">
                <thead>
                  <tr>
                    <th>Port</th>
                    <th>Process</th>
                    <th>PID</th>
                    <th>Ownership</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePorts.map((portInfo) => (
                    <tr key={`${portInfo.port}-${portInfo.pid}`}>
                      <td><strong>{portInfo.port}</strong></td>
                      <td>
                        <div className="process-cell-stack">
                          <strong>{portInfo.process_name}</strong>
                          <span className="muted-note">{portInfo.kill_reason || 'Managed listener'}</span>
                        </div>
                      </td>
                      <td>{portInfo.pid}</td>
                      <td>
                        <span className={`status-pill ${portInfo.dashboard_owned ? 'good' : 'warn'}`}>
                          {portInfo.dashboard_owned ? 'Managed' : 'External'}
                        </span>
                      </td>
                      <td>
                        <div className="table-action">
                          <button
                            className="danger-button"
                            type="button"
                            onClick={() => requestKill(portInfo)}
                            disabled={!portInfo.killable || killPortMutation.isPending}
                            title={portInfo.kill_reason || `Stop listener on port ${portInfo.port}`}
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
              {visiblePorts.map((portInfo) => (
                <div key={`mobile-${portInfo.port}-${portInfo.pid}`} className="mini-card explorer-card">
                  <div className="explorer-card-top">
                    <div>
                      <div className="action-feed-title">Port {portInfo.port}</div>
                      <div className="muted-note">{portInfo.process_name} • PID {portInfo.pid}</div>
                    </div>
                    <span className={`status-badge ${portInfo.killable ? 'status-success' : 'status-warning'}`}>
                      {portInfo.killable ? 'Killable' : 'Blocked'}
                    </span>
                  </div>
                  <div className="muted-note wrap-text">{portInfo.kill_reason || 'Dashboard-owned listener.'}</div>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={() => requestKill(portInfo)}
                    disabled={!portInfo.killable || killPortMutation.isPending}
                  >
                    <ShieldAlert size={16} />
                    Stop listener
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingPort)}
        title={pendingPort ? `Stop port ${pendingPort.port}?` : 'Stop port'}
        description="Only listeners owned by DevControl-managed processes can be terminated."
        details={pendingPort ? [
          `${pendingPort.process_name} • PID ${pendingPort.pid}`,
          pendingPort.kill_reason || 'This listener is eligible for termination.'
        ] : null}
        confirmLabel={killPortMutation.isPending ? 'Stopping...' : 'Stop listener'}
        onConfirm={() => { void confirmKill(); }}
        onCancel={() => setPendingPort(null)}
        disabled={killPortMutation.isPending}
      />
    </section>
  );
};

export default PortControl;
