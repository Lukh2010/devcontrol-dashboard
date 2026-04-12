import React, { useState } from 'react';
import { AlertTriangle, Cpu, RefreshCw, Trash2 } from 'lucide-react';

const ProcessManager = ({ controlPassword, processes, loading, isAdmin, onRefresh }) => {
  const [error, setError] = useState(null);
  const [killingPid, setKillingPid] = useState(null);

  const killProcess = async (pid) => {
    if (!isAdmin) {
      setError('Administrator privileges required to kill processes');
      return;
    }

    try {
      setKillingPid(pid);
      setError(null);

      const response = await fetch(`/api/processes/${pid}/kill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DevControl-Password': controlPassword || ''
        }
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to kill process');
      }

      setTimeout(() => {
        onRefresh().catch((refreshError) => {
          setError(refreshError.message);
        });
      }, 1000);
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

  const formatMemory = (memoryMb) => {
    if (memoryMb > 1024) {
      return `${(memoryMb / 1024).toFixed(1)}GB`;
    }
    return `${Math.round(memoryMb)}MB`;
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div className="panel-title-wrap">
          <span className="panel-icon">
            <Cpu size={18} />
          </span>
          <div>
            <h2 className="panel-title">Process Manager</h2>
            <p className="panel-subtitle">Top CPU consumers with controlled termination for dashboard-owned processes.</p>
          </div>
        </div>

        <button className="ghost-button" onClick={() => {
          setError(null);
          onRefresh().catch((refreshError) => {
            setError(refreshError.message);
          });
        }} disabled={loading}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>
      <div className="panel-body">
        {!isAdmin && (
          <div className="alert warning">
            <AlertTriangle size={16} />
            <span>Run the dashboard as Administrator on Windows for process termination.</span>
          </div>
        )}

        {error && (
          <div className="alert error">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

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
                    <th>PID</th>
                    <th>Name</th>
                    <th>CPU</th>
                    <th>Memory</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {processes.map((process) => (
                    <tr key={process.pid}>
                      <td>{process.pid}</td>
                      <td>{process.name}</td>
                      <td className={getCpuClass(process.cpu_percent)}>{process.cpu_percent}%</td>
                      <td>{formatMemory(process.memory_mb)}</td>
                      <td>{process.status}</td>
                      <td>
                        <button
                          className="danger-button"
                          onClick={() => killProcess(process.pid)}
                          disabled={!isAdmin || killingPid !== null}
                          title={!isAdmin ? 'Administrator privileges required' : `Kill process ${process.pid}`}
                        >
                          {killingPid === process.pid ? <RefreshCw size={16} /> : <Trash2 size={16} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="muted-note">Showing top 15 processes by CPU usage. Auto-refresh interval: 5 seconds.</div>
          </>
        )}
      </div>
    </section>
  );
};

export default ProcessManager;
