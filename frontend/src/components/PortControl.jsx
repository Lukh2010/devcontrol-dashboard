import React, { useState } from 'react';
import { Network, ShieldAlert } from 'lucide-react';

import { useKillPortMutation } from '../features/dashboard/hooks/useActionMutations';

const PortControl = ({ controlPassword, ports, loading, onRefresh }) => {
  const [message, setMessage] = useState('');
  const killPortMutation = useKillPortMutation(controlPassword);

  const killProcess = async (port) => {
    try {
      const result = await killPortMutation.mutateAsync(port);
      setMessage(`Success: ${result.message}`);
      setTimeout(() => setMessage(''), 3000);
      onRefresh?.();
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
            <h2 className="panel-title">Ports</h2>
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
                        {killPortMutation.isPending ? 'Killing...' : 'Kill'}
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
