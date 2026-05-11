import React, { useDeferredValue, useMemo, useState } from 'react';
import { Network, RefreshCw, Search, ShieldAlert, Trash2 } from 'lucide-react';

import { useKillPortMutation, usePreviewPortStopMutation } from '../features/dashboard/hooks/useActionMutations';
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

function formatPortSourceLabel(portInfo) {
  if (portInfo.inventory_degraded) {
    return 'Fallback';
  }

  if (portInfo.inventory_source === 'command') {
    return 'Command';
  }

  if (portInfo.inventory_source === 'psutil_fallback') {
    return 'Fallback';
  }

  return 'Unknown';
}

function matchesSearch(portInfo, value) {
  if (!value) {
    return true;
  }

  const haystack = [
    portInfo.port,
    portInfo.pid,
    portInfo.process_name,
    portInfo.local_address,
    portInfo.exe_path,
    portInfo.protocol,
    portInfo.state,
    portInfo.status
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(value);
}

function comparePorts(left, right, sort) {
  if (sort === 'process_asc') {
    return String(left.process_name || '').localeCompare(String(right.process_name || ''));
  }

  if (sort === 'pid_asc') {
    return Number(left.pid || 0) - Number(right.pid || 0);
  }

  return Number(left.port || 0) - Number(right.port || 0);
}

function getControlLabel(entity) {
  if (entity.dashboard_owned || entity.owner_scope === 'managed') {
    return { label: 'Managed', tone: 'good' };
  }

  if (entity.block_reason === 'password_mode_required') {
    return { label: 'Password required', tone: 'warn' };
  }

  if (entity.owner_scope === 'current_user') {
    return { label: 'Current user', tone: 'good' };
  }

  return { label: 'System/Other user', tone: 'warn' };
}

function canStopPort(portInfo, authUnlocked, passwordProtectionEnabled, mutationPending) {
  if (mutationPending || !portInfo.killable) {
    return false;
  }

  if (passwordProtectionEnabled && !authUnlocked) {
    return false;
  }

  return true;
}

function getStopReason(portInfo, authUnlocked, passwordProtectionEnabled) {
  if (passwordProtectionEnabled && !authUnlocked && portInfo.killable) {
    return 'Unlock control access before stopping this listener';
  }

  if (portInfo.block_reason === 'ambiguous_listener') {
    return 'Select a specific listener before stopping this port';
  }

  return portInfo.kill_reason || portInfo.block_reason || `Stop listener on port ${portInfo.port}`;
}

function buildPortDetails(portInfo) {
  if (!portInfo) {
    return null;
  }

  return [
    `${portInfo.process_name} | PID ${portInfo.pid}`,
    `Port: ${portInfo.local_address || 'unknown host'}:${portInfo.port}`,
    `Protocol: ${portInfo.protocol || 'tcp'} | State: ${portInfo.state || portInfo.status}`,
    `Owner scope: ${portInfo.owner_scope || 'unknown'}`,
    portInfo.sensitive_masked ? 'Sensitive listener details are locked until control access is unlocked.' : (portInfo.exe_path || portInfo.kill_reason || 'This listener is eligible for termination.'),
    portInfo.block_reason ? `Reason: ${portInfo.block_reason}` : null
  ].filter(Boolean);
}

function buildPortPreviewDetails(portInfo, preview) {
  const target = preview?.target || {};
  const details = [
    `${target.process_name || portInfo?.process_name} | PID ${target.pid ?? portInfo?.pid}`,
    `Port: ${target.local_address || portInfo?.local_address || 'unknown host'}:${target.port ?? portInfo?.port}`,
    `Protocol: ${target.protocol || portInfo?.protocol || 'tcp'} | State: ${portInfo?.state || portInfo?.status || 'unknown'}`,
    `Owner scope: ${target.owner_scope || portInfo?.owner_scope || 'unknown'}`,
    `Preview: ${preview?.message || 'Checking stop policy...'}`,
    preview?.reason ? `Reason: ${preview.reason}` : null,
    preview?.allowed === false ? 'This stop is blocked by the current policy.' : null,
    preview?.allowed === true ? 'This listener was verified by the backend dry run.' : null,
    preview?.matches?.length ? `Matching listeners: ${preview.matches.length}` : null,
    portInfo?.sensitive_masked ? 'Sensitive listener details are locked until control access is unlocked.' : (portInfo?.exe_path || null)
  ];

  return details.filter(Boolean);
}

const PortControl = ({
  ports,
  loading,
  isRefreshing = false,
  lastUpdatedAt = null,
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
  const [pendingPreview, setPendingPreview] = useState(null);

  const deferredSearch = useDeferredValue(search);
  const killPortMutation = useKillPortMutation('');
  const previewPortMutation = usePreviewPortStopMutation('');

  const visiblePorts = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    return [...(ports ?? [])]
      .filter((portInfo) => {
        if (!matchesSearch(portInfo, normalizedSearch)) {
          return false;
        }

        if (dashboardOnly && !portInfo.dashboard_owned) {
          return false;
        }

        if (killableOnly && !portInfo.killable) {
          return false;
        }

        return true;
      })
      .sort((left, right) => comparePorts(left, right, sort));
  }, [dashboardOnly, deferredSearch, killableOnly, ports, sort]);

  const requestKill = async (portInfo) => {
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
    setPendingPreview(null);
    try {
      const preview = await previewPortMutation.mutateAsync({
        port: portInfo.port,
        pid: portInfo.pid,
        protocol: portInfo.protocol,
        localAddress: portInfo.local_address
      });
      setPendingPreview(preview);
      if (!preview.allowed) {
        onAction?.({
          action: 'kill_by_port_preview',
          status: 'blocked',
          message: preview.message,
          severity: 'warning',
          entity_type: 'port',
          entity_id: portInfo.port,
          reason: preview.reason
        });
      }
    } catch (error) {
      const fallbackPreview = {
        allowed: false,
        message: error.message,
        reason: error.payload?.reason || 'preview_failed',
        target: { port: portInfo.port, pid: portInfo.pid }
      };
      setPendingPreview(fallbackPreview);
      onAction?.({
        action: 'kill_by_port_preview',
        status: 'failed',
        message: error.message,
        severity: 'danger',
        entity_type: 'port',
        entity_id: portInfo.port,
        retry_after: error.retryAfter ?? null
      });
    }
  };

  const confirmKill = async () => {
    if (!pendingPort) {
      return;
    }

    try {
      const refreshedPorts = await onRefresh?.();
      const currentPort = refreshedPorts?.find((portInfo) => (
        portInfo.port === pendingPort.port
        && portInfo.pid === pendingPort.pid
        && (portInfo.local_address || '') === (pendingPort.local_address || '')
      )) || pendingPort;
      await killPortMutation.mutateAsync({
        port: currentPort.port,
        pid: currentPort.pid,
        protocol: currentPort.protocol,
        localAddress: currentPort.local_address
      });
      await onRefresh?.();
    } catch (error) {
      if (error?.status == null) {
        onAction?.({
          action: 'kill_by_port',
          status: 'failed',
          message: error.message,
          severity: 'danger',
          entity_type: 'port',
          entity_id: pendingPort.port,
          retry_after: error.retryAfter ?? null
        });
      }
    } finally {
      setPendingPort(null);
      setPendingPreview(null);
    }
  };

  const tableLoading = loading && !visiblePorts.length;

  return (
    <section className="panel">
      <div className="panel-header">
        <div className="panel-title-wrap">
          <span className="panel-icon">
            <Network size={18} />
          </span>
          <div>
            <h2 className="panel-title">Ports</h2>
            <p className="panel-subtitle">Inspect listening services and stop managed or password-authorized user listeners.</p>
          </div>
        </div>

        <button
          className="ghost-button"
          type="button"
          onClick={() => {
            void onRefresh?.();
          }}
          disabled={isRefreshing}
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
          {visiblePorts.length} results | last refresh {formatUpdatedAt(lastUpdatedAt)}
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
                    <th>Listener</th>
                    <th>PID</th>
                    <th>Ownership</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePorts.map((portInfo) => {
                    const controlLabel = getControlLabel(portInfo);
                    const canStop = canStopPort(portInfo, authUnlocked, passwordProtectionEnabled, killPortMutation.isPending);
                    const stopReason = getStopReason(portInfo, authUnlocked, passwordProtectionEnabled);

                    return (
                      <tr key={`${portInfo.port}-${portInfo.pid}`}>
                        <td><strong>{portInfo.port}</strong></td>
                        <td>
                          <div className="process-cell-stack">
                            <strong>{portInfo.process_name}</strong>
                            <div className="process-chip-row">
                              <span className={`status-pill ${portInfo.inventory_degraded ? 'warn' : 'neutral'}`}>
                                {formatPortSourceLabel(portInfo)}
                              </span>
                              {portInfo.protocol ? <span className="status-pill neutral">{portInfo.protocol}</span> : null}
                            </div>
                            <span className="muted-note">{portInfo.exe_path || portInfo.kill_reason || 'Managed listener'}</span>
                          </div>
                        </td>
                        <td>
                          <div className="process-cell-stack">
                            <strong>{portInfo.local_address || 'Unknown host'}</strong>
                            <span className="muted-note">{portInfo.state || portInfo.status}</span>
                          </div>
                        </td>
                        <td>{portInfo.pid}</td>
                        <td>
                          <span className={`status-pill ${controlLabel.tone}`}>
                            {controlLabel.label}
                          </span>
                        </td>
                        <td>
                          <div className="table-action">
                            <button
                              className="danger-button"
                              type="button"
                              onClick={() => requestKill(portInfo)}
                              disabled={!canStop}
                              title={stopReason}
                            >
                              <Trash2 size={16} />
                              Stop
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mobile-card-list">
              {visiblePorts.map((portInfo) => {
                const controlLabel = getControlLabel(portInfo);
                const canStop = canStopPort(portInfo, authUnlocked, passwordProtectionEnabled, killPortMutation.isPending);
                const stopReason = getStopReason(portInfo, authUnlocked, passwordProtectionEnabled);

                return (
                  <div key={`mobile-${portInfo.port}-${portInfo.pid}`} className="mini-card explorer-card">
                    <div className="explorer-card-top">
                      <div>
                        <div className="action-feed-title">Port {portInfo.port}</div>
                        <div className="muted-note">{portInfo.process_name} | PID {portInfo.pid}</div>
                      </div>
                      <span className={`status-badge ${canStop ? 'status-success' : 'status-warning'}`}>
                        {canStop ? 'Killable' : controlLabel.label}
                      </span>
                    </div>
                    <div className="process-chip-row">
                      <span className={`status-pill ${portInfo.inventory_degraded ? 'warn' : 'neutral'}`}>
                        {formatPortSourceLabel(portInfo)}
                      </span>
                      <span className={`status-pill ${controlLabel.tone}`}>{controlLabel.label}</span>
                      {portInfo.protocol ? <span className="status-pill neutral">{portInfo.protocol}</span> : null}
                    </div>
                    <div className="explorer-metrics">
                      <span>{portInfo.local_address || 'Unknown host'}</span>
                      <span>{portInfo.state || portInfo.status}</span>
                    </div>
                    <div className="muted-note wrap-text">{portInfo.kill_reason || 'Dashboard-owned listener.'}</div>
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => requestKill(portInfo)}
                      disabled={!canStop}
                      title={stopReason}
                    >
                      <ShieldAlert size={16} />
                      Stop listener
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingPort)}
        title={pendingPort ? `Stop port ${pendingPort.port}?` : 'Stop port'}
        description="DevControl can stop managed listeners and password-authorized current-user listeners."
        details={pendingPort
          ? pendingPreview
            ? buildPortPreviewDetails(pendingPort, pendingPreview)
            : buildPortDetails(pendingPort)
          : null}
        confirmLabel={previewPortMutation.isPending ? 'Previewing...' : killPortMutation.isPending ? 'Stopping...' : 'Stop listener'}
        onConfirm={() => { void confirmKill(); }}
        onCancel={() => {
          setPendingPort(null);
          setPendingPreview(null);
        }}
        disabled={previewPortMutation.isPending || killPortMutation.isPending || pendingPreview?.allowed === false}
      />
    </section>
  );
};

export default PortControl;
