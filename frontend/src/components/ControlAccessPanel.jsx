import React from 'react';
import { KeyRound, LockKeyhole, Server, Terminal, Wifi } from 'lucide-react';

function ControlAccessPanel({
  authBadge,
  authHint,
  authUnlocked,
  createAuthSessionMutation,
  currentStats,
  deleteAuthSessionMutation,
  passwordInput,
  passwordProtectionEnabled,
  setPasswordInput,
  streamError,
  unlockControl,
  lockControl
}) {
  const hostname = currentStats.systemInfo?.hostname || 'Loading';
  const systemEnv = currentStats.systemInfo
    ? `${currentStats.systemInfo.platform || 'Linux'} ${currentStats.systemInfo.platform_release || ''}`.trim()
    : 'Local Host';

  const apiStatus = currentStats.health?.api?.ready ? '127.0.0.1:8000' : 'Offline';
  const terminalStatus = currentStats.health?.terminal?.thread_alive ? '127.0.0.1:8003' : 'Starting';

  const quickStats = [
    {
      label: 'Host',
      value: hostname,
      hint: systemEnv,
      icon: Server
    },
    {
      label: 'API Server',
      value: apiStatus,
      hint: 'REST & SSE',
      icon: Wifi
    },
    {
      label: 'Terminal WS',
      value: terminalStatus,
      hint: 'WebSocket 8003',
      icon: Terminal
    },
    {
      label: 'Security Mode',
      value: authUnlocked ? 'Unlocked' : 'Protected',
      hint: passwordProtectionEnabled ? 'Gated actions' : 'No password',
      icon: KeyRound
    }
  ];

  return (
    <section className="panel control-panel">
      <div className="panel-header compact-header">
        <div className="panel-title-wrap">
          <span className="panel-icon">
            <LockKeyhole size={18} />
          </span>
          <div>
            <h2 className="panel-title">Control access</h2>
            <p className="panel-subtitle">Unlock once, then use the same control session everywhere.</p>
          </div>
        </div>
      </div>

      <div className="panel-body stack">
        {passwordProtectionEnabled ? (
          <div className="unlock-form">
            <label className="field-label" htmlFor="control-password">Control Password</label>
            <input
              id="control-password"
              className="input"
              type="password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              placeholder="Enter startup password"
            />
            <div className="quick-action-row">
              <button
                className="button"
                type="button"
                onClick={() => { void unlockControl(); }}
                disabled={createAuthSessionMutation.isPending}
              >
                {createAuthSessionMutation.isPending ? 'Unlocking...' : 'Unlock'}
              </button>
              <button
                className="ghost-button"
                type="button"
                onClick={() => { void lockControl(); }}
                disabled={!authUnlocked || deleteAuthSessionMutation.isPending}
              >
                Lock
              </button>
            </div>
          </div>
        ) : null}

        <div className="glass-note">
          <span className={`status-badge ${authBadge.tone}`}>{authBadge.label}</span>
          <p>{streamError || authHint}</p>
        </div>

        <div className="stat-grid">
          {quickStats.map(({ label, value, hint, icon: Icon }) => (
            <div key={label} className="mini-card stat-card">
              <div className="stat-card-top">
                <span className="panel-icon small-icon">
                  <Icon size={15} />
                </span>
                <span className="metric-eyebrow">{label}</span>
              </div>
              <p className="metric-reading compact-reading">{value}</p>
              <p className="muted-note">{hint}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ControlAccessPanel;
