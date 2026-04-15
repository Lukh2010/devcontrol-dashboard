import React, { useMemo, useState } from 'react';
import { AlertTriangle, Cpu, RefreshCw, Shield, Trash2 } from 'lucide-react';

import { useKillProcessMutation } from '../features/dashboard/hooks/useActionMutations';

const ProcessManager = ({ controlPassword, processes, loading, isAdmin, onRefresh }) => {
  const [error, setError] = useState(null);
  const [killingPid, setKillingPid] = useState(null);
  const killProcessMutation = useKillProcessMutation(controlPassword);

  const processSummary = useMemo(() => {
    if (!processes?.length) {
      return {
        total: 0,
        hottest: 'No data',
        avgCpu: '0.0%'
      };
    }

    const totalCpu = processes.reduce((sum, process) => sum + process.cpu_percent, 0);
    return {
      total: processes.length,
      hottest: processes[0]?.name || 'Unknown',
      avgCpu: `${(totalCpu / processes.length).toFixed(1)}%`
    };
  }, [processes]);

  const killProcess = async (pid) => {
    if (!isAdmin) {
      setError('Administrator privileges required to kill processes');
      return;
    }

    try {
      setKillingPid(pid);
      setError(null);

      await killProcessMutation.mutateAsync(pid);
      setTimeout(() => {
        onRefresh?.().catch((refreshError) => setError(refreshError.message));
      }, 600);
    } catch (err) {
      setError(err.message);
    } finally {
      setKillingPid(null);
    }
  };

  const getCpuClass = (cpu) => {
    if (cpu > 80) return 'value-danger';
    if (cpu > 50) return 'value-warn';
    return 'value-good';
  };

  const getStatusTone = (status) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized.includes('running')) return 'good';
    if (normalized.includes('sleep')) return 'neutral';
    if (normalized.includes('stop') || normalized.includes('dead')) return 'danger';
    return 'warn';
  };

  const formatMemory = (memoryMb) => {
    if (memoryMb > 1024) {
      return `${(memoryMb / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(memoryMb)} MB`;
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div className="panel-title-wrap">
          <span className="panel-icon">
            <Cpu size={18} />
          </span>
          <div>
            <h2 className="panel-title">Processes</h2>
          </div>
        </div>

        <div className="process-toolbar">
          <span className={`status-badge ${isAdmin ? 'status-success' : 'status-warning'}`}>
            {isAdmin ? 'Admin available' : 'Admin required'}
          </span>
          <button className="ghost-button" type="button" onClick={() => onRefresh?.()} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      <div className="panel-body">
        <div className="summary-grid">
          <div className="summary-strip">
            <div>
              <div className="summary-label">Visible processes</div>
              <div className="summary-value">{processSummary.total}</div>
            </div>
            <Shield size={18} />
          </div>
          <div className="summary-strip">
            <div>
              <div className="summary-label">Hottest process</div>
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

        {!isAdmin ? (
          <div className="alert warning">
            <AlertTriangle size={16} />
            <span>Run the dashboard as Administrator on Windows for process termination.</span>
          </div>
        ) : null}

        {error ? (
          <div className="alert error">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="center-empty">Loading processes...</div>
        ) : processes.length === 0 ? (
          <div className="center-empty">No processes found.</div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Process</th>
                    <th>PID</th>
                    <th>CPU</th>
                    <th>Memory</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {processes.map((process) => (
                    <tr key={process.pid}>
                      <td>
                        <div className="process-cell-stack">
                          <strong>{process.name}</strong>
                        </div>
                      </td>
                      <td>{process.pid}</td>
                      <td className={getCpuClass(process.cpu_percent)}>{process.cpu_percent}%</td>
                      <td>{formatMemory(process.memory_mb)}</td>
                      <td>
                        <span className={`status-pill ${getStatusTone(process.status)}`}>{process.status}</span>
                      </td>
                      <td>
                        <div className="table-action">
                          <button
                            className="danger-button"
                            type="button"
                            onClick={() => killProcess(process.pid)}
                            disabled={!isAdmin || killingPid !== null}
                            title={!isAdmin ? 'Administrator privileges required' : `Kill process ${process.pid}`}
                          >
                            {killingPid === process.pid ? <RefreshCw size={16} /> : <Trash2 size={16} />}
                            {killingPid === process.pid ? 'Stopping' : 'Kill'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="muted-note">
              Top CPU consumers from the live stream.
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default ProcessManager;
