import React, { useState } from 'react';
import { Network, ShieldAlert } from 'lucide-react';

const PortControl = ({ controlPassword, ports, loading, onRefresh }) => {
  const [message, setMessage] = useState('');

  const killProcess = async (port) => {
    try {
      const response = await fetch(`/api/port/${port}`, {
        method: 'DELETE',
        headers: {
          'X-DevControl-Password': controlPassword || ''
        }
      });

      const result = await response.json();
      setMessage(response.ok ? `Success: ${result.message}` : `Error: ${result.error || 'Unknown error'}`);
      setTimeout(() => setMessage(''), 3000);

      if (response.ok) {
        await onRefresh();
      }
    } catch (error) {
      setMessage(`Network error: ${error.message}`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div className="panel-title-wrap">
          <span className="panel-icon">
            <Network size={18} />
          </span>
          <div>
            <h2 className="panel-title">Port Control</h2>
            <p className="panel-subtitle">Inspect listening services and terminate dashboard-owned listeners.</p>
          </div>
        </div>
      </div>
      <div className="panel-body">
        {message && (
          <div className={`alert ${message.startsWith('Success:') ? 'info' : 'error'}`}>
            <ShieldAlert size={16} />
            <span>{message}</span>
          </div>
        )}

        {loading ? (
          <div className="center-empty">Scanning ports...</div>
        ) : ports.length === 0 ? (
          <div className="center-empty">No active listening ports found.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Port</th>
                  <th>Process</th>
                  <th>PID</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {ports.slice(0, 10).map((portInfo) => (
                  <tr key={`${portInfo.port}-${portInfo.pid}`}>
                    <td><strong>{portInfo.port}</strong></td>
                    <td>{portInfo.process_name}</td>
                    <td>{portInfo.pid}</td>
                    <td>
                      <button className="danger-button" onClick={() => killProcess(portInfo.port)}>
                        Kill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

export default PortControl;
